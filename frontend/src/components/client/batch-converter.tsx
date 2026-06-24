"use client";

import { useMutation, useQueries } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, Download, Files, LoaderCircle } from "lucide-react";
import { DragEvent, useState } from "react";
import { Pagination } from "@/components/common/pagination";
import { api } from "@/services/api";
import { filenameFromContentDisposition } from "@/utils/download-filename";

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
  const [dragActive, setDragActive] = useState(false);
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
    anchor.download = filenameFromContentDisposition(response.headers["content-disposition"])
      ?? item.outputFile?.originalName
      ?? "scanpdf-output";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function setPickedFiles(nextFiles: File[]) {
    setFiles(nextFiles.slice(0, 20));
    setIds([]);
    setPage(1);
  }

  function handleDrag(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.type === "dragenter" || event.type === "dragover") setDragActive(true);
    if (event.type === "dragleave") setDragActive(false);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const droppedFiles = Array.from(event.dataTransfer.files ?? []);
    if (!droppedFiles.length) return;
    setPickedFiles(droppedFiles);
  }

  return (
    <div className="app-card mx-auto max-w-6xl overflow-hidden">
      {!ids.length && (
        <>
          <div className="grid gap-4 border-b border-[#d8ded5] bg-[#f8faf7] p-5 dark:border-slate-800 dark:bg-slate-950 sm:grid-cols-2">
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
                onChange={(event) => setPickedFiles(Array.from(event.target.files ?? []))}
                className="field mt-2"
              />
            </label>
          </div>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`m-5 rounded-lg border-2 border-dashed p-8 text-center transition ${
              dragActive
                ? "border-[#10aee8] bg-[#e8f7fd] dark:border-sky-300 dark:bg-sky-950/30"
                : "border-[#d8ded5] bg-white hover:border-[#10aee8] hover:bg-[#f2fbff] dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800"
            }`}
          >
            <Files className="mx-auto text-[#10aee8]" size={48} />
            <h2 className="app-heading mt-4 text-2xl">{files.length ? `${files.length} file đã chọn` : "Chuyển đổi nhiều file cùng lúc"}</h2>
            <p className="mt-2 text-sm text-slate-500">Kéo thả tối đa 20 file vào đây. Mỗi file tạo một kết quả riêng và được tính một lượt sử dụng.</p>
            {files.length > 0 && (
              <p className="mx-auto mt-4 max-w-2xl truncate rounded-lg bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-950/80 dark:text-slate-200 dark:shadow-none">
                {files.map((file) => file.name).join(", ")}
              </p>
            )}
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
        <div className="divide-y divide-[#d8ded5] dark:divide-slate-800">
          <div className="flex items-center justify-between p-5">
            <h2 className="app-heading text-xl">Kết quả batch</h2>
            <button onClick={() => { setIds([]); setFiles([]); setPage(1); }} className="rounded-lg border border-[#d8ded5] px-4 py-2 text-sm font-bold hover:bg-[#f2fbff] dark:border-slate-700">Batch mới</button>
          </div>
          {visibleResults.map((result, index) => {
            const resultIndex = firstResultIndex + index;
            const item = result.data;
            return (
              <div key={ids[resultIndex]} className="flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-bold text-[#17201d] dark:text-slate-50">{files[resultIndex]?.name ?? `File ${resultIndex + 1}`}</p>
                  <p className="mt-1 text-xs text-slate-500">{item?.status ?? "Đang tải trạng thái..."}</p>
                  {item?.errorMessage && <p className="mt-1 text-xs text-red-600">{item.errorMessage}</p>}
                </div>
                {item?.status === "COMPLETED" ? (
                  <button onClick={() => download(item)} className="rounded-lg bg-emerald-600 p-3 text-white"><Download size={18} /></button>
                ) : item?.status === "FAILED" ? (
                  <span className="text-sm font-bold text-red-600">Thất bại</span>
                ) : (
                  <LoaderCircle className="animate-spin text-[#10aee8]" />
                )}
              </div>
            );
          })}
          {pages > 1 && (
            <div className="flex items-center justify-between border-t border-[#d8ded5] px-5 py-4 text-sm text-slate-500 dark:border-slate-800">
              <span>{results.length} kết quả</span>
              <Pagination page={page} pages={pages} onPageChange={setPage} />
            </div>
          )}
          {results.length > 0 && results.every((result) => result.data?.status === "COMPLETED") && (
            <p className="flex items-center justify-center gap-2 bg-emerald-50 p-4 font-bold text-emerald-700 dark:bg-emerald-950/35 dark:text-emerald-300">
              <CheckCircle2 size={18} /> Tất cả file đã xử lý xong
            </p>
          )}
        </div>
      )}
    </div>
  );
}
