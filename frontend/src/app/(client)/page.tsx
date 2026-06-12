"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronUp,
  Cloud,
  Download,
  Droplet,
  Edit3,
  Eraser,
  FileImage,
  FileText,
  Film,
  FileVideo,
  Files,
  FolderOpen,
  Globe2,
  Hash,
  ImageDown,
  LockKeyhole,
  LockKeyholeOpen,
  PenLine,
  PlaySquare,
  RotateCw,
  ScanText,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  WandSparkles,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPlanPrice, isFreePlan, isRecommendedPlan, planDescription, planFeatures, type Plan, sortPlans } from "@/lib/plans";
import { api } from "@/services/api";

const popularTools = [
  {
    name: "TikTok Downloader",
    description: "Tải video TikTok không watermark, MP3, ảnh và slideshow từ URL công khai.",
    href: "/tiktok-downloader",
    icon: PlaySquare,
  },
  {
    name: "Instagram Downloader",
    description: "Tải Reels, Story, post ảnh và carousel Instagram chỉ bằng một link.",
    href: "/instagram-downloader",
    icon: ImageDown,
  },
  {
    name: "AI Remove Watermark Ảnh",
    description: "Xóa logo, chữ đè và watermark khỏi ảnh, đồng thời fill lại nền tự nhiên.",
    href: "/remove-watermark-image",
    icon: Eraser,
  },
  {
    name: "Nén PDF",
    description: "Giảm dung lượng tệp mà vẫn giữ nguyên chất lượng hiển thị tốt nhất.",
    href: "/tools/compress-pdf",
    icon: SlidersHorizontal,
  },
  {
    name: "Ghép PDF",
    description: "Kết hợp nhiều tài liệu vào một tệp PDF duy nhất một cách nhanh chóng.",
    href: "/tools/merge-pdf",
    icon: Scissors,
  },
  {
    name: "PDF sang Word",
    description: "Chuyển đổi tệp PDF sang tài liệu Word có thể chỉnh sửa với độ chính xác cao.",
    href: "/tools/pdf-to-word",
    icon: FileText,
  },
  {
    name: "Chỉnh sửa PDF",
    description: "Thêm văn bản, hình ảnh và ghi chú trực tiếp vào tệp PDF của bạn.",
    href: "/tools/watermark-pdf",
    icon: PenLine,
  },
];

