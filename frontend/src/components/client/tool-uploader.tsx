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
  fields = [],
}: {
  tool: string;
  accept: string;
  multiple?: boolean;
  minimumFiles?: number;
  fields?: Array<{
    name: string;
    label: string;
    placeholder?: string;
    defaultValue?: string;
    type?: "text" | "password" | "select";
    options?: Array<{ label: string; value: string }>;
    help?: string;
  }>;
}) {
  const router = useRouter();
  const token = useAuthStore((state) => state.token);
  const [files, setFiles] = useState<File[]>([]);
  const [teamId, setTeamId] = useState("");
  const [fieldValues, setFieldValues] = useState<Record<string, string>>(() => Object.fromEntries(
    fields.map((field) => [field.name, field.defaultValue ?? ""]),
  ));
  const [conversionId, setConversionId] = useState<string | null>(null);
  const teams = useQuery<Array<{ id: string; name: string }>>({
    queryKey: ["teams-lite"],
    queryFn: async () => (await api.get("/teams")).data,
    enabled: Boolean(token),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (files.length < minimumFiles) throw new Error(`Vui lòng chọn ít nhất ${minimumFiles} file`);
      const body = new FormData();
      files.forEach((file) => body.append(multiple ? "files" : "file", file));
      for (const [key, value] of Object.entries(fieldValues)) body.append(key, value);
      if (teamId) body.append("teamId", teamId);
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
      <div className="mx-auto flex min-h-[420px] max-w-6xl flex-col items-center justify-center rounded-lg border border-[#d8ded5] bg-white p-6 text-center shadow-[0_18px_60px_rgba(23,32,29,0.06)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none sm:min-h-[520px] sm:p-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-[#e8f7fd] text-[#10aee8] dark:bg-[#10aee8]/15 dark:text-sky-300 sm:h-20 sm:w-20">
          <FileUp size={34} />
        </span>
        <h2 className="mt-5 text-xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:mt-6 sm:text-2xl">Đăng nhập để tải file lên</h2>
        <p className="mt-2 text-slate-500">Đăng nhập để sử dụng công cụ và lưu lịch sử chuyển đổi.</p>
        <button onClick={() => router.push("/login")} className="btn-primary mt-6 !px-7">Đăng nhập</button>
      </div>
    );
  }

  const status = conversion.data?.status;
  return (
    <div className="mx-auto max-w-6xl overflow-hidden rounded-lg border border-[#d8ded5] bg-white shadow-[0_18px_60px_rgba(23,32,29,0.07)] dark:border-slate-800 dark:bg-slate-900 dark:shadow-none">
      <label className="m-3 flex min-h-[320px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#10aee8]/45 bg-gradient-to-b from-[#eef8fd]/80 to-[#f8faf7]/50 p-5 text-center transition hover:border-[#10aee8] hover:from-[#eef8fd] hover:to-[#f8faf7] dark:border-sky-500/45 dark:from-slate-800 dark:to-slate-900 dark:hover:border-[#10aee8] dark:hover:from-slate-800 dark:hover:to-slate-800 sm:m-5 sm:min-h-[420px] sm:p-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-lg bg-white text-[#10aee8] shadow-[0_12px_35px_rgba(16,174,232,0.12)] dark:bg-slate-950 dark:text-sky-300 dark:shadow-none sm:h-20 sm:w-20">
          <CloudUpload size={36} strokeWidth={1.6} />
        </span>
        <h2 className="mt-5 text-2xl font-black tracking-normal text-[#17201d] sm:mt-6 sm:text-3xl dark:text-slate-50">
          {multiple ? "Chọn các file cần xử lý" : "Chọn file cần xử lý"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          Kéo thả {multiple ? "các file" : "file"} vào đây hoặc chọn từ thiết bị của bạn
        </p>
        <span className="mt-6 inline-flex max-w-full overflow-hidden rounded-lg bg-[#10aee8] text-white shadow-lg shadow-sky-100 transition hover:bg-[#0789c5] dark:shadow-none">
          <strong className="flex min-w-0 items-center gap-2 px-5 py-3 text-sm sm:px-7 sm:py-3.5 sm:text-base">
            <FileUp size={18} /> {files.length ? `${files.length} file đã chọn` : "Chọn file"}
          </strong>
          <span className="flex items-center border-l border-white/25 px-3.5"><ChevronDown size={18} /></span>
        </span>
        {files.length > 0 && (
          <p className="mt-5 max-w-2xl truncate rounded-lg bg-white/80 px-4 py-2 text-sm font-bold text-slate-700 shadow-sm dark:bg-slate-950/80 dark:text-slate-200 dark:shadow-none">
            {files.map((file) => file.name).join(", ")}
          </p>
        )}
        <div className="mt-6 flex flex-wrap justify-center gap-2 text-[11px] font-black">
          {accept.split(",").map((format) => (
            <span key={format} className="rounded-md border border-[#d8ded5] bg-white px-3 py-1 uppercase text-[#10aee8] dark:border-sky-500/40 dark:bg-slate-950 dark:text-sky-300">
              {format.replace(".", "")}
            </span>
          ))}
        </div>
        <p className="mt-5 text-xs text-slate-500">File được bảo vệ và tự động xóa theo thời hạn gói của bạn</p>
        <input type="file" accept={accept} multiple={multiple} className="hidden" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
      </label>

      {(fields.length > 0 || Boolean(teams.data?.length)) && !status && (
        <div className="grid gap-4 border-t border-[#d8ded5] bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 sm:grid-cols-2 sm:px-6">
          {Boolean(teams.data?.length) && (
            <label className="block text-sm font-bold text-slate-800">
              Workspace
              <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="field mt-2">
                <option value="">Tài khoản cá nhân</option>
                {teams.data?.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
              <span className="mt-1 block text-xs font-normal text-slate-500">Chọn team để dùng quota Business của team.</span>
            </label>
          )}
          {fields.map((field) => (
            <label key={field.name} className="block text-sm font-bold text-slate-800">
              {field.label}
              {field.type === "select" ? (
                <select
                  value={fieldValues[field.name] ?? ""}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="field mt-2"
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type === "password" ? "password" : "text"}
                  value={fieldValues[field.name] ?? ""}
                  onChange={(event) => setFieldValues((current) => ({ ...current, [field.name]: event.target.value }))}
                  className="field mt-2"
                  placeholder={field.placeholder}
                />
              )}
              {field.help && <span className="mt-1 block text-xs font-normal text-slate-500">{field.help}</span>}
            </label>
          ))}
        </div>
      )}

      {!status && (
        <div className="flex flex-col items-stretch justify-between gap-3 border-t border-[#d8ded5] bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:px-6">
          <p className="text-sm text-slate-500">
            {files.length < minimumFiles
              ? `Vui lòng chọn ít nhất ${minimumFiles} file để tiếp tục`
              : `${files.length} file đã sẵn sàng để xử lý`}
          </p>
          <button disabled={files.length < minimumFiles || upload.isPending} onClick={() => upload.mutate()} className="btn-primary w-full !py-3.5 sm:min-w-56 sm:w-auto">
            {upload.isPending ? "Đang tải lên..." : "Bắt đầu chuyển đổi"}
          </button>
        </div>
      )}
      {(status === "QUEUED" || status === "PROCESSING") && (
        <div className="flex items-center justify-center gap-3 border-t border-[#d8ded5] bg-[#eef5f7] p-5 font-semibold text-[#0b8fc7] dark:border-slate-800 dark:bg-slate-800 dark:text-sky-300">
          <LoaderCircle className="animate-spin" /> {status === "QUEUED" ? "Đang chờ xử lý..." : "Đang chuyển đổi..."}
        </div>
      )}
      {status === "COMPLETED" && (
        <div className="border-t border-[#d8ded5] bg-emerald-50 p-5 text-center dark:border-slate-800 dark:bg-emerald-950/35">
          <p className="flex items-center justify-center gap-2 font-bold text-emerald-700"><CheckCircle2 /> Hoàn tất</p>
          <button onClick={download} className="btn-primary mt-4"><Download size={18} /> Tải file</button>
        </div>
      )}
      {(status === "FAILED" || upload.isError) && (
        <p className="flex items-center justify-center gap-2 border-t border-red-100 bg-red-50 p-5 text-red-700 dark:border-red-900/70 dark:bg-red-950/35 dark:text-red-300">
          <XCircle /> {conversion.data?.errorMessage || (axios.isAxiosError(upload.error) ? upload.error.response?.data?.message : "Chuyển đổi thất bại")}
        </p>
      )}
    </div>
  );
}
