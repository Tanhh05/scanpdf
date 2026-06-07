"use client";

import { useQuery } from "@tanstack/react-query";
import { AdminNav } from "@/components/admin/admin-nav";
import { api } from "@/services/api";

type Statistics = {
  daily: { statDate: string; newUsers: number; totalConversions: number; successConversions: number; failedConversions: number; totalRevenue: number }[];
  tools: { tool: string; totalUsage: number; successCount: number; failedCount: number }[];
};

export default function StatisticsPage() {
  const { data } = useQuery<Statistics>({ queryKey: ["admin-statistics"], queryFn: async () => (await api.get("/admin/statistics")).data });
  const max = Math.max(1, ...(data?.daily.map((item) => item.totalConversions) ?? [1]));
  return (
    <section className="container-page py-14">
      <AdminNav /><h1 className="text-3xl font-black">Thống kê 30 ngày</h1>
      <div className="card mt-7 p-6">
        <h2 className="font-bold">Số lượt chuyển đổi</h2>
        <div className="mt-6 flex h-56 items-end gap-1">
          {data?.daily.map((item) => <div key={item.statDate} className="group relative flex-1 rounded-t bg-indigo-500" style={{ height: `${Math.max(3, item.totalConversions / max * 100)}%` }} title={`${item.statDate}: ${item.totalConversions} lượt`} />)}
        </div>
        <div className="mt-2 flex justify-between text-xs text-slate-400"><span>30 ngày trước</span><span>Hôm nay</span></div>
      </div>
      <div className="card mt-7 overflow-hidden">
        <table className="w-full text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Công cụ</th><th>Tổng lượt</th><th>Thành công</th><th>Thất bại</th></tr></thead><tbody>{data?.tools.map((item) => <tr key={item.tool} className="border-t border-slate-100"><td className="p-4 font-semibold">{item.tool.replaceAll("_", " ")}</td><td>{item.totalUsage}</td><td className="text-emerald-700">{item.successCount}</td><td className="text-red-700">{item.failedCount}</td></tr>)}</tbody></table>
      </div>
    </section>
  );
}