const allTools = [
  ["TikTok Downloader", "Tải video TikTok không watermark, MP3, ảnh và slideshow.", "/tiktok-downloader", PlaySquare],
  ["Facebook Downloader", "Tải Reels và video Facebook công khai chất lượng cao.", "/facebook-downloader", PlaySquare],
  ["Instagram Downloader", "Tải Reels, Story, post ảnh và carousel Instagram.", "/instagram-downloader", ImageDown],
  ["YouTube Downloader", "Tải video MP4 và MP3 từ YouTube.", "/youtube-downloader", PlaySquare],
  ["AI Remove Watermark Ảnh", "Xóa logo, chữ đè và watermark khỏi ảnh.", "/remove-watermark-image", Eraser],
  ["Remove Watermark Video", "Xử lý watermark TikTok, logo góc và subtitle cứng.", "/remove-watermark-video", Film],
  ["Video Compress", "Nén video để giảm dung lượng file tải lên hoặc chia sẻ.", "/tools/video-compress", Archive],
  ["Video Convert", "Đổi MOV, AVI, MKV sang MP4.", "/tools/video-convert", FileVideo],
  ["Video To GIF", "Chuyển video thành GIF để chia sẻ nhanh.", "/tools/video-to-gif", FileImage],
  ["Extract Audio", "Trích xuất âm thanh từ video sang MP3.", "/tools/extract-audio", FileText],
  ["Video Merge", "Ghép nhiều video thành một file MP4.", "/tools/video-merge", Files],
  ["Video Trim", "Cắt đoạn video theo mốc thời gian.", "/tools/video-trim", Scissors],
  ["Auto Subtitle", "Tạo subtitle SRT tự động và dịch sang EN hoặc VI.", "/tools/auto-subtitle-video", FileText],
  ["AI Summary Video", "Tạo transcript và tóm tắt nội dung video.", "/tools/video-summary", WandSparkles],
  ["Generate Shorts", "AI chọn highlight và xuất shorts từ video dài.", "/tools/generate-shorts", Film],
  ["Nén PDF", "Giảm dung lượng PDF để chia sẻ nhanh hơn.", "/tools/compress-pdf", SlidersHorizontal],
  ["Ghép PDF", "Kết hợp nhiều file PDF thành một tài liệu.", "/tools/merge-pdf", Scissors],
  ["PDF sang Word", "Chuyển PDF thành Word có thể chỉnh sửa.", "/tools/pdf-to-word", FileText],
  ["Word sang PDF", "Giữ bố cục Word khi xuất sang PDF.", "/tools/word-to-pdf", FileText],
  ["Batch convert", "Xử lý nhiều file trong cùng một lần tải lên.", "/tools/batch-convert", UploadCloud],
  ["JPG sang PDF", "Gộp ảnh JPG/PNG thành tài liệu PDF.", "/tools/jpg-to-pdf", FileImage],
  ["PDF sang JPG", "Xuất từng trang PDF thành ảnh JPG.", "/tools/pdf-to-jpg", FileImage],
  ["OCR PDF", "Nhận dạng chữ trong PDF scan.", "/tools/ocr-pdf", ScanText],
  ["Tách PDF", "Tách trang PDF thành file riêng.", "/tools/split-pdf", Scissors],
  ["Xoay PDF", "Xoay trang PDF theo góc bạn chọn.", "/tools/rotate-pdf", RotateCw],
  ["Xóa trang", "Loại bỏ các trang không cần thiết.", "/tools/delete-pdf-pages", FileText],
  ["Watermark", "Thêm chữ mờ bảo vệ tài liệu.", "/tools/watermark-pdf", Droplet],
  ["Sắp xếp trang", "Đổi thứ tự các trang trong PDF.", "/tools/reorder-pdf", FileText],
  ["Đánh số trang", "Thêm số trang tự động.", "/tools/add-page-numbers", Hash],
  ["Khóa PDF", "Bảo vệ PDF bằng mật khẩu.", "/tools/protect-pdf", LockKeyhole],
  ["Mở khóa PDF", "Gỡ mật khẩu khi bạn có quyền.", "/tools/unlock-pdf", LockKeyholeOpen],
  ["Ký PDF", "Thêm chữ ký trực quan vào tài liệu.", "/tools/sign-pdf", PenLine],
  ["Chat PDF AI", "Hỏi đáp theo nội dung tài liệu.", "/ai/chat-pdf", Bot],
  ["Tóm tắt PDF", "Tạo bản tóm tắt nhanh bằng AI.", "/ai/summarize-pdf", Sparkles],
  ["Trích xuất PDF", "Lấy thông tin quan trọng từ PDF.", "/ai/extract-pdf", FileText],
] as const;

const aiFeatures = [
  {
    title: "Chat với PDF",
    description: "Đặt bất kỳ câu hỏi nào về nội dung trong tài liệu và nhận câu trả lời ngay lập tức.",
  },
  {
    title: "Tóm tắt văn bản",
    description: "Tự động tạo bản tóm tắt các điểm chính cho tài liệu dài, báo cáo hoặc hợp đồng.",
  },
  {
    title: "Trích xuất dữ liệu thông minh",
    description: "Tự động nhận diện và xuất bảng biểu, thông số kỹ thuật ra tệp Excel.",
  },
];

