"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, Eye, Search, ShieldCheck, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminAvatar, AdminEmpty, AdminPagination, adminInputClass, adminPanelClass } from "@/components/admin/admin-ui";
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
  const [search, setSearch] = useState("");
  const logs = useQuery<{ items: AdminLog[]; total: number; pages: number }>({
    queryKey: ["admin-logs", page, action],
    queryFn: async () => (await adminApi.get("/admin/logs", { params: { page, limit: 5, action } })).data,
  });
  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (logs.data?.items ?? []).filter((item) => !keyword || [item.admin.fullName, item.admin.email, item.targetId ?? "", item.action].some((value) => value.toLowerCase().includes(keyword)));
  }, [logs.data?.items, search]);
  const activeAdmins = new Set(visibleItems.map((item) => item.admin.email)).size;

  function exportCsv() {
    const rows = [
      ["Quản trị viên", "Email", "Thao tác", "Đối tượng", "ID", "Thời gian"],
      ...visibleItems.map((item) => [item.admin.fullName, item.admin.email, item.action, item.targetType, item.targetId ?? "", new Date(item.createdAt).toLocaleString("vi-VN")]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `scanpdf-admin-logs-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function actionStyle(value: string) {
    if (value.includes("DELETED") || value.includes("SUSPENDED")) return "bg-red-100 text-red-700";
    if (value.includes("PAYMENT")) return "bg-[#dce6ff] text-[#0b4dcc]";
    return "bg-[#2f67e9] text-white";
  }

  return (
    <section>
      <div className={`${adminPanelClass} grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[210px_210px_minmax(240px,1fr)_auto]`}>
        <select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }} className={adminInputClass}>
          <option value="">Tất cả thao tác</option>
          <option value="USER_">Người dùng</option>
          <option value="PLAN_">Gói dịch vụ</option>
          <option value="PAYMENT_">Thanh toán</option>
        </select>
        <select className={adminInputClass} defaultValue="">
          <option value="">Tất cả đối tượng</option>
          <option value="USER">USER</option>
          <option value="PLAN">PLAN</option>
          <option value="PAYMENT">PAYMENT</option>
        </select>
        <label className="flex h-10 items-center gap-3 rounded-lg border border-[#bcc5df] bg-white px-3"><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Tìm kiếm Admin hoặc ID..." /></label>
        <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0b4dcc] px-4 text-sm font-semibold text-white shadow-md"><Download size={18} /> Xuất báo cáo</button>
      </div>

      <article className={`${adminPanelClass} mt-5 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#eef1ff] text-xs uppercase tracking-wide text-[#293047]"><tr><th className="px-5 py-3.5">Quản trị viên</th><th className="px-4 py-3.5">Thao tác</th><th className="px-4 py-3.5">Đối tượng</th><th className="px-4 py-3.5">ID đối tượng</th><th className="px-4 py-3.5">Thời gian</th><th className="px-4 py-3.5 text-center">Chi tiết</th></tr></thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-t border-[#dfe3ee] text-sm">
                  <td className="px-5 py-3.5"><div className="flex items-center gap-3"><AdminAvatar name={item.admin.fullName} size="sm" /><div><strong className="block">{item.admin.fullName}</strong><span className="text-xs text-slate-500">{item.admin.email}</span></div></div></td>
                  <td className="px-4 py-3.5"><span className={`rounded-full px-3 py-1 text-xs font-medium ${actionStyle(item.action)}`}>{item.action}</span></td>
                  <td className="px-4 py-3.5 font-semibold tracking-wide">{item.targetType}</td>
                  <td className="px-4 py-3.5"><span className="rounded-md bg-slate-600 px-2.5 py-1 font-mono text-xs text-white">{item.targetId ? `#${item.targetId.slice(0, 8)}` : "-"}</span></td>
                  <td className="px-4 py-3.5">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3.5 text-center"><Eye className="mx-auto" size={18} /></td>
                </tr>
              ))}
              {!logs.isLoading && !visibleItems.length && <tr><td colSpan={6}><AdminEmpty>Chưa có nhật ký quản trị.</AdminEmpty></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 bg-[#eef1ff] px-5 py-3.5 text-sm sm:flex-row">
          <span>Hiển thị {visibleItems.length} trong số {logs.data?.total ?? 0} nhật ký</span>
          <AdminPagination page={page} pages={logs.data?.pages ?? 1} onPageChange={setPage} />
        </div>
      </article>

      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[
          { label: "Thao tác/giờ", value: visibleItems.length, icon: Zap, tone: "bg-[#e7efff] text-[#0b4dcc]" },
          { label: "Cảnh báo bảo mật", value: 0, icon: AlertTriangle, tone: "bg-red-100 text-red-700" },
          { label: "Admin hoạt động", value: activeAdmins, icon: ShieldCheck, tone: "bg-slate-100 text-slate-600" },
        ].map((item) => (
          <article key={item.label} className={`${adminPanelClass} flex items-center gap-4 p-5`}>
            <span className={`flex h-11 w-11 items-center justify-center rounded-full ${item.tone}`}><item.icon size={22} /></span>
            <div><p className="text-sm text-[#586075]">{item.label}</p><strong className="mt-1 block text-2xl">{item.value}</strong></div>
          </article>
        ))}
      </div>
    </section>
  );
}
