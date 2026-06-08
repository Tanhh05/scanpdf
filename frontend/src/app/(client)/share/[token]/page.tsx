"use client";

import axios from "axios";
import { Download, FileText, LockKeyhole } from "lucide-react";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/services/api";

type ShareInfo = {
  originalName: string;
  fileSize: number;
  expiresAt: string;
  passwordProtected: boolean;
};

async function getDownloadErrorMessage(error: unknown) {
  if (!axios.isAxiosError(error)) return "Không thể tải file";
  const data = error.response?.data;
  if (data instanceof Blob && data.type.includes("application/json")) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: string };
      return parsed.message ?? "Không thể tải file";
    } catch {
      return "Không thể tải file";
    }
  }
  return data?.message ?? "Không thể tải file";
}

export default function SharedFilePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [info, setInfo] = useState<ShareInfo | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.get(`/files/share/${encodeURIComponent(token)}`)
      .then((response) => setInfo(response.data))
      .catch((requestError) => setError(
        axios.isAxiosError(requestError) ? requestError.response?.data?.message : "Không thể mở liên kết",
      ));
  }, [token]);

  async function download() {
    setDownloading(true);
    setError("");
    try {
      const response = await api.get(`/files/share/${encodeURIComponent(token)}/download`, {
        params: { password: password || undefined },
        responseType: "blob",
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = info?.originalName ?? "scanpdf-shared-file";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1_000);
    } catch (requestError) {
      setError(await getDownloadErrorMessage(requestError));
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="container-page flex min-h-[72vh] items-center justify-center py-16">
      <div className="card w-full max-w-lg p-8 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <FileText size={32} />
        </span>
        <h1 className="mt-5 text-3xl font-black">Tài liệu được chia sẻ</h1>
        {info && (
          <>
            <p className="mt-4 break-all font-bold text-slate-900">{info.originalName}</p>
            <p className="mt-2 text-sm text-slate-500">
              {(info.fileSize / 1024 / 1024).toFixed(2)} MB · Hết hạn {new Date(info.expiresAt).toLocaleString("vi-VN")}
            </p>
            {info.passwordProtected && (
              <label className="mt-6 block text-left text-sm font-bold text-slate-700">
                <span className="flex items-center gap-2"><LockKeyhole size={17} /> Mật khẩu chia sẻ</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field mt-2"
                  placeholder="Nhập mật khẩu"
                />
              </label>
            )}
            <button
              type="button"
              disabled={downloading || (info.passwordProtected && !password)}
              onClick={download}
              className="btn-primary mt-7 w-full"
            >
              <Download size={18} /> {downloading ? "Đang tải..." : "Tải tài liệu"}
            </button>
          </>
        )}
        {error && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
      </div>
    </section>
  );
}
