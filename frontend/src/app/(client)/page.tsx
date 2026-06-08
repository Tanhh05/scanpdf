"use client";

import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronUp,
  Cloud,
  Download,
  Droplet,
  Edit3,
  FileImage,
  FileText,
  FolderOpen,
  Globe2,
  Hash,
  LockKeyhole,
  LockKeyholeOpen,
  PenLine,
  RotateCw,
  ScanText,
  Scissors,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UploadCloud,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

const popularTools = [
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

const plans = [
  {
    name: "Miễn phí",
    description: "Dành cho cá nhân dùng thỉnh thoảng.",
    price: "0đ",
    features: ["Tối đa 5 tệp/ngày", "Nén & Ghép cơ bản", "Kích thước tệp tới 10MB"],
    href: "/register",
  },
  {
    name: "Pro",
    description: "Tăng tốc công việc của bạn.",
    price: "10.000đ",
    recommended: true,
    features: ["Không giới hạn số lượng tệp", "500 yêu cầu AI mỗi tháng", "OCR nhận diện chữ viết tay", "Ưu tiên xử lý nhanh nhất"],
    href: "/pricing",
  },
  {
    name: "Doanh nghiệp",
    description: "Giải pháp bảo mật cao cấp.",
    price: "Liên hệ",
    features: ["Quản lý tập trung đội ngũ", "Tích hợp API tùy chỉnh", "Bảo mật chuẩn ngân hàng", "Hỗ trợ 24/7 riêng biệt"],
    href: "/pricing",
  },
];

export default function HomePage() {
  const [showAllTools, setShowAllTools] = useState(false);
  const displayedTools = showAllTools
    ? allTools
    : popularTools.map(({ name, description, href, icon }) => [name, description, href, icon] as const);

  return (
    <>
      <section className="relative overflow-hidden bg-[#f4f6ff] pb-24 pt-16 text-center sm:pb-28 sm:pt-24">
        <div className="absolute left-1/2 top-0 h-[520px] w-[760px] -translate-x-1/2 rounded-full bg-indigo-200/30 blur-3xl" />
        <div className="container-page relative">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-black text-indigo-600 shadow-sm ring-1 ring-indigo-100">
            <Sparkles size={14} /> Mới: Trò chuyện với tài liệu PDF bằng AI
          </span>
          <h1 className="mx-auto mt-8 max-w-4xl text-5xl font-black leading-[1.03] tracking-[-0.055em] text-slate-950 sm:text-6xl lg:text-7xl">
            Xử lý PDF thông minh với{" "}
            <span className="text-indigo-600">tốc độ vượt trội</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-slate-500 sm:text-base">
            Công cụ PDF tất cả trong một dành cho doanh nghiệp và cá nhân. Nhanh chóng,
            bảo mật và được hỗ trợ bởi trí tuệ nhân tạo.
          </p>

          <div className="mx-auto mt-11 max-w-3xl rounded-[28px] border-2 border-dashed border-indigo-300 bg-white/55 p-5 shadow-[0_22px_70px_rgba(91,92,240,0.12)] backdrop-blur sm:p-8">
            <div className="rounded-[22px] bg-[#f0f1ff] px-6 py-12">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                <UploadCloud size={28} />
              </span>
              <h2 className="mt-7 text-xl font-black text-slate-950">Tải tệp PDF lên tại đây</h2>
              <p className="mt-2 text-sm text-slate-500">hoặc kéo và thả tài liệu vào vùng này</p>
              <Link href="/tools/word-to-pdf" className="mt-6 inline-flex items-center justify-center rounded-lg bg-indigo-600 px-7 py-3 text-sm font-black text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">
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

      <section id="tools" className="bg-white py-16 sm:py-20">
        <div className="container-page">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Công cụ phổ biến</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.035em] text-slate-950 sm:text-4xl">
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

          <div id="all-tools" className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {displayedTools.map(([name, description, href, Icon]) => (
              <Link
                key={href}
                href={href}
                className="group rounded-2xl border border-slate-200 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Icon size={20} />
                </span>
                <h3 className="mt-7 text-xl font-black text-slate-950">{name}</h3>
                <p className="mt-3 min-h-20 text-sm leading-6 text-slate-500">{description}</p>
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
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:border-indigo-200 hover:text-indigo-600"
              >
                Thu gọn <ChevronUp size={16} />
              </button>
            </div>
          )}
        </div>
      </section>

      <section className="bg-[#f4f6ff] py-16 sm:py-24">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <div className="relative">
            <div className="overflow-hidden rounded-2xl bg-slate-950 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
              <Image
                src="/scanpdf-logo.png"
                alt="AI PDF ScanPDF"
                width={760}
                height={680}
                className="aspect-[1.1] w-full object-contain p-12 opacity-90"
              />
            </div>
            <div className="absolute -bottom-8 right-10 rounded-2xl bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.16)]">
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
            <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-indigo-600">
              AI PDF Assistant
            </span>
            <h2 className="mt-5 max-w-xl text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950">
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

      <section className="bg-[#eef3ff] py-16 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-black tracking-[-0.04em] text-slate-950">Gói dịch vụ linh hoạt</h2>
            <p className="mt-4 text-sm leading-7 text-slate-500">
              Chọn gói phù hợp với nhu cầu của bạn, từ sử dụng cá nhân đến các giải pháp doanh nghiệp quy mô lớn.
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`relative rounded-2xl border bg-white p-8 ${
                  plan.recommended
                    ? "border-indigo-600 shadow-[0_22px_60px_rgba(91,92,240,0.2)]"
                    : "border-slate-200"
                }`}
              >
                {plan.recommended && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-indigo-600 px-4 py-1 text-[10px] font-black uppercase tracking-wide text-white">
                    Khuyên dùng
                  </span>
                )}
                <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                <p className="mt-8 text-4xl font-black tracking-[-0.04em] text-slate-950">
                  {plan.price}
                  {plan.price !== "Liên hệ" && <span className="text-sm font-medium text-slate-500">/tháng</span>}
                </p>
                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm text-slate-600">
                      <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-indigo-600" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={plan.recommended
                    ? "mt-9 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-5 py-3 text-sm font-black text-white transition hover:bg-indigo-700"
                    : "mt-9 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-5 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-50"
                  }
                >
                  {plan.name === "Miễn phí" ? "Bắt đầu miễn phí" : plan.name === "Pro" ? "Nâng cấp ngay" : "Liên hệ tư vấn"}
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-14">
        <div className="container-page grid gap-6 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:grid-cols-3">
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
