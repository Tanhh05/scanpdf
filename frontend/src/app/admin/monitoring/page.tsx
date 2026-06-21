"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, CheckCircle2, Clock3, DatabaseZap, RefreshCw, TrendingUp } from "lucide-react";
import { AdminEmpty, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type QueueCounts = {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  paused: number;
};

type MonitoringResponse = {
  window: {
    last24h: {
      conversions: number;
      completed: number;
      failed: number;
      active: number;
      failureRate: number;
      successRate: number;
    };
  };
  queue: QueueCounts;
  daily: { date: string; total: number; completed: number; failed: number }[];
  toolFailures: { tool: string; failed: number }[];
  recentFailures: {
    id: string;
    tool: string;
    errorMessage: string | null;
    createdAt: string;
    user: { email: string; fullName: string };
    inputFile: { originalName: string };
  }[];
  timestamp: string;
};

function toolLabel(tool: string) {
  return tool.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMonitoringPage() {
  const monitoring = useQuery<MonitoringResponse>({
    queryKey: ["admin-monitoring"],
    queryFn: async () => (await adminApi.get("/admin/monitoring")).data,
    refetchInterval: 30_000,
  });
  const data = monitoring.data;
  const last24h = data?.window.last24h;
  const queue = data?.queue;
  const daily = data?.daily ?? [];
  const maxDaily = Math.max(1, ...daily.map((item) => item.total));
  const width = 760;
  const height = 260;
  const points = daily.map((item, index) => ({
    x: daily.length > 1 ? (index / (daily.length - 1)) * width : width / 2,
    y: height - (item.total / maxDaily) * 210 - 24,
    item,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = points.length ? `${line} L ${width} ${height} L 0 ${height} Z` : "";
  const queueRisk = (queue?.failed ?? 0) + (queue?.delayed ?? 0);
  const metrics = [
    {
      label: "Chuyển đổi 24h",
      value: last24h?.conversions.toLocaleString("vi-VN") ?? "...",
      note: `${last24h?.active ?? 0} đang xử lý`,
      icon: Activity,
      color: "text-[#2563eb]",
    },
    {
      label: "Tỷ lệ thành công",
      value: last24h ? `${last24h.successRate}%` : "...",
      note: `${last24h?.completed ?? 0} hoàn thành`,
      icon: CheckCircle2,
      color: "text-emerald-700",
    },
    {
      label: "Tỷ lệ lỗi",
      value: last24h ? `${last24h.failureRate}%` : "...",
      note: `${last24h?.failed ?? 0} lỗi trong 24h`,
      icon: AlertTriangle,
      color: (last24h?.failureRate ?? 0) > 10 ? "text-red-600" : "text-amber-700",
    },
    {
      label: "Rủi ro hàng đợi",
      value: queue ? queueRisk.toLocaleString("vi-VN") : "...",
      note: `${queue?.waiting ?? 0} waiting | ${queue?.active ?? 0} active`,
      icon: DatabaseZap,
      color: queueRisk ? "text-red-600" : "text-slate-700",
    },
  ];

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[22px] font-bold tracking-normal text-[#0f172a] dark:text-slate-50">Giám sát</h2>
          <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">Theo dõi xu hướng conversion, queue và lỗi vận hành gần nhất.</p>
        </div>
        <button
          type="button"
          onClick={() => monitoring.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-semibold text-[#0f172a] transition hover:border-[#2563eb] hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <RefreshCw size={16} className={monitoring.isFetching ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <article key={item.label} className={`${adminPanelClass} min-h-[114px] p-5 ${index === 0 ? "border-l-4 border-l-[#2563eb]" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-[#475569] dark:text-slate-400">{item.label}</p>
              <item.icon size={22} className={item.color} />
            </div>
            <strong className={`mt-2 block text-[23px] ${item.color} dark:text-slate-100`}>{item.value}</strong>
            <p className="mt-2 text-xs text-[#64748b] dark:text-slate-400">{item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <article className={`${adminPanelClass} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Lưu lượng chuyển đổi</h3>
              <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">Tổng lượt xử lý trong 7 ngày gần nhất.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-lg bg-[#dbeafe] px-3 py-2 text-xs font-semibold text-[#2563eb]">
              <TrendingUp size={15} /> 7 ngày
            </span>
          </div>
          <div className="mt-5 h-[270px]">
            {monitoring.isLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-900" />
            ) : points.length ? (
              <svg viewBox={`-12 -8 ${width + 24} ${height + 28}`} className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="monitoringArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity=".24" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((item) => <line key={item} x1="0" x2={width} y1={item * 68} y2={item * 68} stroke="#e1e5ef" />)}
                <path d={area} fill="url(#monitoringArea)" />
                <path d={line} fill="none" stroke="#2563eb" strokeWidth="3" vectorEffect="non-scaling-stroke" />
                {points.map(({ x, y, item }) => (
                  <circle key={item.date} cx={x} cy={y} r="4" fill="#fff" stroke={item.failed ? "#dc2626" : "#2563eb"} strokeWidth="2" vectorEffect="non-scaling-stroke">
                    <title>{`${item.date}: ${item.total} total, ${item.failed} failed`}</title>
                  </circle>
                ))}
              </svg>
            ) : (
              <AdminEmpty>Chưa có dữ liệu conversion.</AdminEmpty>
            )}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500">
            {daily.map((item) => <span key={item.date}>{new Date(`${item.date}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span>)}
          </div>
        </article>

        <article className={`${adminPanelClass} p-5`}>
          <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Trạng thái hàng đợi</h3>
          <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">BullMQ state hiện tại.</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {(["waiting", "active", "completed", "failed", "delayed", "paused"] as const).map((key) => (
              <div key={key} className="rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
                <p className="capitalize text-slate-500">{key}</p>
                <strong className={`mt-1 block text-xl ${key === "failed" || key === "delayed" ? "text-red-600" : "text-[#0f172a] dark:text-slate-50"}`}>
                  {queue ? (queue[key] ?? 0).toLocaleString("vi-VN") : "..."}
                </strong>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-[#f8fafc] p-3 text-sm dark:bg-slate-900">
            <p className="flex items-center gap-2 font-semibold text-[#64748b] dark:text-slate-400"><Clock3 size={15} /> Cập nhật</p>
            <strong className="mt-1 block">{data ? new Date(data.timestamp).toLocaleTimeString("vi-VN") : "..."}</strong>
          </div>
        </article>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_1.6fr]">
        <article className={`${adminPanelClass} overflow-hidden`}>
          <div className="border-b border-[#e2e8f0] px-5 py-4 dark:border-slate-800">
            <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Top tool lỗi 24h</h3>
          </div>
          <div className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
            {(data?.toolFailures ?? []).map((item) => (
              <div key={item.tool} className="flex items-center justify-between gap-4 px-5 py-4 text-sm">
                <span className="font-semibold text-[#0f172a] dark:text-slate-50">{toolLabel(item.tool)}</span>
                <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-600">{item.failed} lỗi</span>
              </div>
            ))}
            {!data?.toolFailures.length && <AdminEmpty>{monitoring.isLoading ? "Đang tải dữ liệu lỗi..." : "Không có tool lỗi trong 24h."}</AdminEmpty>}
          </div>
        </article>

        <article className={`${adminPanelClass} overflow-hidden`}>
          <div className="border-b border-[#e2e8f0] px-5 py-4 dark:border-slate-800">
            <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Conversion lỗi gần nhất</h3>
            <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">Dùng để truy vết user, tool và message lỗi.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left">
              <thead className="bg-[#f8fafc] text-xs uppercase tracking-wide text-[#475569] dark:bg-slate-800 dark:text-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Tool</th>
                  <th className="px-4 py-3.5">User</th>
                  <th className="px-4 py-3.5">File</th>
                  <th className="px-4 py-3.5">Lỗi</th>
                  <th className="px-4 py-3.5">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentFailures ?? []).map((item) => (
                  <tr key={item.id} className="border-t border-[#e2e8f0] text-sm dark:border-slate-800">
                    <td className="px-5 py-3.5 font-semibold text-[#0f172a] dark:text-slate-50">{toolLabel(item.tool)}</td>
                    <td className="px-4 py-3.5">
                      <strong className="block">{item.user.fullName}</strong>
                      <span className="text-xs text-slate-500">{item.user.email}</span>
                    </td>
                    <td className="px-4 py-3.5"><span className="block max-w-[180px] truncate" title={item.inputFile.originalName}>{item.inputFile.originalName}</span></td>
                    <td className="px-4 py-3.5"><span className="block max-w-[240px] truncate text-red-600" title={item.errorMessage ?? ""}>{item.errorMessage ?? "Không có message"}</span></td>
                    <td className="px-4 py-3.5 text-slate-500">{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
                {!data?.recentFailures.length && (
                  <tr><td colSpan={5}><AdminEmpty>{monitoring.isLoading ? "Đang tải lỗi gần nhất..." : "Chưa có conversion lỗi."}</AdminEmpty></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
