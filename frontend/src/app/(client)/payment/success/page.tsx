"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { api } from "@/services/api";

function PaymentSuccessContent() {
  const orderCode = useSearchParams().get("orderCode");
  const payment = useQuery<{ status: string; plan: { name: string } }>({
    queryKey: ["payment-status", orderCode],
    queryFn: async () => (await api.get(`/payments/status/${orderCode}`)).data,
    enabled: Boolean(orderCode),
    refetchInterval: (query) => query.state.data?.status === "PENDING" ? 2000 : false,
  });
  const paid = payment.data?.status === "PAID";
  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card max-w-lg p-10 text-center">
        <h1 className="app-heading text-3xl">{paid ? "Thanh toán thành công" : "Đang xác nhận thanh toán"}</h1>
        <p className="mt-4 text-slate-500">{paid ? `Gói ${payment.data?.plan.name} đã được kích hoạt.` : "Hệ thống đang chờ webhook từ PayOS. Trang sẽ tự cập nhật."}</p>
        <Link href="/dashboard" className="btn-primary mt-7">Về dashboard</Link>
      </div>
    </section>
  );
}

export default function PaymentSuccessPage() {
  return <Suspense><PaymentSuccessContent /></Suspense>;
}
