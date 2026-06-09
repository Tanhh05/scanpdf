"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, CreditCard, LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";
import { ThemeToggle } from "@/components/common/theme-toggle";
import { BrandLogo } from "@/components/common/brand-logo";

function getInitials(fullName?: string, email?: string) {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 1) return words[0]!.slice(0, 2).toLocaleUpperCase("vi");
  if (words.length > 1) return `${words[0]![0]}${words.at(-1)![0]}`.toLocaleUpperCase("vi");
  return email?.slice(0, 2).toLocaleUpperCase("vi") ?? "TK";
}

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  if (pathname.startsWith("/tools/")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="container-page flex h-[72px] items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-xl font-black tracking-tight text-slate-950">
          <BrandLogo />
        </Link>
        <nav className="hidden items-center gap-8 text-sm font-bold text-slate-700 md:flex">
          <Link href="/#tools" className="transition hover:text-indigo-600">Công cụ PDF</Link>
          <Link href="/tools/compress-pdf" className="transition hover:text-indigo-600">Nén PDF</Link>
          <Link href="/tools/merge-pdf" className="transition hover:text-indigo-600">Ghép PDF</Link>
          <Link href="/ai/chat-pdf" className="transition hover:text-indigo-600">AI PDF</Link>
          <Link href="/pricing" className="transition hover:text-indigo-600">Bảng giá</Link>
        </nav>
        <div className="hidden items-center gap-4 text-sm font-bold md:flex">
          <ThemeToggle />
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 transition hover:border-slate-300 hover:bg-slate-50"
                aria-expanded={profileOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                  {getInitials(user.fullName, user.email)}
                </span>
                <span className="max-w-32 truncate">{user.fullName}</span>
                <ChevronDown size={15} className={`text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)]">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <p className="truncate text-base font-black text-slate-900">{user.fullName}</p>
                    <p className="mt-1 truncate text-xs font-normal text-slate-500">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50">
                      <LayoutDashboard size={18} /> Tổng quan tài khoản
                    </Link>
                    <Link href="/dashboard/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50">
                      <UserRound size={18} /> Hồ sơ của tôi
                    </Link>
                    <Link href="/pricing" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50">
                      <CreditCard size={18} /> Gói dịch vụ
                    </Link>
                  </div>
                  <div className="border-t border-slate-100 p-2">
                    <button
                      type="button"
                      onClick={() => { logout(); setProfileOpen(false); }}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-3 text-left text-red-600 hover:bg-red-50"
                    >
                      <LogOut size={18} /> Đăng xuất
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link href="/login" className="transition hover:text-indigo-600">Đăng nhập</Link>
              <Link href="/register" className="btn-primary !px-5 !py-2.5">Dùng miễn phí</Link>
            </>
          )}
        </div>
        <button
          type="button"
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          onClick={() => setMenuOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 md:hidden"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-5 md:hidden">
          <nav className="mx-auto flex max-w-xl flex-col gap-1 text-sm font-bold">
            <div className="mb-2 flex items-center justify-between rounded-lg px-3 py-2">
              <span>Giao diện</span>
              <ThemeToggle />
            </div>
            <Link href="/#tools" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-50">Công cụ PDF</Link>
            <Link href="/tools/compress-pdf" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-50">Nén PDF</Link>
            <Link href="/tools/merge-pdf" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-50">Ghép PDF</Link>
            <Link href="/ai/chat-pdf" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-50">AI PDF</Link>
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 hover:bg-slate-50">Bảng giá</Link>
            <div className="mt-3 border-t border-slate-100 pt-3">
              {user ? (
                <div className="flex gap-2">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-center">Tài khoản</Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="flex-1 rounded-lg bg-slate-900 px-4 py-3 text-white">Đăng xuất</button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1 rounded-lg border border-slate-200 px-4 py-3 text-center">Đăng nhập</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="flex-1 rounded-lg bg-indigo-600 px-4 py-3 text-center text-white">Dùng miễn phí</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
