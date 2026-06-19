"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import {
  AudioLines,
  CheckCircle2,
  Download,
  ImageIcon,
  Link2,
  LoaderCircle,
  PlayCircle,
} from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { API_BASE_URL, api } from "@/services/api";

type Provider = "tiktok" | "facebook" | "instagram" | "youtube";
type AssetKind = "video" | "audio" | "image";

type DownloadAsset = {
  id: string;
  kind: AssetKind;
  label: string;
  format: string;
  quality?: string;
  sizeLabel?: string;
  width?: number;
  height?: number;
  directUrl?: string;
  downloadPath?: string;
};

type DownloadAnalysis = {
  provider: Provider;
  sourceUrl: string;
  title: string;
  author?: string;
  durationSeconds?: number;
  thumbnail?: string;
  assets: DownloadAsset[];
  warnings: string[];
};

type ProviderConfig = {
  id: Provider;
  title: string;
  description: string;
  placeholder: string;
  features: string[];
};

const kindIcon: Record<AssetKind, typeof PlayCircle> = {
  video: PlayCircle,
  audio: AudioLines,
  image: ImageIcon,
};

function formatDuration(value?: number) {
  if (!value) return undefined;
  const minutes = Math.floor(value / 60);
  const seconds = value % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getErrorMessage(error: unknown) {
  return axios.isAxiosError(error)
    ? error.response?.data?.message ?? "Không thể phân tích URL"
    : "Không thể phân tích URL";
}

const simpleDownloaderCopy: Partial<Record<Provider, {
  brandSuffix: string;
  heroTitle: string;
  heroSubtitle: string;
  inputPlaceholder: string;
  articleTitle: string;
  intro: string[];
  guideTitle: string;
  stepOneTitle: string;
  stepOneBody: string;
  stepTwoTitle: string;
  stepTwoBody: string;
  stepTwoUrl: string;
  stepTwoCaption: string;
  stepThreeBody: string;
}>> = {
  tiktok: {
    brandSuffix: "Tik",
    heroTitle: "Tải TikTok Story",
    heroSubtitle: "Download TikTok Story Miễn Phí- Chất Lượng HD - Không Watermark",
    inputPlaceholder: "Nhập link Tiktok story",
    articleTitle: "Tải story Tik Tok đơn giản trên ScanTik",
    intro: [
      "ScanTik cung cấp giải pháp tải story TikTok với công cụ mang tên ScanTik Story. Bạn có thể tải video, ảnh trên mục story của TikTok trên mọi thiết bị iOS, Android, PC.",
      "Công cụ này giúp lưu mọi nội dung TikTok về máy nhanh hơn, rõ ràng hơn và không cần watermark.",
      "Thử TikTok story downloader ngay để lưu giữ những khoảnh khắc, hình ảnh, video trên TikTok Story trước khi chúng biến mất sau 24h.",
    ],
    guideTitle: "Hướng dẫn download stories TikTok bằng đường liên kết",
    stepOneTitle: "Bước 1: Sao chép URL của story trên TikTok",
    stepOneBody: "Truy cập vào ứng dụng TikTok trên điện thoại, tìm đến mục xem story. Trong mỗi story, bạn sẽ tìm thấy nút chia sẻ dưới cùng bên phải. Nhấp vào “Sao chép liên kết” để lưu liên kết story TikTok vào bộ nhớ thiết bị.",
    stepTwoTitle: "Bước 2: Dán liên kết vào ScanTik Story",
    stepTwoBody: "Mở công cụ bằng trình duyệt web, dán liên kết TikTok Story vào thanh công cụ và ấn nút download màu xanh lá.",
    stepTwoUrl: "https://scanpdf.vn/tiktok-downloader",
    stepTwoCaption: "Paste link to ScanTik",
    stepThreeBody: "Sau khi hệ thống phân tích URL, chọn định dạng phù hợp và tải video, ảnh hoặc audio TikTok về máy.",
  },
  instagram: {
    brandSuffix: "Gram",
    heroTitle: "Tải Instagram Reels, Story",
    heroSubtitle: "Download Instagram Reels, Story, Post Ảnh - Chất Lượng HD - Miễn Phí",
    inputPlaceholder: "Nhập link Instagram reels, story hoặc post",
    articleTitle: "Tải Reels, Story Instagram đơn giản trên ScanGram",
    intro: [
      "ScanGram giúp tải nội dung Instagram từ liên kết công khai, bao gồm Reels, Story, post ảnh và carousel.",
      "Bạn chỉ cần sao chép URL Instagram, dán vào ô tải và chọn định dạng hệ thống trả về.",
      "Công cụ hoạt động trực tiếp trên trình duyệt, phù hợp cho iOS, Android và máy tính.",
    ],
    guideTitle: "Hướng dẫn download Instagram bằng đường liên kết",
    stepOneTitle: "Bước 1: Sao chép URL Instagram",
    stepOneBody: "Mở Instagram, chọn Reels, Story hoặc bài viết công khai cần tải. Nhấn chia sẻ và chọn sao chép liên kết để lưu URL vào bộ nhớ thiết bị.",
    stepTwoTitle: "Bước 2: Dán liên kết vào ScanGram",
    stepTwoBody: "Dán liên kết Instagram vào thanh công cụ và nhấn nút Download màu xanh lá để hệ thống phân tích.",
    stepTwoUrl: "https://scanpdf.vn/instagram-downloader",
    stepTwoCaption: "Paste link to ScanGram",
    stepThreeBody: "Chọn file ảnh, video hoặc từng slide carousel phù hợp rồi tải về thiết bị.",
  },
  facebook: {
    brandSuffix: "Face",
    heroTitle: "Tải Facebook Video",
    heroSubtitle: "Download Facebook Reels, Video Công Khai - Chất Lượng HD - Miễn Phí",
    inputPlaceholder: "Nhập link Facebook reels hoặc video",
    articleTitle: "Tải video Facebook đơn giản trên ScanFace",
    intro: [
      "ScanFace hỗ trợ tải Facebook Reels và video công khai bằng một đường liên kết.",
      "Công cụ ưu tiên trả về lựa chọn chất lượng cao khi nguồn video hỗ trợ, giúp tải nhanh và dễ thao tác.",
      "Bạn có thể sử dụng trực tiếp trên điện thoại hoặc máy tính mà không cần cài thêm ứng dụng.",
    ],
    guideTitle: "Hướng dẫn download Facebook video bằng đường liên kết",
    stepOneTitle: "Bước 1: Sao chép URL Facebook",
    stepOneBody: "Mở Facebook, chọn Reels hoặc video công khai cần tải. Nhấn chia sẻ và sao chép liên kết video.",
    stepTwoTitle: "Bước 2: Dán liên kết vào ScanFace",
    stepTwoBody: "Dán liên kết Facebook vào thanh công cụ, sau đó nhấn Download để hệ thống lấy danh sách file tải.",
    stepTwoUrl: "https://scanpdf.vn/facebook-downloader",
    stepTwoCaption: "Paste link to ScanFace",
    stepThreeBody: "Chọn chất lượng video phù hợp và tải file về thiết bị.",
  },
  youtube: {
    brandSuffix: "Tube",
    heroTitle: "Tải YouTube Video",
    heroSubtitle: "Download YouTube MP4, Shorts và MP3 - Chất Lượng HD - Miễn Phí",
    inputPlaceholder: "Nhập link YouTube video, Shorts hoặc youtu.be",
    articleTitle: "Tải video YouTube đơn giản trên ScanTube",
    intro: [
      "ScanTube hỗ trợ tải video YouTube công khai bằng link YouTube đầy đủ, link youtu.be, Shorts hoặc Live đã công khai.",
      "Bạn có thể chọn MP4 theo chất lượng có sẵn hoặc trích xuất MP3 từ video.",
      "Công cụ chạy trực tiếp trên trình duyệt, dễ dùng trên điện thoại và máy tính.",
    ],
    guideTitle: "Hướng dẫn download YouTube bằng đường liên kết",
    stepOneTitle: "Bước 1: Sao chép URL YouTube",
    stepOneBody: "Mở YouTube, chọn video, Shorts hoặc Live công khai cần tải. Nhấn chia sẻ và sao chép liên kết.",
    stepTwoTitle: "Bước 2: Dán liên kết vào ScanTube",
    stepTwoBody: "Dán link YouTube vào thanh công cụ, sau đó nhấn Download để hệ thống phân tích định dạng.",
    stepTwoUrl: "https://scanpdf.vn/youtube-downloader",
    stepTwoCaption: "Paste link to ScanTube",
    stepThreeBody: "Chọn chất lượng MP4 hoặc MP3 phù hợp rồi tải file về thiết bị.",
  },
};

export function MediaDownloader({ config }: { config: ProviderConfig }) {
  const [url, setUrl] = useState("");
  const resolve = useMutation({
    mutationFn: async () => (await api.post<DownloadAnalysis>(`/downloaders/${config.id}/analyze`, { url })).data,
  });

  const groupedAssets = useMemo(() => {
    const assets = resolve.data?.assets ?? [];
    return {
      video: assets.filter((asset) => asset.kind === "video"),
      audio: assets.filter((asset) => asset.kind === "audio"),
      image: assets.filter((asset) => asset.kind === "image"),
    };
  }, [resolve.data?.assets]);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      // Clipboard access depends on browser permission; manual paste still works.
    }
  }

  const simpleCopy = simpleDownloaderCopy[config.id];

  if (simpleCopy) {
    return (
      <main className="min-h-screen bg-[#ffffff] text-[#2a2a2a]">
        <section className="bg-[#10aee8] px-5 py-20 text-center text-white sm:py-24">
          <div className="mx-auto max-w-[980px]">
            <h1 className="text-[34px] font-black leading-tight tracking-normal sm:text-[44px]">
              {simpleCopy.heroTitle}
            </h1>
            <p className="mt-5 text-lg font-medium sm:text-[22px]">
              {simpleCopy.heroSubtitle}
            </p>

            <form
              className="mx-auto mt-9 flex max-w-[760px] flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (url.trim()) resolve.mutate();
              }}
            >
              <div className="flex min-w-0 flex-1 overflow-hidden rounded-[4px] bg-[#ffffff] text-left shadow-sm">
                <input
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder={simpleCopy.inputPlaceholder}
                  className="min-w-0 flex-1 bg-transparent px-4 py-3.5 text-[16px] font-medium text-[#333333] outline-none placeholder:text-[#777777]"
                />
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="m-1 rounded-[4px] bg-[#eef3ff] px-5 text-[14px] font-bold text-[#0f45c6] transition hover:bg-[#dce7ff]"
                >
                  Paste
                </button>
              </div>
              <button
                type="submit"
                disabled={!url.trim() || resolve.isPending}
                className="rounded-[4px] bg-[#f3263e] px-10 py-3.5 text-[17px] font-black text-white transition hover:bg-[#d91f33] disabled:cursor-not-allowed disabled:bg-[#f3263e] disabled:text-white"
              >
                {resolve.isPending ? "Đang tải..." : "Download"}
              </button>
            </form>
            {resolve.isError && (
              <p className="mx-auto mt-5 max-w-[760px] rounded-[4px] bg-white/95 px-4 py-3 text-left text-sm font-semibold text-red-700">
                {getErrorMessage(resolve.error)}
              </p>
            )}
          </div>
        </section>

        {resolve.data && (
          <section className="border-b border-[#eeeeee] bg-[#f7f9fc] px-5 py-8">
            <div className="mx-auto max-w-[960px] rounded-[6px] border border-[#e2e8f0] bg-[#ffffff] p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="relative h-44 w-full overflow-hidden rounded-[4px] bg-[#eef2f7] sm:h-32 sm:w-48">
                  {resolve.data.thumbnail ? (
                    <Image src={resolve.data.thumbnail} alt={resolve.data.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[#8a94a6]">
                      <PlayCircle size={34} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="line-clamp-2 text-xl font-black text-[#252525]">{resolve.data.title}</h2>
                  <p className="mt-2 text-sm text-[#5c5c5c]">
                    {[resolve.data.author ? `Tác giả: ${resolve.data.author}` : undefined, resolve.data.durationSeconds ? `Thời lượng: ${formatDuration(resolve.data.durationSeconds)}` : undefined]
                      .filter(Boolean)
                      .join(" • ")}
                  </p>
                  {resolve.data.warnings.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {resolve.data.warnings.map((warning) => (
                        <p key={warning} className="rounded-[4px] bg-[#fff4e5] px-3 py-2 text-sm font-semibold text-[#9a5a00]">
                          {warning}
                        </p>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {resolve.data.assets.map((asset) => {
                      const href = asset.directUrl ?? `${API_BASE_URL}${asset.downloadPath ?? ""}`;
                      return (
                        <a
                          key={asset.id}
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-[4px] border border-[#d9e2ef] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#10aee8] transition hover:border-[#10aee8] hover:bg-[#f3f7ff]"
                        >
                          <span className="truncate">{asset.label}</span>
                          <span className="shrink-0 rounded-[4px] bg-[#f3263e] px-3 py-1.5 text-white">Tải</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        <article className="mx-auto max-w-[1200px] px-5 py-24 text-[#4b4b4b]">
          <div className="max-w-[980px]">
            <h2 className="text-[28px] font-black tracking-normal text-[#242424]">
              {simpleCopy.articleTitle}
            </h2>
            {simpleCopy.intro.map((paragraph, index) => (
              <p key={paragraph} className={`${index === 0 ? "mt-4" : "mt-3"} text-[17px] leading-8`}>
                {paragraph}
              </p>
            ))}

            <h2 className="mt-10 text-[28px] font-black tracking-normal text-[#242424]">
              {simpleCopy.guideTitle}
            </h2>

            <div className="mt-5 space-y-7 text-[17px] leading-8">
              <section>
                <h3 className="font-black text-[#4a4a4a]">{simpleCopy.stepOneTitle}</h3>
                <p>{simpleCopy.stepOneBody}</p>
                <div className="mx-auto mt-3 flex h-7 max-w-[420px] items-center justify-center text-[#777777]">
                  Sao chép liên kết
                </div>
              </section>

              <section>
                <h3 className="font-black text-[#4a4a4a]">{simpleCopy.stepTwoTitle}</h3>
                <p>{simpleCopy.stepTwoBody}</p>
                <a href={simpleCopy.stepTwoUrl.replace("https://scanpdf.vn", "")} className="text-[#10aee8] underline">
                  {simpleCopy.stepTwoUrl}
                </a>
                <div className="mx-auto mt-3 flex h-7 max-w-[420px] items-center justify-center text-[#777777]">
                  {simpleCopy.stepTwoCaption}
                </div>
              </section>

              <section>
                <h3 className="font-black text-[#4a4a4a]">Bước 3: Tải file về thiết bị</h3>
                <p>{simpleCopy.stepThreeBody}</p>
              </section>
            </div>
          </div>
        </article>
      </main>
    );
  }

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#f3f7fb_0%,#f8faf7_46%,#ffffff_100%)] pb-10 pt-8 dark:bg-[linear-gradient(180deg,#07131a_0%,#101820_48%,#07131a_100%)] sm:pb-18 sm:pt-12">
      <div className="container-page relative">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-lg border border-[#d8ded5] bg-white shadow-[0_24px_80px_rgba(23,32,29,0.10)] dark:border-slate-800 dark:bg-[#101820] dark:shadow-none">
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_390px]">
            <div className="p-5 sm:p-8 lg:p-10">
              <span className="inline-flex rounded-md border border-[#10aee8]/45 bg-[#e8f7fd]/90 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-[#10aee8] dark:border-sky-500/40 dark:bg-[#10aee8]/15 dark:text-sky-300">
                Downloader
              </span>
              <h1 className="mt-5 max-w-3xl font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] min-[380px]:text-4xl sm:text-5xl dark:text-slate-50">{config.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#52615d] sm:text-base dark:text-slate-400">{config.description}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                {["Paste URL công khai", "Phân tích định dạng", "Tải file ngay"].map((step, index) => (
                  <div key={step} className="rounded-lg border border-[#d8ded5] bg-[#f8faf7] px-4 py-4 dark:border-slate-800 dark:bg-slate-950/70">
                    <p className="text-[11px] font-black uppercase tracking-[0.14em] text-[#10aee8]">Bước {index + 1}</p>
                    <p className="mt-2 text-sm font-bold text-[#17201d] dark:text-slate-100">{step}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-lg border border-[#cbd7ce] bg-[#f8faf7] p-4 shadow-inner dark:border-slate-800 dark:bg-slate-950 sm:p-5">
                <label className="block text-sm font-black text-[#17201d] dark:text-slate-100">
                  Dán URL công khai
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#b8c8be] bg-white px-3 py-3 shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-[#101820] dark:shadow-none sm:px-4">
                      <Link2 size={18} className="shrink-0 text-[#10aee8]" />
                      <input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder={config.placeholder}
                        className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none placeholder:text-slate-400"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!url.trim() || resolve.isPending}
                      onClick={() => resolve.mutate()}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#10aee8] px-6 text-sm font-black text-white shadow-lg shadow-sky-100 transition hover:-translate-y-0.5 hover:bg-[#0789c5] disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none sm:w-auto"
                    >
                      {resolve.isPending ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />}
                      {resolve.isPending ? "Đang phân tích..." : "Lấy link tải"}
                    </button>
                  </div>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  {config.features.map((item) => (
                    <span key={item} className="rounded-md border border-[#d8ded5] bg-white px-3 py-1 text-xs font-bold text-[#0789c5] shadow-sm dark:border-sky-500/35 dark:bg-slate-950 dark:text-sky-300 dark:shadow-none">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {resolve.isError && (
                <p className="mt-5 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300 dark:shadow-none">
                  {getErrorMessage(resolve.error)}
                </p>
              )}

              {resolve.data && (
                <div className="mt-7 space-y-6">
                  <div className="rounded-lg border border-[#d8ded5] bg-white p-4 shadow-[0_20px_50px_rgba(23,32,29,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="relative h-40 w-full overflow-hidden rounded-lg bg-slate-100 dark:bg-slate-800 sm:h-32 sm:w-48">
                        {resolve.data.thumbnail ? (
                          <Image src={resolve.data.thumbnail} alt={resolve.data.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <PlayCircle size={34} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-xl font-black text-[#17201d] dark:text-slate-50">{resolve.data.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                          {resolve.data.author && <span>Tác giả: {resolve.data.author}</span>}
                          {resolve.data.durationSeconds && <span>Thời lượng: {formatDuration(resolve.data.durationSeconds)}</span>}
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300"><CheckCircle2 size={15} /> URL công khai</span>
                        </div>
                        {resolve.data.warnings.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {resolve.data.warnings.map((warning) => (
                              <p key={warning} className="rounded-md bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/45 dark:text-amber-300">
                                {warning}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {([
                    ["video", "Video tải xuống"],
                    ["audio", "Audio / MP3"],
                    ["image", "Ảnh / Slide"],
                  ] as const).map(([kind, title]) => {
                    const items = groupedAssets[kind];
                    if (!items.length) return null;
                    return (
                      <div key={kind} className="rounded-lg border border-[#d8ded5] bg-white p-4 shadow-[0_18px_45px_rgba(23,32,29,0.05)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-black text-[#17201d] dark:text-slate-50">{title}</h3>
                          <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length} lựa chọn</span>
                        </div>
                        <div className="mt-4 grid gap-3">
                          {items.map((asset) => {
                            const Icon = kindIcon[asset.kind];
                            const href = asset.directUrl ?? `${API_BASE_URL}${asset.downloadPath ?? ""}`;
                            return (
                              <a
                                key={asset.id}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="flex min-w-0 flex-col gap-3 rounded-lg border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-4 transition hover:-translate-y-0.5 hover:border-[#10aee8]/45 hover:shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:hover:border-sky-500/50 dark:hover:shadow-none sm:flex-row sm:items-center sm:justify-between sm:px-4"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#dff4fc] text-[#10aee8] dark:bg-[#10aee8]/15 dark:text-sky-300">
                                    <Icon size={20} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-black text-[#17201d] dark:text-slate-50">{asset.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {[asset.format.toUpperCase(), asset.quality, asset.sizeLabel, asset.width && asset.height ? `${asset.width}x${asset.height}` : undefined]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-2 text-sm font-black text-[#10aee8]">
                                  <Download size={16} /> Tải ngay
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-[#1f3b4d] bg-[#17201d] p-5 text-white sm:p-8 lg:border-l lg:border-t-0 lg:p-10">
              <div className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-sky-200">
                Tải nhanh
              </div>
              <h2 className="mt-5 font-[var(--font-display)] text-3xl font-black tracking-normal">Cách dùng</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Luồng tải được tối ưu cho nhu cầu lấy file nhanh, không cần đăng nhập và không phải qua nhiều bước.
              </p>
              <div className="mt-8 space-y-3">
                {[
                  "Sao chép URL bài đăng, reel, story hoặc video công khai.",
                  "Dán vào ô nhập và bấm lấy link tải.",
                  "Chọn đúng định dạng: video, MP3, ảnh hoặc slideshow.",
                ].map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-lg border border-white/8 bg-white/5 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-sm font-black text-[#17201d]">{index + 1}</span>
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 rounded-lg border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-200">Điểm cộng</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li>Không cần tài khoản để lấy link tải.</li>
                  <li>Dùng trực tiếp từ trình duyệt, chỉ cần paste URL.</li>
                  <li>Tối ưu cho SEO landing page và nhu cầu tải nhanh.</li>
                </ul>
              </div>

              <div className="mt-6 rounded-lg border border-[#10aee8]/20 bg-sky-500/10 p-5">
                <p className="text-sm font-black text-white">Phù hợp để tải nhanh từng file</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Nếu URL hợp lệ, hệ thống sẽ tự trả ra danh sách định dạng phù hợp để chọn và tải ngay.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
