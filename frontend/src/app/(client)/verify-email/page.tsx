"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { api } from "@/services/api";

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const verify = useMutation({
    mutationFn: async () => (await api.post("/auth/verify-email", { token })).data,
  });

  useEffect(() => {
    if (token && verify.isIdle) verify.mutate();
  }, [token, verify]);

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-lg p-8 text-center">
        {verify.isPending && (
          <>
            <MailCheck className="mx-auto text-[#10aee8]" size={54} />
            <h1 className="app-heading mt-5 text-3xl">Đang xác thực email</h1>
            <p className="mt-3 text-slate-500">Vui lòng chờ trong giây lát.</p>
          </>
        )}
        {verify.isSuccess && (
          <>
            <CheckCircle2 className="mx-auto text-emerald-600" size={54} />
            <h1 className="app-heading mt-5 text-3xl">Email đã được xác thực</h1>
            <p className="mt-3 text-slate-500">Tài khoản của bạn đã sẵn sàng sử dụng đầy đủ.</p>
            <Link href="/dashboard" className="btn-primary mt-7">Vào dashboard</Link>
          </>
        )}
        {verify.isError && (
          <>
            <XCircle className="mx-auto text-red-600" size={54} />
            <h1 className="app-heading mt-5 text-3xl">Không thể xác thực</h1>
            <p className="mt-3 text-red-600">
              {axios.isAxiosError(verify.error) ? verify.error.response?.data?.message : "Liên kết không hợp lệ"}
            </p>
            <Link href="/dashboard/profile" className="btn-primary mt-7">Gửi lại liên kết</Link>
          </>
        )}
        {!token && (
          <>
            <MailCheck className="mx-auto text-[#10aee8]" size={54} />
            <h1 className="app-heading mt-5 text-3xl">Kiểm tra hộp thư</h1>
            <p className="mt-3 text-slate-500">Chúng tôi đã gửi liên kết xác thực tới email bạn đăng ký.</p>
            <Link href="/dashboard/profile" className="btn-primary mt-7">Vào hồ sơ</Link>
          </>
        )}
      </div>
    </section>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailContent /></Suspense>;
}
