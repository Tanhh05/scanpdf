import Link from "next/link";
import {
  ArrowRight,
  Archive,
  Check,
  ChevronRight,
  Clock3,
  FileImage,
  FileOutput,
  Files,
  Gauge,
  LockKeyhole,
  ScanText,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
} from "lucide-react";

const tools = [
  {
    name: "PDF sang Word",
    description: "Chuyển PDF thành tài liệu Word có thể chỉnh sửa.",
    href: "/tools/pdf-to-word",
    icon: FileOutput,
    color: "bg-[#4f7cff]",
  },
  {
    name: "Word sang PDF",
    description: "Chuyển Word sang PDF với bố cục được giữ nguyên.",
    href: "/tools/word-to-pdf",
    icon: FileOutput,
    color: "bg-[#4f7cff]",
  },
  {
    name: "Ghép PDF",
    description: "Kết hợp nhiều tập tin PDF thành một tài liệu.",
    href: "/tools/merge-pdf",
    icon: Files,
    color: "bg-[#7868e6]",
  },
  {
    name: "Nén PDF",
    description: "Giảm kích thước PDF để lưu trữ và chia sẻ dễ hơn.",
    href: "/tools/compress-pdf",
    icon: Archive,
    color: "bg-[#ef476f]",
  },
  {
    name: "JPG sang PDF",
    description: "Gộp ảnh JPG hoặc PNG thành một tập tin PDF.",
    href: "/tools/jpg-to-pdf",
    icon: FileImage,
    color: "bg-[#f59e0b]",
  },
  {
    name: "PDF sang JPG",
    description: "Xuất từng trang PDF thành ảnh JPG chất lượng cao.",
    href: "/tools/pdf-to-jpg",
    icon: FileImage,
    color: "bg-[#f97316]",
  },
  {
    name: "PDF OCR",
    description: "Nhận dạng văn bản tiếng Việt và tiếng Anh trong PDF scan.",
    href: "/tools/ocr-pdf",
    icon: ScanText,
    color: "bg-[#10b981]",
  },
];

const benefits = [
  {
    icon: Gauge,
    title: "Nhanh và dễ sử dụng",
    description: "Chọn công cụ, tải file lên và nhận kết quả chỉ sau vài bước.",
  },
  {
    icon: ShieldCheck,
    title: "Xử lý an toàn",
    description: "Tài liệu được bảo vệ trong suốt quá trình tải lên và chuyển đổi.",
  },
  {
    icon: Sparkles,
    title: "Chất lượng ổn định",
    description: "Các bộ xử lý chuyên dụng giúp giữ nội dung và bố cục tài liệu.",
  },
  {
    icon: Users,
    title: "Dùng trên mọi thiết bị",
    description: "Hoạt động trực tiếp trên trình duyệt, không cần cài đặt phần mềm.",
  },
];

const plans = [
  {
    name: "Free",
    price: "0đ",
    description: "Cho nhu cầu cá nhân cơ bản",
    features: ["5 lượt mỗi ngày", "Tối đa 10MB mỗi file", "Lưu file trong 1 ngày"],
  },
  {
    name: "Pro",
    price: "10.000đ",
    description: "Xử lý tài liệu thường xuyên",
    features: ["100 lượt mỗi ngày", "Tối đa 100MB mỗi file", "Ưu tiên hàng đợi"],
    featured: true,
  },
  {
    name: "Business",
    price: "10.000đ",
    description: "Cho nhóm và khối lượng lớn",
    features: ["1.000 lượt mỗi ngày", "Tối đa 200MB mỗi file", "Lưu file trong 30 ngày"],
  },
];

