import { access, chmod, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { HttpError } from "../utils/http-error.js";

export type DownloaderProvider = "tiktok" | "facebook" | "instagram" | "youtube";
export type DownloaderAssetKind = "video" | "audio" | "image";

type YtDlpFormat = {
  format_id?: string;
  ext?: string;
  url?: string;
  width?: number;
  height?: number;
  format_note?: string;
  resolution?: string;
  filesize?: number;
  filesize_approx?: number;
  vcodec?: string;
  acodec?: string;
  dynamic_range?: string;
};

type YtDlpThumbnail = {
  url?: string;
};

type YtDlpEntry = {
  id?: string;
  title?: string;
  url?: string;
  ext?: string;
  width?: number;
  height?: number;
  thumbnails?: YtDlpThumbnail[];
};

type YtDlpInfo = {
  id?: string;
  title?: string;
  duration?: number;
  extractor?: string;
  extractor_key?: string;
  webpage_url?: string;
  original_url?: string;
  uploader?: string;
  channel?: string;
  thumbnail?: string;
  thumbnails?: YtDlpThumbnail[];
  formats?: YtDlpFormat[];
  entries?: YtDlpEntry[];
};

type TikTokImage = {
  imageURL?: {
    urlList?: string[];
  };
  imageWidth?: number;
  imageHeight?: number;
};

type TikTokItem = {
  id?: string;
  desc?: string;
  author?: {
    uniqueId?: string;
    nickname?: string;
  };
  video?: {
    width?: number;
    height?: number;
    duration?: number;
    cover?: string;
    originCover?: string;
    playAddr?: string;
    downloadAddr?: string;
  };
  music?: {
    title?: string;
    playUrl?: string;
  };
  imagePost?: {
    title?: string;
    images?: TikTokImage[];
    cover?: TikTokImage;
  };
};

type TikTokApiData = {
  videoDetail?: {
    statusCode?: number;
    itemInfo?: {
      itemStruct?: TikTokItem;
    };
    shareMeta?: {
      title?: string;
      desc?: string;
      cover_url?: string;
    };
  };
};

type TikTokUniversalData = {
  __DEFAULT_SCOPE__?: {
    "webapp.reflow.video.detail"?: TikTokApiData["videoDetail"];
  };
};

export type DownloaderAsset = {
  id: string;
  kind: DownloaderAssetKind;
  label: string;
  format: string;
  quality?: string;
  sizeLabel?: string;
  width?: number;
  height?: number;
  directUrl?: string;
  downloadPath?: string;
};

export type DownloaderAnalysis = {
  provider: DownloaderProvider;
  sourceUrl: string;
  title: string;
  author?: string;
  durationSeconds?: number;
  thumbnail?: string;
  assets: DownloaderAsset[];
  warnings: string[];
};

export type PreparedDownload = {
  filePath: string;
  fileName: string;
  contentType: string;
  cleanup: () => Promise<void>;
};

const configuredBinaryPath = process.env.YT_DLP_PATH
  ? path.resolve(process.env.YT_DLP_PATH)
  : path.resolve(process.cwd(), ".cache", "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
const standaloneBinaryPath = path.resolve(process.cwd(), ".cache", "bin", process.platform === "win32" ? "yt-dlp-standalone.exe" : "yt-dlp-standalone");
let activeBinaryPath = configuredBinaryPath;
const execFileAsync = promisify(execFile);
let binaryReady: Promise<string> | null = null;
type YtDlpClient = {
  getVideoInfo(args: string[]): Promise<YtDlpInfo>;
  execStream(args: string[]): NodeJS.ReadableStream;
  execPromise(args: string[]): Promise<string>;
};
type YtDlpRuntime = {
  new(binaryPath?: string): YtDlpClient;
  downloadFile(fileURL: string, filePath: string): Promise<unknown>;
  getGithubReleases(page?: number, perPage?: number): Promise<Array<{ tag_name?: string }>>;
  downloadFromGithub(filePath?: string, version?: string, platform?: NodeJS.Platform): Promise<void>;
};
let ytDlpWrapClassPromise: Promise<YtDlpRuntime> | null = null;
const analysisCache = new Map<string, { expiresAt: number; value: DownloaderAnalysis }>();
const inFlightAnalysis = new Map<string, Promise<DownloaderAnalysis>>();
const analysisCacheTtlMs = 5 * 60 * 1000;
const tiktokUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1";
const genericShortLinkHosts = new Set([
  "bit.ly",
  "tinyurl.com",
  "t.co",
  "goo.gl",
  "is.gd",
  "cutt.ly",
  "shorturl.at",
  "rebrand.ly",
  "lnkd.in",
]);

function ytDlpReleaseAssetName() {
  if (process.platform === "win32") return "yt-dlp.exe";
  if (process.platform === "darwin") return "yt-dlp_macos";
  if (process.platform === "linux") return "yt-dlp_linux";
  return "yt-dlp";
}

async function downloadStandaloneYtDlp(YTDlpWrap: YtDlpRuntime) {
  await mkdir(path.dirname(standaloneBinaryPath), { recursive: true });
  const version = (await YTDlpWrap.getGithubReleases(1, 1))[0]?.tag_name;
  if (!version) throw new Error("Không lấy được phiên bản yt-dlp mới nhất từ GitHub");
  const fileURL = `https://github.com/yt-dlp/yt-dlp/releases/download/${version}/${ytDlpReleaseAssetName()}`;
  await YTDlpWrap.downloadFile(fileURL, standaloneBinaryPath);
  await chmod(standaloneBinaryPath, 0o755);
  activeBinaryPath = standaloneBinaryPath;
}

async function assertYtDlpExecutable() {
  try {
    await execFileAsync(activeBinaryPath, ["--version"], { timeout: 30_000 });
  } catch (error) {
    throw new Error("yt-dlp binary hiện tại không chạy được", { cause: error });
  }
}

function normalizeHostname(hostname: string) {
  return hostname.toLowerCase().replace(/^www\./, "");
}

function normalizeSourceUrl(sourceUrl: string) {
  const parsed = new URL(sourceUrl.trim());
  parsed.hash = "";
  const hostname = normalizeHostname(parsed.hostname);

  for (const key of [...parsed.searchParams.keys()]) {
    if (
      key.toLowerCase().startsWith("utm_")
      || ["fbclid", "igsh", "si", "feature", "pp", "source", "start_radio"].includes(key.toLowerCase())
    ) {
      parsed.searchParams.delete(key);
    }
  }

  if ((hostname === "youtube.com" || hostname === "m.youtube.com") && parsed.pathname.toLowerCase() === "/watch") {
    const videoId = parsed.searchParams.get("v");
    parsed.search = "";
    if (videoId) parsed.searchParams.set("v", videoId);
  }

  if (parsed.hostname === "m.youtube.com") parsed.hostname = "www.youtube.com";
  if (parsed.hostname === "mobile.facebook.com" || parsed.hostname === "m.facebook.com") parsed.hostname = "www.facebook.com";
  if (parsed.hostname === "instagr.am") parsed.hostname = "www.instagram.com";
  parsed.pathname = parsed.pathname.replace(/\/+$/, "") || "/";
  return parsed.toString();
}

async function loadYtDlpWrap() {
  if (!ytDlpWrapClassPromise) {
    ytDlpWrapClassPromise = import("yt-dlp-wrap").then((module) => {
      const runtime = (module.default as { default?: unknown } | undefined)?.default
        ?? module.default
        ?? module;
      return runtime as YtDlpRuntime;
    });
  }
  return ytDlpWrapClassPromise;
}

function formatBytes(value?: number) {
  if (!value || value <= 0) return undefined;
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }
  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function normalizeProvider(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("tiktok")) return "tiktok";
  if (lower.includes("instagram")) return "instagram";
  if (lower.includes("facebook") || lower.includes("fb")) return "facebook";
  if (lower.includes("youtube") || lower.includes("youtu")) return "youtube";
  return null;
}

function assertSupportedSourceUrl(provider: DownloaderProvider, sourceUrl: string) {
  let pathname = "";
  let hostname = "";
  let searchParams = new URLSearchParams();
  try {
    const parsed = new URL(sourceUrl);
    pathname = parsed.pathname.toLowerCase();
    hostname = normalizeHostname(parsed.hostname);
    searchParams = parsed.searchParams;
  } catch {
    throw new HttpError(400, "URL không hợp lệ");
  }

  const isGenericShortLink = genericShortLinkHosts.has(hostname);
  const isTikTokShortLink = ["vt.tiktok.com", "vm.tiktok.com"].includes(hostname);
  const isFacebookShortLink = hostname === "fb.watch" || pathname.includes("/share/r/") || pathname.includes("/share/v/");
  const isInstagramShortLink = hostname === "instagr.am";
  const isYouTubeShortLink = hostname === "youtu.be" || hostname === "youtube.com" && pathname.includes("/shorts/");
  const matchers: Record<DownloaderProvider, { ok: boolean; message: string }> = {
    tiktok: {
      ok: isGenericShortLink || isTikTokShortLink || hostname.endsWith("tiktok.com") && (pathname.includes("/video/") || pathname.includes("/photo/") || pathname.includes("/t/")),
      message: "Hãy dán URL video hoặc slideshow TikTok cụ thể, không dùng URL hồ sơ.",
    },
    facebook: {
      ok: isGenericShortLink || isFacebookShortLink || hostname.endsWith("facebook.com") && (pathname.includes("/reel/") || pathname.includes("/watch/") || pathname.includes("/videos/") || pathname.includes("/share/")),
      message: "Hãy dán URL reel hoặc video Facebook công khai cụ thể.",
    },
    instagram: {
      ok: isGenericShortLink || isInstagramShortLink || hostname.endsWith("instagram.com") && (pathname.includes("/reel/") || pathname.includes("/p/") || pathname.includes("/stories/") || pathname.includes("/tv/")),
      message: "Hãy dán URL reel, post, carousel hoặc story Instagram cụ thể.",
    },
    youtube: {
      ok: isGenericShortLink || isYouTubeShortLink || hostname.endsWith("youtube.com") && ((pathname === "/watch" && Boolean(searchParams.get("v"))) || pathname.includes("/shorts/") || pathname.includes("/live/") || pathname.includes("/embed/")),
      message: "Hãy dán URL video hoặc Shorts YouTube cụ thể.",
    },
  };

  if (!matchers[provider].ok) {
    throw new HttpError(400, matchers[provider].message);
  }
}

const ytDlpNetworkArgs = [
  "--socket-timeout",
  "20",
  "--extractor-retries",
  "1",
  "--retries",
  "1",
] as const;

const ytDlpAnalyzeNetworkArgs = [
  "--socket-timeout",
  process.env.DOWNLOADER_ANALYZE_TIMEOUT_SECONDS ?? "4",
  "--extractor-retries",
  "0",
  "--retries",
  "0",
] as const;

function ytDlpProviderArgs(provider: DownloaderProvider) {
  const browserUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";
  const args = ["--user-agent", browserUserAgent];
  if (provider === "instagram") return [...args, "--referer", "https://www.instagram.com/"];
  if (provider === "facebook") return [...args, "--referer", "https://www.facebook.com/"];
  if (provider === "youtube") return [...args, "--referer", "https://www.youtube.com/"];
  return args;
}

export function isSupportedSourceUrl(provider: DownloaderProvider, sourceUrl: string) {
  try {
    assertSupportedSourceUrl(provider, sourceUrl);
    return true;
  } catch {
    return false;
  }
}

export function detectProvider(info: Pick<YtDlpInfo, "extractor" | "extractor_key" | "webpage_url" | "original_url">) {
  return normalizeProvider(
    [info.extractor_key, info.extractor, info.webpage_url, info.original_url]
      .filter(Boolean)
      .join(" "),
  );
}

function buildFileName(title: string, extension: string) {
  const safeTitle = title
    .normalize("NFKD")
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80) || "scanpdf-download";
  const ext = extension.replace(/^\./, "") || "bin";
  return `${safeTitle}.${ext}`;
}

