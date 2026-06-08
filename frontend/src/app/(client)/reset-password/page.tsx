"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { api } from "@/services/api";

function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const reset = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>("/auth/reset-password", { token, password })).data,
  });
  const error = reset.error
    ? axios.isAxiosError(reset.error) ? reset.error.response?.data?.message ?? "Không thể đặt lại mật khẩu" : "Không thể đặt lại mật khẩu"
    : "";

  return (
    <section className="container-page flex min-h-[75vh] items-center justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-black">Đặt lại mật khẩu</h1>
        <p className="mt-2 text-slate-500">Nhập mật khẩu mới cho tài khoản của bạn.</p>
        <label className="mt-7 block text-sm font-semibold">
          Mật khẩu mới
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" className="field mt-2" placeholder="Tối thiểu 8 ký tự" />
        </label>
        {!token && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">Thiếu token đặt lại mật khẩu.</p>}
        {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {reset.data && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{reset.data.message}</p>}
        <button disabled={reset.isPending || !token || password.length < 8} onClick={() => reset.mutate()} className="btn-primary mt-6 w-full">
          {reset.isPending ? "Đang cập nhật..." : "Cập nhật mật khẩu"}
        </button>
        <Link href="/login" className="mt-5 block text-center text-sm font-bold text-indigo-600">Đăng nhập</Link>
      </div>
    </section>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container-page py-24 text-center">Đang tải...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
