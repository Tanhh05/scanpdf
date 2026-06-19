"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, CreditCard, Gauge } from "lucide-react";
import Link from "next/link";
import { AccountLayout } from "@/components/client/account-layout";
import type { Profile } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const profile = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/profile")).data,
    enabled: !!token,
    staleTime: 300_000,
  });
  const dailyLimit = profile.data?.plan.dailyLimit ?? 0;
  const usedToday = profile.data?.usedToday ?? 0;
  const usagePercent = dailyLimit ? Math.min(100, Math.round((usedToday / dailyLimit) * 100)) : 0;

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold text-[#10aee8]">TỔNG QUAN TÀI KHOẢN</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">
            Xin chào, {profile.data?.user.fullName ?? user?.fullName ?? "..."}
          </h1>
          <p className="mt-2 text-slate-500">Theo dõi gói dịch vụ và mức sử dụng tài liệu của bạn.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <article className="rounded-lg border border-[#d8ded5] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101820]">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-[#e8f7fd] text-[#10aee8]"><Gauge size={21} /></span>
            <p className="mt-5 text-sm text-slate-500">Lượt còn lại hôm nay</p>
            <p className="mt-1 text-3xl font-black text-[#17201d] dark:text-slate-50">{profile.data?.remainingToday ?? "-"}</p>
          </article>
          <article className="rounded-lg border border-[#d8ded5] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101820]">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-600"><CheckCircle2 size={21} /></span>
            <p className="mt-5 text-sm text-slate-500">Gói hiện tại</p>
            <p className="mt-1 text-3xl font-black text-[#17201d] dark:text-slate-50">{profile.data?.plan.name ?? "-"}</p>
          </article>
          <article className="rounded-lg border border-[#d8ded5] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101820]">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-amber-50 text-amber-600"><Clock3 size={21} /></span>
            <p className="mt-5 text-sm text-slate-500">Đã dùng hôm nay</p>
            <p className="mt-1 text-3xl font-black text-[#17201d] dark:text-slate-50">{profile.data?.usedToday ?? "-"}</p>
          </article>
        </div>

        <article className="rounded-lg border border-[#1f3b4d] bg-[#17201d] p-6 text-white shadow-[0_18px_60px_rgba(23,32,29,0.16)] sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-sky-300">Gói hiện tại</p>
              <h2 className="mt-2 text-3xl font-black">{profile.data?.plan.name ?? "Free"}</h2>
            </div>
            <CreditCard className="text-sky-300" />
          </div>
          <div className="mt-8">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Sử dụng hôm nay</span>
              <strong>{usedToday}/{dailyLimit || "-"}</strong>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${usagePercent}%` }} />
            </div>
          </div>
          <div className="mt-7 grid gap-3 text-sm text-slate-300 sm:grid-cols-3">
            <p>{profile.data?.plan.maxFileSizeMb ?? "-"}MB tối đa/file</p>
            <p>Lưu tài liệu {profile.data?.plan.storageDays ?? "-"} ngày</p>
            <p>{profile.data?.remainingToday ?? "-"} lượt còn lại</p>
          </div>
          <Link href="/pricing" className="mt-8 inline-flex rounded-lg bg-[#10aee8] px-5 py-3 font-black text-white shadow-sm shadow-sky-950/20 transition hover:bg-[#0789c5]">
            Xem các gói dịch vụ
          </Link>
        </article>
      </div>
    </AccountLayout>
  );
}
