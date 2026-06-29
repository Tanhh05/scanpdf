"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, AtSign, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { BrandLogo } from "@/components/common/brand-logo";
import { api } from "@/services/api";
import { useAdminAuthStore } from "@/stores/admin-auth.store";

export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAdminAuthStore((state) => state.setSession);
  const token = useAdminAuthStore((state) => state.token);
  const adminUser = useAdminAuthStore((state) => state.user);
  const hasHydrated = useAdminAuthStore((state) => state.hasHydrated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = useMutation({
    mutationFn: async () => {
      const data = (await api.post("/auth/login", { email, password })).data;
      if (data.user.role !== "ADMIN") {
        throw new Error("Tài khoản này không có quyền ADMIN");
      }
      return data;
    },
    onSuccess: (data) => {
      setSession(data.token, data.user);
      router.replace("/dashboard");
    },
  });

  useEffect(() => {
    if (hasHydrated && token && adminUser?.role === "ADMIN") {
      router.replace("/dashboard");
    }
  }, [adminUser?.role, hasHydrated, router, token]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate();
  }

  const errorMessage = login.error
    ? axios.isAxiosError(login.error)
      ? login.error.response?.data?.message ?? "Không thể đăng nhập admin"
      : login.error.message
    : "";

  return (
    <section className="grid min-h-screen bg-[#f8fafc] text-[#0f172a] lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,1fr)]">
      <aside className="hidden border-r border-slate-800 bg-[#0f172a] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <BrandLogo compact admin />
          <div className="mt-16 max-w-md">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">Admin console</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight">Quản trị ScanPDF tập trung và an toàn.</h1>
            <p className="mt-4 text-sm leading-6 text-slate-300">Theo dõi người dùng, gói dịch vụ, thanh toán, hàng đợi xử lý và trạng thái hệ thống từ một giao diện duy nhất.</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
          <ShieldCheck size={18} className="text-blue-300" />
          Phiên đăng nhập chỉ dành cho tài khoản ADMIN.
        </div>
      </aside>

      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 py-8">
        <form
          onSubmit={submit}
          className="w-full max-w-[420px] rounded-lg border border-[#e2e8f0] bg-[#ffffff] p-6 shadow-sm sm:p-8"
        >
          <div className="lg:hidden">
            <BrandLogo compact admin />
          </div>
          <div className="mt-8 lg:mt-0">
            <p className="text-sm font-semibold text-[#2563eb]">ScanPDF Admin</p>
            <h1 className="mt-2 text-2xl font-semibold leading-8">Đăng nhập hệ thống</h1>
            <p className="mt-2 text-sm text-[#64748b]">Sử dụng tài khoản quản trị để tiếp tục.</p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block text-sm font-semibold leading-5">
              Email quản trị
              <span className="relative mt-2 block">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={17} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="username"
                  placeholder="admin@scanpdf.vn"
                  className="admin-login-input h-12 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] pl-11 pr-4 text-sm font-normal text-[#0f172a] outline-none transition placeholder:text-[#94a3b8] focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                  required
                />
              </span>
            </label>

            <label className="block text-sm font-semibold leading-5">
              <span className="flex items-center justify-between gap-4">
                Mật khẩu
                <Link href="/forgot-password" className="font-semibold text-[#2563eb] hover:underline">Quên mật khẩu?</Link>
              </span>
              <span className="relative mt-2 block">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94a3b8]" size={17} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="admin-login-input h-12 w-full rounded-md border border-[#cbd5e1] bg-[#ffffff] pl-11 pr-11 text-sm font-normal text-[#0f172a] outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#94a3b8] hover:bg-[#f1f5f9]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {errorMessage && <p className="rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>}

            <button
              disabled={login.isPending}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-md bg-[#2563eb] text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
              {!login.isPending && <ArrowRight size={18} />}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
