"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, TimerReset } from "lucide-react";
import { useState } from "react";
import { AdminEmpty, adminInputClass, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type JobStatus = "waiting" | "active" | "completed" | "failed" | "delayed" | "paused";

type QueueJob = {
  id: string;
  name: string;
  status: string;
  attemptsMade: number;
  failedReason?: string;
  timestamp: number;
  processedOn?: number;
  finishedOn?: number;
  data: {
    conversionId: string | null;
    userId: string | null;
    tool: string;
  };
};

type JobsResponse = {
  counts: Record<JobStatus, number>;
  items: QueueJob[];
  status: JobStatus;
  limit: number;
  timestamp: string;
};

const statuses: { value: JobStatus; label: string; icon: typeof Clock3 }[] = [
  { value: "failed", label: "Lỗi", icon: AlertCircle },
  { value: "waiting", label: "Đang chờ", icon: Clock3 },
  { value: "active", label: "Đang chạy", icon: Loader2 },
  { value: "completed", label: "Hoàn tất", icon: CheckCircle2 },
  { value: "delayed", label: "Trì hoãn", icon: TimerReset },
  { value: "paused", label: "Tạm dừng", icon: Clock3 },
];

function formatDate(value?: number) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: string) {
  if (status === "completed") return "bg-[#dbeafe] text-[#2563eb]";
  if (status === "failed") return "bg-red-100 text-red-700";
  if (status === "active") return "bg-emerald-100 text-emerald-700";
  return "bg-amber-100 text-amber-700";
}

export default function AdminJobsPage() {
  const [status, setStatus] = useState<JobStatus>("failed");
  const [limit, setLimit] = useState(10);
  const jobs = useQuery<JobsResponse>({
    queryKey: ["admin-jobs", status, limit],
    queryFn: async () => (await adminApi.get("/admin/jobs", { params: { status, limit } })).data,
    refetchInterval: 20_000,
  });
  const data = jobs.data;
  const counts = data?.counts;
  const items = data?.items ?? [];

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[22px] font-bold tracking-normal text-[#0f172a] dark:text-slate-50">Hàng đợi xử lý</h2>
          <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">Theo dõi job chuyển đổi tài liệu và lỗi worker gần nhất.</p>
        </div>
        <button
          type="button"
          onClick={() => jobs.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-semibold text-[#0f172a] transition hover:border-[#2563eb] hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <RefreshCw size={16} className={jobs.isFetching ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {statuses.map((item) => {
          const Icon = item.icon;
          const selected = status === item.value;
          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setStatus(item.value)}
              className={`${adminPanelClass} min-h-[104px] p-4 text-left transition ${selected ? "border-[#2563eb] ring-2 ring-[#2563eb]/10" : "hover:border-[#2563eb]"}`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm text-[#64748b] dark:text-slate-400">{item.label}</span>
                <Icon size={17} className={item.value === "active" && jobs.isFetching ? "animate-spin text-[#2563eb]" : "text-slate-500"} />
              </span>
              <strong className="mt-3 block text-2xl text-[#0f172a] dark:text-slate-50">{counts ? (counts[item.value] ?? 0).toLocaleString("vi-VN") : "..."}</strong>
            </button>
          );
        })}
      </div>

      <article className={`${adminPanelClass} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[#e2e8f0] px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Danh sách job</h3>
            <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">
              {data ? `Cập nhật ${new Date(data.timestamp).toLocaleTimeString("vi-VN")}` : "Đang tải dữ liệu queue"}
            </p>
          </div>
          <label className="flex items-center gap-2 text-sm text-[#64748b] dark:text-slate-400">
            Hiển thị
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className={`${adminInputClass} w-24`}
            >
              {[10, 20, 50].map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left">
            <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-5 py-3.5">Job</th>
                <th className="px-4 py-3.5">Trạng thái</th>
                <th className="px-4 py-3.5">Tool</th>
                <th className="px-4 py-3.5">Attempts</th>
                <th className="px-4 py-3.5">Tạo lúc</th>
                <th className="px-4 py-3.5">Hoàn tất</th>
                <th className="px-4 py-3.5">Lỗi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((job) => (
                <tr key={job.id} className="border-t border-[#e2e8f0] text-sm dark:border-slate-800">
                  <td className="px-5 py-3.5">
                    <strong className="block text-[#0f172a] dark:text-slate-50">{job.name}</strong>
                    <span className="mt-1 block max-w-[240px] truncate text-xs text-slate-500">#{job.id}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(job.status)}`}>{job.status}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="font-semibold">{job.data.tool}</span>
                    {job.data.conversionId && <span className="mt-1 block max-w-[180px] truncate text-xs text-slate-500">{job.data.conversionId}</span>}
                  </td>
                  <td className="px-4 py-3.5">{job.attemptsMade.toLocaleString("vi-VN")}</td>
                  <td className="px-4 py-3.5">{formatDate(job.timestamp)}</td>
                  <td className="px-4 py-3.5">{formatDate(job.finishedOn ?? job.processedOn)}</td>
                  <td className="px-4 py-3.5">
                    <span className="block max-w-[260px] truncate text-slate-500" title={job.failedReason ?? ""}>{job.failedReason ?? "-"}</span>
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={7}><AdminEmpty>{jobs.isLoading ? "Đang tải danh sách job..." : "Không có job trong trạng thái này."}</AdminEmpty></td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}
