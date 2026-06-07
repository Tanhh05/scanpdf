"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, LoaderCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import { Suspense, useEffect, useState } from "react";
import { api } from "@/services/api";

type PaymentStatus = {
  orderCode: string;
  amount: number;
  status: string;
  qrCode?: string;
  description?: string;
  plan: { name: string };
  bank?: { bin?: string; accountNumber?: string; accountName?: string };
};

function VietQrContent() {
  const router = useRouter();
  const orderCode = useSearchParams().get("orderCode");
  const [qrImage, setQrImage] = useState("");
  const payment = useQuery<PaymentStatus>({
    queryKey: ["payment-qr", orderCode],
    queryFn: async () => (await api.get(`/payments/status/${orderCode}`)).data,
    enabled: Boolean(orderCode),
    refetchInterval: (query) => query.state.data?.status === "PENDING" ? 2000 : false,
  });
  const cancel = useMutation({
    mutationFn: async () => api.post(`/payments/${orderCode}/cancel`),
    onSuccess: () => router.replace("/pricing"),
  });

  useEffect(() => {
    if (payment.data?.qrCode) {
      void QRCode.toDataURL(payment.data.qrCode, { width: 320, margin: 1 }).then(setQrImage);
    }
  }, [payment.data?.qrCode]);

  if (payment.data?.status === "PAID") {
    return (
      <div className="card max-w-lg p-10 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={56} />
        <h1 className="mt-5 text-3xl font-black">Đã kích hoạt gói {payment.data.plan.name}</h1>
        <p className="mt-3 text-slate-500">Giao dịch đã được PayOS xác nhận.</p>
        <Link href="/dashboard" className="btn-primary mt-7">Về dashboard</Link>
      </div>
    );
  }
  if (payment.data?.status === "CANCELLED" || payment.data?.status === "FAILED") {
    return (
      <div className="card max-w-lg p-10 text-center">
        <XCircle className="mx-auto text-red-600" size={56} />
        <h1 className="mt-5 text-3xl font-black">Thanh toán không còn hiệu lực</h1>
        <p className="mt-3 text-slate-500">Tạo một giao dịch mới để tiếp tục nâng cấp.</p>
        <Link href="/pricing" className="btn-primary mt-7">Quay lại bảng giá</Link>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-3xl p-8">
      <div className="text-center">
        <h1 className="text-3xl font-black">Quét VietQR để nâng cấp {payment.data?.plan.name ?? ""}</h1>
        <p className="mt-2 text-slate-500">Mở ứng dụng ngân hàng và quét mã bên dưới.</p>
      </div>
      <div className="mt-8 grid items-center gap-8 md:grid-cols-2">
        <div className="flex min-h-80 items-center justify-center rounded-2xl bg-slate-50 p-4">
          {qrImage
            ? <img src={qrImage} alt="VietQR thanh toán ScanPDF Pro" className="w-full max-w-72" />
            : <LoaderCircle className="animate-spin text-indigo-600" />}
        </div>
        <dl className="space-y-4 text-sm">
          <div><dt className="text-slate-500">Ngân hàng / BIN</dt><dd className="mt-1 font-bold">{payment.data?.bank?.bin ?? "..."}</dd></div>
          <div><dt className="text-slate-500">Số tài khoản</dt><dd className="mt-1 flex items-center gap-2 font-bold">{payment.data?.bank?.accountNumber ?? "..."} <CopyButton value={payment.data?.bank?.accountNumber} /></dd></div>
          <div><dt className="text-slate-500">Chủ tài khoản</dt><dd className="mt-1 font-bold">{payment.data?.bank?.accountName ?? "..."}</dd></div>
          <div><dt className="text-slate-500">Số tiền</dt><dd className="mt-1 text-2xl font-black text-indigo-600">{payment.data?.amount.toLocaleString("vi-VN") ?? "..."}đ</dd></div>
          <div><dt className="text-slate-500">Nội dung</dt><dd className="mt-1 flex items-center gap-2 font-bold">{payment.data?.description ?? "..."} <CopyButton value={payment.data?.description} /></dd></div>
          <p className="rounded-xl bg-amber-50 p-3 text-amber-800">Giữ nguyên số tiền và nội dung để hệ thống tự động xác nhận.</p>
        </dl>
      </div>
      <p className="mt-7 flex items-center justify-center gap-2 text-sm text-slate-500"><LoaderCircle size={16} className="animate-spin" /> Đang chờ giao dịch...</p>
      <div className="mt-4 text-center">
        <button disabled={cancel.isPending} onClick={() => cancel.mutate()} className="cursor-pointer text-sm font-semibold text-slate-500 hover:text-red-600">
          {cancel.isPending ? "Đang hủy..." : "Hủy giao dịch"}
        </button>
      </div>
    </div>
  );
}

function CopyButton({ value }: { value?: string }) {
  return (
    <button type="button" title="Sao chép" className="cursor-pointer text-slate-400 hover:text-indigo-600" onClick={() => value && navigator.clipboard.writeText(value)}>
      <Copy size={15} />
    </button>
  );
}

export default function VietQrPage() {
  return <section className="container-page flex min-h-[75vh] items-center justify-center py-12"><Suspense><VietQrContent /></Suspense></section>;
}
