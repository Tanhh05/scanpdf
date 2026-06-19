"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Eye, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { AdminEmpty, AdminPagination, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type DailyStat = {
  statDate: string;
  totalConversions: number;
  successConversions: number;
  failedConversions: number;
};

type ToolStat = {
  tool: string;
  totalUsage: number;
  successCount: number;
  failedCount: number;
};

type Statistics = { daily: DailyStat[]; tools: ToolStat[] };

function toolLabel(tool: string) {
  return tool.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

export default function StatisticsPage() {
  const [search, setSearch] = useState("");
  const [toolPage, setToolPage] = useState(1);
  const [selectedTool, setSelectedTool] = useState<ToolStat | null>(null);
  const { data, isLoading } = useQuery<Statistics>({
    queryKey: ["admin-statistics"],
    queryFn: async () => (await adminApi.get("/admin/statistics")).data,
  });
  const daily = data?.daily ?? [];
  const total = daily.reduce((sum, item) => sum + item.totalConversions, 0);
  const success = daily.reduce((sum, item) => sum + item.successConversions, 0);
  const failed = daily.reduce((sum, item) => sum + item.failedConversions, 0);
  const successRate = total ? Math.round((success / total) * 1000) / 10 : 0;
  const max = Math.max(1, ...daily.map((item) => item.totalConversions));
  const width = 1100;
  const height = 330;
  const points = daily.map((item, index) => ({
    x: daily.length > 1 ? (index / (daily.length - 1)) * width : width / 2,
    y: height - (item.totalConversions / max) * 285 - 18,
    item,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = points.length ? `${line} L ${width} ${height} L 0 ${height} Z` : "";
  const tools = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return (data?.tools ?? []).filter((item) => !keyword || toolLabel(item.tool).toLowerCase().includes(keyword));
  }, [data?.tools, search]);
  const toolLimit = 5;
  const toolPages = Math.max(1, Math.ceil(tools.length / toolLimit));
  const visibleTools = tools.slice((toolPage - 1) * toolLimit, toolPage * toolLimit);
  const metrics = [
    { label: "Tổng lượt chuyển đổi", value: total.toLocaleString("vi-VN"), note: "30 ngày gần nhất", icon: TrendingUp, color: "text-[#10aee8]" },
    { label: "Tỷ lệ thành công", value: `${successRate}%`, note: "Ổn định", icon: CheckCircle2, color: "text-emerald-700" },
    { label: "Lượt thất bại", value: failed.toLocaleString("vi-VN"), note: "Cần theo dõi", icon: TrendingDown, color: "text-red-600" },
    { label: "Thời gian TB", value: "N/A", note: "Chưa thu thập", icon: Clock3, color: "text-slate-600" },
  ];

  return (
    <section>
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((item, index) => (
          <article key={item.label} className={`${adminPanelClass} min-h-[112px] p-5 ${index === 1 ? "border-l-4 border-l-[#10aee8]" : ""}`}>
            <p className="text-sm text-[#464e63]">{item.label}</p>
            <strong className={`mt-2 block text-[23px] ${item.color}`}>{isLoading ? "..." : item.value}</strong>
            <p className={`mt-2 flex items-center gap-2 text-xs ${item.color}`}><item.icon size={14} /> {item.note}</p>
          </article>
        ))}
      </div>

      <article className={`${adminPanelClass} mt-6 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-xl font-bold">Số lượt chuyển đổi theo ngày</h2><p className="mt-1 text-sm text-[#52615d]">Dữ liệu tổng hợp từ 30 ngày gần nhất</p></div>
          <span className="rounded-lg bg-[#10aee8] px-4 py-2 text-sm font-semibold text-white">30 ngày qua</span>
        </div>
        <div className="mt-5 h-[300px]">
          {isLoading ? <div className="h-full animate-pulse rounded-lg bg-slate-50" /> : points.length ? (
            <svg viewBox={`-15 -10 ${width + 30} ${height + 35}`} className="h-full w-full" preserveAspectRatio="none">
              <defs><linearGradient id="statisticsArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#10aee8" stopOpacity=".2" /><stop offset="100%" stopColor="#10aee8" stopOpacity="0" /></linearGradient></defs>
              {[0, 1, 2, 3, 4].map((item) => <line key={item} x1="0" x2={width} y1={item * 78} y2={item * 78} stroke="#e1e5ef" />)}
              <path d={area} fill="url(#statisticsArea)" />
              <path d={line} fill="none" stroke="#10aee8" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              {points.map(({ x, y, item }) => <circle key={item.statDate} cx={x} cy={y} r="3.5" fill="#fff" stroke="#10aee8" strokeWidth="2" vectorEffect="non-scaling-stroke"><title>{`${item.statDate}: ${item.totalConversions}`}</title></circle>)}
            </svg>
          ) : <AdminEmpty>Chưa có dữ liệu thống kê.</AdminEmpty>}
        </div>
        <div className="flex justify-between text-[10px] text-slate-500">
          {daily.filter((_, index) => index % 5 === 0 || index === daily.length - 1).map((item) => <span key={item.statDate}>{new Date(`${item.statDate}T00:00:00`).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</span>)}
        </div>
      </article>

      <article className={`${adminPanelClass} mt-6 overflow-hidden`}>
        <div className="flex flex-col gap-3 border-b border-[#d8ded5] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Thống kê theo công cụ</h2>
          <label className="flex h-10 items-center gap-3 rounded-lg border border-[#b8c8be] bg-[#eef8fd] px-3 sm:w-64"><Search size={18} /><input value={search} onChange={(event) => { setSearch(event.target.value); setToolPage(1); }} className="min-w-0 flex-1 bg-transparent text-sm outline-none" placeholder="Tìm kiếm công cụ..." /></label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[850px] text-left">
            <thead className="bg-[#eef8fd] text-xs uppercase tracking-wide text-[#34423e] dark:bg-slate-800 dark:text-slate-200"><tr><th className="px-5 py-3.5">Công cụ</th><th className="px-4 py-3.5">Tổng lượt</th><th className="px-4 py-3.5">Thành công</th><th className="px-4 py-3.5">Thất bại</th><th className="px-4 py-3.5">Tỷ lệ thành công</th><th className="px-4 py-3.5 text-center">Hành động</th></tr></thead>
            <tbody>
              {visibleTools.map((item) => {
                const rate = item.totalUsage ? Math.round((item.successCount / item.totalUsage) * 1000) / 10 : 0;
                return (
                  <tr key={item.tool} className="border-t border-[#d8ded5] dark:border-slate-800 text-sm">
                    <td className="px-5 py-3.5"><strong>{toolLabel(item.tool)}</strong></td>
                    <td className="px-4 py-3.5">{item.totalUsage.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3.5 font-semibold text-[#10aee8]">{item.successCount.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3.5 font-semibold text-red-600">{item.failedCount.toLocaleString("vi-VN")}</td>
                    <td className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="h-2 w-24 rounded-full bg-[#e3e7f2]"><div className="h-full rounded-full bg-[#10aee8]" style={{ width: `${rate}%` }} /></div><span>{rate}%</span></div></td>
                    <td className="px-4 py-3.5 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedTool(item)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#f2fbff] hover:text-[#10aee8]"
                        title="Xem chi tiết công cụ"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!visibleTools.length && <tr><td colSpan={6}><AdminEmpty>Không có dữ liệu công cụ.</AdminEmpty></td></tr>}
            </tbody>
          </table>
        </div>
        {toolPages > 1 && (
          <div className="flex items-center justify-between border-t border-[#d8ded5] px-5 py-3.5 text-sm text-slate-500">
            <span>{tools.length} công cụ</span>
            <AdminPagination page={toolPage} pages={toolPages} onPageChange={setToolPage} />
          </div>
        )}
      </article>

      {selectedTool && (
        <article className={`${adminPanelClass} mt-5 p-5`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold">{toolLabel(selectedTool.tool)}</h3>
              <p className="mt-1 text-sm text-slate-500">Tổng hợp theo trạng thái thực thi</p>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(selectedTool.tool)}
              className="inline-flex h-10 items-center rounded-lg border border-[#b8c8be] px-4 text-sm font-semibold text-[#10aee8]"
            >
              Sao chép mã công cụ
            </button>
          </div>
          <div className="mt-4 grid gap-3 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-[#f8faf7] p-4 dark:bg-slate-900"><p className="text-slate-500">Tổng lượt</p><p className="mt-2 text-xl font-semibold">{selectedTool.totalUsage.toLocaleString("vi-VN")}</p></div>
            <div className="rounded-lg bg-[#f8faf7] p-4 dark:bg-slate-900"><p className="text-slate-500">Thành công</p><p className="mt-2 text-xl font-semibold text-[#10aee8]">{selectedTool.successCount.toLocaleString("vi-VN")}</p></div>
            <div className="rounded-lg bg-[#f8faf7] p-4 dark:bg-slate-900"><p className="text-slate-500">Thất bại</p><p className="mt-2 text-xl font-semibold text-red-600">{selectedTool.failedCount.toLocaleString("vi-VN")}</p></div>
          </div>
        </article>
      )}
    </section>
  );
}
