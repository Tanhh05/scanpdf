"use client";

import { ArrowRight, CreditCard, History, LayoutDashboard, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";

const navigation = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutDashboard },
  { label: "Hồ sơ", href: "/dashboard/profile", icon: UserRound },
  { label: "Lịch sử", href: "/dashboard/history", icon: History },
  { label: "Thanh toán", href: "/dashboard/payments", icon: CreditCard },
];

export function AccountLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return (
      <div className="container-page py-24 text-center">
        <h1 className="text-3xl font-black">Đăng nhập để xem tài khoản</h1>
        <p className="mt-3 text-slate-500">Quản lý gói dịch vụ, lượt sử dụng và lịch sử tài liệu của bạn.</p>
        <Link href="/login" className="btn-primary mt-6">Đăng nhập</Link>
      </div>
    );
  }

  return (
    <section className="bg-[#f7f8fc] py-8 sm:py-12">
      <div className="container-page grid gap-7 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 lg:sticky lg:top-24">
          <div className="border-b border-slate-100 px-3 pb-4 pt-2">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Tài khoản</p>
            <p className="mt-2 truncate font-black text-slate-900">{user?.fullName}</p>
          </div>
          <nav className="mt-3 space-y-1 text-sm font-bold">
            {navigation.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                    active ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <item.icon size={18} /> {item.label}
                </Link>
              );
            })}
          </nav>
          <Link href="/tools/word-to-pdf" className="btn-primary mt-4 w-full !rounded-xl !py-3">
            Công cụ PDF <ArrowRight size={16} />
          </Link>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </section>
  );
}
