"use client";

import {
  Archive,
  Boxes,
  Droplet,
  FileImage,
  Files,
  FileText,
  Hash,
  ListOrdered,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCw,
  ScanText,
  Signature,
  Scissors,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";

const tools = [
  { label: "Chuyển đổi", icon: Files, href: "/tools/word-to-pdf" },
];

const conversionTools = [
  { label: "Batch convert", icon: Boxes, color: "bg-purple-600", href: "/tools/batch-convert" },
  { label: "PDF ↔ Word", icon: FileText, color: "bg-blue-500", href: "/tools/pdf-to-word" },
  { label: "Ghép PDF", icon: Files, color: "bg-indigo-500", href: "/tools/merge-pdf" },
  { label: "Nén PDF", icon: Archive, color: "bg-violet-500", href: "/tools/compress-pdf" },
  { label: "JPG → PDF", icon: FileImage, color: "bg-amber-500", href: "/tools/jpg-to-pdf" },
  { label: "PDF → JPG", icon: FileImage, color: "bg-orange-500", href: "/tools/pdf-to-jpg" },
  { label: "PDF OCR", icon: ScanText, color: "bg-red-500", href: "/tools/ocr-pdf" },
  { label: "Tách PDF", icon: Scissors, color: "bg-cyan-500", href: "/tools/split-pdf" },
  { label: "Xoay PDF", icon: RotateCw, color: "bg-emerald-500", href: "/tools/rotate-pdf" },
  { label: "Xóa trang", icon: Files, color: "bg-rose-500", href: "/tools/delete-pdf-pages" },
  { label: "Watermark", icon: Droplet, color: "bg-sky-500", href: "/tools/watermark-pdf" },
  { label: "Sắp xếp trang", icon: ListOrdered, color: "bg-fuchsia-500", href: "/tools/reorder-pdf" },
  { label: "Đánh số trang", icon: Hash, color: "bg-teal-500", href: "/tools/add-page-numbers" },
  { label: "Khóa PDF", icon: LockKeyhole, color: "bg-slate-600", href: "/tools/protect-pdf" },
  { label: "Mở khóa PDF", icon: LockKeyholeOpen, color: "bg-lime-600", href: "/tools/unlock-pdf" },
  { label: "Ký PDF", icon: Signature, color: "bg-blue-700", href: "/tools/sign-pdf" },
];

export function ToolWorkspace({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [conversionMenuOpen, setConversionMenuOpen] = useState(false);

  return (
    <section className="min-h-screen bg-[#f5f7fc]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[82px] shrink-0 flex-col bg-[#08275f] text-white shadow-xl md:flex">
          <nav className="flex flex-1 flex-col items-center gap-1 py-3">
            <Link href="/" className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 transition hover:bg-white/15">
              <Image src="/scanpdf-icon.png" alt="ScanPDF" width={48} height={48} className="h-12 w-12 object-contain" priority />
            </Link>
            {tools.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => setConversionMenuOpen((open) => !open)}
                className={`flex w-full cursor-pointer flex-col items-center gap-1.5 border-l-2 py-4 font-normal transition hover:bg-white/10 ${
                  conversionMenuOpen ? "border-white bg-white/10" : "border-transparent"
                }`}
              >
                <item.icon size={19} strokeWidth={1.7} />
                <span className="w-full px-1 text-center text-[9px] font-normal leading-none">{item.label}</span>
              </button>
            ))}
          </nav>
          <Link href="/dashboard" className="flex flex-col items-center gap-1.5 border-t border-white/15 py-5 text-[11px] transition hover:bg-white/10">
            <UserRound size={21} />
            Tài khoản
          </Link>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 sm:px-7">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/"
                aria-label="Về trang chủ ScanPDF"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 transition hover:bg-indigo-100 md:hidden"
              >
                <Image
                  src="/scanpdf-icon.png"
                  alt="ScanPDF"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500 sm:text-xs sm:tracking-[0.14em]">
                  Công cụ PDF
                </p>
                <h1 className="mt-0.5 truncate text-lg font-black text-slate-950 sm:text-xl">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Link href="/pricing" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 sm:px-4">
                Nâng cấp
              </Link>
            </div>
          </div>

          <div className="flex overflow-x-auto bg-[#06245d] text-white md:hidden">
            {conversionTools.map((item) => (
              <Link key={item.label} href={item.href} className="flex min-w-24 flex-col items-center gap-1 px-3 py-2 text-[10px]">
                <item.icon size={18} />
                {item.label}
              </Link>
            ))}
          </div>

          <div className="relative px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
            {conversionMenuOpen && <div className="absolute left-5 top-16 z-20 hidden w-56 rounded-xl bg-[#08275f] p-3 text-white shadow-2xl lg:block">
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
