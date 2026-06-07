"use client";

import {
  Archive,
  FileImage,
  Files,
  FileText,
  Grid2X2,
  PenLine,
  ScanText,
  Sparkles,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useAuthStore } from "@/stores/auth.store";

const tools = [
  { label: "Chuyển đổi", icon: Files, href: "/tools/word-to-pdf" },
  { label: "Sắp xếp", icon: Grid2X2, href: "#" },
  { label: "Chỉnh sửa", icon: FileText, href: "#" },
  { label: "Ký tên", icon: PenLine, href: "#" },
  { label: "AI PDF", icon: Sparkles, href: "#" },
  { label: "Thêm", icon: Grid2X2, href: "#" },
];

const conversionTools = [
  { label: "PDF ↔ Word", icon: FileText, color: "bg-blue-500", href: "/tools/pdf-to-word" },
  { label: "Ghép PDF", icon: Files, color: "bg-indigo-500", href: "/tools/merge-pdf" },
  { label: "Nén PDF", icon: Archive, color: "bg-violet-500", href: "/tools/compress-pdf" },
  { label: "JPG → PDF", icon: FileImage, color: "bg-amber-500", href: "/tools/jpg-to-pdf" },
  { label: "PDF → JPG", icon: FileImage, color: "bg-orange-500", href: "/tools/pdf-to-jpg" },
  { label: "PDF OCR", icon: ScanText, color: "bg-red-500", href: "/tools/ocr-pdf" },
];

function getInitials(fullName?: string, email?: string) {
  const words = fullName?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length === 1) return words[0]!.slice(0, 2).toLocaleUpperCase("vi");
  if (words.length > 1) {
    return `${words[0]![0]}${words.at(-1)![0]}`.toLocaleUpperCase("vi");
  }
  return email?.slice(0, 2).toLocaleUpperCase("vi") ?? "TK";
}

export function ToolWorkspace({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [conversionMenuOpen, setConversionMenuOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const initials = getInitials(user?.fullName, user?.email);

  return (
    <section className="min-h-screen bg-[#f2f6ff]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[76px] shrink-0 flex-col bg-[#06245d] text-white md:flex">
          <nav className="flex flex-1 flex-col items-center gap-1 py-3">
            <Link href="/" className="mb-2 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10">
              <Image src="/scanpdf-icon.png" alt="ScanPDF" width={48} height={48} className="h-12 w-12 object-contain" priority />
            </Link>
            {tools.map((item, index) => (
              index === 0 ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setConversionMenuOpen((open) => !open)}
                  className={`flex w-full cursor-pointer flex-col items-center gap-1 py-3 text-[10px] transition hover:bg-white/10 ${conversionMenuOpen ? "bg-white/10" : ""}`}
                >
                  <item.icon size={21} strokeWidth={1.7} />
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex w-full flex-col items-center gap-1 py-3 text-[10px] transition hover:bg-white/10"
                >
                  <item.icon size={21} strokeWidth={1.7} />
                  <span>{item.label}</span>
                </Link>
              )
            ))}
          </nav>
          <Link href="/dashboard" className="flex flex-col items-center gap-1 border-t border-white/20 py-4 text-[10px] hover:bg-white/10">
            <UserRound size={21} />
            Tài khoản
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex min-h-14 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
            <div className="flex items-center gap-2">
              <Link href="/pricing" className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                Nâng cấp
              </Link>
              <Link
                href="/dashboard"
                title={user?.fullName ?? "Tài khoản"}
                aria-label={user?.fullName ? `Tài khoản của ${user.fullName}` : "Tài khoản"}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white"
              >
                {initials}
              </Link>
            </div>
          </div>

          <div className="flex overflow-x-auto bg-[#06245d] text-white md:hidden">
            {tools.slice(0, 5).map((item) => (
              <Link key={item.label} href={item.href} className="flex min-w-20 flex-col items-center gap-1 px-3 py-2 text-[10px]">
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="relative p-4 sm:p-7 lg:p-10">
            {conversionMenuOpen && <div className="absolute left-5 top-16 z-10 hidden w-52 rounded-md bg-[#06245d] p-3 text-white shadow-xl lg:block">
              <div className="mb-3 flex items-center gap-2 border-b border-white/15 pb-3 text-sm font-bold">
                <span className="rounded bg-red-500 p-1"><Archive size={16} /></span>
                Công cụ chuyển đổi
              </div>
              <div className="space-y-1">
                {conversionTools.map((item) => (
                  <Link key={item.label} href={item.href} onClick={() => setConversionMenuOpen(false)} className="flex items-center gap-2 rounded px-1 py-2 text-sm hover:bg-white/10">
                    <span className={`rounded p-1 ${item.color}`}><item.icon size={15} /></span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>}
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
