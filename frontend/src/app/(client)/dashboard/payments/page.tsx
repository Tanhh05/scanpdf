"use client";

import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import { Pagination } from "@/components/common/pagination";
import type { PaginatedList, Payment } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export default function PaymentsPage() {
  const token = useAuthStore((state) => state.token);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState("");
  const [paymentPage, setPaymentPage] = useState(1);
  const [subscriptionPage, setSubscriptionPage] = useState(1);
  const payments = useQuery<PaginatedList<Payment>>({
    queryKey: ["my-payments", paymentPage],
    queryFn: async () => (await api.get("/payments/mine", { params: { page: paymentPage, limit: 5 } })).data,
    enabled: !!token,
  });
  const subscriptions = useQuery<PaginatedList<{
    id: string;
    status: string;
    startDate: string;
    endDate?: string | null;
    plan: { name: string };
  }>>({
    queryKey: ["my-subscriptions", subscriptionPage],
    queryFn: async () => (await api.get("/subscriptions", { params: { page: subscriptionPage, limit: 5 } })).data,
    enabled: !!token,
  });

  async function downloadInvoice(payment: Payment) {
    setDownloadingId(payment.id);
    setDownloadError("");
    try {
      const response = await api.get(`/payments/${payment.id}/invoice`, { responseType: "blob" });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `scanpdf-invoice-${payment.transactionCode}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch {
      setDownloadError("Không thể tải hóa đơn. Vui lòng thử lại.");
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#10aee8]">THANH TOÁN</p>
            <h1 className="mt-2 app-heading text-3xl sm:text-4xl">Lịch sử thanh toán</h1>
            <p className="mt-2 text-slate-500">Theo dõi các giao dịch nâng cấp tài khoản.</p>
          </div>
          <Link href="/pricing" className="btn-primary !py-2.5">Xem các gói</Link>
        </div>
        {downloadError && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{downloadError}</p>}
        <article className="overflow-hidden rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-[#eef8fd] text-xs uppercase tracking-wide text-[#34423e] dark:bg-slate-800 dark:text-slate-200">
                <tr><th className="p-4 sm:px-6">Mã giao dịch</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th><th>Hóa đơn</th></tr>
              </thead>
              <tbody>
                {payments.data?.items.map((item) => (
                  <tr key={item.id} className="border-t border-[#d8ded5] dark:border-slate-800">
                    <td className="p-4 font-bold sm:px-6">{item.transactionCode}</td>
                    <td>{item.plan.name}</td>
                    <td>{item.amount.toLocaleString("vi-VN")}đ</td>
                    <td><span className="rounded-md bg-[#eef8fd] px-3 py-1 dark:bg-slate-800 text-xs font-bold">{item.status}</span></td>
                    <td className="text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td>
                      <button
                        type="button"
                        disabled={item.status !== "PAID" || downloadingId === item.id}
                        onClick={() => downloadInvoice(item)}
                        className="rounded-lg border border-[#d8ded5] p-2 dark:border-slate-700 text-[#10aee8] disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        <Download size={17} className={downloadingId === item.id ? "animate-pulse" : ""} />
                      </button>
                    </td>
                  </tr>
                ))}
                {!payments.data?.items.length && <tr><td colSpan={6} className="p-12 text-center text-slate-500">Chưa có giao dịch.</td></tr>}
              </tbody>
            </table>
          </div>
          {payments.data && payments.data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#d8ded5] dark:border-slate-800 px-5 py-4 text-sm text-slate-500">
              <span>{payments.data.total} giao dịch</span>
              <Pagination page={paymentPage} pages={payments.data.pages} onPageChange={setPaymentPage} />
            </div>
          )}
        </article>

        <article className="overflow-hidden rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820]">
          <div className="border-b border-[#d8ded5] dark:border-slate-800 p-5">
            <h2 className="text-xl font-black">Lịch sử gói dịch vụ</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="bg-[#eef8fd] text-xs uppercase tracking-wide text-[#34423e] dark:bg-slate-800 dark:text-slate-200">
                <tr><th className="p-4 sm:px-6">Gói</th><th>Trạng thái</th><th>Bắt đầu</th><th>Kết thúc</th></tr>
              </thead>
              <tbody>
                {subscriptions.data?.items.map((item) => (
                  <tr key={item.id} className="border-t border-[#d8ded5] dark:border-slate-800">
                    <td className="p-4 font-bold sm:px-6">{item.plan.name}</td>
                    <td><span className="rounded-md bg-[#eef8fd] px-3 py-1 dark:bg-slate-800 text-xs font-bold">{item.status}</span></td>
                    <td>{new Date(item.startDate).toLocaleString("vi-VN")}</td>
                    <td>{item.endDate ? new Date(item.endDate).toLocaleString("vi-VN") : "Không giới hạn"}</td>
                  </tr>
                ))}
                {!subscriptions.data?.items.length && <tr><td colSpan={4} className="p-10 text-center text-slate-500">Chưa có lịch sử gói.</td></tr>}
              </tbody>
            </table>
          </div>
          {subscriptions.data && subscriptions.data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#d8ded5] dark:border-slate-800 px-5 py-4 text-sm text-slate-500">
              <span>{subscriptions.data.total} lần đăng ký</span>
              <Pagination page={subscriptionPage} pages={subscriptions.data.pages} onPageChange={setSubscriptionPage} />
            </div>
          )}
        </article>
      </div>
    </AccountLayout>
  );
}
