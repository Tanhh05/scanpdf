"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Bell, Braces, CreditCard, History, LayoutDashboard, Link2, ShieldCheck, Users, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import type { ConversionList, Profile } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

const navigation = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Hồ sơ", href: "/dashboard/profile", icon: UserRound },
  { label: "Bảo mật", href: "/dashboard/security", icon: ShieldCheck },
  { label: "Lịch sử", href: "/dashboard/history", icon: History },
  { label: "Thanh toán", href: "/dashboard/billing", icon: CreditCard },
  { label: "Team", href: "/dashboard/teams", icon: Users },
  { label: "Link chia sẻ", href: "/dashboard/share-links", icon: Link2 },
  { label: "Thông báo", href: "/dashboard/notifications", icon: Bell },
  { label: "Public API", href: "/dashboard/api-keys", icon: Braces },
];

export function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  function prefetchDashboardItem(href: string) {
    router.prefetch(href);
    if (!token) return;
    if (href === "/dashboard" || href === "/dashboard/profile") {
      void queryClient.prefetchQuery<Profile>({
        queryKey: ["profile"],
        queryFn: async () => (await api.get("/profile")).data,
        staleTime: 300_000,
      });
    }
    if (href === "/dashboard/history") {
      void queryClient.prefetchQuery<ConversionList>({
        queryKey: ["conversions", 1, "", ""],
        queryFn: async () => (await api.get("/conversions", {
          params: { page: 1, limit: 5 },
        })).data,
        staleTime: 120_000,
      });
    }
  }

  if (!token) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="font-[var(--font-display)] text-3xl font-black text-[#17201d] dark:text-slate-50">Đăng nhập để xem tài khoản</h1>
        <p className="mt-3 text-slate-500">Quản lý gói dịch vụ, lượt sử dụng và lịch sử tài liệu của bạn.</p>
        <Link href="/login" className="btn-primary mt-6">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <section className="min-h-[calc(100vh-72px)] bg-[#f3f7fb] py-8 dark:bg-[#07131a] sm:py-12">
      <div className="container-page grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-lg border border-[#d8ded5] bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-[#101820] lg:sticky lg:top-24">
          <div className="border-b border-[#d8ded5] px-3 pb-4 pt-2 dark:border-slate-800">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tài khoản</p>
            <p className="mt-2 truncate font-black text-[#17201d] dark:text-slate-50">{user?.fullName}</p>
          </div>
          <nav className="mt-3 space-y-1 text-sm font-bold">
            {navigation.map((item) => {
              const active = pathname === item.href || (item.href === "/dashboard/billing" && pathname === "/dashboard/payments");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onMouseEnter={() => prefetchDashboardItem(item.href)}
                  onFocus={() => prefetchDashboardItem(item.href)}
                  className={`flex items-center gap-3 rounded-md px-3 py-3 transition ${
                    active ? "bg-[#dff4fc] text-[#10aee8] dark:bg-sky-500/15 dark:text-sky-300" : "text-slate-600 hover:bg-[#f2fbff] dark:text-slate-300 dark:hover:bg-slate-900"
                  }`}
                >
                  <item.icon size={18} /> {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/tools/word-to-pdf" className="btn-primary mt-4 w-full !py-3">
            Công cụ PDF <ArrowRight size={16} />
          </Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
