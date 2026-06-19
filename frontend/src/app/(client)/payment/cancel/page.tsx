import Link from "next/link";

export default function PaymentCancelPage() {
  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card max-w-lg p-10 text-center">
        <h1 className="app-heading text-3xl">Thanh toán đã hủy</h1>
        <p className="mt-4 text-slate-500">Bạn chưa bị trừ tiền và có thể thử lại bất kỳ lúc nào.</p>
        <Link href="/pricing" className="btn-primary mt-7">Quay lại bảng giá</Link>
      </div>
    </section>
  );
}
