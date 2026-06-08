"use client";

import { Globe2, Mail, ShieldCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const footerGroups = [
  {
    title: "Công cụ phổ biến",
    links: [
      ["Nén PDF", "/tools/compress-pdf"],
      ["Ghép PDF", "/tools/merge-pdf"],
      ["PDF sang Word", "/tools/pdf-to-word"],
      ["Xoay PDF", "/tools/rotate-pdf"],
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

  if (pathname.startsWith("/tools/")) return null;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-[1.25fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black text-slate-950">
            <Image src="/scanpdf-icon.png" alt="ScanPDF" width={38} height={38} className="h-9 w-9 object-contain" />
            ScanPDF
          </Link>
          <p className="mt-5 max-w-xs text-sm leading-6 text-slate-500">
            Giải pháp PDF thông minh giúp hàng triệu người dùng xử lý tài liệu hiệu quả mỗi ngày.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              href="/#all-tools"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Ngôn ngữ"
            >
              <Globe2 size={17} />
            </Link>
            <Link
              href="/dashboard/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-indigo-50 hover:text-indigo-600"
              aria-label="Liên hệ"
            >
              <Mail size={17} />
            </Link>
          </div>
        </div>

        {footerGroups.map((group) => (
          <div key={group.title}>
            <h2 className="text-sm font-black text-slate-950">{group.title}</h2>
            <ul className="mt-5 space-y-3 text-sm text-slate-500">
              {group.links.map(([label, href]) => (
                <li key={`${group.title}-${label}-${href}`}>
                  <Link href={href} className="transition hover:text-indigo-600">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-200">
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
