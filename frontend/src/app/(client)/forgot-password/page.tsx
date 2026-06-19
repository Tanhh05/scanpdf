"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/services/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const request = useMutation({
    mutationFn: async () => (await api.post<{ message: string }>("/auth/forgot-password", { email })).data,
  });
  const error = request.error
    ? axios.isAxiosError(request.error) ? request.error.response?.data?.message ?? "Không thể gửi yêu cầu" : "Không thể gửi yêu cầu"
    : "";

  return (
    <section className="container-page flex min-h-[75vh] items-center justify-center py-16">
      <div className="card w-full max-w-md p-8">
        <h1 className="text-3xl font-black">Quên mật khẩu</h1>
        <p className="mt-2 text-slate-500">Nhập email để nhận liên kết đặt lại mật khẩu.</p>
        <label className="mt-7 block text-sm font-semibold">
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} className="field mt-2" placeholder="you@example.com" />
        </label>
        {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {request.data && (
          <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
            <p>{request.data.message}</p>
          </div>
        )}
        <button disabled={request.isPending || !email} onClick={() => request.mutate()} className="btn-primary mt-6 w-full">
          {request.isPending ? "Đang gửi..." : "Gửi liên kết"}
        </button>
        <Link href="/login" className="mt-5 block text-center text-sm font-bold text-[#10aee8]">Quay lại đăng nhập</Link>
      </div>
    </section>
  );
}
