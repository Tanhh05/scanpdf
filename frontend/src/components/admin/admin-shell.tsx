"use client";

import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  LogOut,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAdminAuthStore } from "@/stores/admin-auth.store";
import { ThemeToggle } from "@/components/common/theme-toggle";

const navigation = [
  { label: "Tổng quan", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Người dùng", href: "/admin/users", icon: Users },
  { label: "Gói dịch vụ", href: "/admin/plans", icon: Settings },
  { label: "Thanh toán", href: "/admin/payments", icon: CreditCard },
  { label: "Thống kê", href: "/admin/statistics", icon: BarChart3 },
  { label: "Nhật ký", href: "/admin/logs", icon: FileText },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, token, logout } = useAdminAuthStore();
  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) return <main className="min-h-screen bg-slate-950">{children}</main>;

  if (!token) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 text-center shadow-2xl">
          <Shield className="mx-auto text-indigo-300" size={48} />
          <h1 className="mt-5 text-3xl font-black">Admin ScanPDF</h1>
          <p className="mt-3 text-sm text-slate-300">Đăng nhập bằng tài khoản quản trị để tiếp tục.</p>
          <Link href="/admin/login" className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 font-black text-slate-950">
            Đăng nhập admin
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-800 bg-slate-950 text-white lg:block">
          <div className="sticky top-0 flex h-screen flex-col">
            <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
              <Image src="/scanpdf-icon.png" alt="ScanPDF" width={42} height={42} className="h-11 w-11 object-contain" />
              <div>
                <p className="text-lg font-black">ScanPDF Admin</p>
                <p className="text-xs text-slate-400">Quản trị hệ thống</p>
              </div>
            </div>
            <nav className="flex-1 space-y-1 p-4">
              {navigation.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      active ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <item.icon size={19} /> {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t border-white/10 p-4">
              <div className="rounded-2xl bg-white/5 p-4">
                <p className="truncate font-black">{user?.fullName}</p>
                <p className="mt-1 truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  logout();
                  router.push("/admin/login");
                }}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-red-200 hover:bg-red-500/10"
              >
                <LogOut size={17} /> Đăng xuất
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur lg:px-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-indigo-600">Admin Console</p>
                <h1 className="mt-1 text-2xl font-black">Quản trị ScanPDF</h1>
              </div>
              <div className="flex gap-2 overflow-x-auto lg:hidden">
                {navigation.map((item) => (
                  <Link key={item.href} href={item.href} className="shrink-0 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold">
                    {item.label}
                  </Link>
                ))}
              </div>
              <div className="hidden items-center md:flex">
                <ThemeToggle />
              </div>
            </div>
          </header>
          <div className="p-4 lg:p-8">{children}</div>
        </section>
      </div>
    </main>
  );
}
