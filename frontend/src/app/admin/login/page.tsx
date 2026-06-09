"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { ArrowRight, AtSign, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
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
      router.replace("/admin/dashboard");
    },
  });

  useEffect(() => {
    if (hasHydrated && token && adminUser?.role === "ADMIN") {
      router.replace("/admin/dashboard");
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
    <section className="flex min-h-screen items-center justify-center bg-[#faf8ff] px-4 py-5 text-[#172033]">
      <form
        onSubmit={submit}
        className="w-full max-w-[420px] rounded-xl border border-[#dde0e8] bg-white p-6 shadow-[0_12px_36px_rgba(38,42,58,0.10)] sm:p-8"
      >
          <h1 className="text-2xl font-bold leading-8 tracking-[-0.02em]">Đăng nhập hệ thống</h1>

          <div className="mt-5 flex items-start gap-3 rounded-lg border border-[#b8c7ff] bg-[#f4f5ff] px-4 py-3.5 text-sm font-medium leading-5 text-[#4c5260]">
            <ShieldCheck className="mt-0.5 shrink-0 text-[#2162e8]" size={17} />
            <p>Đây là khu vực quản trị riêng. Vui lòng không chia sẻ thông tin đăng nhập.</p>
          </div>

          <div className="mt-6 space-y-5">
            <label className="block text-sm font-semibold leading-5">
              Email quản trị
              <span className="relative mt-2 block">
                <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e96a8]" size={17} />
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="username"
                  placeholder="admin@scanpdf.vn"
                  className="h-12 w-full rounded-lg border border-[#d9dde6] bg-white pl-11 pr-4 text-sm font-normal outline-none transition placeholder:text-[#687083] focus:border-[#2864e8] focus:ring-2 focus:ring-[#2864e8]/10"
                  required
                />
              </span>
            </label>

            <label className="block text-sm font-semibold leading-5">
              <span className="flex items-center justify-between gap-4">
                Mật khẩu
                <Link href="/forgot-password" className="font-semibold text-[#1757d4] hover:underline">Quên mật khẩu?</Link>
              </span>
              <span className="relative mt-2 block">
                <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8e96a8]" size={17} />
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-12 w-full rounded-lg border border-[#d9dde6] bg-white pl-11 pr-11 text-sm font-normal outline-none transition focus:border-[#2864e8] focus:ring-2 focus:ring-[#2864e8]/10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="absolute right-2.5 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-[#8e96a8] hover:bg-slate-100"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </span>
            </label>

            {errorMessage && <p className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{errorMessage}</p>}

            <button
              disabled={login.isPending}
              className="flex h-[50px] w-full items-center justify-center gap-2 rounded-lg bg-[#2d66e8] text-sm font-bold text-white transition hover:bg-[#2458ce] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {login.isPending ? "Đang đăng nhập..." : "Đăng nhập"}
              {!login.isPending && <ArrowRight size={18} />}
            </button>
          </div>
      </form>
    </section>
  );
}
