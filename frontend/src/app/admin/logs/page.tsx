"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { adminApi } from "@/services/api";

type AdminLog = {
  id: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  createdAt: string;
  admin: { fullName: string; email: string };
};

export default function AdminLogsPage() {
  const [page, setPage] = useState(1);
  const [action, setAction] = useState("");
  const logs = useQuery<{ items: AdminLog[]; total: number; pages: number }>({
    queryKey: ["admin-logs", page, action],
    queryFn: async () => (await adminApi.get("/admin/logs", { params: { page, action } })).data,
  });

  return (
    <section className="container-page py-14">
      <AdminNav />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-bold text-indigo-600">AUDIT LOG</p>
          <h1 className="mt-2 text-3xl font-black">Nhật ký quản trị</h1>
          <p className="mt-2 text-slate-500">Theo dõi thay đổi gói và trạng thái tài khoản.</p>
        </div>
        <select
          value={action}
          onChange={(event) => {
            setAction(event.target.value);
            setPage(1);
          }}
          className="field sm:max-w-60"
        >
          <option value="">Tất cả thao tác</option>
          <option value="USER_">Tài khoản người dùng</option>
          <option value="PLAN_">Gói dịch vụ</option>
        </select>
      </div>
      <div className="card mt-7 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-4">Quản trị viên</th><th>Thao tác</th><th>Đối tượng</th><th>ID</th><th>Thời gian</th></tr>
          </thead>
          <tbody>
            {logs.data?.items.map((item) => (
              <tr key={item.id} className="border-t border-slate-100">
                <td className="p-4"><strong>{item.admin.fullName}</strong><span className="block text-slate-500">{item.admin.email}</span></td>
                <td><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{item.action}</span></td>
                <td>{item.targetType}</td>
                <td className="max-w-52 truncate text-xs text-slate-500">{item.targetId ?? "-"}</td>
                <td>{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
              </tr>
            ))}
            {!logs.data?.items.length && <tr><td colSpan={5} className="p-12 text-center text-slate-500">Chưa có nhật ký quản trị.</td></tr>}
          </tbody>
        </table>
        {logs.data && logs.data.pages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
            <span>{logs.data.total} bản ghi</span>
            <div className="flex items-center gap-3">
              <button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Trước</button>
              <strong>{page}/{logs.data.pages}</strong>
              <button disabled={page >= logs.data.pages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
