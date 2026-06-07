"use client";

import { useQuery } from "@tanstack/react-query";
import { Clock, FileText, Gauge } from "lucide-react";
import Link from "next/link";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

type Profile = {
  user: { fullName: string; email: string };
  plan: { name: string; dailyLimit: number };
  usedToday: number;
  remainingToday: number;
};
type Conversion = {
  id: string;
  tool: string;
  status: string;
  createdAt: string;
  inputFile: { originalName: string };
};
type Payment = {
  id: string;
  transactionCode: string;
  amount: number;
  status: string;
  createdAt: string;
  plan: { name: string };
};

export default function DashboardPage() {
  const token = useAuthStore((state) => state.token);
  const profile = useQuery<Profile>({ queryKey: ["profile"], queryFn: async () => (await api.get("/profile")).data, enabled: !!token });
  const history = useQuery<Conversion[]>({ queryKey: ["conversions"], queryFn: async () => (await api.get("/conversions")).data, enabled: !!token });
  const payments = useQuery<Payment[]>({ queryKey: ["my-payments"], queryFn: async () => (await api.get("/payments/mine")).data, enabled: !!token });

  if (!token) return <div className="container-page py-20 text-center"><p>Vui lòng đăng nhập để xem dashboard.</p><Link href="/login" className="btn-primary mt-5">Đăng nhập</Link></div>;

  return (
    <section className="container-page py-12">
      <h1 className="text-3xl font-black">Xin chào, {profile.data?.user.fullName ?? "..."}</h1>
      <div className="mt-7 grid gap-5 md:grid-cols-3">
        <div className="card p-6"><Gauge className="text-indigo-600" /><p className="mt-3 text-sm text-slate-500">Lượt còn lại hôm nay</p><strong className="text-3xl">{profile.data?.remainingToday ?? "-"}</strong></div>
        <div className="card p-6"><FileText className="text-indigo-600" /><p className="mt-3 text-sm text-slate-500">Gói hiện tại</p><strong className="text-3xl">{profile.data?.plan.name ?? "-"}</strong></div>
        <div className="card p-6"><Clock className="text-indigo-600" /><p className="mt-3 text-sm text-slate-500">Đã dùng hôm nay</p><strong className="text-3xl">{profile.data?.usedToday ?? "-"}</strong></div>
      </div>
      <div className="card mt-8 overflow-hidden">
        <div className="border-b border-slate-200 p-6"><h2 className="text-xl font-bold">Lịch sử thanh toán</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Mã giao dịch</th><th>Gói</th><th>Số tiền</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
            <tbody>
              {payments.data?.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-4 font-mono">{item.transactionCode}</td>
                  <td>{item.plan.name}</td>
                  <td>{item.amount.toLocaleString("vi-VN")}đ</td>
                  <td><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.status}</span></td>
                  <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
              {!payments.data?.length && <tr><td colSpan={5} className="p-8 text-center text-slate-500">Chưa có giao dịch.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card mt-8 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <h2 className="text-xl font-bold">Lịch sử chuyển đổi</h2>
          <Link href="/tools/word-to-pdf" className="btn-primary !py-2">Chuyển đổi mới</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">File</th><th>Công cụ</th><th>Trạng thái</th><th>Ngày</th></tr></thead>
            <tbody>
              {history.data?.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="p-4 font-semibold">{item.inputFile.originalName}</td>
                  <td>{item.tool.replaceAll("_", " ")}</td>
                  <td><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{item.status}</span></td>
                  <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                </tr>
              ))}
              {!history.data?.length && <tr><td colSpan={4} className="p-10 text-center text-slate-500">Chưa có lịch sử chuyển đổi.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
