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

export function ToolUploader({ tool, accept }: { tool: string; accept: string }) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [file, setFile] = useState<File | null>(null);
  const [conversionId, setConversionId] = useState<string | null>(null);

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Vui lòng chọn file");
      const body = new FormData();
      body.append("file", file);
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
      <div className="mx-auto flex min-h-[72vh] max-w-5xl flex-col items-center justify-center border border-dashed border-blue-400 bg-[#e7efff] p-10 text-center">
        <FileUp className="mx-auto text-indigo-600" size={48} />
        <h2 className="mt-5 text-xl font-bold">Đăng nhập để tải file lên</h2>
        <button onClick={() => router.push("/login")} className="btn-primary mt-5">Đăng nhập</button>
      </div>
    );
  }

  const status = conversion.data?.status;
  return (
    <div className="mx-auto max-w-[1580px]">
      <label className="flex min-h-[72vh] cursor-pointer flex-col items-center justify-center border border-dashed border-blue-400 bg-[#e7efff] p-8 text-center transition hover:bg-[#dfeaff]">
        <CloudUpload size={62} strokeWidth={1.5} className="text-[#06245d]" />
        <span className="mt-5 inline-flex overflow-hidden rounded-md bg-[#075bff] text-white shadow-md">
          <strong className="flex items-center gap-2 px-6 py-3 text-base">
            <FileUp size={18} /> {file ? file.name : "Chọn file"}
          </strong>
          <span className="flex items-center border-l border-white/30 px-3"><ChevronDown size={18} /></span>
        </span>
        <strong className="mt-5 text-base text-slate-800">
          {file ? "File đã sẵn sàng để chuyển đổi" : "Kéo thả file vào đây hoặc chọn từ thiết bị"}
        </strong>
        <span className="mt-3 text-sm text-slate-600">File được mã hóa và tự động xóa theo thời hạn gói của bạn</span>
        <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-bold">
          {accept.split(",").map((format) => (
            <span key={format} className="rounded-full bg-white/80 px-3 py-1 uppercase text-[#075bff] shadow-sm">
              {format.replace(".", "")}
            </span>
          ))}
        </div>
        <input type="file" accept={accept} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      {!status && (
        <div className="-mt-24 flex justify-center pb-8">
          <button disabled={!file || upload.isPending} onClick={() => upload.mutate()} className="btn-primary relative z-10 min-w-56 !rounded-md !bg-[#075bff]">
          {upload.isPending ? "Đang tải lên..." : "Bắt đầu chuyển đổi"}
          </button>
        </div>
      )}
      {(status === "QUEUED" || status === "PROCESSING") && (
        <div className="-mt-20 relative z-10 mx-auto flex max-w-md items-center justify-center gap-3 rounded-xl bg-white p-4 font-semibold text-blue-700 shadow-lg">
          <LoaderCircle className="animate-spin" /> {status === "QUEUED" ? "Đang chờ xử lý..." : "Đang chuyển đổi..."}
        </div>
      )}
      {status === "COMPLETED" && (
        <div className="-mt-24 relative z-10 mx-auto max-w-md rounded-xl bg-white p-5 text-center shadow-lg">
          <p className="flex items-center justify-center gap-2 font-bold text-emerald-700"><CheckCircle2 /> Hoàn tất</p>
          <button onClick={download} className="btn-primary mt-4"><Download size={18} /> Tải file</button>
        </div>
      )}
      {(status === "FAILED" || upload.isError) && (
        <p className="-mt-20 relative z-10 mx-auto flex max-w-lg items-center justify-center gap-2 rounded-xl bg-red-50 p-4 text-red-700 shadow-lg">
          <XCircle /> {conversion.data?.errorMessage || (axios.isAxiosError(upload.error) ? upload.error.response?.data?.message : "Chuyển đổi thất bại")}
        </p>
      )}
    </div>
  );
}
