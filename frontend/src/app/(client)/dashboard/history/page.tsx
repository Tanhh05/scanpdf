"use client";

import { useQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import Link from "next/link";
import { AccountLayout } from "@/components/client/account-layout";
import { type Conversion, toolNames } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export default function HistoryPage() {
  const token = useAuthStore((state) => state.token);
  const history = useQuery<Conversion[]>({
    queryKey: ["conversions"],
    queryFn: async () => (await api.get("/conversions")).data,
    enabled: !!token,
  });

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-indigo-600">LỊCH SỬ</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Lịch sử chuyển đổi</h1>
            <p className="mt-2 text-slate-500">Danh sách tài liệu bạn đã xử lý gần đây.</p>
          </div>
          <Link href="/tools/word-to-pdf" className="btn-primary !rounded-lg !py-2.5">Chuyển đổi mới</Link>
        </div>
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-400">
                <tr><th className="p-4 sm:px-6">Tài liệu</th><th>Công cụ</th><th>Trạng thái</th><th>Thời gian</th></tr>
              </thead>
              <tbody>
                {history.data?.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="p-4 sm:px-6"><span className="flex items-center gap-3 font-bold text-slate-900"><FileText size={18} className="text-indigo-500" />{item.inputFile.originalName}</span></td>
                    <td className="text-slate-600">{toolNames[item.tool] ?? item.tool.replaceAll("_", " ")}</td>
                    <td><span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">{item.status === "COMPLETED" ? "Hoàn thành" : item.status}</span></td>
                    <td className="text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  </tr>
                ))}
                {!history.data?.length && <tr><td colSpan={4} className="p-12 text-center text-slate-500">Chưa có lịch sử chuyển đổi.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </AccountLayout>
  );
}
