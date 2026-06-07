"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import { AdminNav } from "@/components/admin/admin-nav";

type Metrics = { totalUsers: number; newUsers: number; proUsers: number; totalConversions: number; successRate: number; totalRevenue: number };
export default function AdminDashboardPage() {
  const { data, error } = useQuery<Metrics>({ queryKey: ["admin-dashboard"], queryFn: async () => (await api.get("/admin/dashboard")).data });
  if (error) return <div className="container-page py-16 text-red-700">Không thể truy cập. Tài khoản cần quyền ADMIN.</div>;
  const cards = [
    ["Tổng người dùng", data?.totalUsers],
    ["Người dùng mới hôm nay", data?.newUsers],
    ["Người dùng trả phí", data?.proUsers],
    ["Tổng chuyển đổi", data?.totalConversions],
    ["Tỷ lệ thành công", data ? `${data.successRate}%` : undefined],
    ["Doanh thu", data ? `${data.totalRevenue.toLocaleString("vi-VN")}đ` : undefined],
  ];
  return <section className="container-page py-14"><AdminNav /><h1 className="text-3xl font-black">Admin Dashboard</h1><div className="mt-8 grid gap-5 md:grid-cols-3">{cards.map(([label, value]) => <div className="card p-6" key={label}><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl">{value ?? "..."}</strong></div>)}</div></section>;
}
