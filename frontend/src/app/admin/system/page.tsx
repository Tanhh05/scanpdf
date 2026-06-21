"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Database, HardDrive, Mail, RefreshCw, Server, TriangleAlert } from "lucide-react";
import { AdminEmpty, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type SystemCheck = {
  name: string;
  status: "ok" | "error";
  latencyMs: number;
  message?: string;
  details?: Record<string, unknown>;
};

type SystemResponse = {
  status: "ready" | "degraded";
  checks: SystemCheck[];
  runtime: {
    node: string;
    platform: string;
    arch: string;
    cpuCount: number;
    uptimeSeconds: number;
    memory: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
  };
  config: {
    nodeEnv: string;
    storageDriver: string;
    aiProvider: string;
    mailConfigured: boolean;
    sentryConfigured: boolean;
    cleanupIntervalMinutes: number;
  };
  timestamp: string;
};

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index ? 1 : 0)} ${units[index]}`;
}

function formatDuration(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days) return `${days} ngày ${hours} giờ`;
  if (hours) return `${hours} giờ ${minutes} phút`;
  return `${Math.max(1, minutes)} phút`;
}

function checkLabel(name: string) {
  const labels: Record<string, string> = {
    database: "Database",
    redis: "Redis",
    storage: "Storage",
    queue: "Hàng đợi xử lý",
  };
  return labels[name] ?? name;
}

function detailText(details?: Record<string, unknown>) {
  if (!details) return "";
  if (typeof details.driver === "string") return `Driver: ${details.driver}`;
  const counts = details.counts;
  if (counts && typeof counts === "object") {
    return Object.entries(counts as Record<string, number>)
      .map(([key, value]) => `${key}: ${value}`)
      .join(" | ");
  }
  return "";
}

export default function AdminSystemPage() {
  const system = useQuery<SystemResponse>({
    queryKey: ["admin-system"],
    queryFn: async () => (await adminApi.get("/admin/system")).data,
    refetchInterval: 30_000,
  });
  const data = system.data;
  const checks = data?.checks ?? [];
  const healthyCount = checks.filter((item) => item.status === "ok").length;

  const metrics = [
    {
      label: "Trạng thái",
      value: data?.status === "ready" ? "Sẵn sàng" : data ? "Cần kiểm tra" : "...",
      note: data ? `${healthyCount}/${checks.length} dịch vụ ổn định` : "Đang tải",
      icon: data?.status === "ready" ? CheckCircle2 : TriangleAlert,
      color: data?.status === "ready" ? "text-[#2563eb]" : "text-amber-700",
    },
    {
      label: "Uptime",
      value: data ? formatDuration(data.runtime.uptimeSeconds) : "...",
      note: data ? `${data.runtime.platform}/${data.runtime.arch}` : "Runtime",
      icon: Activity,
      color: "text-[#2563eb]",
    },
    {
      label: "Memory",
      value: data ? formatBytes(data.runtime.memory.heapUsed) : "...",
      note: data ? `${formatBytes(data.runtime.memory.rss)} RSS` : "Process",
      icon: HardDrive,
      color: "text-slate-700",
    },
    {
      label: "Môi trường",
      value: data?.config.nodeEnv ?? "...",
      note: data ? `${data.config.storageDriver} storage` : "Config",
      icon: Server,
      color: "text-slate-700",
    },
  ];

  return (
    <section>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-[22px] font-bold tracking-normal text-[#0f172a] dark:text-slate-50">Trạng thái hệ thống</h2>
          <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">Theo dõi database, Redis, storage, queue và runtime backend.</p>
        </div>
        <button
          type="button"
          onClick={() => system.refetch()}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-[#cbd5e1] bg-white px-4 text-sm font-semibold text-[#0f172a] transition hover:border-[#2563eb] hover:text-[#2563eb] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <RefreshCw size={16} className={system.isFetching ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <article key={item.label} className={`${adminPanelClass} min-h-[112px] p-5 ${index === 0 ? "border-l-4 border-l-[#2563eb]" : ""}`}>
            <p className="text-sm text-[#475569] dark:text-slate-400">{item.label}</p>
            <strong className={`mt-2 block text-[23px] ${item.color} dark:text-slate-100`}>{item.value}</strong>
            <p className="mt-2 flex items-center gap-2 text-xs text-[#64748b] dark:text-slate-400"><item.icon size={14} /> {item.note}</p>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <article className={`${adminPanelClass} overflow-hidden`}>
          <div className="border-b border-[#e2e8f0] px-5 py-4 dark:border-slate-800">
            <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Kiểm tra sức khỏe</h3>
            <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">Tự động cập nhật mỗi 30 giây.</p>
          </div>
          <div className="divide-y divide-[#e2e8f0] dark:divide-slate-800">
            {checks.map((check) => (
              <div key={check.name} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${check.status === "ok" ? "bg-[#dbeafe] text-[#2563eb]" : "bg-red-100 text-red-700"}`}>
                    {check.name === "database" ? <Database size={18} /> : check.status === "ok" ? <CheckCircle2 size={18} /> : <TriangleAlert size={18} />}
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-[#0f172a] dark:text-slate-50">{checkLabel(check.name)}</p>
                    <p className="mt-1 text-sm text-[#64748b] dark:text-slate-400">{check.message || detailText(check.details) || "Hoạt động bình thường"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${check.status === "ok" ? "bg-[#dbeafe] text-[#2563eb]" : "bg-red-100 text-red-700"}`}>
                    {check.status === "ok" ? "OK" : "Lỗi"}
                  </span>
                  <span className="w-16 text-right text-slate-500">{check.latencyMs} ms</span>
                </div>
              </div>
            ))}
            {!checks.length && <AdminEmpty>{system.isLoading ? "Đang tải trạng thái hệ thống..." : "Chưa có dữ liệu health check."}</AdminEmpty>}
          </div>
        </article>

        <article className={`${adminPanelClass} p-5`}>
          <h3 className="text-lg font-bold text-[#0f172a] dark:text-slate-50">Cấu hình an toàn</h3>
          <div className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
              <span className="text-[#64748b] dark:text-slate-400">Node</span>
              <strong>{data?.runtime.node ?? "..."}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
              <span className="text-[#64748b] dark:text-slate-400">CPU</span>
              <strong>{data ? `${data.runtime.cpuCount} cores` : "..."}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
              <span className="text-[#64748b] dark:text-slate-400">AI provider</span>
              <strong>{data?.config.aiProvider ?? "..."}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
              <span className="flex items-center gap-2 text-[#64748b] dark:text-slate-400"><Mail size={15} /> Email</span>
              <strong className={data?.config.mailConfigured ? "text-[#2563eb]" : "text-amber-700"}>{data?.config.mailConfigured ? "Đã cấu hình" : "Chưa đủ"}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
              <span className="text-[#64748b] dark:text-slate-400">Cleanup</span>
              <strong>{data ? `${data.config.cleanupIntervalMinutes} phút` : "..."}</strong>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg bg-[#f8fafc] p-3 dark:bg-slate-900">
              <span className="text-[#64748b] dark:text-slate-400">Cập nhật</span>
              <strong>{data ? new Date(data.timestamp).toLocaleTimeString("vi-VN") : "..."}</strong>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
