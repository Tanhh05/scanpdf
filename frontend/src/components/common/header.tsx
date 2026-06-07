"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth.store";

export function Header() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  if (pathname.startsWith("/tools/")) return null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-black text-slate-900">
          <Image
            src="/scanpdf-icon.png"
            alt="ScanPDF"
            width={40}
            height={40}
            priority
            className="h-10 w-10 object-contain"
          />
          ScanPDF
        </Link>
        <nav className="flex items-center gap-5 text-sm font-semibold">
          <Link href="/#tools">Công cụ</Link>
          <Link href="/pricing">Bảng giá</Link>
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <button onClick={logout} className="cursor-pointer text-slate-500">Đăng xuất</button>
            </>
          ) : (
            <>
              <Link href="/login">Đăng nhập</Link>
              <Link href="/register" className="btn-primary !py-2">Đăng ký</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
