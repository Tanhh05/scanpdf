"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import { Pagination } from "@/components/common/pagination";
import type { PaginatedList } from "@/lib/account";
import { api } from "@/services/api";

type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  lastFour: string;
  createdAt: string;
  lastUsedAt?: string | null;
  revokedAt?: string | null;
};

export default function ApiKeysPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [newKey, setNewKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [page, setPage] = useState(1);
  const keys = useQuery<PaginatedList<ApiKey>>({
    queryKey: ["api-keys", page],
    queryFn: async () => (await api.get("/api-keys", { params: { page, limit: 5 } })).data,
  });
  const createKey = useMutation({
    mutationFn: async () => (await api.post("/api-keys", { name })).data,
    onSuccess: (data) => {
      setNewKey(data.key);
      setName("");
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
  const revokeKey = useMutation({
    mutationFn: async (id: string) => api.delete(`/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["api-keys"] }),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createKey.mutate();
  }

  async function copyKey() {
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
  }

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold text-[#10aee8]">BUSINESS API</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">Public API</h1>
          <p className="mt-2 text-slate-500">Tạo API key để tích hợp ScanPDF vào hệ thống của bạn. Tính năng dành cho gói Business.</p>
        </div>

        <form onSubmit={submit} className="rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820] p-6">
          <h2 className="text-xl font-black">Tạo API key</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} className="field flex-1" placeholder="Ví dụ: Production server" minLength={2} required />
            <button disabled={createKey.isPending} className="btn-primary">
              <KeyRound size={18} /> {createKey.isPending ? "Đang tạo..." : "Tạo key"}
            </button>
          </div>
          {createKey.isError && (
            <p className="mt-3 text-sm font-bold text-red-600">
              {axios.isAxiosError(createKey.error) ? createKey.error.response?.data?.message : "Không thể tạo API key"}
            </p>
          )}
        </form>

        {newKey && (
          <article className="rounded-lg border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="font-black text-emerald-950">Lưu API key ngay bây giờ</h2>
            <p className="mt-1 text-sm text-emerald-800">Key này sẽ không được hiển thị lại.</p>
            <div className="mt-4 flex gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-lg bg-slate-950 p-3 text-sm text-white">{newKey}</code>
              <button type="button" onClick={copyKey} className="rounded-lg bg-emerald-700 px-4 text-white">
                {copied ? <Check size={19} /> : <Copy size={19} />}
              </button>
            </div>
          </article>
        )}

        <article className="overflow-hidden rounded-lg border border-[#d8ded5] bg-white dark:border-slate-800 dark:bg-[#101820]">
          <div className="border-b border-[#d8ded5] dark:border-slate-800 p-5">
            <h2 className="text-xl font-black">API key của bạn</h2>
          </div>
          <div className="divide-y divide-[#d8ded5] dark:divide-slate-800">
            {keys.data?.items.map((key) => (
              <div key={key.id} className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-black text-slate-900">{key.name}</p>
                  <code className="mt-1 block text-sm text-slate-500">{key.prefix}...{key.lastFour}</code>
                  <p className="mt-1 text-xs text-slate-400">
                    Tạo {new Date(key.createdAt).toLocaleString("vi-VN")}
                    {key.lastUsedAt ? ` · Dùng gần nhất ${new Date(key.lastUsedAt).toLocaleString("vi-VN")}` : ""}
                  </p>
                </div>
                {key.revokedAt ? (
                  <span className="text-sm font-bold text-slate-400">Đã thu hồi</span>
                ) : (
                  <button
                    type="button"
                    disabled={revokeKey.isPending}
                    onClick={() => window.confirm("Thu hồi API key này?") && revokeKey.mutate(key.id)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} /> Thu hồi
                  </button>
                )}
              </div>
            ))}
            {!keys.data?.items.length && <p className="p-8 text-center text-slate-500">Chưa có API key.</p>}
          </div>
          {keys.data && keys.data.pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#d8ded5] dark:border-slate-800 px-5 py-4 text-sm text-slate-500">
              <span>{keys.data.total} API key</span>
              <Pagination page={page} pages={keys.data.pages} onPageChange={setPage} />
            </div>
          )}
        </article>

        <article className="rounded-lg border border-[#1f3b4d] bg-[#17201d] p-6 text-white">
          <h2 className="text-xl font-black">Ví dụ sử dụng</h2>
          <pre className="mt-4 overflow-x-auto rounded-lg bg-black/30 p-4 text-xs leading-6 text-slate-200">{`curl -X POST http://localhost:4000/api/v1/convert/compress-pdf \\
  -H "X-API-Key: sp_live_..." \\
  -F "file=@document.pdf"`}</pre>
        </article>
      </div>
    </AccountLayout>
  );
}
