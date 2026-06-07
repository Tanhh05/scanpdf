"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

type Plan = {
  id: string;
  name: string;
  price: number;
  dailyLimit: number;
  maxFileSizeMb: number;
  storageDays: number;
};

export default function PricingPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [error, setError] = useState("");
  const plans = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => (await api.get("/plans")).data,
  });
  const checkout = useMutation({
    mutationFn: async (planId: string) => (await api.post("/payments/create", { planId })).data,
    onSuccess: (data) => router.push(`/payment/qr?orderCode=${data.orderCode}`),
    onError: (requestError) => {
      setError(axios.isAxiosError(requestError)
        ? requestError.response?.data?.message ?? "Không thể tạo thanh toán"
        : "Không thể tạo thanh toán");
    },
  });

  return (
    <section className="container-page py-20">
      <div className="text-center">
        <h1 className="text-4xl font-black">Gói dịch vụ phù hợp với bạn</h1>
        <p className="mt-3 text-slate-500">Chọn Free, Pro hoặc Business; các gói trả phí thanh toán bằng VietQR.</p>
      </div>
      {error && <p className="mx-auto mt-6 max-w-xl rounded-xl bg-red-50 p-3 text-center text-red-700">{error}</p>}
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {plans.data?.map((plan) => (
          <article key={plan.id} className={`card p-8 ${plan.name === "Pro" ? "border-2 border-indigo-500" : ""}`}>
            {plan.name === "Pro" && <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700">Phổ biến</span>}
            <h2 className="mt-4 text-2xl font-black">{plan.name}</h2>
            <p className="mt-4 text-4xl font-black">
              {plan.price.toLocaleString("vi-VN")}đ
              <small className="text-sm font-normal text-slate-500">/tháng</small>
            </p>
            <ul className="mt-7 space-y-3 text-slate-600">
              <li>✓ {plan.dailyLimit.toLocaleString("vi-VN")} lượt/ngày</li>
              <li>✓ {plan.maxFileSizeMb}MB/file</li>
              <li>✓ Lưu {plan.storageDays} ngày</li>
              {plan.name !== "Free" && <li>✓ Ưu tiên hàng đợi</li>}
            </ul>
            {plan.price === 0 ? (
              <Link href={token ? "/dashboard" : "/register"} className="btn-primary mt-8 w-full">Bắt đầu miễn phí</Link>
            ) : (
              <button
                className="btn-primary mt-8 w-full"
                disabled={checkout.isPending}
                onClick={() => token ? checkout.mutate(plan.id) : window.location.assign("/login")}
              >
                {checkout.isPending ? "Đang xử lý..." : "Nâng cấp"}
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
