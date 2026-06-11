import { access, chmod, mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
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

const binaryPath = process.env.YT_DLP_PATH
  ? path.resolve(process.env.YT_DLP_PATH)
  : path.resolve(process.cwd(), ".cache", "bin", process.platform === "win32" ? "yt-dlp.exe" : "yt-dlp");
let binaryReady: Promise<string> | null = null;
type YtDlpClient = {
  getVideoInfo(args: string[]): Promise<YtDlpInfo>;
  execStream(args: string[]): NodeJS.ReadableStream;
  execPromise(args: string[]): Promise<string>;
};
type YtDlpRuntime = {
  new(binaryPath?: string): YtDlpClient;
  downloadFromGithub(filePath?: string, version?: string, platform?: NodeJS.Platform): Promise<void>;
};
let ytDlpWrapClassPromise: Promise<YtDlpRuntime> | null = null;

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
  try {
    const parsed = new URL(sourceUrl);
    pathname = parsed.pathname.toLowerCase();
    hostname = parsed.hostname.toLowerCase();
  } catch {
    throw new HttpError(400, "URL không hợp lệ");
  }

  const matchers: Record<DownloaderProvider, { ok: boolean; message: string }> = {
    tiktok: {
      ok: pathname.includes("/video/") || pathname.includes("/photo/"),
      message: "Hãy dán URL video hoặc slideshow TikTok cụ thể, không dùng URL hồ sơ.",
    },
    facebook: {
      ok: pathname.includes("/reel/") || pathname.includes("/watch/") || pathname.includes("/videos/"),
      message: "Hãy dán URL reel hoặc video Facebook công khai cụ thể.",
    },
    instagram: {
      ok: pathname.includes("/reel/") || pathname.includes("/p/") || pathname.includes("/stories/"),
      message: "Hãy dán URL reel, post, carousel hoặc story Instagram cụ thể.",
    },
    youtube: {
      ok: hostname === "youtu.be" || pathname === "/watch" || pathname.includes("/shorts/") || pathname.includes("/live/"),
      message: "Hãy dán URL video hoặc Shorts YouTube cụ thể.",
    },
  };

  if (!matchers[provider].ok) {
    throw new HttpError(400, matchers[provider].message);
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

async function ensureBinaryPath() {
  if (!binaryReady) {
    binaryReady = (async () => {
      try {
        await access(binaryPath);
      } catch (error) {
        if (process.env.YT_DLP_PATH) {
          throw new Error(`Không tìm thấy yt-dlp tại ${binaryPath}`, { cause: error });
        }
        const YTDlpWrap = await loadYtDlpWrap();
        await mkdir(path.dirname(binaryPath), { recursive: true });
        await YTDlpWrap.downloadFromGithub(binaryPath);
      }
      await chmod(binaryPath, 0o755);
      return binaryPath;
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
  assertSupportedSourceUrl(provider, sourceUrl);
  const client = await getClient();
  let info: YtDlpInfo;
  try {
    info = await client.getVideoInfo([
      sourceUrl,
      "--no-warnings",
      "--no-playlist",
    ]) as YtDlpInfo;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(`[downloader:${provider}] analyze failed`, error);
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
  const picked = files.find((item) => item !== path.basename(binaryPath)) ?? files[0];
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
