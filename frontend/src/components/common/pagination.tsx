"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({
  page,
  pages,
  onPageChange,
  compact = false,
}: {
  page: number;
  pages: number;
  onPageChange: (page: number) => void;
  compact?: boolean;
}) {
  if (pages <= 1) return null;
  const items = Array.from(new Set([1, page - 1, page, page + 1, pages]))
    .filter((item) => item >= 1 && item <= pages)
    .sort((left, right) => left - right);
  const size = compact ? "h-8 min-w-8 rounded-md text-xs" : "h-9 min-w-9 rounded-lg text-sm";

  return (
    <nav className="flex items-center gap-2" aria-label="Phân trang">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className={`${size} inline-flex items-center justify-center border border-[#d8ded5] bg-white px-2 text-slate-600 transition hover:bg-[#f2fbff] disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300`}
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
      </button>
      {items.map((item, index) => (
        <span key={item} className="contents">
          {index > 0 && item - items[index - 1] > 1 && <span className="px-0.5 text-slate-400">...</span>}
          <button
            type="button"
            onClick={() => onPageChange(item)}
            className={`${size} border px-2 font-bold ${
              item === page
                ? "border-[#10aee8] bg-[#10aee8] text-white"
                : "border-[#d8ded5] bg-white text-slate-700 hover:bg-[#f2fbff] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
            aria-current={item === page ? "page" : undefined}
          >
            {item}
          </button>
        </span>
      ))}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
        className={`${size} inline-flex items-center justify-center border border-[#d8ded5] bg-white px-2 text-slate-600 transition hover:bg-[#f2fbff] disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300`}
        aria-label="Trang sau"
      >
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
