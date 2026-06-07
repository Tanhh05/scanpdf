"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, Check } from "lucide-react";
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

const planDescriptions: Record<string, string> = {
  Free: "Cho nhu cầu cá nhân cơ bản",
  Pro: "Xử lý tài liệu thường xuyên",
  Business: "Cho nhóm và khối lượng lớn",
};

export default function PricingPage() {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [error, setError] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const plans = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: async () => (await api.get("/plans")).data,
  });
  const checkout = useMutation({
    mutationFn: async (planId: string) => {
      setSelectedPlanId(planId);
      return (await api.post("/payments/create", { planId })).data;
    },
    onSuccess: (data) => router.push(`/payment/qr?orderCode=${data.orderCode}`),
    onError: (requestError) => {
      setSelectedPlanId(null);
      setError(axios.isAxiosError(requestError)
        ? requestError.response?.data?.message ?? "Không thể tạo thanh toán"
        : "Không thể tạo thanh toán");
    },
  });

  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-kicker">Gói dịch vụ</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Gói dịch vụ phù hợp với bạn
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Bắt đầu miễn phí và nâng cấp khi bạn cần xử lý nhiều hơn.
          </p>
        </div>

        {error && (
          <p className="mx-auto mt-7 max-w-xl rounded-xl border border-red-100 bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mx-auto mt-12 grid max-w-6xl items-stretch gap-5 lg:grid-cols-3">
          {plans.data?.map((plan) => {
            const isPro = plan.name === "Pro";
            const isFree = plan.price === 0;
            const isLoading = checkout.isPending && selectedPlanId === plan.id;
            const features = [
              `${plan.dailyLimit.toLocaleString("vi-VN")} lượt mỗi ngày`,
              `Tối đa ${plan.maxFileSizeMb}MB mỗi file`,
              `Lưu file trong ${plan.storageDays} ngày`,
              ...(isFree ? [] : ["Ưu tiên hàng đợi"]),
            ];

            return (
              <article
                key={plan.id}
                className={`relative flex min-h-[450px] flex-col rounded-2xl border bg-white p-7 transition sm:p-8 ${
                  isPro
                    ? "border-2 border-indigo-500 shadow-[0_24px_70px_rgba(91,92,240,0.16)]"
                    : "border-slate-200 shadow-[0_12px_35px_rgba(15,23,42,0.04)]"
                }`}
              >
                {isPro && (
                  <span className="absolute right-5 top-5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-indigo-600">
                    Phổ biến
                  </span>
                )}

                <h2 className="text-2xl font-black text-slate-950">{plan.name}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {planDescriptions[plan.name] ?? "Gói dịch vụ ScanPDF"}
                </p>

                <p className="mt-8 flex items-end gap-1 text-slate-950">
                  <strong className="text-4xl font-black tracking-tight">{plan.price.toLocaleString("vi-VN")}đ</strong>
                  <span className="pb-1 text-sm text-slate-400">/tháng</span>
                </p>

                <ul className="mt-8 space-y-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Check size={14} strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-9">
                  {isFree ? (
                    <Link
                      href={token ? "/dashboard" : "/register"}
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 px-5 py-3.5 font-black text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
                    >
                      Bắt đầu miễn phí
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`w-full cursor-pointer rounded-xl px-5 py-3.5 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isPro
                          ? "bg-indigo-600 text-white hover:bg-indigo-700"
                          : "border border-slate-300 bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50"
                      }`}
                      disabled={checkout.isPending}
                      onClick={() => token ? checkout.mutate(plan.id) : window.location.assign("/login")}
                    >
                      {isLoading ? "Đang xử lý..." : "Chọn gói"}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {plans.isLoading && (
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 lg:grid-cols-3">
            {[0, 1, 2].map((item) => <div key={item} className="h-[450px] animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        )}

        <div className="mt-9 text-center">
          <Link href="/#tools" className="inline-flex items-center gap-2 font-black text-indigo-600 transition hover:text-indigo-700">
            Xem tất cả công cụ PDF <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
