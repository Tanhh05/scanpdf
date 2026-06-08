"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Shield } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { api } from "@/services/api";
import { useAdminAuthStore } from "@/stores/admin-auth.store";
import { ThemeToggle } from "@/components/common/theme-toggle";

export default function AdminLoginPage() {
  const router = useRouter();
  const setSession = useAdminAuthStore((state) => state.setSession);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const login = useMutation({
    mutationFn: async () => (await api.post("/auth/login", {
      email,
      password,
      otp: otp || undefined,
    })).data,
    onSuccess: (data) => {
      if (data.user.role !== "ADMIN") {
        throw new Error("Tài khoản này không có quyền ADMIN");
      }
      setSession(data.token, data.user);
      router.push("/admin/dashboard");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate();
  }

  const errorMessage = login.error
    ? axios.isAxiosError(login.error)
      ? login.error.response?.data?.message ?? "Không thể đăng nhập admin"
      : login.error.message
    : "";
  const requiresTwoFactor = axios.isAxiosError(login.error) && login.error.response?.data?.requiresTwoFactor;

  return (
    <section className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#1d4ed8_0,#020617_42%,#020617_100%)] p-6 text-white">
      <ThemeToggle className="absolute right-6 top-6 border-white/20 bg-white/10 text-white hover:bg-white/20" />
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/10 bg-white/10 p-8 shadow-2xl backdrop-blur">
        <div className="flex items-center gap-3">
          <Image src="/scanpdf-icon.png" alt="ScanPDF" width={48} height={48} className="h-12 w-12 object-contain" />
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-200">Admin Console</p>
            <h1 className="text-3xl font-black">ScanPDF</h1>
          </div>
        </div>
        <div className="mt-8 flex items-start gap-3 rounded-2xl bg-black/20 p-4">
          <Shield className="mt-0.5 text-indigo-200" size={22} />
          <p className="text-sm leading-6 text-slate-200">Đây là khu vực quản trị riêng. Session admin không dùng chung với tài khoản client.</p>
        </div>
        <div className="mt-7 space-y-4">
          <label className="block text-sm font-bold">
            Email admin
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="field mt-2 !bg-white !text-slate-950" required />
          </label>
          <label className="block text-sm font-bold">
            Mật khẩu
            <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="field mt-2 !bg-white !text-slate-950" required />
          </label>
          {requiresTwoFactor && (
            <label className="block text-sm font-bold">
              Mã 2FA
              <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" className="field mt-2 !bg-white !text-slate-950" placeholder="123456" />
            </label>
          )}
          {errorMessage && <p className="rounded-xl bg-red-500/15 p-3 text-sm font-bold text-red-100">{errorMessage}</p>}
          <button disabled={login.isPending} className="w-full rounded-xl bg-white px-5 py-3.5 font-black text-slate-950 transition hover:bg-indigo-50 disabled:opacity-60">
            {login.isPending ? "Đang đăng nhập..." : "Đăng nhập admin"}
          </button>
        </div>
      </form>
    </section>
  );
}
