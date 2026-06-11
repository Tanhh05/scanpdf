"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleDollarSign, Download, Eye, MoreVertical, Search, Timer, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AdminAvatar,
  AdminEmpty,
  AdminPagination,
  AdminStatusBadge,
  adminInputClass,
  adminPanelClass,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

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
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const payments = useQuery<{ items: Payment[]; total: number; pages: number }>({
    queryKey: ["admin-payments", page, status],
    queryFn: async () => (await adminApi.get("/admin/payments", { params: { page, limit: 5, status: status || undefined } })).data,
  });
  const visibleItems = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return payments.data?.items ?? [];
    return (payments.data?.items ?? []).filter((item) =>
      [item.transactionCode, item.user.fullName, item.user.email, item.plan.name].some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [payments.data?.items, search]);
  const paid = visibleItems.filter((item) => item.status === "PAID");
  const pending = visibleItems.filter((item) => item.status === "PENDING");
  const cancelled = visibleItems.filter((item) => ["FAILED", "CANCELLED"].includes(item.status));
  const revenue = paid.reduce((sum, item) => sum + item.amount, 0);

  function exportCsv() {
    const rows = [
      ["Mã đơn", "Người dùng", "Email", "Gói", "Số tiền", "Trạng thái", "Ngày"],
      ...visibleItems.map((item) => [
        item.transactionCode,
        item.user.fullName,
        item.user.email,
        item.plan.name,
        String(item.amount),
        item.status,
        new Date(item.createdAt).toLocaleString("vi-VN"),
      ]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
    link.download = `scanpdf-payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const metrics = [
    { label: "Tổng doanh thu", value: `${revenue.toLocaleString("vi-VN")}đ`, note: "Trong trang hiện tại", icon: CircleDollarSign, color: "text-[#0b4dcc]" },
    { label: "Giao dịch thành công", value: paid.length.toLocaleString("vi-VN"), note: `${visibleItems.length ? Math.round((paid.length / visibleItems.length) * 100) : 0}% tỷ lệ hoàn tất`, icon: CheckCircle2, color: "text-emerald-700" },
    { label: "Đang chờ xử lý", value: pending.length.toLocaleString("vi-VN"), note: "Cần xác nhận", icon: Timer, color: "text-amber-700" },
    { label: "Hoàn tiền / Hủy", value: cancelled.length.toLocaleString("vi-VN"), note: "Giao dịch không hoàn tất", icon: XCircle, color: "text-red-600" },
  ];

  return (
    <section>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <article key={item.label} className={`${adminPanelClass} min-h-[128px] p-5`}>
            <div className="flex items-center justify-between">
              <p className="text-[15px] text-[#464e63]">{item.label}</p>
              <item.icon size={25} className={item.color} />
            </div>
            <strong className="mt-3 block text-[23px] tracking-tight">{payments.isLoading ? "..." : item.value}</strong>
            <p className={`mt-2 text-xs font-medium ${item.color}`}>{item.note}</p>
          </article>
        ))}
      </div>

      <article className={`${adminPanelClass} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[#cbd2e5] p-4 xl:flex-row xl:items-center">
          <label className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#bcc5df] bg-[#eef1ff] px-3 xl:max-w-sm">
            <Search size={21} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm theo mã đơn, tên..." className="min-w-0 flex-1 bg-transparent text-sm outline-none" />
          </label>
          <label className="flex items-center gap-3 text-sm">
            <span className="whitespace-nowrap">Trạng thái:</span>
            <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={`${adminInputClass} min-w-48`}>
              <option value="">Tất cả</option>
              <option value="PAID">Đã thanh toán</option>
              <option value="PENDING">Đang chờ</option>
              <option value="FAILED">Thất bại</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0b4dcc] px-4 text-sm font-semibold text-white shadow-md">
            <Download size={20} /> Xuất báo cáo
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-[#eef1ff] text-xs uppercase tracking-wide text-[#293047]">
              <tr><th className="px-5 py-3.5">Mã đơn hàng</th><th className="px-4 py-3.5">Người dùng</th><th className="px-4 py-3.5">Gói dịch vụ</th><th className="px-4 py-3.5">Số tiền</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5">Ngày giao dịch</th><th className="px-4 py-3.5 text-center">Thao tác</th></tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-t border-[#dfe3ee] text-sm">
                  <td className="px-5 py-3.5 font-medium text-[#0b4dcc]">#{item.transactionCode}</td>
                  <td className="px-4 py-3.5"><div className="flex items-center gap-3"><AdminAvatar name={item.user.fullName} size="sm" /><div><strong className="block">{item.user.fullName}</strong><span className="text-xs text-slate-500">{item.user.email}</span></div></div></td>
                  <td className="px-4 py-3.5"><span className="rounded-md bg-[#dfe6fb] px-2.5 py-1 text-xs font-semibold">{item.plan.name}</span></td>
                  <td className="px-4 py-3.5 font-bold">{item.amount.toLocaleString("vi-VN")}đ</td>
                  <td className="px-4 py-3.5"><AdminStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3.5">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedPayment(item)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#eef2ff] hover:text-[#0b4dcc]"
                      title="Xem giao dịch"
                    >
                      <MoreVertical size={19} />
                    </button>
                  </td>
                </tr>
              ))}
              {!payments.isLoading && !visibleItems.length && <tr><td colSpan={7}><AdminEmpty>Không có giao dịch phù hợp.</AdminEmpty></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#d8dceb] px-5 py-3.5 text-sm sm:flex-row">
          <span>Hiển thị {visibleItems.length} trong số {payments.data?.total ?? 0} giao dịch</span>
          <AdminPagination page={page} pages={payments.data?.pages ?? 1} onPageChange={setPage} />
        </div>
      </article>

      {selectedPayment && (
        <article className={`${adminPanelClass} mt-5 p-5`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-lg font-bold">Chi tiết giao dịch</h3>
              <p className="mt-1 text-sm text-slate-500">Mã đơn #{selectedPayment.transactionCode}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(selectedPayment.transactionCode)}
                className="inline-flex h-10 items-center rounded-lg border border-[#bcc5df] px-4 text-sm font-semibold text-[#0b4dcc]"
              >
                Sao chép mã đơn
              </button>
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(selectedPayment.user.email)}
                className="inline-flex h-10 items-center rounded-lg border border-[#bcc5df] px-4 text-sm font-semibold text-[#0b4dcc]"
              >
                <Eye size={16} className="mr-2" />
                Sao chép email
              </button>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg bg-[#f4f6fb] p-4"><p className="text-slate-500">Người dùng</p><p className="mt-2 font-semibold">{selectedPayment.user.fullName}</p><p className="text-slate-500">{selectedPayment.user.email}</p></div>
            <div className="rounded-lg bg-[#f4f6fb] p-4"><p className="text-slate-500">Gói</p><p className="mt-2 font-semibold">{selectedPayment.plan.name}</p></div>
            <div className="rounded-lg bg-[#f4f6fb] p-4"><p className="text-slate-500">Số tiền</p><p className="mt-2 font-semibold">{selectedPayment.amount.toLocaleString("vi-VN")}đ</p></div>
            <div className="rounded-lg bg-[#f4f6fb] p-4"><p className="text-slate-500">Trạng thái</p><div className="mt-2"><AdminStatusBadge status={selectedPayment.status} /></div><p className="mt-2 text-slate-500">{new Date(selectedPayment.createdAt).toLocaleString("vi-VN")}</p></div>
          </div>
        </article>
      )}
    </section>
  );
}