export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden bg-white pb-24 pt-20 text-center sm:pt-28">
        <div className="hero-orb hero-orb-left" />
        <div className="hero-orb hero-orb-right" />
        <div className="container-page relative">
          <p className="mx-auto inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-bold text-indigo-700">
            <Sparkles size={16} />
            Bộ công cụ PDF trực tuyến cho mọi người
          </p>
          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black leading-[1.08] tracking-[-0.04em] text-slate-950 md:text-7xl">
            Xử lý tài liệu PDF
            <span className="block text-[#5b5cf0]">dễ dàng hơn mỗi ngày.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Chuyển đổi, nén, ghép và nhận dạng nội dung PDF nhanh chóng.
            Không cần cài đặt, bắt đầu miễn phí ngay trên trình duyệt.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/tools/word-to-pdf" className="btn-primary min-w-48 !rounded-xl !px-7 !py-4">
              Bắt đầu miễn phí <ArrowRight size={18} />
            </Link>
            <Link href="#tools" className="inline-flex min-w-48 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-7 py-4 font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50">
              Xem tất cả công cụ
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-medium text-slate-500">
            <span className="flex items-center gap-2"><Check size={17} className="text-emerald-500" /> Không cần cài đặt</span>
            <span className="flex items-center gap-2"><Check size={17} className="text-emerald-500" /> Sử dụng miễn phí</span>
            <span className="flex items-center gap-2"><Check size={17} className="text-emerald-500" /> Xử lý an toàn</span>
          </div>
        </div>
      </section>

      <section id="tools" className="border-y border-slate-200 bg-[#f7f8fc] py-20 sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-kicker">Công cụ ScanPDF</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Các công cụ PDF được sử dụng nhiều nhất
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Tất cả công cụ hiện có đều hoạt động trực tuyến và sẵn sàng sử dụng.
            </p>
          </div>
          <div className="mt-12 grid overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_50px_rgba(15,23,42,0.06)] sm:grid-cols-2 lg:grid-cols-3">
            {tools.map((tool) => (
              <Link key={tool.name} href={tool.href} className="tool-card group">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm ${tool.color}`}>
                  <tool.icon size={24} strokeWidth={1.8} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-1 text-base font-extrabold text-slate-900">
                    {tool.name}
                    <ChevronRight size={16} className="translate-x-0 opacity-0 transition group-hover:translate-x-1 group-hover:opacity-100" />
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{tool.description}</p>
                </div>
              </Link>
            ))}
            <Link href="/tools/word-to-pdf" className="tool-card group bg-slate-50/70">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white">
                <ArrowRight size={24} />
              </span>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Bắt đầu xử lý tài liệu</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500">Chọn file và sử dụng công cụ đầu tiên của bạn.</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="container-page grid items-center gap-14 lg:grid-cols-2">
          <div>
            <p className="section-kicker">Đơn giản từ đầu đến cuối</p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-slate-950">
              Hoàn thành công việc tài liệu chỉ trong ba bước
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
              ScanPDF tập trung vào trải nghiệm rõ ràng: không có thiết lập phức tạp,
              không cần tải phần mềm và không làm gián đoạn công việc của bạn.
            </p>
            <div className="mt-9 space-y-7">
              {[
                ["01", "Chọn công cụ", "Chọn đúng thao tác bạn cần cho tài liệu."],
                ["02", "Tải file lên", "Kéo thả hoặc chọn file trực tiếp từ thiết bị."],
                ["03", "Nhận kết quả", "Theo dõi tiến trình và tải file đã xử lý."],
              ].map(([number, title, description]) => (
                <div key={number} className="flex gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-sm font-black text-indigo-600">{number}</span>
                  <div>
                    <h3 className="font-extrabold text-slate-900">{title}</h3>
                    <p className="mt-1 text-slate-500">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative rounded-[32px] bg-[#eef1ff] p-6 sm:p-10">
            <div className="rounded-3xl border border-white bg-white p-7 shadow-[0_24px_70px_rgba(55,65,150,0.15)] sm:p-10">
              <div className="flex items-center justify-between">
                <span className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-600">WORD SANG PDF</span>
                <span className="text-xs font-semibold text-emerald-600">Sẵn sàng</span>
              </div>
              <div className="mt-8 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 px-5 py-12 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-200">
                  <UploadCloud size={30} />
                </span>
                <p className="mt-5 text-lg font-extrabold text-slate-900">Chọn file tài liệu</p>
                <p className="mt-2 text-sm text-slate-500">hoặc kéo và thả file vào đây</p>
              </div>
              <div className="mt-6 flex items-center justify-center gap-6 text-xs font-semibold text-slate-400">
                <span className="flex items-center gap-1.5"><LockKeyhole size={14} /> Bảo mật</span>
                <span className="flex items-center gap-1.5"><Clock3 size={14} /> Nhanh chóng</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 py-20 text-white sm:py-24">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-kicker !text-indigo-300">Tại sao chọn ScanPDF?</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
              Một nơi cho các công việc PDF hàng ngày
            </h2>
          </div>
          <div className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <article key={benefit.title} className="bg-slate-950 p-7 transition hover:bg-slate-900">
                <benefit.icon size={28} className="text-indigo-400" />
                <h3 className="mt-6 text-lg font-extrabold">{benefit.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-400">{benefit.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <p className="section-kicker">Gói dịch vụ</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Chọn mức sử dụng phù hợp với bạn
            </h2>
            <p className="mt-4 text-lg text-slate-600">Bắt đầu miễn phí và nâng cấp khi bạn cần xử lý nhiều hơn.</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 lg:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className={`relative rounded-2xl border bg-white p-7 ${plan.featured ? "border-indigo-500 shadow-[0_18px_50px_rgba(91,92,240,0.15)]" : "border-slate-200"}`}>
                {plan.featured && (
                  <span className="absolute right-5 top-5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600">PHỔ BIẾN</span>
                )}
                <h3 className="text-xl font-black text-slate-950">{plan.name}</h3>
                <p className="mt-2 text-sm text-slate-500">{plan.description}</p>
                <p className="mt-7 text-4xl font-black tracking-tight text-slate-950">
                  {plan.price}<span className="text-sm font-medium text-slate-400"> / tháng</span>
                </p>
                <ul className="mt-7 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm text-slate-600">
                      <span className="rounded-full bg-emerald-50 p-1 text-emerald-600"><Check size={13} strokeWidth={3} /></span>
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/pricing" className={plan.featured ? "btn-primary mt-8 w-full" : "mt-8 inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-5 py-3 font-bold transition hover:bg-slate-50"}>
                  {plan.name === "Free" ? "Bắt đầu miễn phí" : "Chọn gói"}
                </Link>
              </article>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link href="/pricing" className="inline-flex items-center gap-1 font-bold text-indigo-600 hover:text-indigo-700">
              So sánh đầy đủ các gói <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-[#5b5cf0] py-20 text-white">
        <div className="container-page text-center">
          <h2 className="mx-auto max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Bắt đầu xử lý PDF dễ dàng hơn
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-indigo-100">
            Tạo tài khoản miễn phí để lưu lịch sử chuyển đổi và quản lý tài liệu của bạn.
          </p>
          <Link href="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 font-extrabold text-indigo-600 transition hover:bg-indigo-50">
            Tạo tài khoản miễn phí <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </>
  );
}
