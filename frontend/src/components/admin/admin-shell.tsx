"use client";

import {
  BarChart3,
  CircleUserRound,
  CreditCard,
  DatabaseZap,
  FolderOpen,
  FileClock,
  LayoutGrid,
  LogOut,
  Menu,
  MonitorCog,
  ServerCog,
  Settings,
  SlidersHorizontal,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAdminAuthStore } from "@/stores/admin-auth.store";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandLogo } from "@/components/common/brand-logo";

const navigation = [
  { label: "Tổng quan", href: "/dashboard", icon: LayoutGrid },
  { label: "Người dùng", href: "/users", icon: Users },
  { label: "Gói dịch vụ", href: "/plans", icon: SlidersHorizontal },
  { label: "Thanh toán", href: "/payments", icon: CreditCard },
  { label: "Đăng ký", href: "/subscriptions", icon: CreditCard },
  { label: "Thống kê", href: "/statistics", icon: BarChart3 },
  { label: "Tệp tin", href: "/files", icon: FolderOpen },
  { label: "Hàng đợi", href: "/jobs", icon: DatabaseZap },
  { label: "Audit logs", href: "/audit-logs", icon: FileClock },
  { label: "Hệ thống", href: "/system", icon: ServerCog },
  { label: "Cài đặt", href: "/settings", icon: Settings },
  { label: "Giám sát", href: "/monitoring", icon: MonitorCog },
];

const pageTitles: Record<string, string> = {
  "/dashboard": "Tổng quan",
  "/users": "Quản lý người dùng",
  "/plans": "Cấu hình Gói dịch vụ",
  "/payments": "Thanh toán",
  "/subscriptions": "Quản lý đăng ký",
  "/statistics": "Thống kê 30 ngày qua",
  "/logs": "Nhật ký hệ thống",
  "/audit-logs": "Nhật ký hệ thống",
  "/files": "Quản lý tệp tin",
  "/jobs": "Hàng đợi xử lý",
  "/system": "Trạng thái hệ thống",
  "/monitoring": "Giám sát",
  "/profile": "Hồ sơ admin",
  "/settings": "Cài đặt hệ thống",
  "/admin/dashboard": "Tổng quan",
  "/admin/users": "Quản lý người dùng",
  "/admin/plans": "Cấu hình Gói dịch vụ",
  "/admin/payments": "Thanh toán",
  "/admin/subscriptions": "Quản lý đăng ký",
  "/admin/statistics": "Thống kê 30 ngày qua",
  "/admin/logs": "Nhật ký hệ thống",
  "/admin/audit-logs": "Nhật ký hệ thống",
  "/admin/files": "Quản lý tệp tin",
  "/admin/jobs": "Hàng đợi xử lý",
  "/admin/system": "Trạng thái hệ thống",
  "/admin/monitoring": "Giám sát",
  "/admin/profile": "Hồ sơ admin",
  "/admin/settings": "Cài đặt hệ thống",
};

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, token, hasHydrated, logout } = useAdminAuthStore();
  const isLoginPage = pathname === "/login" || pathname === "/admin/login";

  useEffect(() => {
    if (hasHydrated && !token && !isLoginPage) {
      router.replace("/login");
    }
  }, [hasHydrated, isLoginPage, router, token]);

  if (isLoginPage) return <main className="min-h-screen bg-[#f8fafc] dark:bg-[#020617]">{children}</main>;

  if (!hasHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2563eb]/20 border-t-[#2563eb]" aria-label="Đang tải phiên đăng nhập" />
      </main>
    );
  }

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] dark:bg-[#020617]">
        <div className="h-9 w-9 animate-spin rounded-full border-4 border-[#2563eb]/20 border-t-[#2563eb]" aria-label="Đang chuyển đến đăng nhập" />
      </main>
    );
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function isNavActive(href: string) {
    if (pathname === href) return true;
    if (pathname === `/admin${href}`) return true;
    if (href === "/audit-logs" && (pathname === "/logs" || pathname === "/admin/logs")) return true;
    return false;
  }

  const sidebar = (
    <div className="flex h-full flex-col bg-[#0f172a] text-white dark:bg-[#020617] dark:text-slate-100">
      <div className="flex h-[76px] items-center border-b border-white/10 px-5">
        <BrandLogo compact admin />
      </div>

      <nav className="flex-1 space-y-1 px-3 pt-2">
        {navigation.map((item) => {
          const active = isNavActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex h-11 items-center gap-3 rounded-lg px-4 text-sm font-medium transition ${
                active
                  ? "!bg-white !text-[#0f172a] shadow-sm [&_svg]:!text-[#2563eb]"
                  : "text-slate-300 hover:bg-white/10 hover:text-white dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
              }`}
            >
              <item.icon size={19} strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-3 pb-4 pt-3 dark:border-slate-800">
        <Link
          href="/profile"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            pathname === "/profile" || pathname === "/admin/profile"
              ? "!bg-white !text-[#0f172a] shadow-sm [&_svg]:!text-[#2563eb]"
              : "text-slate-300 hover:bg-white/10 hover:text-white dark:hover:bg-slate-900"
          }`}
        >
          <CircleUserRound size={19} /> Hồ sơ
        </Link>
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className={`mt-1 flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
            pathname === "/settings" || pathname === "/admin/settings"
              ? "!bg-white !text-[#0f172a] shadow-sm [&_svg]:!text-[#2563eb]"
              : "text-slate-300 hover:bg-white/10 hover:text-white dark:hover:bg-slate-900"
          }`}
        >
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
    <main className="min-h-screen bg-[#f8fafc] text-[#0f172a] dark:bg-[#020617] dark:text-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-slate-800 dark:border-slate-800 lg:block">
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
        <header className="h-[72px] border-b border-[#e2e8f0] bg-white/95 px-4 backdrop-blur dark:border-slate-800 dark:bg-[#020617]/92 sm:px-6 lg:px-7">
          <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button type="button" onClick={() => setMobileOpen(true)} className="rounded-md border border-[#e2e8f0] bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900 lg:hidden">
                <Menu size={21} />
              </button>
              <h1 className="truncate text-[22px] font-semibold tracking-normal">{pageTitles[pathname] ?? "ScanPDF Admin"}</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-5">
              <ThemeToggle className="!border-[#e2e8f0] !bg-white hover:!bg-[#eff6ff] dark:!border-slate-800 dark:!bg-slate-900 dark:hover:!bg-slate-800" />
              <span className="hidden h-8 w-px bg-[#e2e8f0] dark:bg-slate-800 sm:block" />
              <div className="hidden text-right sm:block">
                <p className="max-w-40 truncate text-sm font-semibold">{user?.fullName || "Quản trị viên"}</p>
                <p className="text-[11px] uppercase tracking-wide text-[#64748b] dark:text-slate-400">Super Admin</p>
              </div>
            </div>
          </div>
        </header>

        <div className="mx-auto min-h-[calc(100vh-124px)] max-w-[1440px] px-4 py-6 sm:px-6 lg:px-7">
          {children}
        </div>
        <footer className="border-t border-[#e2e8f0] bg-white px-6 py-4 text-center text-[11px] text-[#64748b] dark:border-slate-800 dark:bg-[#020617] dark:text-slate-400 lg:text-left">
          <div className="mx-auto flex max-w-[1380px] flex-wrap items-center justify-between gap-3">
            <span>© 2026 ScanPDF Admin. All rights reserved.</span>
            <span>Version 2.1.0-stable</span>
          </div>
        </footer>
      </section>
    </main>
  );
}
