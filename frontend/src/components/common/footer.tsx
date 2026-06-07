"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const toolLinks = [
  ["Nén PDF", "/tools/compress-pdf"],
  ["Ghép PDF", "/tools/merge-pdf"],
  ["PDF sang Word", "/tools/pdf-to-word"],
  ["Word sang PDF", "/tools/word-to-pdf"],
  ["PDF OCR", "/tools/ocr-pdf"],
];

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/tools/")) return null;

  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link href="/" className="flex items-center gap-2.5 text-xl font-black text-slate-950">
            <Image src="/scanpdf-icon.png" alt="ScanPDF" width={38} height={38} className="h-9 w-9 object-contain" />
            ScanPDF
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-slate-500">
            Công cụ trực tuyến giúp chuyển đổi và xử lý tài liệu PDF nhanh chóng, đơn giản.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Công cụ phổ biến</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-500">
            {toolLinks.map(([label, href]) => (
              <li key={href}><Link href={href} className="transition hover:text-indigo-600">{label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">Tài khoản</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-500">
            <li><Link href="/login" className="transition hover:text-indigo-600">Đăng nhập</Link></li>
            <li><Link href="/register" className="transition hover:text-indigo-600">Đăng ký</Link></li>
            <li><Link href="/dashboard" className="transition hover:text-indigo-600">Lịch sử chuyển đổi</Link></li>
            <li><Link href="/pricing" className="transition hover:text-indigo-600">Gói dịch vụ</Link></li>
          </ul>
        </div>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">ScanPDF</h2>
          <ul className="mt-4 space-y-3 text-sm text-slate-500">
            <li><Link href="/#tools" className="transition hover:text-indigo-600">Tất cả công cụ</Link></li>
            <li><Link href="/pricing" className="transition hover:text-indigo-600">Bảng giá</Link></li>
            <li><span>Tài liệu được xử lý an toàn</span></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} ScanPDF. Mọi quyền được bảo lưu.</p>
          <p>Được xây dựng để việc xử lý PDF trở nên đơn giản.</p>
        </div>
      </div>
    </footer>
  );
}
