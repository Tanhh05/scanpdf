"use client";

import { useMutation, useQueries } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, Download, Files, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Pagination } from "@/components/common/pagination";
import { api } from "@/services/api";

type Conversion = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage?: string;
  downloadUrl?: string;
  inputFile: { originalName: string };
  outputFile?: { originalName: string };
};

const options = [
  { value: "word-to-pdf", label: "Word sang PDF", accept: ".doc,.docx,.odt" },
  { value: "compress-pdf", label: "Nén PDF", accept: ".pdf" },
  { value: "pdf-to-jpg", label: "PDF sang JPG", accept: ".pdf" },
];

export function BatchConverter() {
  const [tool, setTool] = useState(options[0]!.value);
  const [files, setFiles] = useState<File[]>([]);
  const [ids, setIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const selected = options.find((item) => item.value === tool)!;
  const upload = useMutation({
    mutationFn: async () => {
      const body = new FormData();
      files.forEach((file) => body.append("files", file));
      return (await api.post<Conversion[]>(`/convert/batch/${tool}`, body)).data;
    },
    onSuccess: (items) => {
      setIds(items.map((item) => item.id));
      setPage(1);
    },
  });
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["batch-conversion", id],
      queryFn: async () => (await api.get<Conversion>(`/conversions/${id}`)).data,
      refetchInterval: (query: { state: { data?: Conversion } }) => {
        const status = query.state.data?.status;
        return status === "COMPLETED" || status === "FAILED" ? false : 1500;
      },
    })),
  });
  const pageSize = 5;
  const pages = Math.max(1, Math.ceil(results.length / pageSize));
  const firstResultIndex = (page - 1) * pageSize;
  const visibleResults = results.slice(firstResultIndex, firstResultIndex + pageSize);

  async function download(item: Conversion) {
    if (!item.downloadUrl) return;
    const response = await api.get(item.downloadUrl.replace(/^\/api/, ""), { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = item.outputFile?.originalName ?? "scanpdf-output";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {!ids.length && (
        <>
          <div className="grid gap-4 border-b border-slate-100 p-6 sm:grid-cols-2">
            <label className="text-sm font-bold text-slate-700">
              Công cụ
              <select value={tool} onChange={(event) => { setTool(event.target.value); setFiles([]); }} className="field mt-2">
                {options.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold text-slate-700">
              Chọn tối đa 20 file
              <input
                type="file"
                multiple
                accept={selected.accept}
                onChange={(event) => setFiles(Array.from(event.target.files ?? []).slice(0, 20))}
                className="field mt-2"
              />
            </label>
          </div>
          <div className="p-6 text-center">
            <Files className="mx-auto text-indigo-600" size={48} />
            <h2 className="mt-4 text-2xl font-black">{files.length ? `${files.length} file đã chọn` : "Chuyển đổi nhiều file cùng lúc"}</h2>
            <p className="mt-2 text-sm text-slate-500">Mỗi file tạo một kết quả riêng và được tính một lượt sử dụng.</p>
            <button disabled={!files.length || upload.isPending} onClick={() => upload.mutate()} className="btn-primary mt-6">
              {upload.isPending ? "Đang tải lên..." : "Bắt đầu batch convert"}
            </button>
            {upload.isError && (
              <p className="mt-4 text-sm font-bold text-red-600">
                {axios.isAxiosError(upload.error) ? upload.error.response?.data?.message : "Không thể tải file"}
              </p>
            )}
          </div>
        </>
      )}
      {ids.length > 0 && (
        <div className="divide-y divide-slate-100">
          <div className="flex items-center justify-between p-5">
            <h2 className="text-xl font-black">Kết quả batch</h2>
            <button onClick={() => { setIds([]); setFiles([]); setPage(1); }} className="rounded-lg border px-4 py-2 text-sm font-bold">Batch mới</button>
          </div>
          {visibleResults.map((result, index) => {
            const resultIndex = firstResultIndex + index;
            const item = result.data;
            return (
              <div key={ids[resultIndex]} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-bold text-slate-900">{files[resultIndex]?.name ?? `File ${resultIndex + 1}`}</p>
                  <p className="mt-1 text-xs text-slate-500">{item?.status ?? "Đang tải trạng thái..."}</p>
                  {item?.errorMessage && <p className="mt-1 text-xs text-red-600">{item.errorMessage}</p>}
                </div>
                {item?.status === "COMPLETED" ? (
                  <button onClick={() => download(item)} className="rounded-xl bg-emerald-600 p-3 text-white"><Download size={18} /></button>
                ) : item?.status === "FAILED" ? (
                  <span className="text-sm font-bold text-red-600">Thất bại</span>
                ) : (
                  <LoaderCircle className="animate-spin text-indigo-600" />
                )}
              </div>
            );
          })}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
              <span>{results.length} kết quả</span>
              <Pagination page={page} pages={pages} onPageChange={setPage} />
            </div>
          )}
          {results.length > 0 && results.every((result) => result.data?.status === "COMPLETED") && (
            <p className="flex items-center justify-center gap-2 bg-emerald-50 p-4 font-bold text-emerald-700">
              <CheckCircle2 size={18} /> Tất cả file đã xử lý xong
            </p>
          )}
        </div>
      )}
    </div>
  );
}
