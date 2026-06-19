"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatPlanPrice, isFreePlan, isRecommendedPlan, planDescription, planFeatures, type Plan, sortPlans } from "@/lib/plans";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

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
    <section className="bg-white py-16 dark:bg-[#07131a] sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="section-kicker">Gói dịch vụ</p>
          <h1 className="app-heading mt-3 text-4xl sm:text-5xl">
            Gói dịch vụ phù hợp với bạn
          </h1>
          <p className="mt-4 text-lg text-slate-600">
            Bắt đầu miễn phí và nâng cấp khi bạn cần xử lý nhiều hơn.
          </p>
        </div>

        {error && (
          <p className="mx-auto mt-7 max-w-xl rounded-lg border border-red-100 bg-red-50 p-3 text-center text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <div className="mx-auto mt-12 grid max-w-6xl items-stretch gap-5 lg:grid-cols-3">
          {sortPlans(plans.data ?? []).map((plan) => {
            const isPro = isRecommendedPlan(plan);
            const isFree = isFreePlan(plan);
            const isLoading = checkout.isPending && selectedPlanId === plan.id;
            const features = planFeatures(plan);

            return (
              <article
                key={plan.id}
                className={`relative flex min-h-[450px] flex-col rounded-lg border bg-white p-7 transition dark:bg-[#101820] sm:p-8 ${
                  isPro
                    ? "border-2 border-[#10aee8] shadow-[0_24px_70px_rgba(16,174,232,0.16)] dark:shadow-none"
                    : "border-[#d8ded5] shadow-[0_12px_35px_rgba(23,32,29,0.04)] dark:border-slate-800 dark:shadow-none"
                }`}
              >
                {isPro && (
                  <span className="absolute right-5 top-5 rounded-md bg-[#e8f7fd] px-3 py-1 text-xs font-black uppercase tracking-wide text-[#10aee8] dark:bg-[#10aee8]/15 dark:text-sky-300">
                    Phổ biến
                  </span>
                )}

                <h2 className="text-2xl font-black text-[#17201d] dark:text-slate-50">{plan.name}</h2>
                <p className="mt-2 text-sm text-slate-500">
                  {planDescription(plan)}
                </p>

                <p className="mt-8 flex items-end gap-1 text-[#17201d] dark:text-slate-50">
                  <strong className="text-4xl font-black tracking-tight">{formatPlanPrice(plan.price)}</strong>
                  <span className="pb-1 text-sm text-slate-400">/tháng</span>
                </p>

                <ul className="mt-8 space-y-4">
                  {features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm font-medium text-slate-600">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 dark:bg-emerald-950/35 dark:text-emerald-300">
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
                      className="inline-flex w-full items-center justify-center rounded-lg border border-[#b8c8be] px-5 py-3.5 font-black text-[#17201d] transition hover:border-[#10aee8] hover:bg-[#f2fbff] dark:border-slate-700 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      Bắt đầu miễn phí
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={`w-full cursor-pointer rounded-lg px-5 py-3.5 font-black transition disabled:cursor-not-allowed disabled:opacity-60 ${
                        isPro
                          ? "bg-[#10aee8] text-white hover:bg-[#0789c5]"
                          : "border border-[#b8c8be] bg-white text-[#17201d] hover:border-[#10aee8] hover:bg-[#f2fbff] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
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
            {[0, 1, 2].map((item) => <div key={item} className="h-[450px] animate-pulse rounded-lg bg-slate-100" />)}
          </div>
        )}

        <div className="mt-9 text-center">
          <Link href="/#tools" className="inline-flex items-center gap-2 font-black text-[#10aee8] transition hover:text-[#0789c5]">
            Xem tất cả công cụ PDF <ArrowRight size={17} />
          </Link>
        </div>
      </div>
    </section>
  );
}
