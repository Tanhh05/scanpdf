"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, ChevronDown, CloudUpload, Download, FileUp, LoaderCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

type Conversion = {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  errorMessage?: string;
  downloadUrl?: string;
  outputFile?: { originalName: string };
};

export function ToolUploader({
  tool,
  accept,
  multiple = false,
  minimumFiles = 1,
}: {
  tool: string;
  accept: string;
  multiple?: boolean;
  minimumFiles?: number;
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [files, setFiles] = useState<File[]>([]);
  const [conversionId, setConversionId] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (files.length < minimumFiles) throw new Error(`Vui lòng chọn ít nhất ${minimumFiles} file`);
      const body = new FormData();
      files.forEach((file) => body.append(multiple ? "files" : "file", file));
      return (await api.post<Conversion>(`/convert/${tool}`, body)).data;
    },
    onSuccess: (data) => setConversionId(data.id),
  });

  const conversion = useQuery({
    queryKey: ["conversion", conversionId],
    queryFn: async () => (await api.get<Conversion>(`/conversions/${conversionId}`)).data,
    enabled: Boolean(conversionId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "COMPLETED" || status === "FAILED" ? false : 1500;
    },
  });

  async function download() {
    if (!conversion.data?.downloadUrl) return;
    const response = await api.get(conversion.data.downloadUrl.replace(/^\/api/, ""), { responseType: "blob" });
    const url = URL.createObjectURL(response.data);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = conversion.data.outputFile?.originalName ?? "scanpdf-output";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[560px] max-w-6xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-50 text-indigo-600">
          <FileUp size={38} />
        </span>
        <h2 className="mt-6 text-2xl font-black text-slate-950">Đăng nhập để tải file lên</h2>
        <p className="mt-2 text-slate-500">Đăng nhập để sử dụng công cụ và lưu lịch sử chuyển đổi.</p>
        <button onClick={() => router.push("/login")} className="btn-primary mt-6 !px-7">Đăng nhập</button>
      </div>
    );
  }

  const status = conversion.data?.status;
  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.07)]">
      <label className="m-4 flex min-h-[470px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-gradient-to-b from-indigo-50/80 to-blue-50/50 p-8 text-center transition hover:border-indigo-400 hover:from-indigo-50 hover:to-blue-50 sm:m-6">
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white text-[#08275f] shadow-[0_12px_35px_rgba(79,70,229,0.12)]">
          <CloudUpload size={42} strokeWidth={1.6} />
        </span>
        <h2 className="mt-6 text-2xl font-black text-slate-950">
          {multiple ? "Chọn các file cần xử lý" : "Chọn file cần xử lý"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Kéo thả {multiple ? "các file" : "file"} vào đây hoặc chọn từ thiết bị của bạn
        </p>
        <span className="mt-6 inline-flex overflow-hidden rounded-xl bg-[#1262e8] text-white shadow-lg shadow-blue-200 transition hover:bg-[#0756d4]">
          <strong className="flex items-center gap-2 px-7 py-3.5 text-base">
            <FileUp size={18} /> {files.length ? `${files.length} file đã chọn` : "Chọn file"}
          </strong>
          <span className="flex items-center border-l border-white/25 px-3.5"><ChevronDown size={18} /></span>
        </span>
        {files.length > 0 && (
          <p className="mt-5 max-w-2xl truncate rounded-lg bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm">
            {files.map((file) => file.name).join(", ")}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] font-black">
          {accept.split(",").map((format) => (
            <span key={format} className="rounded-full border border-indigo-100 bg-white px-3 py-1 uppercase text-indigo-600">
              {format.replace(".", "")}
            </span>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-500">File được bảo vệ và tự động xóa theo thời hạn gói của bạn</p>
        <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>

      {!status && (
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-5 sm:flex-row">
          <p className="text-sm text-slate-500">
            {files.length < minimumFiles
              ? `Vui lòng chọn ít nhất ${minimumFiles} file để tiếp tục`
              : `${files.length} file đã sẵn sàng để xử lý`}
          </p>
          <button disabled={files.length < minimumFiles || upload.isPending} onClick={() => upload.mutate()} className="btn-primary min-w-56 !rounded-xl !bg-[#1262e8] !py-3.5 hover:!bg-[#0756d4]">
            {upload.isPending ? "Đang tải lên..." : "Bắt đầu chuyển đổi"}
          </button>
        </div>
      )}
      {(status === "QUEUED" || status === "PROCESSING") && (
        <div className="flex items-center justify-center gap-3 border-t border-slate-100 bg-blue-50 p-5 font-semibold text-blue-700">
          <LoaderCircle className="animate-spin" /> {status === "QUEUED" ? "Đang chờ xử lý..." : "Đang chuyển đổi..."}
        </div>
      )}
      {status === "COMPLETED" && (
        <div className="border-t border-slate-100 bg-emerald-50 p-5 text-center">
          <p className="flex items-center justify-center gap-2 font-bold text-emerald-700"><CheckCircle2 /> Hoàn tất</p>
          <button onClick={download} className="btn-primary mt-4"><Download size={18} /> Tải file</button>
        </div>
      )}
      {(status === "FAILED" || upload.isError) && (
        <p className="flex items-center justify-center gap-2 border-t border-red-100 bg-red-50 p-5 text-red-700">
          <XCircle /> {conversion.data?.errorMessage || (axios.isAxiosError(upload.error) ? upload.error.response?.data?.message : "Chuyển đổi thất bại")}
        </p>
      )}
    </div>
  );
}
