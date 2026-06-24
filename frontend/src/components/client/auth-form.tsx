"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";
import { API_BASE_URL } from "@/services/api";
import { Github } from "lucide-react";

const schema = z.object({
  fullName: z.string().optional(),
  email: z.email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự"),
  otp: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const setSession = useAuthStore((state) => state.setSession);
  const { register, handleSubmit, formState: { errors, isSubmitting }, setError } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  async function submit(values: FormValues) {
    try {
      const { data } = await api.post(`/auth/${mode}`, values);
      setSession(data.token, data.user);
      if (mode === "register") {
        window.location.assign(data.verifyUrl ?? "/verify-email?sent=1");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.requiresTwoFactor) {
        setRequiresTwoFactor(true);
      }
      setError("root", {
        message: axios.isAxiosError(error) ? error.response?.data?.message : "Không thể kết nối máy chủ",
      });
    }
  }

  const isRegister = mode === "register";
  return (
    <section className="container-page grid min-h-[75vh] items-center gap-8 py-16 lg:grid-cols-[0.9fr_1.1fr]">
      <div className="auth-hero-copy hidden lg:block">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#10aee8]">ScanPDF Workspace</p>
        <h1 className="auth-hero-title mt-4 max-w-lg font-[var(--font-display)] text-5xl font-black leading-tight">
          Vào hệ thống xử lý tài liệu của bạn
        </h1>
        <p className="auth-hero-description mt-5 max-w-md leading-7">
          Quản lý lịch sử, gói dịch vụ, API key và các luồng chuyển đổi PDF trong một bảng điều khiển thống nhất.
        </p>
      </div>
      <form onSubmit={handleSubmit(submit)} className="card w-full max-w-md justify-self-center p-8">
        <h1 className="font-[var(--font-display)] text-3xl font-black text-[#17201d] dark:text-slate-50">{isRegister ? "Tạo tài khoản" : "Chào mừng trở lại"}</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {isRegister ? "Bắt đầu chuyển đổi tài liệu miễn phí." : "Đăng nhập để xem lịch sử chuyển đổi."}
        </p>
        <div className="mt-7 grid grid-cols-2 gap-3">
          <a href={`${API_BASE_URL}/auth/google`} className="flex items-center justify-center gap-2 rounded-lg border border-[#cbd5c7] bg-white px-4 py-3 text-sm font-bold hover:border-[#10aee8] dark:border-slate-700 dark:bg-slate-900">
            <span className="text-lg font-black text-[#10aee8]">G</span> Google
          </a>
          <a href={`${API_BASE_URL}/auth/github`} className="flex items-center justify-center gap-2 rounded-lg border border-[#cbd5c7] bg-white px-4 py-3 text-sm font-bold hover:border-[#10aee8] dark:border-slate-700 dark:bg-slate-900">
            <Github size={19} /> GitHub
          </a>
        </div>
        <div className="my-6 flex items-center gap-3 text-xs text-slate-400"><span className="h-px flex-1 bg-slate-200" />hoặc dùng email<span className="h-px flex-1 bg-slate-200" /></div>
        <div className="space-y-4">
          {isRegister && (
            <label className="block text-sm font-semibold">Họ và tên
              <input {...register("fullName")} className="field mt-2" placeholder="Nguyễn Văn A" />
            </label>
          )}
          <label className="block text-sm font-semibold">Email
            <input {...register("email")} type="email" className="field mt-2" placeholder="you@example.com" />
            {errors.email && <small className="text-red-600">{errors.email.message}</small>}
          </label>
          <label className="block text-sm font-semibold">Mật khẩu
            <input {...register("password")} type="password" className="field mt-2" placeholder="Tối thiểu 8 ký tự" />
            {errors.password && <small className="text-red-600">{errors.password.message}</small>}
          </label>
          {!isRegister && (
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm font-bold text-[#10aee8]">Quên mật khẩu?</Link>
            </div>
          )}
          {!isRegister && requiresTwoFactor && (
            <label className="block text-sm font-semibold">Mã xác thực 2FA
              <input {...register("otp")} inputMode="numeric" maxLength={6} className="field mt-2" placeholder="123456" />
            </label>
          )}
          {errors.root && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.root.message}</p>}
          <button disabled={isSubmitting} className="btn-primary w-full">
            {isSubmitting ? "Đang xử lý..." : isRegister ? "Đăng ký" : "Đăng nhập"}
          </button>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link className="font-bold text-[#10aee8]" href={isRegister ? "/login" : "/register"}>
            {isRegister ? "Đăng nhập" : "Đăng ký"}
          </Link>
        </p>
      </form>
    </section>
  );
}
