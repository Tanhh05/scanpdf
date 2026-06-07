"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminNav } from "@/components/admin/admin-nav";
import { api } from "@/services/api";

type Payment = {
  id: string;
  amount: number;
  status: string;
  transactionCode: string;
  createdAt: string;
  user: { email: string; fullName: string };
  plan: { name: string };
};

export default function PaymentsPage() {
  const payments = useQuery<{ items: Payment[] }>({
    queryKey: ["admin-payments"],
    queryFn: async () => (await api.get("/admin/payments")).data,
  });
  return <section className="container-page py-14"><AdminNav /><h1 className="text-3xl font-black">Quản lý thanh toán</h1><div className="card mt-7 overflow-x-auto"><table className="w-full min-w-[800px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Mã</th><th>Người dùng</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead><tbody>{payments.data?.items.map((item) => <tr key={item.id} className="border-t border-slate-100"><td className="p-4 font-mono">{item.transactionCode}</td><td>{item.user.fullName}<span className="block text-slate-500">{item.user.email}</span></td><td>{item.plan.name}</td><td>{item.amount.toLocaleString("vi-VN")}đ</td><td><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.status}</span></td><td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td></tr>)}</tbody></table></div></section>;
}
