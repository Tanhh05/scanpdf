"use client";

import { Globe2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLogo } from "@/components/common/brand-logo";

const footerGroups = [
  {
    title: "Công cụ phổ biến",
    links: [
      ["TikTok Downloader", "/tiktok-downloader"],
      ["Instagram Downloader", "/instagram-downloader"],
      ["Remove Watermark Ảnh", "/remove-watermark-image"],
      ["Remove Watermark Video", "/remove-watermark-video"],
      ["Nén PDF", "/tools/compress-pdf"],
    ],
  },
  {
    title: "Công ty",
    links: [
      ["Giới thiệu", "/#tools"],
      ["Tin tức", "/#tools"],
      ["Nghề nghiệp", "/#tools"],
      ["Liên hệ", "/dashboard/profile"],
    ],
  },
  {
    title: "Pháp lý",
    links: [
      ["Điều khoản", "/pricing"],
      ["Bảo mật", "/pricing"],
      ["Cookies", "/pricing"],
      ["Sơ đồ trang", "/#all-tools"],
    ],
  },
];

export function Footer() {
  const pathname = usePathname();

  if (
    pathname.startsWith("/tools/")
    || pathname.startsWith("/dashboard")
    || pathname === "/remove-watermark-image"
    || pathname === "/remove-watermark-video"
  ) return null;

  return (
    <footer className="border-t border-[#d8ded5] bg-[linear-gradient(180deg,#ffffff_0%,#f3f7fb_100%)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,#101820_0%,#07131a_100%)]">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black text-[#17201d] dark:text-slate-50">
            <BrandLogo />
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
            Nền tảng xử lý tài liệu, media và AI PDF cho đội ngũ cần tốc độ, kiểm soát và dữ liệu rõ ràng.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/#all-tools"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef8fd] text-[#34423e] shadow-sm transition hover:bg-[#d6f1fb] hover:text-[#10aee8] dark:bg-slate-800 dark:text-slate-300 dark:shadow-none dark:hover:bg-sky-500/20 dark:hover:text-sky-300"
              aria-label="Ngôn ngữ"
            >
              <Globe2 size={17} />
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex h-9 w-9 items-center justify-center rounded-md bg-[#eef8fd] text-[#34423e] shadow-sm transition hover:bg-[#d6f1fb] hover:text-[#10aee8] dark:bg-slate-800 dark:text-slate-300 dark:shadow-none dark:hover:bg-sky-500/20 dark:hover:text-sky-300"
              aria-label="Liên hệ"
            >
              <Mail size={17} />
            </Link>
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-black text-[#17201d] dark:text-slate-50">{group.title}</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-500 dark:text-slate-400">
              {group.links.map(([label, href]) => (
                <li key={`${group.title}-${label}-${href}`}>
                  <Link href={href} className="transition hover:text-[#10aee8] dark:hover:text-sky-300">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ScanPDF. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Ngôn ngữ: Tiếng Việt</span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} /> Bảo mật SSL 256-bit
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
