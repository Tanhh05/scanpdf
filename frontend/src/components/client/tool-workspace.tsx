"use client";

import {
  Archive,
  Boxes,
  CircleEllipsis,
  FolderOpen,
  Droplet,
  Eraser,
  FileImage,
  FileVideo,
  Files,
  FileText,
  Hash,
  ListOrdered,
  LockKeyhole,
  LockKeyholeOpen,
  RotateCw,
  ScanText,
  Signature,
  Scissors,
  UserRound,
  Video,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "@/components/common/theme-toggle";

const toolCategories = [
  {
    id: "convert",
    label: "Convert",
    icon: Files,
    panelTitle: "PDF Converter",
    items: [
      { label: "Batch convert", icon: Boxes, color: "bg-purple-600", href: "/tools/batch-convert" },
      { label: "PDF ↔ Word", icon: FileText, color: "bg-blue-500", href: "/tools/pdf-to-word" },
      { label: "JPG → PDF", icon: FileImage, color: "bg-amber-500", href: "/tools/jpg-to-pdf" },
      { label: "PDF → JPG", icon: FileImage, color: "bg-orange-500", href: "/tools/pdf-to-jpg" },
      { label: "Đổi định dạng video", icon: FileVideo, color: "bg-blue-600", href: "/tools/video-convert" },
      { label: "Video to GIF", icon: FileImage, color: "bg-orange-500", href: "/tools/video-to-gif" },
    ],
  },
  {
    id: "compress",
    label: "Compress",
    icon: Archive,
    panelTitle: "Compress",
    items: [
      { label: "Nén PDF", icon: Archive, color: "bg-violet-500", href: "/tools/compress-pdf" },
      { label: "Nén video", icon: FileVideo, color: "bg-violet-600", href: "/tools/video-compress" },
    ],
  },
  {
    id: "organize",
    label: "Organize",
    icon: Boxes,
    panelTitle: "Organize PDF",
    items: [
      { label: "Ghép PDF", icon: Files, color: "bg-indigo-500", href: "/tools/merge-pdf" },
      { label: "Tách PDF", icon: Scissors, color: "bg-cyan-500", href: "/tools/split-pdf" },
      { label: "Xóa trang", icon: Files, color: "bg-rose-500", href: "/tools/delete-pdf-pages" },
      { label: "Sắp xếp trang", icon: ListOrdered, color: "bg-fuchsia-500", href: "/tools/reorder-pdf" },
      { label: "Đánh số trang", icon: Hash, color: "bg-teal-500", href: "/tools/add-page-numbers" },
      { label: "Ghép video", icon: FileVideo, color: "bg-cyan-600", href: "/tools/video-merge" },
      { label: "Cắt video", icon: Scissors, color: "bg-rose-600", href: "/tools/video-trim" },
    ],
  },
  {
    id: "edit",
    label: "Edit",
    icon: Scissors,
    panelTitle: "Edit Media",
    items: [
      { label: "Xoay PDF", icon: RotateCw, color: "bg-emerald-500", href: "/tools/rotate-pdf" },
      { label: "Watermark", icon: Droplet, color: "bg-sky-500", href: "/tools/watermark-pdf" },
      { label: "Xóa watermark ảnh", icon: Eraser, color: "bg-pink-500", href: "/remove-watermark-image" },
      { label: "Xóa watermark video", icon: Video, color: "bg-purple-600", href: "/remove-watermark-video" },
      { label: "Extract audio", icon: FileText, color: "bg-emerald-600", href: "/tools/extract-audio" },
    ],
  },
  {
    id: "sign",
    label: "Sign",
    icon: Signature,
    panelTitle: "Sign & Protect",
    items: [
      { label: "Ký PDF", icon: Signature, color: "bg-blue-700", href: "/tools/sign-pdf" },
      { label: "Khóa PDF", icon: LockKeyhole, color: "bg-slate-600", href: "/tools/protect-pdf" },
      { label: "Mở khóa PDF", icon: LockKeyholeOpen, color: "bg-lime-600", href: "/tools/unlock-pdf" },
    ],
  },
  {
    id: "ai-pdf",
    label: "AI PDF",
    icon: WandSparkles,
    panelTitle: "AI PDF & OCR",
    items: [
      { label: "PDF OCR", icon: ScanText, color: "bg-red-500", href: "/tools/ocr-pdf" },
      { label: "Chat PDF", icon: FileText, color: "bg-indigo-600", href: "/ai/chat-pdf" },
      { label: "Tóm tắt PDF", icon: WandSparkles, color: "bg-purple-600", href: "/ai/summarize-pdf" },
      { label: "Trích xuất PDF", icon: FileText, color: "bg-cyan-600", href: "/ai/extract-pdf" },
      { label: "Auto Subtitle", icon: FileText, color: "bg-teal-600", href: "/tools/auto-subtitle-video" },
      { label: "AI Summary Video", icon: WandSparkles, color: "bg-fuchsia-600", href: "/tools/video-summary" },
      { label: "Generate Shorts", icon: Video, color: "bg-red-600", href: "/tools/generate-shorts" },
    ],
  },
  {
    id: "more",
    label: "More",
    icon: CircleEllipsis,
    panelTitle: "More Tools",
    items: [
      { label: "TikTok Downloader", icon: Video, color: "bg-slate-700", href: "/tiktok-downloader" },
      { label: "YouTube Downloader", icon: Video, color: "bg-red-600", href: "/youtube-downloader" },
      { label: "Facebook Downloader", icon: Video, color: "bg-blue-700", href: "/facebook-downloader" },
      { label: "Instagram Downloader", icon: FileImage, color: "bg-pink-600", href: "/instagram-downloader" },
    ],
  },
] as const;

export function ToolWorkspace({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLElement | null>(null);
  const flyoutRef = useRef<HTMLDivElement | null>(null);
  const activeCategory = toolCategories.find((group) => group.items.some((item) => item.href === pathname))?.id ?? null;
  const [mobileOpenCategory, setMobileOpenCategory] = useState<string | null>(activeCategory);
  const [previewCategory, setPreviewCategory] = useState<string | null>(null);
  const [pinnedCategory, setPinnedCategory] = useState<string | null>(null);
  const openCategory = previewCategory ?? pinnedCategory;
  const highlightedCategory = openCategory ?? activeCategory;
  const openCategoryData = openCategory
    ? toolCategories.find((group) => group.id === openCategory)
    : null;

  function closeDesktopMenu() {
    setPreviewCategory(null);
    setPinnedCategory(null);
  }

  function togglePinnedCategory(categoryId: string) {
    setPreviewCategory(null);
    setPinnedCategory((current) => current === categoryId ? null : categoryId);
  }

  function handleCategoryKeyDown(event: React.KeyboardEvent<HTMLButtonElement>, categoryId: string) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    togglePinnedCategory(categoryId);
  }

  useEffect(() => {
    setMobileOpenCategory(activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    function closeOnOutsideInteraction(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (sidebarRef.current?.contains(target) || flyoutRef.current?.contains(target)) return;

      closeDesktopMenu();
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      closeDesktopMenu();
    }

    document.addEventListener("pointerdown", closeOnOutsideInteraction);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideInteraction);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <section className="min-h-screen bg-[#f5f7fc] dark:bg-slate-950">
      <div className="relative flex min-h-screen">
        <aside
          ref={sidebarRef}
          className="hidden w-[82px] shrink-0 flex-col bg-[#08275f] text-white shadow-xl dark:bg-slate-950 dark:ring-1 dark:ring-slate-800 md:flex"
          onMouseLeave={() => setPreviewCategory(null)}
        >
          <nav className="flex flex-1 flex-col items-center gap-1 py-3">
            <Link href="/" className="mb-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white/10 transition hover:bg-white/15">
              <Image src="/scanpdf-icon.png" alt="ScanPDF" width={48} height={48} className="h-12 w-12 object-contain" priority />
            </Link>
            {toolCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onMouseEnter={() => setPreviewCategory(item.id)}
                onFocus={() => setPreviewCategory(item.id)}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  togglePinnedCategory(item.id);
                }}
                onKeyDown={(event) => handleCategoryKeyDown(event, item.id)}
                aria-expanded={openCategory === item.id}
                aria-current={activeCategory === item.id ? "page" : undefined}
                className={`flex w-full cursor-pointer flex-col items-center gap-1.5 border-l-2 py-4 font-normal transition hover:border-white hover:bg-white/12 focus-visible:border-white focus-visible:bg-white/12 ${
                  highlightedCategory === item.id
                    ? "border-white bg-white/12"
                    : "border-transparent text-white/85"
                }`}
              >
                <item.icon size={19} strokeWidth={1.7} />
                <span className="w-full px-1 text-center text-[10px] font-normal leading-none">{item.label}</span>
              </button>
            ))}
          </nav>
          <Link href="/dashboard" className="flex flex-col items-center gap-1.5 border-t border-white/15 py-4 text-[10px] transition hover:bg-white/10">
            <FolderOpen size={20} />
            Documents
          </Link>
          <Link href="/dashboard" className="flex flex-col items-center gap-1.5 border-t border-white/15 py-4 text-[10px] transition hover:bg-white/10">
            <UserRound size={20} />
            Account
          </Link>
        </aside>

        {openCategoryData && (
        <div
          ref={flyoutRef}
          className="absolute left-[82px] top-0 z-40 hidden w-[320px] px-4 py-6 lg:block"
          onMouseEnter={() => setPreviewCategory(openCategoryData.id)}
          onMouseLeave={() => setPreviewCategory(null)}
        >
          <div className="sticky top-6 rounded-2xl bg-[#08275f] p-4 text-white shadow-2xl dark:bg-slate-950 dark:ring-1 dark:ring-slate-800">
            <div className="mb-4 flex items-center gap-3">
              <span className="rounded-xl bg-red-500 p-2">
                <openCategoryData.icon size={18} />
              </span>
              <div>
                <div className="text-lg font-bold">{openCategoryData.panelTitle}</div>
                <div className="text-xs text-slate-300">{openCategoryData.label}</div>
              </div>
            </div>

            <div className="space-y-2">
              {openCategoryData.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeDesktopMenu}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    pathname === item.href ? "bg-white text-[#08275f]" : "hover:bg-white/10"
                  }`}
                >
                  <span className={`rounded-lg p-1.5 ${item.color}`}>
                    <item.icon size={15} />
                  </span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
        )}

        <div className="min-w-0 flex-1" onMouseEnter={() => { if (!pinnedCategory) setPreviewCategory(null); }}>
          <div className="flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 dark:border-slate-800 dark:bg-slate-950 sm:px-7">
            <div className="flex min-w-0 items-center gap-2.5">
              <Link
                href="/"
                aria-label="Về trang chủ ScanPDF"
                className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 transition hover:bg-indigo-100 dark:bg-slate-800 dark:hover:bg-slate-700 md:hidden"
              >
                <Image
                  src="/scanpdf-icon.png"
                  alt="ScanPDF"
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                  priority
                />
              </Link>
              <div className="min-w-0">
                <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-indigo-500 sm:text-xs sm:tracking-[0.14em]">
                  Công cụ PDF
                </p>
                <h1 className="mt-0.5 truncate text-lg font-black text-slate-950 dark:text-slate-50 sm:text-xl">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <ThemeToggle />
              <Link href="/pricing" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-800 sm:px-4">
                Nâng cấp
              </Link>
            </div>
          </div>

          <div className="border-b border-slate-200 bg-[#eef4ff] px-3 py-3 dark:border-slate-800 dark:bg-slate-950 md:hidden">
            <nav aria-label="Chọn nhóm công cụ" className="space-y-2">
              {toolCategories.map((group) => {
                const active = activeCategory === group.id;
                const open = mobileOpenCategory === group.id;
                return (
                  <div key={group.id}>
                    <button
                      type="button"
                      onClick={() => setMobileOpenCategory((current) => current === group.id ? null : group.id)}
                      aria-expanded={open}
                      aria-current={active ? "page" : undefined}
                      className={`flex w-full items-center gap-3 border border-[#c8dcff] bg-white px-3 py-3 text-left text-[15px] font-black text-slate-950 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50 ${
                        active
                          ? "border-[#7eabff] bg-blue-50 dark:border-indigo-500/60 dark:bg-indigo-500/15"
                          : "hover:border-[#7eabff] hover:bg-blue-50 dark:hover:border-indigo-500/60 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center ${active ? "bg-blue-600 text-white" : "bg-[#eef4ff] text-[#0b4dcc] dark:bg-slate-800 dark:text-indigo-300"}`}>
                        <group.icon size={17} strokeWidth={2} />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{group.label}</span>
                    </button>

                    {open && (
                      <div className="grid gap-2 border-x border-b border-[#c8dcff] bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
                        {group.items.map((item) => {
                          const itemActive = pathname === item.href;
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              aria-current={itemActive ? "page" : undefined}
                              className={`flex min-w-0 items-center gap-3 border px-3 py-2.5 text-sm font-semibold transition ${
                                itemActive
                                  ? "border-[#7eabff] bg-blue-50 text-[#0b4dcc] dark:border-indigo-500/60 dark:bg-indigo-500/15 dark:text-indigo-200"
                                  : "border-slate-200 text-slate-700 hover:border-[#7eabff] hover:bg-blue-50 dark:border-slate-800 dark:text-slate-200 dark:hover:border-indigo-500/60 dark:hover:bg-slate-800"
                              }`}
                            >
                              <span className={`flex h-7 w-7 shrink-0 items-center justify-center text-white ${item.color}`}>
                                <item.icon size={15} />
                              </span>
                              <span className="min-w-0 flex-1 truncate">{item.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          <div className="px-4 py-6 sm:px-7 sm:py-8 lg:px-10">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
