"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeftRight,
  BadgeCheck,
  CircleDollarSign,
  Cpu,
  EllipsisVertical,
  Eye,
  Server,
  Star,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminAvatar, AdminEmpty, AdminStatusBadge, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type Metrics = {
  totalUsers: number;
  newUsers: number;
  proUsers: number;
  totalConversions: number;
  successRate: number;
  totalRevenue: number;
};

type Statistics = {
  daily: {
    statDate: string;
    totalConversions: number;
  }[];
};

type RecentUser = {
  id: string;
  fullName: string;
  email: string;
  status: string;
  createdAt: string;
  subscriptions: { plan: { name: string } }[];
};

function formatMoney(value: number) {
  return `${value.toLocaleString("vi-VN")}đ`;
}

export default function AdminDashboardPage() {
  const [selectedUser, setSelectedUser] = useState<RecentUser | null>(null);
  const metrics = useQuery<Metrics>({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await adminApi.get("/admin/dashboard")).data,
  });
  const statistics = useQuery<Statistics>({
    queryKey: ["admin-statistics"],
    queryFn: async () => (await adminApi.get("/admin/statistics")).data,
  });
  const recentUsers = useQuery<{ items: RecentUser[] }>({
    queryKey: ["admin-dashboard-users"],
    queryFn: async () => (await adminApi.get("/admin/users", { params: { page: 1, limit: 5 } })).data,
  });

  if (metrics.isError) {
    return <div className={`${adminPanelClass} p-10 text-center font-semibold text-red-600`}>Không thể tải dữ liệu tổng quan.</div>;
  }

  const data = metrics.data;
  const daily = statistics.data?.daily.slice(-7) ?? [];
  const width = 760;
  const height = 260;
  const max = Math.max(1, ...daily.map((item) => item.totalConversions));
  const points = daily.map((item, index) => ({
    x: daily.length > 1 ? (index / (daily.length - 1)) * width : width / 2,
    y: height - (item.totalConversions / max) * 205 - 22,
    item,
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const area = points.length ? `${line} L ${width} ${height} L 0 ${height} Z` : "";

  const cards = [
    { label: "Tổng người dùng", value: data?.totalUsers, note: `+${data?.newUsers ?? 0} hôm nay`, icon: Users, tone: "blue" },
    { label: "Người dùng mới", value: data?.newUsers, note: "Trong hôm nay", icon: UserPlus, tone: "slate" },
    { label: "Người dùng trả phí", value: data?.proUsers, note: "Đang hoạt động", icon: Star, tone: "blue" },
    { label: "Tổng chuyển đổi", value: data?.totalConversions, note: "Xu hướng hệ thống", icon: ArrowLeftRight, tone: "slate" },
    { label: "Tỷ lệ thành công", value: `${data?.successRate ?? 0}%`, note: "Hoạt động tốt", icon: BadgeCheck, tone: "green" },
    { label: "Doanh thu", value: formatMoney(data?.totalRevenue ?? 0), note: "Tổng đã thanh toán", icon: CircleDollarSign, tone: "solid" },
  ] as const;

  return (
    <section>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`min-h-[142px] rounded-lg border p-4 shadow-[0_2px_6px_rgba(30,41,59,0.035)] ${
              card.tone === "solid"
                ? "border-[#10aee8] bg-[#10aee8] text-white"
                : "border-[#d8ded5] bg-white text-[#17201d] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            }`}
          >
            <div className="flex items-start justify-between">
              <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                card.tone === "solid" ? "bg-white/15" : card.tone === "green" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : card.tone === "blue" ? "bg-[#e8f7fd] text-[#10aee8] dark:bg-[#10aee8]/15 dark:text-sky-300" : "bg-slate-100 text-slate-600 dark:bg-slate-950 dark:text-slate-300"
              }`}>
                <card.icon size={20} />
              </span>
              <span className={`text-xs font-semibold ${card.tone === "solid" ? "text-blue-100" : card.tone === "green" ? "text-emerald-700" : "text-[#10aee8]"}`}>
                {card.note}
              </span>
            </div>
            <p className={`mt-4 text-[11px] font-semibold uppercase tracking-wide ${card.tone === "solid" ? "text-blue-100" : "text-[#34423e] dark:text-slate-300"}`}>{card.label}</p>
            <strong className="mt-1.5 block text-[23px] leading-none">{metrics.isLoading ? "..." : card.value}</strong>
          </article>
        ))}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,2.1fr)_minmax(290px,0.9fr)]">
        <article className={`${adminPanelClass} p-5`}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold">Thống kê hoạt động</h2>
              <p className="mt-1 text-sm text-[#52615d]">Lượt chuyển đổi PDF trong 7 ngày qua</p>
            </div>
            <span className="rounded-lg border border-[#b8c8be] bg-[#eef8fd] px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">7 ngày gần nhất</span>
          </div>
          <div className="mt-5 h-[260px]">
            {statistics.isLoading ? (
              <div className="h-full animate-pulse rounded-lg bg-slate-50 dark:bg-slate-800" />
            ) : points.length ? (
              <svg viewBox={`-10 -10 ${width + 20} ${height + 45}`} className="h-full w-full" preserveAspectRatio="none" aria-label="Biểu đồ chuyển đổi">
                <defs>
                  <linearGradient id="adminDashboardArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10aee8" stopOpacity=".22" />
                    <stop offset="100%" stopColor="#10aee8" stopOpacity=".01" />
                  </linearGradient>
                </defs>
                {[0, 1, 2, 3].map((item) => <line key={item} x1="0" x2={width} y1={item * 80} y2={item * 80} stroke="currentColor" className="text-slate-700 dark:text-slate-600" strokeDasharray="4 5" />)}
                <path d={area} fill="url(#adminDashboardArea)" />
                <path d={line} fill="none" stroke="#10aee8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                {points.map(({ x, y, item }) => (
                  <circle key={item.statDate} cx={x} cy={y} r="4" fill="#fff" stroke="#10aee8" strokeWidth="2" vectorEffect="non-scaling-stroke">
                    <title>{`${item.statDate}: ${item.totalConversions} lượt`}</title>
                  </circle>
                ))}
              </svg>
            ) : (
              <AdminEmpty>Chưa có dữ liệu chuyển đổi.</AdminEmpty>
            )}
          </div>
          <div className="flex justify-between text-xs text-[#52615d]">
            {daily.map((item) => <span key={item.statDate}>{new Date(`${item.statDate}T00:00:00`).toLocaleDateString("vi-VN", { weekday: "short" })}</span>)}
          </div>
        </article>

        <article className={`${adminPanelClass} overflow-hidden`}>
          <div className="border-b border-[#d8ded5] px-5 py-4 dark:border-slate-800">
            <h2 className="text-lg font-bold">Trạng thái hệ thống</h2>
          </div>
          <div className="space-y-5 p-5">
            {[
              { label: "Dung lượng ổ đĩa", value: 45, icon: Server, color: "bg-[#10aee8]" },
              { label: "CPU Usage", value: 12, icon: Cpu, color: "bg-slate-600" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#e8f7fd] text-[#10aee8] dark:bg-[#10aee8]/15 dark:text-sky-300"><item.icon size={22} /></span>
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex justify-between text-sm"><span>{item.label}</span><strong>{item.value}%</strong></div>
                  <div className="h-2 rounded-full bg-[#e7eaf4] dark:bg-slate-700"><div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} /></div>
                </div>
              </div>
            ))}
            <div className="border-t border-[#d8ded5] pt-5 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide">Nhật ký gần đây</p>
              <div className="mt-5 space-y-5 text-sm">
                <div><p className="flex items-center gap-3"><i className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Người dùng mới hôm nay: {data?.newUsers ?? 0}</p><span className="ml-5 mt-1 block text-xs text-slate-500">Dữ liệu trực tiếp</span></div>
                <div><p className="flex items-center gap-3"><i className="h-2.5 w-2.5 rounded-full bg-[#10aee8]" /> Tỷ lệ thành công: {data?.successRate ?? 0}%</p><span className="ml-5 mt-1 block text-xs text-slate-500">Toàn hệ thống</span></div>
              </div>
            </div>
          </div>
          <Link href="/admin/logs" className="block bg-[#f2fbff] px-6 py-4 text-center text-sm font-semibold text-[#10aee8] dark:bg-slate-800 dark:text-sky-300">Xem tất cả hoạt động</Link>
        </article>
      </div>

      <article className={`${adminPanelClass} mt-6 overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-[#d8ded5] px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-bold">Người dùng mới nhất</h2>
          <Link href="/admin/users" className="text-sm font-semibold text-[#10aee8]">Quản lý tất cả →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-[#f2fbff] text-xs uppercase tracking-wide text-[#34423e] dark:bg-slate-800 dark:text-slate-200">
              <tr><th className="px-7 py-4">Người dùng</th><th className="px-5 py-4">Trạng thái</th><th className="px-5 py-4">Ngày tham gia</th><th className="px-5 py-4">Gói</th><th className="px-5 py-4 text-center">Thao tác</th></tr>
            </thead>
            <tbody>
              {recentUsers.data?.items.map((user) => (
                <tr key={user.id} className="border-t border-[#e3e6ef] text-sm dark:border-slate-800 dark:text-slate-100">
                  <td className="px-7 py-4"><div className="flex items-center gap-3"><AdminAvatar name={user.fullName} /><div><strong className="block">{user.fullName}</strong><span className="text-xs text-slate-500">{user.email}</span></div></div></td>
                  <td className="px-5 py-4"><AdminStatusBadge status={user.status} /></td>
                  <td className="px-5 py-4">{new Date(user.createdAt).toLocaleDateString("vi-VN")}</td>
                  <td className="px-5 py-4 font-medium text-[#10aee8]">{user.subscriptions[0]?.plan.name ?? "Free"}</td>
                  <td className="px-5 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => setSelectedUser(user)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#f2fbff] hover:text-[#10aee8] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-sky-300"
                      title="Xem nhanh"
                    >
                      <EllipsisVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {!recentUsers.isLoading && !recentUsers.data?.items.length && <tr><td colSpan={5}><AdminEmpty>Chưa có người dùng.</AdminEmpty></td></tr>}
            </tbody>
          </table>
        </div>
      </article>

      {selectedUser && (
        <article className={`${adminPanelClass} mt-5 p-5`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <AdminAvatar name={selectedUser.fullName} />
              <div>
                <h3 className="text-lg font-bold">{selectedUser.fullName}</h3>
                <p className="text-sm text-slate-500">{selectedUser.email}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(selectedUser.email)}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#b8c8be] px-4 text-sm font-semibold text-[#10aee8] hover:bg-[#f2fbff] dark:border-slate-700 dark:text-sky-300 dark:hover:bg-slate-800"
              >
                <Eye size={17} />
                Sao chép email
              </button>
              <Link href="/admin/users" className="inline-flex h-10 items-center rounded-lg bg-[#10aee8] px-4 text-sm font-semibold text-white">
                Mở trang người dùng
              </Link>
            </div>
          </div>
          <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-lg bg-[#f8faf7] p-4 dark:bg-slate-800">
              <p className="text-slate-500">Trạng thái</p>
              <div className="mt-2"><AdminStatusBadge status={selectedUser.status} /></div>
            </div>
            <div className="rounded-lg bg-[#f8faf7] p-4 dark:bg-slate-800">
              <p className="text-slate-500">Ngày tham gia</p>
              <p className="mt-2 font-semibold">{new Date(selectedUser.createdAt).toLocaleString("vi-VN")}</p>
            </div>
            <div className="rounded-lg bg-[#f8faf7] p-4 dark:bg-slate-800">
              <p className="text-slate-500">Gói hiện tại</p>
              <p className="mt-2 font-semibold text-[#10aee8]">{selectedUser.subscriptions[0]?.plan.name ?? "Free"}</p>
            </div>
          </div>
        </article>
      )}
    </section>
  );
}