export default function HomePage() {
  const [showAllTools, setShowAllTools] = useState(false);
  const plans = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => (await api.get("/plans")).data,
  });
  const displayedTools = showAllTools
    ? allTools
    : popularTools.map(({ name, description, href, icon }) => [name, description, href, icon] as const);

  return (
    <>
      <section className="relative overflow-hidden bg-[linear-gradient(180deg,#eef2ff_0%,#f8fbff_45%,#ffffff_100%)] pb-14 pt-10 text-center dark:bg-[linear-gradient(180deg,#0b1120_0%,#0f172a_45%,#111827_100%)] sm:pb-28 sm:pt-24">
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/20 blur-3xl dark:bg-indigo-500/10" />
        <div className="container-page relative">
          <span className="glass-panel inline-flex items-center gap-2 rounded-full border border-white/80 px-4 py-2 text-xs font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100/70 dark:border-slate-700 dark:text-indigo-300 dark:ring-slate-700">
            <Sparkles size={14} /> Mới: Trò chuyện với tài liệu PDF bằng AI
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl text-4xl font-black leading-[1.08] tracking-[-0.025em] text-slate-950 min-[390px]:text-5xl sm:mt-8 sm:text-6xl lg:text-7xl">
            Xử lý PDF thông minh với{" "}
            <span className="text-indigo-600">tốc độ vượt trội</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Công cụ PDF tất cả trong một dành cho doanh nghiệp và cá nhân. Nhanh chóng,
            bảo mật và được hỗ trợ bởi trí tuệ nhân tạo.
          </p>

          <div className="mx-auto mt-8 max-w-3xl border-2 border-dashed border-indigo-300 bg-white/55 p-3 shadow-[0_22px_70px_rgba(91,92,240,0.12)] backdrop-blur dark:border-indigo-500/45 dark:bg-slate-900/70 sm:mt-11 sm:rounded-[28px] sm:p-8">
            <div className="bg-[#f0f1ff] px-4 py-8 dark:bg-slate-800 sm:rounded-[22px] sm:px-6 sm:py-12">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                <UploadCloud size={28} />
              </span>
              <h2 className="mt-7 text-xl font-black text-slate-950">Tải tệp PDF lên tại đây</h2>
              <p className="mt-2 text-sm text-slate-500">hoặc kéo và thả tài liệu vào vùng này</p>
              <Link href="/tools/word-to-pdf" className="mt-6 inline-flex w-full items-center justify-center bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 dark:shadow-none sm:w-auto sm:rounded-lg sm:px-7">
                Chọn tệp từ thiết bị
              </Link>
              <div className="mt-5 flex items-center justify-center gap-4 text-slate-500">
                <Cloud size={17} />
                <Globe2 size={17} />
                <FolderOpen size={17} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tools" className="bg-white py-12 dark:bg-slate-950 sm:py-20">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Công cụ phổ biến</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.015em] text-slate-950 sm:text-4xl">
                Giải quyết mọi vấn đề về PDF
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAllTools((current) => !current)}
              className="inline-flex items-center gap-2 text-sm font-black text-indigo-600 transition hover:text-indigo-700"
            >
              {showAllTools ? "Thu gọn" : "Xem tất cả công cụ"}
              {showAllTools ? <ChevronUp size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>

          <div id="all-tools" className="mt-7 grid gap-4 sm:mt-9 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {displayedTools.map(([name, description, href, Icon]) => (
              <Link key={href} href={href} className="group border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] dark:hover:border-indigo-500/60 dark:hover:shadow-none sm:rounded-[26px] sm:p-7">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                  <Icon size={20} />
                </span>
                <h3 className="mt-5 text-lg font-black text-slate-950 sm:mt-7 sm:text-xl">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500 sm:min-h-20">{description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-indigo-600">
                  Bắt đầu <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
          {showAllTools && (
            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => setShowAllTools(false)}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-indigo-500 dark:hover:text-indigo-300"
              >
                Thu gọn <ChevronUp size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f4f6ff] py-12 dark:bg-slate-950 sm:py-24">
        <div className="container-page grid items-center gap-10 sm:gap-14 lg:grid-cols-2">
          <div className="relative">
            <div className="overflow-hidden rounded-[30px] bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <Image
                src="/scanpdf-logo.png"
                alt="AI PDF ScanPDF"
                width={760}
                height={680}
                className="aspect-[1.1] w-full object-contain p-7 opacity-90 sm:p-12"
              />
            </div>
            <div className="absolute -bottom-6 right-3 rounded-[20px] bg-white p-4 shadow-[0_18px_45px_rgba(15,23,42,0.16)] dark:bg-slate-900 dark:shadow-none sm:-bottom-8 sm:right-10 sm:rounded-[24px] sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Zap size={17} />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">AI Summarizer</p>
                  <div className="mt-2 h-2 w-28 rounded-full bg-indigo-100">
                    <div className="h-2 w-20 rounded-full bg-indigo-600" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
              AI PDF Assistant
            </span>
            <h2 className="mt-5 max-w-xl text-3xl font-black leading-tight tracking-[-0.018em] text-slate-950 sm:text-4xl">
              Làm việc thông minh hơn với trợ lý AI tích hợp
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-500">
              Đừng chỉ đọc PDF, hãy trò chuyện với chúng. AI của chúng tôi giúp bạn trích xuất
              thông tin quan trọng chỉ trong vài giây từ hàng trăm trang tài liệu.
            </p>
            <div className="mt-8 space-y-5">
              {aiFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <div>
                    <h3 className="font-black text-slate-950">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/ai/chat-pdf" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
              <Bot size={17} /> Thử nghiệm AI ngay
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#eef3ff] py-12 dark:bg-slate-900 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black tracking-[-0.018em] text-slate-950 sm:text-4xl">Gói dịch vụ linh hoạt</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Chọn gói phù hợp với nhu cầu của bạn, từ sử dụng cá nhân đến các giải pháp doanh nghiệp quy mô lớn.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {sortPlans(plans.data ?? []).map((plan) => {
              const recommended = isRecommendedPlan(plan);
              const free = isFreePlan(plan);
              return (
                <article
                  key={plan.id}
                  className={`relative border bg-white p-6 dark:bg-slate-950 sm:rounded-2xl sm:p-8 ${
                    recommended
                      ? "border-indigo-600 shadow-[0_22px_60px_rgba(91,92,240,0.2)] dark:shadow-none"
                      : "border-slate-200 dark:border-slate-800"
                  }`}
                >
                  {recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      Khuyên dùng
                    </span>
                  )}
                  <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{planDescription(plan)}</p>
                  <p className="mt-8 text-3xl font-black tracking-[-0.018em] text-slate-950 sm:text-4xl">
                    {formatPlanPrice(plan.price)}
                    <span className="text-sm font-medium text-slate-500">/tháng</span>
                  </p>
                  <ul className="mt-8 space-y-4">
                    {planFeatures(plan).map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-indigo-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={free ? "/register" : "/pricing"}
                    className={recommended
                      ? "mt-9 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                      : "mt-9 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                    }
                  >
                    {free ? "Bắt đầu miễn phí" : recommended ? "Nâng cấp ngay" : "Xem chi tiết"}
                  </Link>
                </article>
              );
            })}
          </div>
          {plans.isLoading && (
            <div className="mt-12 grid gap-6 lg:grid-cols-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-[430px] animate-pulse rounded-2xl bg-white/70 dark:bg-slate-800" />)}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-10 sm:py-14">
        <div className="container-page grid gap-4 border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:gap-6 sm:rounded-[28px] sm:p-7">
          {[
            [ShieldCheck, "Bảo mật SSL 256-bit"],
            [Download, "Tải kết quả nhanh"],
            [Edit3, "Công cụ dễ sử dụng"],
          ].map(([Icon, label]) => (
            <div key={label as string} className="flex items-center justify-center gap-3 text-sm font-black text-slate-700">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Icon size={18} />
              </span>
              {label as string}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
