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

  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef2ff_0%,#f8fbff_42%,#ffffff_100%)] pb-12 pt-8 dark:bg-[linear-gradient(180deg,#0b1120_0%,#0f172a_45%,#111827_100%)] sm:pb-24 sm:pt-16">
      <div className="hero-orb hero-orb-left" />
      <div className="hero-orb hero-orb-right" />
      <div className="container-page relative">
        <div className="mx-auto max-w-6xl overflow-hidden border border-white/70 bg-white/85 shadow-[0_30px_90px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:ring-slate-800 dark:shadow-none sm:rounded-[36px]">
          <div className="grid gap-0 lg:grid-cols-[1.18fr_0.82fr]">
            <div className="p-4 sm:p-10 lg:p-12">
              <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50/90 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-indigo-600 dark:border-indigo-500/40 dark:bg-indigo-500/15 dark:text-indigo-300">
                Downloader
              </span>
              <h1 className="mt-5 max-w-3xl text-3xl font-black tracking-[-0.03em] text-slate-950 min-[380px]:text-4xl sm:text-5xl">{config.title}</h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">{config.description}</p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Bước 1</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">Paste URL công khai</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Bước 2</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">Phân tích định dạng</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:shadow-none">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Bước 3</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">Tải file ngay</p>
                </div>
              </div>

              <div className="glass-panel mt-8 border border-white/80 bg-gradient-to-br from-white via-indigo-50/70 to-sky-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] dark:border-slate-800 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 dark:shadow-none sm:rounded-[28px] sm:p-6">
                <label className="block text-sm font-black text-slate-900">
                  Dán URL công khai
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-w-0 flex-1 items-center gap-3 border border-slate-200 bg-white px-3 py-3 shadow-sm shadow-slate-200/50 dark:border-slate-700 dark:bg-slate-950 dark:shadow-none sm:rounded-2xl sm:px-4">
                      <Link2 size={18} className="shrink-0 text-indigo-600" />
                      <input
                        value={url}
                        onChange={(event) => setUrl(event.target.value)}
                        placeholder={config.placeholder}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!url.trim() || resolve.isPending}
                      onClick={() => resolve.mutate()}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 bg-slate-950 px-6 text-sm font-black text-white shadow-lg shadow-slate-300 transition hover:-translate-y-0.5 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto sm:rounded-2xl"
                    >
                      {resolve.isPending ? <LoaderCircle className="animate-spin" size={18} /> : <Download size={18} />}
                      {resolve.isPending ? "Đang phân tích..." : "Lấy link tải"}
                    </button>
                  </div>
                </label>
                <div className="mt-4 flex flex-wrap gap-2">
                  {config.features.map((item) => (
                    <span key={item} className="rounded-full border border-indigo-100 bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow-sm dark:border-indigo-500/35 dark:bg-slate-950 dark:text-indigo-300 dark:shadow-none">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              {resolve.isError && (
                <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 shadow-sm dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300 dark:shadow-none">
                  {getErrorMessage(resolve.error)}
                </p>
              )}

              {resolve.data && (
                <div className="mt-7 space-y-6">
                  <div className="border border-slate-200 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:rounded-[28px] sm:p-5">
                    <div className="flex flex-col gap-4 sm:flex-row">
                      <div className="relative h-40 w-full overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 sm:h-32 sm:w-48">
                        {resolve.data.thumbnail ? (
                          <Image src={resolve.data.thumbnail} alt={resolve.data.title} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-400">
                            <PlayCircle size={34} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h2 className="line-clamp-2 text-xl font-black text-slate-950">{resolve.data.title}</h2>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                          {resolve.data.author && <span>Tác giả: {resolve.data.author}</span>}
                          {resolve.data.durationSeconds && <span>Thời lượng: {formatDuration(resolve.data.durationSeconds)}</span>}
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300"><CheckCircle2 size={15} /> URL công khai</span>
                        </div>
                        {resolve.data.warnings.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {resolve.data.warnings.map((warning) => (
                              <p key={warning} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-950/45 dark:text-amber-300">
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
                      <div key={kind} className="border border-slate-200 bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950 dark:shadow-none sm:rounded-[28px] sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-lg font-black text-slate-950">{title}</h3>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">{items.length} lựa chọn</span>
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
                                className="flex min-w-0 flex-col gap-3 border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] px-3 py-4 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-sm dark:border-slate-800 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:hover:border-indigo-500/50 dark:hover:shadow-none sm:flex-row sm:items-center sm:justify-between sm:rounded-2xl sm:px-4"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                                    <Icon size={20} />
                                  </span>
                                  <div className="min-w-0">
                                    <p className="font-black text-slate-950">{asset.label}</p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      {[asset.format.toUpperCase(), asset.quality, asset.sizeLabel, asset.width && asset.height ? `${asset.width}x${asset.height}` : undefined]
                                        .filter(Boolean)
                                        .join(" • ")}
                                    </p>
                                  </div>
                                </div>
                                <span className="inline-flex items-center gap-2 text-sm font-black text-indigo-600">
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

            <div className="border-t border-slate-100 bg-[linear-gradient(180deg,#0f172a_0%,#111c34_100%)] p-5 text-white sm:p-10 lg:border-l lg:border-t-0 lg:p-12">
              <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-sky-300">
                Tải nhanh
              </div>
              <h2 className="mt-5 text-3xl font-black tracking-[-0.03em]">Cách dùng</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                Luồng tải được tối ưu cho nhu cầu lấy file nhanh, không cần đăng nhập và không phải qua nhiều bước.
              </p>
              <div className="mt-8 space-y-5">
                {[
                  "Sao chép URL bài đăng, reel, story hoặc video công khai.",
                  "Dán vào ô nhập và bấm lấy link tải.",
                  "Chọn đúng định dạng: video, MP3, ảnh hoặc slideshow.",
                ].map((item, index) => (
                  <div key={item} className="flex gap-4 rounded-2xl border border-white/8 bg-white/5 p-4">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-sm font-black text-slate-950">{index + 1}</span>
                    <p className="text-sm leading-6 text-slate-300">{item}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-3xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-300">Điểm cộng</p>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  <li>Không cần tài khoản để lấy link tải.</li>
                  <li>Dùng trực tiếp từ trình duyệt, chỉ cần paste URL.</li>
                  <li>Tối ưu cho SEO landing page và nhu cầu tải nhanh.</li>
                </ul>
              </div>

              <div className="mt-6 rounded-3xl border border-indigo-400/20 bg-indigo-400/10 p-5">
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
