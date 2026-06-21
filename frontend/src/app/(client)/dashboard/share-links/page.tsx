"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, Clock3, Copy, FileText, Link2, LoaderCircle, LockKeyhole, ShieldOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import { Pagination } from "@/components/common/pagination";
import type { PaginatedList } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

type ShareLink = {
  id: string;
  fileId: string;
  expiresAt: string;
  createdAt: string;
  revokedAt: string | null;
  passwordProtected: boolean;
  file: {
    originalName: string;
    fileSize: number;
    fileType: string;
    expiredAt: string;
  };
};

function errorMessage(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? "Thao tác thất bại" : "Thao tác thất bại";
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function statusOf(item: ShareLink) {
  const now = Date.now();
  if (item.revokedAt) return { label: "Đã thu hồi", className: "bg-slate-100 text-slate-600", active: false };
  if (new Date(item.expiresAt).getTime() <= now || new Date(item.file.expiredAt).getTime() <= now) {
    return { label: "Hết hạn", className: "bg-red-50 text-red-700", active: false };
  }
  return { label: "Đang hoạt động", className: "bg-[#dff4fc] text-[#10aee8]", active: true };
}

export default function DashboardShareLinksPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");
  const shares = useQuery<PaginatedList<ShareLink>>({
    queryKey: ["shares", page],
    queryFn: async () => (await api.get("/shares", { params: { page, limit: 8 } })).data,
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => api.delete(`/shares/${id}`),
    onSuccess: async () => {
      setNotice("Đã thu hồi liên kết chia sẻ.");
      await queryClient.invalidateQueries({ queryKey: ["shares"] });
    },
  });

  const items = shares.data?.items ?? [];
  const activeCount = items.filter((item) => statusOf(item).active).length;
  const expiredCount = items.filter((item) => !statusOf(item).active && !item.revokedAt).length;
  const revokedCount = items.filter((item) => item.revokedAt).length;
  const protectedCount = items.filter((item) => item.passwordProtected).length;

  async function copyInfo(item: ShareLink) {
    await navigator.clipboard.writeText(`Share ID: ${item.id}`);
    setNotice("Đã sao chép Share ID. Link đầy đủ chỉ hiển thị tại thời điểm tạo để bảo vệ token công khai.");
  }

  function confirmRevoke(item: ShareLink) {
    if (window.confirm(`Thu hồi liên kết của "${item.file.originalName}"?`)) {
      revoke.mutate(item.id);
    }
  }

  const metrics = [
    { label: "Đang hoạt động", value: activeCount, note: "Trong trang hiện tại", icon: CheckCircle2, color: "text-[#10aee8]" },
    { label: "Có mật khẩu", value: protectedCount, note: "Được bảo vệ", icon: LockKeyhole, color: "text-emerald-700" },
    { label: "Hết hạn", value: expiredCount, note: "Không còn truy cập", icon: Clock3, color: "text-amber-700" },
    { label: "Đã thu hồi", value: revokedCount, note: "Bị vô hiệu hóa", icon: ShieldOff, color: "text-red-600" },
  ];

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold text-[#10aee8]">LINK CHIA SẺ</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">Liên kết chia sẻ</h1>
          <p className="mt-2 text-slate-500">Theo dõi link công khai, trạng thái hết hạn và thu hồi quyền truy cập khi cần.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((item) => (
            <article key={item.label} className="rounded-lg border border-[#d8ded5] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101820]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
                <item.icon size={22} className={item.color} />
              </div>
              <strong className="mt-3 block text-2xl text-[#17201d] dark:text-slate-50">{shares.isLoading ? "..." : item.value.toLocaleString("vi-VN")}</strong>
              <p className={`mt-2 text-xs font-bold ${item.color}`}>{item.note}</p>
            </article>
          ))}
        </div>

        {notice && <p className="rounded-lg bg-[#e8f7fd] p-3 text-sm font-bold text-[#0789c5]">{notice}</p>}

        <article className="overflow-hidden rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820]">
          <div className="border-b border-[#d8ded5] px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-black text-[#17201d] dark:text-slate-50">Danh sách link</h2>
            <p className="mt-1 text-sm text-slate-500">Token công khai không được lưu dạng đọc được, nên hệ thống chỉ cho sao chép Share ID sau khi tạo.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="bg-[#eef8fd] text-xs uppercase tracking-wide text-[#34423e] dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Tài liệu</th>
                  <th className="px-4 py-3.5">Bảo vệ</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5">Ngày tạo</th>
                  <th className="px-4 py-3.5">Hết hạn link</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const status = statusOf(item);
                  return (
                    <tr key={item.id} className="border-t border-[#d8ded5] dark:border-slate-800">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dff4fc] text-[#10aee8]">
                            <FileText size={18} />
                          </span>
                          <div className="min-w-0">
                            <strong className="block max-w-[260px] truncate text-[#17201d] dark:text-slate-50" title={item.file.originalName}>{item.file.originalName}</strong>
                            <span className="mt-1 block text-xs text-slate-500">{formatBytes(item.file.fileSize)} | {item.file.fileType}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold ${item.passwordProtected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                          <LockKeyhole size={13} /> {item.passwordProtected ? "Có mật khẩu" : "Không"}
                        </span>
                      </td>
                      <td className="px-4 py-3.5"><span className={`rounded-md px-3 py-1 text-xs font-bold ${status.className}`}>{status.label}</span></td>
                      <td className="px-4 py-3.5 text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3.5 text-slate-500">{new Date(item.expiresAt).toLocaleString("vi-VN")}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => copyInfo(item)}
                            title="Sao chép Share ID"
                            className="rounded-lg border border-[#d8ded5] p-2 text-[#10aee8] transition hover:bg-[#e8f7fd] dark:border-slate-700"
                          >
                            <Copy size={17} />
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(item.revokedAt) || revoke.isPending}
                            onClick={() => confirmRevoke(item)}
                            title="Thu hồi link"
                            className="rounded-lg border border-[#d8ded5] p-2 text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-slate-300 dark:border-slate-700"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shares.isLoading && (
                  <tr><td colSpan={6} className="p-12 text-center text-slate-500"><LoaderCircle className="mx-auto animate-spin" /></td></tr>
                )}
                {!shares.isLoading && !items.length && (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Link2 className="mx-auto text-slate-300" size={30} />
                      <p className="mt-3 text-sm font-bold text-slate-500">Bạn chưa có liên kết chia sẻ nào.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {shares.data && shares.data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#d8ded5] px-5 py-4 text-sm dark:border-slate-800">
              <span className="text-slate-500">{shares.data.total} link</span>
              <Pagination page={page} pages={shares.data.pages} onPageChange={setPage} />
            </div>
          )}
        </article>
        {revoke.isError && <p className="text-sm font-bold text-red-600">{errorMessage(revoke.error)}</p>}
      </div>
    </AccountLayout>
  );
}
