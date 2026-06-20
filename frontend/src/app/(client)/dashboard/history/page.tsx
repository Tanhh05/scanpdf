"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Download, FileText, LoaderCircle, Search, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import { Pagination } from "@/components/common/pagination";
import { type Conversion, type ConversionList, toolNames } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

const statuses = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "PROCESSING", label: "Đang xử lý" },
  { value: "QUEUED", label: "Đang chờ" },
  { value: "FAILED", label: "Thất bại" },
];

const statusStyles: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  PROCESSING: "bg-[#eef5f7] text-[#0b8fc7]",
  QUEUED: "bg-amber-50 text-amber-700",
  FAILED: "bg-red-50 text-red-700",
};

const statusNames: Record<string, string> = {
  COMPLETED: "Hoàn thành",
  PROCESSING: "Đang xử lý",
  QUEUED: "Đang chờ",
  FAILED: "Thất bại",
};

function errorMessage(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? "Thao tác thất bại" : "Thao tác thất bại";
}

export default function HistoryPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");
  const history = useQuery<ConversionList>({
    queryKey: ["conversions", page, search, status],
    queryFn: async () => (await api.get("/conversions", {
      params: { page, limit: 5, search, status: status || undefined },
    })).data,
    enabled: !!token,
    placeholderData: keepPreviousData,
    staleTime: 120_000,
  });

  const removeConversion = useMutation({
    mutationFn: async (id: string) => api.delete(`/conversions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["conversions"] }),
  });
  const createShare = useMutation({
    mutationFn: async ({ id, password }: { id: string; password?: string }) => (
      await api.post(`/conversions/${id}/share`, { expiresInHours: 24, password })
    ).data as { shareUrl: string },
    onSuccess: async (data) => {
      await navigator.clipboard.writeText(data.shareUrl);
      setNotice("Đã tạo và sao chép liên kết chia sẻ có hiệu lực 24 giờ.");
    },
  });

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function download(item: Conversion) {
    const conversion = item.downloadUrl
      ? item
      : (await queryClient.fetchQuery<Conversion>({
        queryKey: ["conversion", item.id],
        queryFn: async () => (await api.get(`/conversions/${item.id}`)).data,
        staleTime: 60_000,
      }));
    if (!conversion.downloadUrl) return;
    if (/^https?:\/\//.test(conversion.downloadUrl)) {
      window.open(conversion.downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    const response = await api.get(conversion.downloadUrl.replace(/^\/api/, ""), { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = conversion.outputFile?.originalName ?? "scanpdf-output";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function confirmDelete(item: Conversion) {
    if (window.confirm(`Xóa lịch sử và file của "${item.inputFile.originalName}"?`)) {
      removeConversion.mutate(item.id);
    }
  }

  function share(item: Conversion) {
    const password = window.prompt("Mật khẩu chia sẻ (để trống nếu không cần):") ?? undefined;
    if (password !== undefined && password.length > 0 && password.length < 4) {
      setNotice("Mật khẩu chia sẻ cần ít nhất 4 ký tự.");
      return;
    }
    createShare.mutate({ id: item.id, password: password || undefined });
  }

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#10aee8]">LỊCH SỬ</p>
            <h1 className="mt-2 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">Lịch sử chuyển đổi</h1>
            <p className="mt-2 text-slate-500">Tìm kiếm, tải xuống hoặc xóa các tài liệu đã xử lý.</p>
          </div>
          <Link href="/tools/word-to-pdf" className="btn-primary !py-2.5">Chuyển đổi mới</Link>
        </div>

        <div className="rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820] p-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <form onSubmit={submitSearch} className="flex min-w-0 flex-1 gap-2">
              <label className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  className="field !pl-10"
                  placeholder="Tìm theo tên file..."
                />
              </label>
              <button className="rounded-lg bg-slate-900 px-5 py-3 text-sm font-bold text-white hover:bg-slate-700">Tìm</button>
            </form>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="field sm:max-w-52"
            >
              {statuses.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </div>
        {notice && <p className="rounded-lg bg-[#e8f7fd] p-3 text-sm font-bold text-[#0789c5]">{notice}</p>}

        <article className="overflow-hidden rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[880px] text-left text-sm">
              <thead className="bg-[#eef8fd] text-xs uppercase tracking-wide text-[#34423e] dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="p-4 sm:px-6">Tài liệu</th>
                  <th>Công cụ</th>
                  <th>Trạng thái</th>
                  <th>Thời gian</th>
                  <th className="pr-5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {history.data?.items.map((item) => (
                  <tr key={item.id} className="border-t border-[#d8ded5] dark:border-slate-800">
                    <td className="p-4 sm:px-6">
                      <span className="flex max-w-xs items-center gap-3 font-bold text-slate-900">
                        <FileText size={18} className="shrink-0 text-[#10aee8]" />
                        <span className="truncate" title={item.inputFile.originalName}>{item.inputFile.originalName}</span>
                      </span>
                      {item.status === "FAILED" && item.errorMessage && (
                        <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={item.errorMessage}>{item.errorMessage}</p>
                      )}
                    </td>
                    <td className="text-slate-600">{toolNames[item.tool] ?? item.tool.replaceAll("_", " ")}</td>
                    <td>
                      <span className={`rounded-md px-3 py-1 text-xs font-bold ${statusStyles[item.status] ?? "bg-slate-100 text-slate-700"}`}>
                        {statusNames[item.status] ?? item.status}
                      </span>
                    </td>
                    <td className="text-slate-500">{new Date(item.createdAt).toLocaleString("vi-VN")}</td>
                    <td className="pr-5">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={!item.canDownload || createShare.isPending}
                          onClick={() => share(item)}
                          title="Tạo liên kết chia sẻ"
                          className="rounded-lg border border-[#d8ded5] p-2 dark:border-slate-700 text-[#0b8fc7] transition hover:bg-[#eef5f7] disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          <Share2 size={17} />
                        </button>
                        <button
                          type="button"
                          disabled={!item.canDownload}
                          onClick={() => download(item)}
                          title={item.canDownload ? "Tải kết quả" : "File không còn khả dụng"}
                          className="rounded-lg border border-[#d8ded5] p-2 dark:border-slate-700 text-[#10aee8] transition hover:bg-[#e8f7fd] disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-white"
                        >
                          <Download size={17} />
                        </button>
                        <button
                          type="button"
                          disabled={removeConversion.isPending}
                          onClick={() => confirmDelete(item)}
                          title="Xóa lịch sử"
                          className="rounded-lg border border-[#d8ded5] p-2 dark:border-slate-700 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {history.isLoading && (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500"><LoaderCircle className="mx-auto animate-spin" /></td></tr>
                )}
                {!history.isLoading && !history.data?.items.length && (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500">Không tìm thấy lịch sử chuyển đổi.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {history.data && history.data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#d8ded5] dark:border-slate-800 px-5 py-4 text-sm">
              <span className="text-slate-500">{history.data.total} kết quả</span>
              <Pagination page={page} pages={history.data.pages} onPageChange={setPage} />
            </div>
          )}
        </article>
        {removeConversion.isError && <p className="text-sm font-bold text-red-600">{errorMessage(removeConversion.error)}</p>}
      </div>
    </AccountLayout>
  );
}
