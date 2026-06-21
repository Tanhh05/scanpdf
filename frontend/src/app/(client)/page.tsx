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
      <section className="relative overflow-hidden border-b border-[#d8ded5] bg-[linear-gradient(180deg,#f6f7f4_0%,#f3f7fb_100%)] pb-12 pt-10 dark:border-slate-800 dark:bg-[linear-gradient(180deg,#07131a_0%,#101820_100%)] sm:pb-20 sm:pt-18">
        <div className="container-page relative grid items-center gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(520px,1.05fr)]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-md border border-[#b8c8be] bg-white/80 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-[#10aee8] shadow-sm dark:border-slate-700 dark:bg-slate-900/70 dark:text-sky-300">
              <Sparkles size={14} /> AI PDF Operations
            </span>
            <h1 className="mt-6 max-w-3xl font-[var(--font-display)] text-4xl font-black leading-[1.04] tracking-normal text-[#17201d] min-[390px]:text-5xl sm:text-6xl">
              Bộ công cụ tài liệu cho đội ngũ vận hành hiện đại
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#52615d] dark:text-slate-300">
              ScanPDF gom chuyển đổi PDF, tải media, AI trích xuất và quản trị tài khoản vào một workspace nhanh, rõ ràng và phù hợp quy trình doanh nghiệp.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/tools/word-to-pdf" className="btn-primary">
                <UploadCloud size={17} /> Bắt đầu xử lý tài liệu
              </Link>
              <Link href="/pricing" className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#b8c8be] bg-white px-5 py-3 text-sm font-black text-[#17201d] shadow-sm transition hover:border-[#10aee8] hover:bg-[#f2fbff] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:border-sky-500">
                Xem gói doanh nghiệp <ArrowRight size={16} />
              </Link>
            </div>

            <div className="mt-8 grid max-w-xl grid-cols-3 divide-x divide-[#d8ded5] rounded-lg border border-[#d8ded5] bg-white/75 text-center shadow-sm dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900/70">
              {[
                ["35+", "Công cụ"],
                ["AI", "PDF & video"],
                ["SSL", "Bảo mật"],
              ].map(([value, label]) => (
                <div key={label} className="px-3 py-4">
                  <strong className="block text-xl font-black text-[#17201d] dark:text-slate-50">{value}</strong>
                  <span className="mt-1 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#cbd7ce] bg-[#17201d] p-3 shadow-[0_24px_70px_rgba(23,32,29,0.22)] dark:border-slate-700">
            <div className="rounded-md bg-[#f8faf7] dark:bg-[#101820]">
              <div className="flex items-center justify-between border-b border-[#d8ded5] px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-[#10aee8] dark:text-sky-300">Live workspace</p>
                  <h2 className="mt-1 text-lg font-black text-[#17201d] dark:text-slate-50">Tài liệu đang xử lý</h2>
                </div>
                <span className="rounded-md bg-[#dff4fc] px-3 py-1 text-xs font-black text-[#10aee8] dark:bg-sky-500/15 dark:text-sky-300">Online</span>
              </div>
              <div className="grid gap-3 p-4 sm:grid-cols-[1fr_0.8fr]">
                <div className="space-y-3">
                  {[
                    ["Hợp đồng NCC.pdf", "OCR + tóm tắt", 82],
                    ["Báo cáo Q2.docx", "Word sang PDF", 64],
                    ["video-demo.mov", "Nén video", 39],
                  ].map(([name, action, progress]) => (
                    <div key={name as string} className="rounded-md border border-[#d8ded5] bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-[#17201d] dark:text-slate-50">{name}</p>
                          <p className="mt-1 text-xs text-slate-500">{action}</p>
                        </div>
                        <FileText className="shrink-0 text-[#10aee8]" size={19} />
                      </div>
                      <div className="mt-4 h-2 rounded-full bg-[#f3f7fb] dark:bg-slate-800">
                        <div className="h-full rounded-full bg-[#10aee8]" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="rounded-md border border-[#d8ded5] bg-[#eef8fd] p-4 dark:border-slate-800 dark:bg-slate-950">
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">AI insight</p>
                  <div className="mt-5 space-y-4">
                    {aiFeatures.map((feature) => (
                      <div key={feature.title} className="border-l-2 border-[#10aee8] pl-3">
                        <h3 className="text-sm font-black text-[#17201d] dark:text-slate-50">{feature.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{feature.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tools" className="bg-white py-12 dark:bg-[#07131a] sm:py-20">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#10aee8]">Công cụ phổ biến</p>
              <h2 className="mt-2 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">
                Một workspace cho toàn bộ vòng đời tài liệu
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowAllTools((current) => !current)}
              className="inline-flex items-center gap-2 text-sm font-black text-[#10aee8] transition hover:text-[#0789c5] dark:text-sky-300"
            >
              {showAllTools ? "Thu gọn" : "Xem tất cả công cụ"}
              {showAllTools ? <ChevronUp size={16} /> : <ArrowRight size={16} />}
            </button>
          </div>

          <div id="all-tools" className="mt-7 grid gap-4 sm:mt-9 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
            {displayedTools.map(([name, description, href, Icon]) => (
              <Link key={href} href={href} className="group rounded-lg border border-[#d8ded5] bg-[linear-gradient(180deg,#ffffff_0%,#f8faf7_100%)] p-5 shadow-sm transition hover:-translate-y-1 hover:border-[#10aee8]/45 hover:shadow-[0_18px_45px_rgba(23,32,29,0.08)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,#101820_0%,#07131a_100%)] dark:hover:border-sky-500/60 dark:hover:shadow-none sm:p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-[#e8f7fd] text-[#10aee8] dark:bg-sky-500/15 dark:text-sky-300">
                  <Icon size={20} />
                </span>
                <h3 className="mt-5 text-lg font-black text-[#17201d] dark:text-slate-50 sm:text-xl">{name}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-500 sm:min-h-20">{description}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-xs font-black uppercase tracking-wide text-[#10aee8] dark:text-sky-300">
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
              className="inline-flex items-center gap-2 rounded-lg border border-[#d8ded5] bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-[#10aee8]/45 hover:text-[#10aee8] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-500 dark:hover:text-sky-300"
              >
                Thu gọn <ChevronUp size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f3f7fb] py-12 dark:bg-[#101820] sm:py-24">
        <div className="container-page grid items-center gap-10 sm:gap-14 lg:grid-cols-2">
          <div className="relative">
            <div className="overflow-hidden rounded-lg border border-[#1f3b4d] bg-[#17201d] shadow-[0_24px_80px_rgba(23,32,29,0.18)]">
              <Image
                src="/scanpdf-logo.png"
                alt="AI PDF ScanPDF"
                width={760}
                height={680}
                className="aspect-[1.1] w-full object-contain p-7 opacity-90 sm:p-12"
              />
            </div>
            <div className="absolute -bottom-6 right-3 rounded-lg bg-white p-4 shadow-[0_18px_45px_rgba(23,32,29,0.16)] dark:bg-slate-900 dark:shadow-none sm:-bottom-8 sm:right-10 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-[#10aee8] text-white">
                  <Zap size={17} />
                </span>
                <div>
                  <p className="text-sm font-black text-[#17201d] dark:text-slate-50">AI Summarizer</p>
                  <div className="mt-2 h-2 w-28 rounded-full bg-[#e8f7fd]">
                    <div className="h-2 w-20 rounded-full bg-[#10aee8]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <span className="rounded-md bg-[#dff4fc] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#10aee8] dark:bg-sky-500/15 dark:text-sky-300">
              AI PDF Assistant
            </span>
            <h2 className="mt-5 max-w-xl font-[var(--font-display)] text-3xl font-black leading-tight tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">
              Làm việc thông minh hơn với trợ lý AI tích hợp
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-slate-500">
              Đừng chỉ đọc PDF, hãy trò chuyện với chúng. AI của chúng tôi giúp bạn trích xuất
              thông tin quan trọng chỉ trong vài giây từ hàng trăm trang tài liệu.
            </p>
            <div className="mt-8 space-y-5">
              {aiFeatures.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#dff4fc] text-[#10aee8]">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  <div>
                    <h3 className="font-black text-[#17201d] dark:text-slate-50">{feature.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/ai/chat-pdf" className="btn-primary mt-8">
              <Bot size={17} /> Thử nghiệm AI ngay
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#f8faf7] py-12 dark:bg-slate-900 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">Gói dịch vụ linh hoạt</h2>
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
                  className={`relative rounded-lg border bg-white p-6 dark:bg-slate-950 sm:p-8 ${
                    recommended
                      ? "border-[#10aee8] shadow-[0_22px_60px_rgba(16,174,232,0.16)] dark:shadow-none"
                      : "border-[#d8ded5] dark:border-slate-800"
                  }`}
                >
                  {recommended && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-md bg-[#10aee8] px-4 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                      Khuyên dùng
                    </span>
                  )}
                  <h3 className="text-xl font-black text-[#17201d] dark:text-slate-50">{plan.name}</h3>
                  <p className="mt-2 text-sm text-slate-500">{planDescription(plan)}</p>
                  <p className="mt-8 text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">
                    {formatPlanPrice(plan.price)}
                    <span className="text-sm font-medium text-slate-500">/tháng</span>
                  </p>
                  <ul className="mt-8 space-y-4">
                    {planFeatures(plan).map((feature) => (
                      <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                        <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-[#10aee8]" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={free ? "/register" : "/pricing"}
                    className={recommended
                      ? "mt-9 inline-flex w-full items-center justify-center rounded-lg bg-[#10aee8] px-5 py-3 text-sm font-black text-white transition hover:bg-[#0789c5]"
                      : "mt-9 inline-flex w-full items-center justify-center rounded-lg border border-[#b8c8be] px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-[#f2fbff] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
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
              {[0, 1, 2].map((item) => <div key={item} className="h-[430px] animate-pulse rounded-lg bg-white/70 dark:bg-slate-800" />)}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-10 dark:bg-[#07131a] sm:py-14">
        <div className="container-page grid gap-4 rounded-lg border border-[#d8ded5] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-3 sm:gap-6 sm:p-7">
          {[
            [ShieldCheck, "Bảo mật SSL 256-bit"],
            [Download, "Tải kết quả nhanh"],
            [Edit3, "Công cụ dễ sử dụng"],
          ].map(([Icon, label]) => (
            <div key={label as string} className="flex w-full items-center justify-start gap-3 text-sm font-black text-slate-700 dark:text-slate-200 sm:justify-center">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#dff4fc] text-[#10aee8] dark:bg-sky-500/15 dark:text-sky-300">
                <Icon size={18} />
              </span>
              <span className="min-w-0">{label as string}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
