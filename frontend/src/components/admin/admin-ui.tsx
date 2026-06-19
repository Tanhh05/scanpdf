import type { ReactNode } from "react";
import { Pagination } from "@/components/common/pagination";

export const adminPanelClass =
  "rounded-lg border border-[#d8ded5] bg-white shadow-[0_2px_10px_rgba(23,32,29,0.045)] dark:border-slate-800 dark:bg-[#101820]";

export const adminInputClass =
  "h-10 w-full rounded-md border border-[#b8c8be] bg-white px-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#10aee8] focus:ring-2 focus:ring-[#10aee8]/10 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100";

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
      <div>
        {title && <h2 className="text-[22px] font-bold tracking-normal text-[#17201d] dark:text-slate-50">{title}</h2>}
        {description && <p className={`${title ? "mt-1" : ""} text-sm text-[#52615d] dark:text-slate-400`}>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function AdminAvatar({
  name,
  tone = "blue",
  size = "md",
}: {
  name: string;
  tone?: "blue" | "slate" | "red";
  size?: "sm" | "md";
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const tones = {
    blue: "bg-[#dff4fc] text-[#10aee8]",
    slate: "bg-slate-200 text-slate-600",
    red: "bg-red-100 text-red-600",
  };
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${tones[tone]} ${size === "sm" ? "h-8 w-8 text-[11px]" : "h-9 w-9 text-xs"}`}>
      {initials || "A"}
    </span>
  );
}

export function AdminStatusBadge({
  status,
}: {
  status: string;
}) {
  const value = status.toUpperCase();
  const style =
    value === "ACTIVE" || value === "PAID" || value === "COMPLETED"
      ? "bg-[#dff4fc] text-[#10aee8]"
      : value === "PENDING" || value === "PROCESSING" || value === "QUEUED"
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  const labels: Record<string, string> = {
    ACTIVE: "Hoạt động",
    SUSPENDED: "Đã khóa",
    PAID: "Đã thanh toán",
    PENDING: "Đang chờ",
    FAILED: "Thất bại",
    CANCELLED: "Đã hủy",
    COMPLETED: "Thành công",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${style}`}>
      <i className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[value] ?? status}
    </span>
  );
}

export function AdminPagination({
  page,
  pages,
  onPageChange,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
}) {
  return <Pagination page={page} pages={pages} onPageChange={onPageChange} compact />;
}

export function AdminEmpty({ children }: { children: ReactNode }) {
  return <div className="p-8 text-center text-sm text-slate-500">{children}</div>;
}
