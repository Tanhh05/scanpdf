"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AccountLayout } from "@/components/client/account-layout";
import type { Payment } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export default function PaymentsPage() {
  const token = useAuthStore((state) => state.token);
  const payments = useQuery<Payment[]>({
    queryKey: ["my-payments"],
    queryFn: async () => (await api.get("/payments/mine")).data,
    enabled: !!token,
  });

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-indigo-600">THANH TOÁN</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Lịch sử thanh toán</h1>
            <p className="mt-2 text-slate-500">Theo dõi các giao dịch nâng cấp tài khoản.</p>
          </div>
          <Link href="/pricing" className="btn-primary !rounded-lg !py-2.5">Xem các gói</Link>
        </div>
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                <tr><th className="p-4 sm:px-6">Mã giao dịch</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th></tr>
              </thead>
              <tbody>
                {payments.data?.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-4 font-bold sm:px-6">{item.transactionCode}</td>
                    <td>{item.plan.name}</td>
                    <td>{item.amount.toLocaleString("vi-VN")}đ</td>
                    <td><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.status}</span></td>
                    <td className="text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                {!payments.data?.length && <tr><td colSpan={5} className="p-12 text-center text-slate-500">Chưa có giao dịch.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </AccountLayout>
  );
}
