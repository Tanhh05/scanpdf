"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { AtSign, CalendarDays, IdCard, KeyRound, Loader2, Mail, Save, ShieldCheck, UserRound } from "lucide-react";
import { AdminPageHeader, adminInputClass, adminPanelClass } from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";
import { useAdminAuthStore } from "@/stores/admin-auth.store";

type AdminProfile = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
  status: string;
  emailVerifiedAt: string | null;
  createdAt: string;
  hasPassword: boolean;
};

function getErrorMessage(error: unknown, fallback: string) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? fallback : fallback;
}

export default function AdminProfilePage() {
  const queryClient = useQueryClient();
  const { token, setSession } = useAdminAuthStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");

  const profile = useQuery<AdminProfile>({
    queryKey: ["admin-profile"],
    queryFn: async () => (await adminApi.get("/admin/profile")).data,
  });

  useEffect(() => {
    if (!profile.data) return;
    setFullName(profile.data.fullName);
    setEmail(profile.data.email);
  }, [profile.data]);

  const initials = useMemo(() => {
    return (fullName || email || "A")
      .split(/\s+/)
      .filter(Boolean)
      .slice(-2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }, [email, fullName]);

  const updateProfile = useMutation({
    mutationFn: async (payload: { fullName: string; email: string }) =>
      (await adminApi.patch("/admin/profile", payload)).data,
    onSuccess: (data: AdminProfile) => {
      setMessage("Đã cập nhật hồ sơ admin.");
      queryClient.setQueryData(["admin-profile"], data);
      if (token) setSession(token, { id: data.id, email: data.email, fullName: data.fullName, role: data.role });
    },
    onError: (error) => setMessage(getErrorMessage(error, "Cập nhật hồ sơ thất bại")),
  });

  const changePassword = useMutation({
    mutationFn: async (payload: { currentPassword: string; newPassword: string }) =>
      (await adminApi.patch("/admin/profile/password", payload)).data,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Đã đổi mật khẩu admin.");
    },
    onError: (error) => setMessage(getErrorMessage(error, "Đổi mật khẩu thất bại")),
  });

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    updateProfile.mutate({ fullName, email });
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (newPassword !== confirmPassword) {
      setMessage("Mật khẩu xác nhận không khớp.");
      return;
    }
    changePassword.mutate({ currentPassword, newPassword });
  }

  const joinedDate = profile.data?.createdAt ? new Date(profile.data.createdAt).toLocaleDateString("vi-VN") : "--";
  const isSavingProfile = updateProfile.isPending;
  const isChangingPassword = changePassword.isPending;

  return (
    <section>
      <AdminPageHeader
        title="Hồ sơ admin"
        description="Chỉnh sửa thông tin tài khoản quản trị đang đăng nhập. Phần này tách riêng với Cài đặt hệ thống."
      />

      {message && <p className="fixed bottom-6 right-6 z-50 rounded-lg bg-[#0f172a] px-6 py-4 text-sm font-semibold text-white shadow-2xl">{message}</p>}
      {profile.isError && <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm font-bold text-red-700">Không thể tải hồ sơ admin.</p>}

      <div className="mt-7 grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className={`${adminPanelClass} overflow-hidden`}>
          <div className="bg-[#0f172a] p-6 text-white dark:bg-slate-950">
            <div className="flex h-20 w-20 items-center justify-center rounded-lg border-2 border-[#2563eb] bg-[#dbeafe] text-2xl font-black text-[#2563eb]">
              {profile.isLoading ? "..." : initials || "A"}
            </div>
            <h2 className="mt-5 text-2xl font-black">{fullName || "Quản trị viên"}</h2>
            <p className="mt-1 text-sm text-white/68">{email || "admin@scanpdf.vn"}</p>
          </div>
          <div className="grid gap-3 p-5 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfd] p-3 dark:bg-slate-900">
              <span className="inline-flex items-center gap-2 text-[#64748b] dark:text-slate-400"><ShieldCheck size={16} /> Vai trò</span>
              <span className="rounded-md bg-[#dbeafe] px-2.5 py-1 text-xs font-bold text-[#2563eb]">{profile.data?.role ?? "ADMIN"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfd] p-3 dark:bg-slate-900">
              <span className="inline-flex items-center gap-2 text-[#64748b] dark:text-slate-400"><IdCard size={16} /> Trạng thái</span>
              <span className="font-bold text-[#2563eb]">{profile.data?.status === "ACTIVE" ? "Hoạt động" : profile.data?.status ?? "--"}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f7fbfd] p-3 dark:bg-slate-900">
              <span className="inline-flex items-center gap-2 text-[#64748b] dark:text-slate-400"><CalendarDays size={16} /> Ngày tạo</span>
              <span className="font-bold text-[#0f172a] dark:text-slate-100">{joinedDate}</span>
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <form onSubmit={submitProfile} className={`${adminPanelClass} p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#dbeafe] text-[#2563eb]">
                <UserRound size={21} />
              </span>
              <div>
                <h2 className="text-lg font-black text-[#0f172a] dark:text-slate-50">Thông tin cá nhân</h2>
                <p className="text-sm text-[#64748b] dark:text-slate-400">Tên và email dùng cho phiên quản trị.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                Họ tên admin
                <span className="relative mt-2 block">
                  <UserRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={17} />
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className={`${adminInputClass} pl-10`}
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </span>
              </label>
              <label className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                Email đăng nhập
                <span className="relative mt-2 block">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" size={17} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className={`${adminInputClass} pl-10`}
                    required
                  />
                </span>
              </label>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                disabled={profile.isLoading || isSavingProfile}
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-md disabled:opacity-60"
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSavingProfile ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </div>
          </form>

          <form onSubmit={submitPassword} className={`${adminPanelClass} p-5`}>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-red-50 text-red-600">
                <KeyRound size={21} />
              </span>
              <div>
                <h2 className="text-lg font-black text-[#0f172a] dark:text-slate-50">Bảo mật đăng nhập</h2>
                <p className="text-sm text-[#64748b] dark:text-slate-400">Đổi mật khẩu admin để bảo vệ quyền quản trị.</p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                Mật khẩu hiện tại
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className={`${adminInputClass} mt-2`}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                Mật khẩu mới
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  className={`${adminInputClass} mt-2`}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="text-sm font-bold text-[#0f172a] dark:text-slate-100">
                Nhập lại mật khẩu mới
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  className={`${adminInputClass} mt-2`}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="inline-flex items-center gap-2 text-sm text-[#64748b] dark:text-slate-400">
                <Mail size={16} />
                Sau khi đổi email, lần đăng nhập tiếp theo sẽ dùng email mới.
              </p>
              <button
                disabled={isChangingPassword}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[#0f172a] px-4 text-sm font-semibold text-white shadow-md disabled:opacity-60 dark:bg-slate-800"
              >
                {isChangingPassword ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={18} />}
                {isChangingPassword ? "Đang đổi..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
