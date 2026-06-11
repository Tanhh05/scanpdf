"use client";

import {
  BarChart3,
  CircleUserRound,
  CreditCard,
  FileClock,
  LayoutGrid,
  LogOut,
  Menu,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useAdminAuthStore } from "@/stores/admin-auth.store";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandLogo } from "@/components/common/brand-logo";

const navigation = [
  { label: "Tổng quan", href: "/admin/dashboard", icon: LayoutGrid },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Gói dịch vụ", href: "/admin/plans", icon: SlidersHorizontal },
  { label: "Thanh toán", href: "/admin/payments", icon: CreditCard },
  { label: "Thống kê", href: "/admin/statistics", icon: BarChart3 },
  { label: "Nhật ký", href: "/admin/logs", icon: FileClock },
];

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Tổng quan",
  "/admin/users": "Quản lý người dùng",
  "/admin/plans": "Cấu hình Gói dịch vụ",
  "/admin/payments": "Thanh toán",
  "/admin/statistics": "Thống kê 30 ngày qua",
  "/admin/logs": "Nhật ký hệ thống",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, token, hasHydrated, logout } = useAdminAuthStore();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) return <main className="min-h-screen bg-slate-950">{children}</main>;

  if (!hasHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f9f8ff]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#0b4dcc]/20 border-t-[#0b4dcc]" aria-label="Đang tải phiên đăng nhập" />
      </main>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f9f8ff] p-6 text-[#111527]">
        <div className="w-full max-w-md rounded-2xl border border-[#d8dceb] bg-white p-8 text-center shadow-xl">
          <Shield className="mx-auto text-[#0b4dcc]" size={48} />
          <h1 className="mt-5 text-3xl font-bold">ScanPDF Admin</h1>
          <p className="mt-3 text-sm text-slate-500">Đăng nhập bằng tài khoản quản trị để tiếp tục.</p>
          <Link href="/admin/login" className="mt-7 inline-flex rounded-xl bg-[#0b4dcc] px-6 py-3 font-bold text-white">
            Đăng nhập admin
          </Link>
        </div>
      </main>
    );
  }

  function handleLogout() {
    logout();
    router.replace("/admin/login");
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#fbfaff] text-[#20263a] dark:bg-slate-950 dark:text-slate-100">
      <div className="flex h-[76px] items-center px-5">
        <BrandLogo compact admin />
      </div>

      <nav className="flex-1 space-y-1 px-3 pt-2">
        {navigation.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium transition ${
                active
                  ? "bg-[#2f67e9] text-white shadow-[0_5px_12px_rgba(47,103,233,0.2)] dark:bg-blue-600"
                  : "text-[#252b40] hover:bg-[#edf2ff] hover:text-[#0b4dcc] dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <item.icon size={19} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[#d8dceb] px-3 pb-4 pt-3 dark:border-slate-800">
        <Link href="/admin/users" className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#edf2ff] dark:hover:bg-slate-900">
          <CircleUserRound size={19} /> Hồ sơ
        </Link>
        <Link href="/admin/plans" className="mt-1 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-[#edf2ff] dark:hover:bg-slate-900">
          <Settings size={19} /> Cài đặt
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-100 dark:bg-red-950/30 dark:text-red-300 dark:hover:bg-red-950/50"
        >
          <LogOut size={19} /> Đăng xuất
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-[#f9f8ff] text-[#111527] dark:bg-slate-950 dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-[#cfd4e4] dark:border-slate-800 lg:block">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Đóng menu" onClick={() => setMobileOpen(false)} className="absolute inset-0 bg-slate-950/35 backdrop-blur-sm" />
          <aside className="relative h-full w-[260px] shadow-2xl">
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 z-10 rounded-lg p-2 text-slate-500 hover:bg-slate-100">
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <section className="min-h-screen lg:pl-[248px]">
        <header className="h-[72px] px-4 sm:px-6 lg:px-7">
          <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl border border-[#cfd4e4] bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900 lg:hidden">
                <Menu size={21} />
              </button>
              <h1 className="truncate text-[22px] font-bold tracking-[-0.02em]">{pageTitles[pathname] ?? "ScanPDF Admin"}</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <ThemeToggle className="!border-0 !bg-transparent hover:!bg-[#edf2ff] dark:hover:!bg-slate-800" />
              <span className="hidden h-8 w-px bg-[#cfd4e4] dark:bg-slate-800 sm:block" />
              <div className="hidden text-right sm:block">
                <p className="max-w-40 truncate text-sm font-semibold">{user?.fullName || "Quản trị viên"}</p>
                <p className="text-[11px] uppercase tracking-wide text-[#586075] dark:text-slate-400">Super Admin</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-[#0b4dcc] bg-[#dce6ff] text-xs font-bold text-[#0b4dcc] dark:border-blue-400 dark:bg-slate-900 dark:text-blue-300">
                {(user?.fullName || user?.email || "A").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto min-h-[calc(100vh-124px)] max-w-[1440px] px-4 pb-8 sm:px-6 lg:px-7">
          {children}
        </div>
        <footer className="border-t border-[#d8dceb] px-6 py-4 text-center text-[11px] text-[#737b90] dark:border-slate-800 dark:text-slate-400 lg:text-left">
          <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3">
            <span>© 2026 ScanPDF Admin. All rights reserved.</span>
            <span>Version 2.1.0-stable</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
