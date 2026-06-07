import Link from "next/link";
import { ArrowRight, FileOutput, Files, Image, Lock, Sparkles, Zap } from "lucide-react";

const tools = [
  { name: "Word sang PDF", href: "/tools/word-to-pdf", icon: FileOutput, ready: true },
  { name: "PDF sang Word", href: "/tools/pdf-to-word", icon: FileOutput, ready: true },
  { name: "Ghép PDF", href: "#", icon: Files, ready: false },
  { name: "Nén PDF", href: "#", icon: Zap, ready: false },
  { name: "JPG sang PDF", href: "#", icon: Image, ready: false },
  { name: "Chat PDF AI", href: "#", icon: Sparkles, ready: false },
];

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden bg-gradient-to-b from-indigo-50 to-slate-50 py-24 text-center">
        <div className="container-page">
          <span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700">
            Xử lý tài liệu đơn giản hơn
          </span>
          <h1 className="mx-auto mt-7 max-w-4xl text-5xl font-black tracking-tight md:text-7xl">
            Chuyển đổi PDF <span className="text-indigo-600">trong vài giây</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Nhanh chóng, an toàn, không cần cài đặt. Mọi công cụ tài liệu bạn cần ở cùng một nơi.
          </p>
          <div className="mt-9 flex justify-center gap-3">
            <Link href="/tools/word-to-pdf" className="btn-primary !px-7 !py-4">
              Chọn file Word <ArrowRight size={18} />
            </Link>
            <Link href="/pricing" className="rounded-xl border border-slate-300 bg-white px-7 py-4 font-bold">
              Xem bảng giá
            </Link>
          </div>
          <div className="mt-8 flex justify-center gap-8 text-sm text-slate-500">
            <span className="flex items-center gap-2"><Zap size={16} /> Xử lý nhanh</span>
            <span className="flex items-center gap-2"><Lock size={16} /> Tự động xóa file</span>
          </div>
        </div>
      </section>

      <section id="tools" className="container-page py-20">
        <div className="text-center">
          <h2 className="text-3xl font-black">Công cụ phổ biến</h2>
          <p className="mt-3 text-slate-500">Chọn công cụ và bắt đầu ngay</p>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.name} href={tool.href} className="card group p-6 transition hover:-translate-y-1 hover:border-indigo-300">
              <div className="flex items-start justify-between">
                <span className="rounded-2xl bg-indigo-50 p-3 text-indigo-600"><tool.icon /></span>
                {!tool.ready && <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">Sắp có</span>}
              </div>
              <h3 className="mt-5 text-lg font-bold">{tool.name}</h3>
              <p className="mt-2 text-sm text-slate-500">Chuyển đổi trực tuyến an toàn và dễ dàng.</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-slate-900 py-20 text-white">
        <div className="container-page text-center">
          <h2 className="text-3xl font-black">Bắt đầu miễn phí hôm nay</h2>
          <p className="mt-4 text-slate-300">5 lượt chuyển đổi mỗi ngày, không cần thẻ thanh toán.</p>
          <Link href="/register" className="btn-primary mt-8">Tạo tài khoản</Link>
        </div>
      </section>
    </>
  );
}
