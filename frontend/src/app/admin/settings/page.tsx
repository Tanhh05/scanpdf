"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Gauge,
  Loader2,
  Mail,
  Megaphone,
  Save,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Wrench,
} from "lucide-react";
import { AdminPageHeader, adminInputClass, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type AdminSettings = {
  siteName: string;
  supportEmail: string;
  contactPhone: string;
  maintenanceMode: boolean;
  allowRegistrations: boolean;
  maxUploadMb: number;
  defaultStorageDays: number;
  downloaderEnabled: boolean;
  watermarkRemovalEnabled: boolean;
  announcement: string;
};

const defaultSettings: AdminSettings = {
  siteName: "ScanPDF",
  supportEmail: "support@scanpdf.vn",
  contactPhone: "",
  maintenanceMode: false,
  allowRegistrations: true,
  maxUploadMb: 200,
  defaultStorageDays: 7,
  downloaderEnabled: true,
  watermarkRemovalEnabled: true,
  announcement: "",
};

function getErrorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? fallback : fallback;
}

function SettingCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Settings2;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`${adminPanelClass} p-5`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#dff4fc] text-[#10aee8]">
          <Icon size={20} />
        </span>
        <div>
          <h2 className="text-[17px] font-black text-[#17201d] dark:text-slate-50">{title}</h2>
          <p className="mt-1 text-sm leading-5 text-[#52615d] dark:text-slate-400">{description}</p>
        </div>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function ToggleField({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex min-h-[86px] w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition ${
        checked
          ? "border-[#10aee8]/40 bg-[#eef8fd] dark:border-sky-500/40 dark:bg-sky-950/20"
          : "border-[#d8ded5] bg-white hover:border-[#b8c8be] dark:border-slate-800 dark:bg-slate-950"
      }`}
    >
      <span className="min-w-0">
        <span className="block text-sm font-bold text-[#17201d] dark:text-slate-100">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#52615d] dark:text-slate-400">{description}</span>
      </span>
      <span
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#10aee8]" : "bg-slate-300 dark:bg-slate-700"
        }`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="text-sm font-bold text-[#17201d] dark:text-slate-100">
      {label}
      <div className="mt-2 flex overflow-hidden rounded-md border border-[#b8c8be] bg-white focus-within:border-[#10aee8] focus-within:ring-2 focus-within:ring-[#10aee8]/10 dark:border-slate-700 dark:bg-slate-900">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="h-11 min-w-0 flex-1 bg-transparent px-3 text-sm font-semibold text-slate-800 outline-none dark:text-slate-100"
          required
        />
        <span className="flex h-11 items-center border-l border-[#d8ded5] px-3 text-xs font-bold text-[#52615d] dark:border-slate-700 dark:text-slate-400">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function StatusTile({
  label,
  value,
  active,
  icon: Icon,
}: {
  label: string;
  value: string;
  active: boolean;
  icon: typeof Settings2;
}) {
  return (
    <div className="rounded-lg border border-[#d8ded5] bg-white p-4 shadow-[0_1px_8px_rgba(23,32,29,0.035)] dark:border-slate-800 dark:bg-[#101820]">
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${active ? "bg-[#dff4fc] text-[#10aee8]" : "bg-red-50 text-red-600"}`}>
          <Icon size={18} />
        </span>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${active ? "bg-[#dff4fc] text-[#10aee8]" : "bg-red-50 text-red-600"}`}>
          {value}
        </span>
      </div>
      <p className="mt-3 text-sm font-bold text-[#17201d] dark:text-slate-100">{label}</p>
    </div>
  );
}

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<AdminSettings>(defaultSettings);
  const [message, setMessage] = useState("");

  const settings = useQuery<AdminSettings>({
    queryKey: ["admin-settings"],
    queryFn: async () => (await adminApi.get("/admin/settings")).data,
    retry: 1,
  });

  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);

  const saveSettings = useMutation({
    mutationFn: async (payload: AdminSettings) => (await adminApi.patch("/admin/settings", payload)).data,
    onSuccess: (data: AdminSettings) => {
      setForm(data);
      setMessage("Đã lưu cài đặt hệ thống.");
      queryClient.setQueryData(["admin-settings"], data);
    },
    onError: (error) => setMessage(getErrorMessage(error, "Lưu cài đặt thất bại")),
  });

  function updateField<K extends keyof AdminSettings>(key: K, value: AdminSettings[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function submitSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    saveSettings.mutate(form);
  }

  const errorMessage = settings.isError ? getErrorMessage(settings.error, "Không thể tải cài đặt hệ thống.") : "";
  const disabled = settings.isLoading || saveSettings.isPending;

  return (
    <section>
      <AdminPageHeader
        title="Cài đặt hệ thống"
        description="Quản lý thông tin vận hành, giới hạn file và trạng thái chức năng của nền tảng."
        action={
          <button
            type="submit"
            form="admin-settings-form"
            disabled={disabled}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#10aee8] px-4 text-sm font-semibold text-white shadow-md disabled:opacity-60"
          >
            {saveSettings.isPending ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            {saveSettings.isPending ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        }
      />

      {message && (
        <p className="fixed bottom-6 right-6 z-50 rounded-lg bg-[#242c42] px-6 py-4 text-sm font-semibold text-white shadow-2xl">
          {message}
        </p>
      )}

      {errorMessage && (
        <div className="mt-5 flex items-start gap-3 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-950/60 dark:bg-red-950/20 dark:text-red-200">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatusTile label="Đăng ký tài khoản" value={form.allowRegistrations ? "Đang bật" : "Đang tắt"} active={form.allowRegistrations} icon={CheckCircle2} />
        <StatusTile label="Chế độ bảo trì" value={form.maintenanceMode ? "Đang bật" : "Đang tắt"} active={!form.maintenanceMode} icon={Wrench} />
        <StatusTile label="Downloader" value={form.downloaderEnabled ? "Đang bật" : "Đang tắt"} active={form.downloaderEnabled} icon={Download} />
        <StatusTile label="Xóa watermark" value={form.watermarkRemovalEnabled ? "Đang bật" : "Đang tắt"} active={form.watermarkRemovalEnabled} icon={ShieldCheck} />
      </div>

      <form id="admin-settings-form" onSubmit={submitSettings} className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="grid gap-5 content-start">
          <SettingCard
            icon={Settings2}
            title="Thông tin nền tảng"
            description="Thông tin nhận diện và kênh hỗ trợ hiển thị cho đội vận hành."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-[#17201d] dark:text-slate-100">
                Tên hệ thống
                <input
                  value={form.siteName}
                  onChange={(event) => updateField("siteName", event.target.value)}
                  className={`${adminInputClass} mt-2 h-11`}
                  maxLength={80}
                  required
                />
              </label>
              <label className="text-sm font-bold text-[#17201d] dark:text-slate-100">
                Email hỗ trợ
                <input
                  type="email"
                  value={form.supportEmail}
                  onChange={(event) => updateField("supportEmail", event.target.value)}
                  className={`${adminInputClass} mt-2 h-11`}
                  maxLength={120}
                  required
                />
              </label>
              <label className="text-sm font-bold text-[#17201d] dark:text-slate-100">
                Số điện thoại hỗ trợ
                <input
                  value={form.contactPhone}
                  onChange={(event) => updateField("contactPhone", event.target.value)}
                  className={`${adminInputClass} mt-2 h-11`}
                  maxLength={30}
                  placeholder="Ví dụ: 0900 000 000"
                />
              </label>
              <label className="text-sm font-bold text-[#17201d] dark:text-slate-100">
                Thông báo ngắn
                <input
                  value={form.announcement}
                  onChange={(event) => updateField("announcement", event.target.value)}
                  className={`${adminInputClass} mt-2 h-11`}
                  maxLength={240}
                  placeholder="Thông báo vận hành nội bộ"
                />
              </label>
            </div>
          </SettingCard>

          <SettingCard
            icon={SlidersHorizontal}
            title="Giới hạn vận hành"
            description="Ngưỡng mặc định dùng khi xử lý file và dọn dẹp lưu trữ."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <NumberField
                label="Dung lượng upload mặc định"
                value={form.maxUploadMb}
                min={1}
                max={2000}
                suffix="MB"
                onChange={(value) => updateField("maxUploadMb", value)}
              />
              <NumberField
                label="Số ngày lưu file mặc định"
                value={form.defaultStorageDays}
                min={1}
                max={365}
                suffix="ngày"
                onChange={(value) => updateField("defaultStorageDays", value)}
              />
            </div>
          </SettingCard>
        </div>

        <div className="grid gap-5 content-start">
          <SettingCard
            icon={ShieldCheck}
            title="Trạng thái chức năng"
            description="Bật tắt nhanh các khu vực quan trọng khi cần vận hành hoặc bảo trì."
          >
            <div className="grid gap-3">
              <ToggleField
                label="Cho phép đăng ký tài khoản"
                description="Tắt khi chỉ muốn admin tạo tài khoản thủ công."
                checked={form.allowRegistrations}
                onChange={(value) => updateField("allowRegistrations", value)}
              />
              <ToggleField
                label="Bật chế độ bảo trì"
                description="Dùng khi cần khóa thao tác người dùng trong thời gian bảo trì."
                checked={form.maintenanceMode}
                onChange={(value) => updateField("maintenanceMode", value)}
              />
              <ToggleField
                label="Bật downloader"
                description="Áp dụng cho TikTok, Instagram, Facebook và YouTube downloader."
                checked={form.downloaderEnabled}
                onChange={(value) => updateField("downloaderEnabled", value)}
              />
              <ToggleField
                label="Bật xóa watermark"
                description="Cho phép sử dụng công cụ xóa watermark ảnh và video."
                checked={form.watermarkRemovalEnabled}
                onChange={(value) => updateField("watermarkRemovalEnabled", value)}
              />
            </div>
          </SettingCard>

          <section className={`${adminPanelClass} p-5`}>
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <Gauge size={20} />
              </span>
              <div>
                <h2 className="text-[17px] font-black text-[#17201d] dark:text-slate-50">Trạng thái lưu trữ</h2>
                <p className="mt-1 text-sm leading-5 text-[#52615d] dark:text-slate-400">
                  API đọc và ghi trực tiếp vào bảng admin_settings trong database.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfd] px-4 py-3 dark:bg-slate-900">
                <span className="inline-flex items-center gap-2 text-[#52615d] dark:text-slate-400"><Mail size={16} /> Email hỗ trợ</span>
                <span className="max-w-[190px] truncate font-bold text-[#17201d] dark:text-slate-100">{form.supportEmail}</span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfd] px-4 py-3 dark:bg-slate-900">
                <span className="inline-flex items-center gap-2 text-[#52615d] dark:text-slate-400"><Megaphone size={16} /> Thông báo</span>
                <span className="max-w-[190px] truncate font-bold text-[#17201d] dark:text-slate-100">{form.announcement || "Chưa có"}</span>
              </div>
            </div>
          </section>
        </div>
      </form>
    </section>
  );
}
