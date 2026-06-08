"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Bot, FileText, LoaderCircle, Send, Sparkles, UploadCloud, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

type AiMode = "chat" | "summary" | "extract";

const modeCopy: Record<AiMode, { endpoint: string; action: string; placeholder: string; emptyText: string }> = {
  chat: {
    endpoint: "/ai/chat",
    action: "Hỏi AI",
    placeholder: "Ví dụ: Tóm tắt điều khoản thanh toán trong tài liệu này",
    emptyText: "Tải PDF lên để AI tóm tắt, trích xuất thông tin hoặc trả lời câu hỏi dựa trên nội dung tài liệu.",
  },
  summary: {
    endpoint: "/ai/summary",
    action: "Tóm tắt PDF",
    placeholder: "AI sẽ tự động tóm tắt nội dung chính trong tài liệu.",
    emptyText: "Tải PDF lên để AI tạo bản tóm tắt ngắn gọn, dễ đọc và có cấu trúc.",
  },
  extract: {
    endpoint: "/ai/extract",
    action: "Trích xuất thông tin",
    placeholder: "AI sẽ tự động trích xuất dữ liệu quan trọng trong tài liệu.",
    emptyText: "Tải PDF lên để AI lấy ra ngày tháng, số tiền, điều khoản và thông tin quan trọng.",
  },
};

const suggestionChips = [
  "Tóm tắt nhanh",
  "Trích xuất dữ liệu",
  "Phân tích hợp đồng",
];

export function AiPdfTool({
  mode,
  title,
  description,
}: {
  mode: AiMode;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState("");

  const request = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Vui lòng chọn file PDF");
      if (mode === "chat" && !question.trim()) throw new Error("Vui lòng nhập câu hỏi");
      const body = new FormData();
      body.append("file", file);
      if (mode === "chat") body.append("question", question.trim());
      return (await api.post<{ result: string }>(modeCopy[mode].endpoint, body)).data;
    },
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Bot className="mx-auto text-indigo-600" size={42} />
        <h1 className="mt-5 text-2xl font-black text-slate-950">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-slate-500">Đăng nhập để sử dụng AI với tài liệu PDF của bạn.</p>
        <button onClick={() => router.push("/login")} className="btn-primary mt-6">Đăng nhập</button>
      </div>
    );
  }

  const error = request.error
    ? axios.isAxiosError(request.error)
      ? request.error.response?.data?.message ?? "Không thể xử lý AI"
      : request.error.message
    : "";

  return (
    <section className="mx-auto max-w-6xl">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Sparkles size={18} />
          </span>
          <h1 className="mt-5 text-3xl font-black tracking-[-0.015em] text-slate-950">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>

          <label className="mt-7 flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-indigo-300 bg-white p-6 text-center transition hover:border-indigo-500 hover:bg-indigo-50/30">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <UploadCloud size={23} />
            </span>
            <strong className="mt-4 text-sm font-black text-slate-950">{file ? file.name : "Chọn file PDF"}</strong>
            <span className="mt-1 text-xs font-semibold text-slate-500">PDF có văn bản sẽ cho kết quả tốt nhất</span>
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                request.reset();
              }}
            />
          </label>

          {mode === "chat" && (
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              className="mt-5 min-h-28 w-full resize-none rounded-lg border border-slate-200 bg-indigo-50/60 px-4 py-3 text-sm font-medium leading-6 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-100"
              placeholder={modeCopy.chat.placeholder}
            />
          )}
          {mode !== "chat" && (
            <div className="mt-5 rounded-lg border border-slate-200 bg-indigo-50/60 px-4 py-4 text-sm font-medium leading-6 text-slate-400">
              {modeCopy[mode].placeholder}
            </div>
          )}

          <button
            type="button"
            onClick={() => request.mutate()}
            disabled={request.isPending || !file || (mode === "chat" && !question.trim())}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {request.isPending ? <LoaderCircle className="animate-spin" size={16} /> : <Send size={16} />}
            {request.isPending ? "AI đang xử lý..." : modeCopy[mode].action}
          </button>

          {error && (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">
              <XCircle size={18} className="mt-0.5 shrink-0" /> {error}
            </p>
          )}
        </div>

        <div className="flex min-h-[612px] flex-col rounded-xl border border-slate-200 bg-white p-7 shadow-sm">
          <div className="flex items-start gap-3 border-b border-slate-100 pb-5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <FileText size={18} />
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-950">Kết quả AI</h2>
              <p className="text-xs font-semibold text-slate-500">Nội dung sẽ hiển thị sau khi xử lý.</p>
            </div>
          </div>

          <div className="flex flex-1 whitespace-pre-wrap py-6 text-[15px] leading-8 text-slate-700">
            {request.data?.result ?? (
              <div className="flex w-full flex-col items-center justify-center text-center text-slate-500">
                <span className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                  <Bot size={33} />
                </span>
                <p className="mt-6 max-w-sm text-sm font-medium leading-6">{modeCopy[mode].emptyText}</p>
                <div className="mt-5 flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-300" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-200" />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            {suggestionChips.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => mode === "chat" && setQuestion(suggestion)}
                className="rounded-full bg-indigo-50 px-3 py-1.5 text-[11px] font-black text-indigo-600 transition hover:bg-indigo-100"
              >
                # {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
