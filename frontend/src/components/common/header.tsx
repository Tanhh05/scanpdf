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

const toolLinks = [
  ["Tất cả công cụ", "/#tools"],
  ["Nén PDF", "/tools/compress-pdf"],
  ["PDF sang Word", "/tools/pdf-to-word"],
  ["Word sang PDF", "/tools/word-to-pdf"],
  ["AI PDF", "/ai/chat-pdf"],
] as const;

const downloaderLinks = [
  ["TikTok", "/tiktok-downloader"],
  ["YouTube", "/youtube-downloader"],
  ["Facebook", "/facebook-downloader"],
  ["Instagram", "/instagram-downloader"],
] as const;

export function Header() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [downloadersOpen, setDownloadersOpen] = useState(false);
  const { user, logout } = useAuthStore();
  if (
    pathname.startsWith("/tools/")
    || pathname === "/remove-watermark-image"
    || pathname === "/remove-watermark-video"
  ) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90">
      <div className="container-page flex h-16 items-center justify-between gap-3 sm:h-[72px] sm:gap-5">
        <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2 text-lg font-black tracking-tight text-slate-950 dark:text-slate-50 sm:gap-2.5 sm:text-xl">
          <BrandLogo />
        </Link>
        <nav className="hidden min-w-0 flex-1 items-center justify-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 lg:flex">
          <div
            className="relative"
            onMouseEnter={() => setToolsOpen(true)}
            onMouseLeave={() => setToolsOpen(false)}
          >
            <button
              type="button"
              onClick={() => setToolsOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-1.5 px-3 transition hover:text-indigo-600 dark:hover:text-indigo-300"
              aria-expanded={toolsOpen}
            >
              Công cụ <ChevronDown size={15} className={`transition ${toolsOpen ? "rotate-180" : ""}`} />
            </button>
            {toolsOpen && (
              <div className="absolute left-0 top-full z-40 w-56 border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                {toolLinks.map(([label, href]) => (
                  <Link key={href} href={href} onClick={() => setToolsOpen(false)} className="block px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-indigo-300">
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div
            className="relative"
            onMouseEnter={() => setDownloadersOpen(true)}
            onMouseLeave={() => setDownloadersOpen(false)}
          >
            <button
              type="button"
              onClick={() => setDownloadersOpen((open) => !open)}
              className="inline-flex h-10 items-center gap-1.5 px-3 transition hover:text-indigo-600 dark:hover:text-indigo-300"
              aria-expanded={downloadersOpen}
            >
              Downloader <ChevronDown size={15} className={`transition ${downloadersOpen ? "rotate-180" : ""}`} />
            </button>
            {downloadersOpen && (
              <div className="absolute left-0 top-full z-40 w-52 border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-950">
                {downloaderLinks.map(([label, href]) => (
                  <Link key={href} href={href} onClick={() => setDownloadersOpen(false)} className="block px-3 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-indigo-300">
                    {label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <Link href="/remove-watermark-image" className="px-3 transition hover:text-indigo-600 dark:hover:text-indigo-300">Remove Watermark</Link>
          <Link href="/ai/chat-pdf" className="px-3 transition hover:text-indigo-600 dark:hover:text-indigo-300">AI PDF</Link>
          <Link href="/pricing" className="px-3 transition hover:text-indigo-600 dark:hover:text-indigo-300">Bảng giá</Link>
        </nav>
        <div className="hidden shrink-0 items-center gap-3 text-sm font-bold md:flex">
          <ThemeToggle />
          {user ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setProfileOpen((open) => !open)}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-slate-200 bg-white/90 py-1.5 pl-1.5 pr-3 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
                aria-expanded={profileOpen}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-black text-white">
                  {getInitials(user.fullName, user.email)}
                </span>
                <span className="max-w-32 truncate dark:text-slate-100">{user.fullName}</span>
                <ChevronDown size={15} className={`text-slate-400 transition ${profileOpen ? "rotate-180" : ""}`} />
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-[calc(100%+10px)] w-72 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950">
                  <div className="border-b border-slate-100 px-5 py-4">
                    <p className="truncate text-base font-black text-slate-900 dark:text-slate-50">{user.fullName}</p>
                    <p className="mt-1 truncate text-xs font-normal text-slate-500">{user.email}</p>
                  </div>
                  <div className="p-2">
                    <Link href="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">
                      <LayoutDashboard size={18} /> Tổng quan tài khoản
                    </Link>
                    <Link href="/dashboard/profile" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">
                      <UserRound size={18} /> Hồ sơ của tôi
                    </Link>
                    <Link href="/pricing" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900">
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
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 md:hidden"
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
      {menuOpen && (
        <div className="border-t border-slate-100 bg-white/95 px-4 py-4 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95 md:hidden">
          <nav className="mx-auto flex max-w-xl flex-col gap-1 text-sm font-bold">
            <div className="mb-2 flex items-center justify-between border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <span>Giao diện</span>
              <ThemeToggle />
            </div>
            <Link href="/#tools" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">Công cụ PDF</Link>
            <Link href="/tiktok-downloader" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">TikTok Downloader</Link>
            <Link href="/remove-watermark-image" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">Remove Watermark</Link>
            <Link href="/instagram-downloader" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">Instagram Downloader</Link>
            <Link href="/tools/compress-pdf" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">Nén PDF</Link>
            <Link href="/ai/chat-pdf" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">AI PDF</Link>
            <Link href="/pricing" onClick={() => setMenuOpen(false)} className="px-3 py-3 hover:bg-slate-50 dark:hover:bg-slate-900">Bảng giá</Link>
            <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              {user ? (
                <div className="grid gap-2 min-[380px]:grid-cols-2">
                  <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="border border-slate-200 px-4 py-3 text-center dark:border-slate-700">Tài khoản</Link>
                  <button onClick={() => { logout(); setMenuOpen(false); }} className="bg-slate-900 px-4 py-3 text-white dark:bg-slate-100 dark:text-slate-950">Đăng xuất</button>
                </div>
              ) : (
                <div className="grid gap-2 min-[380px]:grid-cols-2">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="border border-slate-200 px-4 py-3 text-center dark:border-slate-700">Đăng nhập</Link>
                  <Link href="/register" onClick={() => setMenuOpen(false)} className="bg-indigo-600 px-4 py-3 text-center text-white">Dùng miễn phí</Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