function buildDownloadPath(params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `/downloaders/file?${search.toString()}`;
}

function preferredVideoFormats(formats: YtDlpFormat[]) {
  const seen = new Set<string>();
  return formats
    .filter((format) => format.format_id && format.url && format.vcodec && format.vcodec !== "none")
    .filter((format) => (format.ext ?? "").toLowerCase() === "mp4")
    .sort((left, right) => (right.height ?? 0) - (left.height ?? 0))
    .filter((format) => {
      const key = `${format.height ?? 0}-${format.ext ?? ""}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 4);
}

export function buildAssets(provider: DownloaderProvider, info: YtDlpInfo, sourceUrl: string) {
  const title = info.title?.trim() || `${provider}-download`;
  const assets: DownloaderAsset[] = [];
  const warnings: string[] = [];
  const formats = info.formats ?? [];
  const thumbnail = info.thumbnail ?? info.thumbnails?.find((item) => item.url)?.url;

  for (const format of preferredVideoFormats(formats)) {
    const quality = format.height ? `${format.height}p` : format.format_note ?? format.resolution;
    const extension = format.ext ?? "mp4";
    assets.push({
      id: `video-${format.format_id}`,
      kind: "video",
      label: provider === "tiktok"
        ? `Tải video không watermark${quality ? ` ${quality}` : ""}`
        : `Tải video${quality ? ` ${quality}` : ""}`,
      format: extension,
      quality,
      width: format.width,
      height: format.height,
      sizeLabel: formatBytes(format.filesize ?? format.filesize_approx),
      downloadPath: buildDownloadPath({
        provider,
        source: sourceUrl,
        mode: "video",
        formatId: format.format_id!,
        ext: extension,
        filename: buildFileName(title, extension),
      }),
    });
  }

  assets.push({
    id: "audio-mp3",
    kind: "audio",
    label: provider === "youtube" || provider === "tiktok" ? "Tải MP3" : "Trích xuất âm thanh MP3",
    format: "mp3",
    quality: "MP3",
    downloadPath: buildDownloadPath({
      provider,
      source: sourceUrl,
      mode: "audio",
      filename: buildFileName(title, "mp3"),
    }),
  });

  for (const [index, entry] of (info.entries ?? []).entries()) {
    const imageUrl = entry.url ?? entry.thumbnails?.find((item) => item.url)?.url;
    const extension = (entry.ext ?? "jpg").replace(/^\./, "");
    if (!imageUrl) continue;
    assets.push({
      id: `image-${index + 1}`,
      kind: "image",
      label: info.entries && info.entries.length > 1 ? `Slide ${index + 1}` : `Ảnh ${index + 1}`,
      format: extension,
      width: entry.width,
      height: entry.height,
      directUrl: imageUrl,
    });
  }

  if (!assets.some((asset) => asset.kind === "video") && !assets.some((asset) => asset.kind === "image")) {
    warnings.push("Nguồn này không trả về định dạng tải trực tiếp ổn định. Hãy thử lại với URL công khai khác.");
  }
  if (provider === "instagram" && assets.some((asset) => asset.kind === "image")) {
    warnings.push("Carousel và ảnh được trả về theo từng mục riêng để tải trực tiếp.");
  }
  if (provider === "tiktok" && assets.filter((asset) => asset.kind === "image").length > 1) {
    warnings.push("Slideshow TikTok được tách thành từng slide ảnh riêng.");
  }

  return {
    title,
    thumbnail,
    author: info.uploader ?? info.channel,
    durationSeconds: info.duration,
    assets,
    warnings,
  };
}

function firstNonEmpty(...values: Array<string | undefined>) {
  return values.find((value) => value?.trim())?.trim();
}

export function parseTikTokApiData(raw: string, sourceUrl: string): DownloaderAnalysis | null {
  let data: TikTokApiData;
  try {
    data = JSON.parse(raw) as TikTokApiData;
  } catch {
    return null;
  }

  const detail = data.videoDetail;
  const item = detail?.itemInfo?.itemStruct;
  if (!item || (detail?.statusCode != null && detail.statusCode !== 0)) return null;

  const title = firstNonEmpty(
    item.desc,
    item.imagePost?.title,
    detail?.shareMeta?.title,
    item.author?.nickname,
    item.author?.uniqueId,
  ) ?? "TikTok download";
  const author = firstNonEmpty(item.author?.nickname, item.author?.uniqueId);
  const thumbnail = firstNonEmpty(
    item.imagePost?.cover?.imageURL?.urlList?.[0],
    item.video?.cover,
    item.video?.originCover,
    detail?.shareMeta?.cover_url,
  );
  const assets: DownloaderAsset[] = [];

  for (const [index, image] of (item.imagePost?.images ?? []).entries()) {
    const directUrl = image.imageURL?.urlList?.find(Boolean);
    if (!directUrl) continue;
    assets.push({
      id: `image-${item.id ?? "tiktok"}-${index + 1}`,
      kind: "image",
      label: `Tải ảnh ${index + 1}`,
      format: "jpeg",
      width: image.imageWidth,
      height: image.imageHeight,
      directUrl,
    });
  }

  const videoUrl = firstNonEmpty(item.video?.downloadAddr, item.video?.playAddr);
  if (videoUrl) {
    const quality = item.video?.height ? `${item.video.height}p` : undefined;
    assets.push({
      id: `video-${item.id ?? "tiktok"}`,
      kind: "video",
      label: `Tải video không watermark${quality ? ` ${quality}` : ""}`,
      format: "mp4",
      quality,
      width: item.video?.width,
      height: item.video?.height,
      directUrl: videoUrl,
    });
  }

  if (item.music?.playUrl) {
    assets.push({
      id: `audio-${item.id ?? "tiktok"}`,
      kind: "audio",
      label: item.music.title ? `Tải âm thanh - ${item.music.title}` : "Tải âm thanh",
      format: "mp3",
      quality: "MP3",
      directUrl: item.music.playUrl,
    });
  }

  if (!assets.length) return null;

  return {
    provider: "tiktok",
    sourceUrl,
    title,
    author,
    durationSeconds: item.video?.duration,
    thumbnail,
    assets,
    warnings: item.imagePost?.images?.length
      ? ["Bài ảnh TikTok được tách thành từng ảnh riêng để tải trực tiếp."]
      : [],
  };
}

function parseTikTokUniversalData(raw: string, sourceUrl: string) {
  try {
    const data = JSON.parse(raw) as TikTokUniversalData;
    const detail = data.__DEFAULT_SCOPE__?.["webapp.reflow.video.detail"];
    return detail ? parseTikTokApiData(JSON.stringify({ videoDetail: detail }), sourceUrl) : null;
  } catch {
    return null;
  }
}

function extractJsonScript(html: string, id: string) {
  const escapedId = id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return html.match(new RegExp(`<script[^>]+id=["']${escapedId}["'][^>]*>([\\s\\S]*?)<\\/script>`, "i"))?.[1];
}

async function analyzeTikTokPage(sourceUrl: string) {
  const response = await fetch(sourceUrl, {
    redirect: "follow",
    signal: AbortSignal.timeout(6_000),
    headers: {
      "user-agent": tiktokUserAgent,
      "accept-language": "vi-VN,vi;q=0.9,en;q=0.8",
    },
  });
  if (!response.ok) return null;

  const finalUrl = response.url || sourceUrl;
  const finalHost = new URL(finalUrl).hostname.toLowerCase();
  if (!finalHost.endsWith("tiktok.com")) return null;

  const html = await response.text();
  const apiData = extractJsonScript(html, "api-data");
  if (apiData) {
    const analysis = parseTikTokApiData(apiData, sourceUrl);
    if (analysis) return analysis;
  }

  const universalData = extractJsonScript(html, "__UNIVERSAL_DATA_FOR_REHYDRATION__");
  return universalData ? parseTikTokUniversalData(universalData, sourceUrl) : null;
}

async function ensureBinaryPath() {
  if (!binaryReady) {
    binaryReady = (async () => {
      const YTDlpWrap = await loadYtDlpWrap();
      try {
        activeBinaryPath = configuredBinaryPath;
        await access(activeBinaryPath);
        await chmod(activeBinaryPath, 0o755);
        await assertYtDlpExecutable();
      } catch (error) {
        await downloadStandaloneYtDlp(YTDlpWrap);
        await assertYtDlpExecutable();
      }
      return activeBinaryPath;
    })().catch((error) => {
      binaryReady = null;
      throw error;
    });
  }
  return binaryReady;
}

async function getClient() {
  const YTDlpWrap = await loadYtDlpWrap();
  return new YTDlpWrap(await ensureBinaryPath());
}

export async function analyzeMedia(provider: DownloaderProvider, sourceUrl: string): Promise<DownloaderAnalysis> {
  const normalizedUrl = normalizeSourceUrl(sourceUrl);
  assertSupportedSourceUrl(provider, normalizedUrl);
  const cacheKey = `${provider}:${normalizedUrl}`;
  const cached = analysisCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  if (cached) analysisCache.delete(cacheKey);

  const inFlight = inFlightAnalysis.get(cacheKey);
  if (inFlight) return inFlight;

  const promise = analyzeMediaUncached(provider, normalizedUrl)
    .then((analysis) => {
      analysisCache.set(cacheKey, {
        expiresAt: Date.now() + analysisCacheTtlMs,
        value: analysis,
      });
      return analysis;
    })
    .finally(() => {
      inFlightAnalysis.delete(cacheKey);
    });
  inFlightAnalysis.set(cacheKey, promise);
  return promise;
}

async function analyzeMediaUncached(provider: DownloaderProvider, sourceUrl: string): Promise<DownloaderAnalysis> {
  if (provider === "tiktok") {
    try {
      const fastAnalysis = await analyzeTikTokPage(sourceUrl);
      if (fastAnalysis) return fastAnalysis;
    } catch (error) {
      console.warn("[downloader:tiktok] fast analysis failed, falling back to yt-dlp", error);
    }
  }

  const client = await getClient();
  let info: YtDlpInfo;
  try {
    info = await client.getVideoInfo([
      sourceUrl,
      "--no-warnings",
      "--no-playlist",
      ...ytDlpAnalyzeNetworkArgs,
      ...ytDlpProviderArgs(provider),
    ]) as YtDlpInfo;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(`[downloader:${provider}] analyze failed`, error);
    if (provider === "instagram" && message.includes("There is no video in this post")) {
      const shortcode = new URL(sourceUrl).pathname.split("/").filter(Boolean).at(1);
      return {
        provider,
        sourceUrl,
        title: shortcode ? `Instagram post ${shortcode}` : "Instagram post",
        assets: [],
        warnings: [
          "Bài Instagram này là post ảnh không có video. Instagram hiện không trả link ảnh trực tiếp ổn định cho nguồn này; hãy thử Reels/video công khai hoặc carousel có media public.",
        ],
      };
    }
    if (message.includes("Unable to extract")) {
      throw new HttpError(422, `Không thể đọc nội dung từ URL ${providerLabel(provider)} này lúc này. Hãy thử một bài đăng công khai khác.`);
    }
    throw new HttpError(503, `Không thể phân tích URL ${providerLabel(provider)} hiện tại.`);
  }

  const resolvedProvider = detectProvider(info);
  if (!resolvedProvider) {
    throw new HttpError(422, "Không nhận diện được nền tảng từ URL này");
  }
  if (resolvedProvider !== provider) {
    throw new HttpError(400, `URL này thuộc nền tảng ${resolvedProvider}, không phải ${provider}`);
  }

  const summary = buildAssets(provider, info, sourceUrl);
  return {
    provider,
    sourceUrl,
    title: summary.title,
    author: summary.author,
    durationSeconds: summary.durationSeconds,
    thumbnail: summary.thumbnail,
    assets: summary.assets,
    warnings: summary.warnings,
  };
}

function getContentType(extension: string) {
  const ext = extension.replace(/^\./, "").toLowerCase();
  if (ext === "mp4") return "video/mp4";
  if (ext === "mp3") return "audio/mpeg";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "application/octet-stream";
}

async function readPreparedOutput(tempDir: string, preferredName: string, fallbackExtension: string) {
  const files = await readdir(tempDir);
  const picked = files.find((item) => item !== path.basename(activeBinaryPath)) ?? files[0];
  if (!picked) {
    throw new HttpError(503, "Không tạo được file tải xuống");
  }
  const extension = path.extname(picked) || fallbackExtension;
  return {
    filePath: path.join(tempDir, picked),
    fileName: buildFileName(preferredName, extension),
    contentType: getContentType(extension),
  };
}

export async function prepareVideoDownload(params: {
  sourceUrl: string;
  formatId: string;
  title: string;
  extension?: string;
}) {
  const client = await getClient();
  const tempDir = await mkdtemp(path.join(tmpdir(), "scanpdf-video-"));
  try {
    await client.execPromise([
      params.sourceUrl,
      "--no-warnings",
      "--no-playlist",
      ...ytDlpNetworkArgs,
      "-f",
      params.formatId,
      "-o",
      path.join(tempDir, "video.%(ext)s"),
    ]);
    const prepared = await readPreparedOutput(tempDir, params.title, `.${params.extension ?? "mp4"}`);
    return {
      ...prepared,
      cleanup: async () => rm(tempDir, { recursive: true, force: true }),
    } satisfies PreparedDownload;
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw new HttpError(503, `Không thể tải video lúc này: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

export async function prepareAudioDownload(sourceUrl: string, title: string) {
  const client = await getClient();
  const tempDir = await mkdtemp(path.join(tmpdir(), "scanpdf-audio-"));
  try {
    await client.execPromise([
      sourceUrl,
      "--no-warnings",
      "--no-playlist",
      ...ytDlpNetworkArgs,
      "-x",
      "--audio-format",
      "mp3",
      "--audio-quality",
      "0",
      "-o",
      path.join(tempDir, "audio.%(ext)s"),
    ]);
    const prepared = await readPreparedOutput(tempDir, title, ".mp3");
    return {
      ...prepared,
      cleanup: async () => rm(tempDir, { recursive: true, force: true }),
    } satisfies PreparedDownload;
  } catch (error) {
    await rm(tempDir, { recursive: true, force: true });
    throw new HttpError(503, `Không thể tạo MP3 cho URL này: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

export function providerLabel(provider: DownloaderProvider) {
  const labels: Record<DownloaderProvider, string> = {
    tiktok: "TikTok",
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
  };
  return labels[provider];
}
