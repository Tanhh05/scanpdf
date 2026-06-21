"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Ban, CheckCircle2, Clock3, RefreshCw, RotateCcw, Search, Star, TimerReset } from "lucide-react";
import { useState } from "react";
import {
  AdminAvatar,
  AdminEmpty,
  AdminPagination,
  AdminStatusBadge,
  adminInputClass,
  adminPanelClass,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

type Subscription = {
  id: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string | null;
  user: { id: string; email: string; fullName: string };
  plan: { id: string; name: string; price: number };
};

type SubscriptionsResponse = {
  items: Subscription[];
  total: number;
  page: number;
  pages: number;
  summary: {
    active: number;
    expired: number;
    cancelled: number;
    paidActive: number;
  };
};

function formatDate(value: string | null) {
  if (!value) return "Không giới hạn";
  return new Date(value).toLocaleDateString("vi-VN");
}

function isPast(value: string | null) {
  return Boolean(value && new Date(value).getTime() <= Date.now());
}

export default function AdminSubscriptionsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [keyword, setKeyword] = useState("");
  const [message, setMessage] = useState("");

  const subscriptions = useQuery<SubscriptionsResponse>({
    queryKey: ["admin-subscriptions", page, status, keyword],
    queryFn: async () => (await adminApi.get("/admin/subscriptions", {
      params: {
        page,
        limit: 10,
        status: status || undefined,
        search: keyword || undefined,
      },
    })).data,
    placeholderData: keepPreviousData,
  });

  const refresh = async (text: string) => {
    setMessage(text);
    await queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  };

  const updateStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: SubscriptionStatus }) =>
      adminApi.patch(`/admin/subscriptions/${id}/status`, { status: nextStatus }),
    onSuccess: () => refresh("Đã cập nhật trạng thái subscription."),
    onError: (error) => setMessage(axios.isAxiosError(error) ? error.response?.data?.message ?? "Cập nhật thất bại" : "Cập nhật thất bại"),
  });

  const renew = useMutation({
    mutationFn: async (id: string) => adminApi.patch(`/admin/subscriptions/${id}/renew`, { durationDays: 30 }),
    onSuccess: () => refresh("Đã gia hạn subscription thêm 30 ngày."),
    onError: (error) => setMessage(axios.isAxiosError(error) ? error.response?.data?.message ?? "Gia hạn thất bại" : "Gia hạn thất bại"),
  });

  const syncExpired = useMutation({
    mutationFn: async () => adminApi.post("/admin/subscriptions/sync-expired"),
    onSuccess: (response) => refresh(`Đã sync ${response.data.updated ?? 0} subscription hết hạn.`),
    onError: (error) => setMessage(axios.isAxiosError(error) ? error.response?.data?.message ?? "Sync thất bại" : "Sync thất bại"),
  });

  const summary = subscriptions.data?.summary;
  const items = subscriptions.data?.items ?? [];
  const metrics = [
    { label: "Đang hoạt động", value: summary?.active ?? 0, note: "Tất cả gói ACTIVE", icon: CheckCircle2, color: "text-[#2563eb]" },
    { label: "Gói trả phí", value: summary?.paidActive ?? 0, note: "ACTIVE không phải Free", icon: Star, color: "text-emerald-700" },
    { label: "Đã hết hạn", value: summary?.expired ?? 0, note: "Cần theo dõi", icon: Clock3, color: "text-amber-700" },
    { label: "Đã hủy", value: summary?.cancelled ?? 0, note: "Không còn hiệu lực", icon: Ban, color: "text-red-600" },
  ];

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setKeyword(search.trim());
    setPage(1);
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
            <strong className="mt-3 block text-[23px] tracking-tight text-[#0f172a] dark:text-slate-50">
              {subscriptions.isLoading ? "..." : item.value.toLocaleString("vi-VN")}
            </strong>
            <p className={`mt-2 text-xs font-medium ${item.color}`}>{item.note}</p>
          </article>
        ))}
      </div>

      {message && <p className="mt-4 rounded-lg bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#2563eb] dark:bg-slate-800 dark:text-sky-300">{message}</p>}

      <article className={`${adminPanelClass} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[#e2e8f0] p-4 xl:flex-row xl:items-center dark:border-slate-800">
          <form onSubmit={submitSearch} className="flex h-10 min-w-0 flex-1 items-center gap-3 rounded-lg border border-[#cbd5e1] bg-[#f8fafc] px-3 xl:max-w-md">
            <Search size={20} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm user, email, gói..."
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
              <option value="ACTIVE">Hoạt động</option>
              <option value="EXPIRED">Hết hạn</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => syncExpired.mutate()}
            disabled={syncExpired.isPending}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-md disabled:opacity-60"
          >
            <RefreshCw size={18} className={syncExpired.isPending ? "animate-spin" : ""} />
            Sync hết hạn
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3.5">Người dùng</th>
                <th className="px-4 py-3.5">Gói</th>
                <th className="px-4 py-3.5">Giá</th>
                <th className="px-4 py-3.5">Bắt đầu</th>
                <th className="px-4 py-3.5">Kết thúc</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={`border-t border-[#e2e8f0] text-sm dark:border-slate-800 ${item.status !== "ACTIVE" ? "bg-slate-50/70 text-slate-500 dark:bg-slate-800/55" : ""}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AdminAvatar name={item.user.fullName} tone={item.status === "ACTIVE" ? "blue" : "slate"} size="sm" />
                      <div className="min-w-0">
                        <strong className="block max-w-[180px] truncate text-[#0f172a] dark:text-slate-50">{item.user.fullName}</strong>
                        <span className="block max-w-[220px] truncate text-xs text-slate-500">{item.user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><span className="rounded-md bg-[#dfe6fb] px-2.5 py-1 text-xs font-semibold dark:bg-slate-800 dark:text-slate-200">{item.plan.name}</span></td>
                  <td className="px-4 py-3.5 font-semibold">{item.plan.price.toLocaleString("vi-VN")}đ</td>
                  <td className="px-4 py-3.5">{formatDate(item.startDate)}</td>
                  <td className="px-4 py-3.5">
                    <span className={isPast(item.endDate) && item.status === "ACTIVE" ? "font-semibold text-amber-700" : ""}>{formatDate(item.endDate)}</span>
                  </td>
                  <td className="px-4 py-3.5"><AdminStatusBadge status={item.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        title="Gia hạn thêm 30 ngày"
                        disabled={renew.isPending}
                        onClick={() => renew.mutate(item.id)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#eff6ff] hover:text-[#2563eb] disabled:opacity-40"
                      >
                        <TimerReset size={18} />
                      </button>
                      {item.status === "ACTIVE" ? (
                        <button
                          type="button"
                          title="Hủy subscription"
                          disabled={updateStatus.isPending}
                          onClick={() => {
                            if (window.confirm("Hủy subscription này?")) updateStatus.mutate({ id: item.id, nextStatus: "CANCELLED" });
                          }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        >
                          <Ban size={18} />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Kích hoạt lại"
                          disabled={updateStatus.isPending}
                          onClick={() => updateStatus.mutate({ id: item.id, nextStatus: "ACTIVE" })}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                        >
                          <RotateCcw size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!subscriptions.isLoading && !items.length && (
                <tr>
                  <td colSpan={7}><AdminEmpty>Không có subscription phù hợp.</AdminEmpty></td>
                </tr>
              )}
              {subscriptions.isLoading && !items.length && (
                <tr>
                  <td colSpan={7}><AdminEmpty>Đang tải subscription...</AdminEmpty></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#e2e8f0] px-5 py-3.5 text-sm sm:flex-row dark:border-slate-800">
          <span className="text-slate-500">{subscriptions.data?.total ?? 0} subscription</span>
          <AdminPagination page={page} pages={subscriptions.data?.pages ?? 1} onPageChange={setPage} />
        </div>
      </article>
    </section>
  );
}
