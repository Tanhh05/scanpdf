"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Clock3, FileText, HardDrive, Search, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  AdminAvatar,
  AdminEmpty,
  AdminPagination,
  adminInputClass,
  adminPanelClass,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type AdminFile = {
  id: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
  expiredAt: string;
  user: { email: string; fullName: string };
  team: { name: string } | null;
  _count: {
    inputFor: number;
    outputFor: number;
    shares: number;
  };
};

type FilesResponse = {
  items: AdminFile[];
  total: number;
  page: number;
  pages: number;
  totalSize: number;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function isExpired(expiredAt: string) {
  return new Date(expiredAt).getTime() <= Date.now();
}

function fileExtension(name: string) {
  const extension = name.split(".").pop();
  return extension && extension !== name ? extension.toUpperCase() : "FILE";
}

export default function AdminFilesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const files = useQuery<FilesResponse>({
    queryKey: ["admin-files", page, status, keyword],
    queryFn: async () => (await adminApi.get("/admin/files", {
      params: {
        page,
        limit: 10,
        status: status || undefined,
        search: keyword || undefined,
      },
    })).data,
    placeholderData: keepPreviousData,
  });
  const deleteFile = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/files/${id}`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-files"] });
    },
  });

  const items = files.data?.items ?? [];
  const active = items.filter((item) => !isExpired(item.expiredAt));
  const expired = items.filter((item) => isExpired(item.expiredAt));
  const shared = items.filter((item) => item._count.shares > 0);
  const metrics = [
    { label: "Tổng file", value: (files.data?.total ?? 0).toLocaleString("vi-VN"), note: "Theo bộ lọc hiện tại", icon: Archive, color: "text-[#2563eb]" },
    { label: "Dung lượng", value: formatBytes(files.data?.totalSize ?? 0), note: "Tổng storage khớp bộ lọc", icon: HardDrive, color: "text-slate-700" },
    { label: "Còn hạn", value: active.length.toLocaleString("vi-VN"), note: "Trong trang hiện tại", icon: Clock3, color: "text-emerald-700" },
    { label: "Đã chia sẻ", value: shared.length.toLocaleString("vi-VN"), note: `${expired.length} file hết hạn trong trang`, icon: Users, color: "text-amber-700" },
  ];

  const visibleItems = useMemo(() => items, [items]);

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyword(search.trim());
    setPage(1);
  }

  function confirmDelete(file: AdminFile) {
    const ok = window.confirm(`Xóa file "${file.originalName}"? Các conversion/share liên quan cũng sẽ bị xóa.`);
    if (ok) deleteFile.mutate(file.id);
  }

  return (
    <section>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item) => (
          <article key={item.label} className={`${adminPanelClass} min-h-[118px] p-5`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-[15px] text-[#475569] dark:text-slate-400">{item.label}</p>
              <item.icon size={24} className={item.color} />
            </div>
            <strong className="mt-3 block text-[23px] tracking-tight text-[#0f172a] dark:text-slate-50">{files.isLoading ? "..." : item.value}</strong>
            <p className={`mt-2 text-xs font-medium ${item.color}`}>{item.note}</p>
          </article>
        ))}
      </div>

      <article className={`${adminPanelClass} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[#e2e8f0] p-4 xl:flex-row xl:items-center dark:border-slate-800">
          <form onSubmit={submitSearch} className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 xl:max-w-md">
            <Search size={20} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm file, email, team..."
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
            <button type="submit" className="text-sm font-semibold text-[#2563eb]">Tìm</button>
          </form>
          <label className="flex items-center gap-3 text-sm">
            <span className="whitespace-nowrap">Trạng thái:</span>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className={`${adminInputClass} min-w-44`}
            >
              <option value="">Tất cả</option>
              <option value="active">Còn hạn</option>
              <option value="expired">Hết hạn</option>
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3.5">File</th>
                <th className="px-4 py-3.5">Người dùng</th>
                <th className="px-4 py-3.5">Team</th>
                <th className="px-4 py-3.5">Dung lượng</th>
                <th className="px-4 py-3.5">Liên kết</th>
                <th className="px-4 py-3.5">Hết hạn</th>
                <th className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {visibleItems.map((item) => (
                <tr key={item.id} className="border-t border-[#e2e8f0] text-sm dark:border-slate-800">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dbeafe] text-[#2563eb]">
                        <FileText size={19} />
                      </span>
                      <div className="min-w-0">
                        <strong className="block max-w-[260px] truncate text-[#0f172a] dark:text-slate-50" title={item.originalName}>{item.originalName}</strong>
                        <span className="mt-1 block text-xs text-slate-500">{fileExtension(item.originalName)} | {item.fileType}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <AdminAvatar name={item.user.fullName} size="sm" />
                      <div className="min-w-0">
                        <strong className="block max-w-[180px] truncate">{item.user.fullName}</strong>
                        <span className="block max-w-[220px] truncate text-xs text-slate-500">{item.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">{item.team?.name ?? "-"}</td>
                  <td className="px-4 py-3.5 font-semibold">{formatBytes(item.fileSize)}</td>
                  <td className="px-4 py-3.5">
                    <span className="text-slate-600">{item._count.inputFor} input</span>
                    <span className="mx-2 text-slate-300">/</span>
                    <span className="text-slate-600">{item._count.outputFor} output</span>
                    <span className="mx-2 text-slate-300">/</span>
                    <span className="text-slate-600">{item._count.shares} share</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${isExpired(item.expiredAt) ? "bg-red-100 text-red-700" : "bg-[#dbeafe] text-[#2563eb]"}`}>
                      {new Date(item.expiredAt).toLocaleDateString("vi-VN")}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => confirmDelete(item)}
                      disabled={deleteFile.isPending}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                      title="Xóa file"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!files.isLoading && !visibleItems.length && (
                <tr>
                  <td colSpan={7}><AdminEmpty>Không có file phù hợp.</AdminEmpty></td>
                </tr>
              )}
              {files.isLoading && !visibleItems.length && (
                <tr>
                  <td colSpan={7}><AdminEmpty>Đang tải danh sách file...</AdminEmpty></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#e2e8f0] px-5 py-3.5 text-sm sm:flex-row dark:border-slate-800">
          <span className="text-slate-500">{files.data?.total ?? 0} file</span>
          <AdminPagination page={page} pages={files.data?.pages ?? 1} onPageChange={setPage} />
        </div>
      </article>
    </section>
  );
}
