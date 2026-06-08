"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Check, Copy, KeyRound, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
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
  const keys = useQuery<ApiKey[]>({
    queryKey: ["api-keys"],
    queryFn: async () => (await api.get("/api-keys")).data,
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
          <p className="text-sm font-bold text-indigo-600">BUSINESS API</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Public API</h1>
          <p className="mt-2 text-slate-500">Tạo API key để tích hợp ScanPDF vào hệ thống của bạn. Tính năng dành cho gói Business.</p>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-black">Tạo API key</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={name} onChange={(event) => setName(event.target.value)} className="field flex-1" placeholder="Ví dụ: Production server" minLength={2} required />
            <button disabled={createKey.isPending} className="btn-primary !rounded-xl">
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
          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
            <h2 className="font-black text-emerald-950">Lưu API key ngay bây giờ</h2>
            <p className="mt-1 text-sm text-emerald-800">Key này sẽ không được hiển thị lại.</p>
            <div className="mt-4 flex gap-2">
              <code className="min-w-0 flex-1 overflow-x-auto rounded-xl bg-slate-950 p-3 text-sm text-white">{newKey}</code>
              <button type="button" onClick={copyKey} className="rounded-xl bg-emerald-700 px-4 text-white">
                {copied ? <Check size={19} /> : <Copy size={19} />}
              </button>
            </div>
          </article>
        )}

        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">API key của bạn</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {keys.data?.map((key) => (
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
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-bold text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={16} /> Thu hồi
                  </button>
                )}
              </div>
            ))}
            {!keys.data?.length && <p className="p-8 text-center text-slate-500">Chưa có API key.</p>}
          </div>
        </article>

        <article className="rounded-2xl bg-slate-950 p-6 text-white">
          <h2 className="text-xl font-black">Ví dụ sử dụng</h2>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-black/30 p-4 text-xs leading-6 text-slate-200">{`curl -X POST http://localhost:4000/api/v1/convert/compress-pdf \\
  -H "X-API-Key: sp_live_..." \\
  -F "file=@document.pdf"`}</pre>
        </article>
      </div>
    </AccountLayout>
  );
}
