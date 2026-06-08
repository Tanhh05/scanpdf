"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, KeyRound, Mail, Save } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import { getInitials, type Profile } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

function getErrorMessage(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? "Thao tác thất bại" : "Thao tác thất bại";
}

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [fullName, setFullName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    uri: string;
    qrCode: string;
    debugToken?: string;
  } | null>(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const profile = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/profile")).data,
    enabled: !!token,
    staleTime: 300_000,
  });
  const user = profile.data?.user ?? storedUser;

  useEffect(() => {
    if (user?.fullName) setFullName(user.fullName);
  }, [user?.fullName]);

  const updateProfile = useMutation({
    mutationFn: async () => (await api.patch("/profile", { fullName })).data,
    onSuccess: (data) => {
      updateUser({ fullName: data.fullName });
      queryClient.setQueryData<Profile>(["profile"], (current) => current
        ? { ...current, user: { ...current.user, fullName: data.fullName } }
        : current);
    },
  });

  const changePassword = useMutation({
    mutationFn: async () => (await api.patch("/profile/password", {
      currentPassword: currentPassword || undefined,
      newPassword,
    })).data,
    onSuccess: () => {
      setCurrentPassword("");
      setNewPassword("");
      queryClient.setQueryData<Profile>(["profile"], (current) => current
        ? { ...current, user: { ...current.user, hasPassword: true } }
        : current);
    },
  });
  const resendVerification = useMutation({
    mutationFn: async () => (await api.post("/auth/resend-verification")).data,
  });
  const setupTwoFactor = useMutation({
    mutationFn: async () => {
      const data = (await api.post("/profile/2fa/setup")).data as {
        secret: string;
        uri: string;
        debugToken?: string;
      };
      const QRCode = await import("qrcode");
      return { ...data, qrCode: await QRCode.toDataURL(data.uri) };
    },
    onSuccess: (data) => {
      setTwoFactorSetup(data);
      setTwoFactorToken("");
    },
  });
  const enableTwoFactor = useMutation({
    mutationFn: async () => (await api.post("/profile/2fa/enable", { token: twoFactorToken })).data,
    onSuccess: () => {
      setTwoFactorSetup(null);
      setTwoFactorToken("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
  const disableTwoFactor = useMutation({
    mutationFn: async () => (await api.post("/profile/2fa/disable", { token: twoFactorToken })).data,
    onSuccess: () => {
      setTwoFactorToken("");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateProfile.mutate();
  }

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changePassword.mutate();
  }

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold text-indigo-600">HỒ SƠ CỦA TÔI</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Thông tin cá nhân</h1>
          <p className="mt-2 text-slate-500">Thông tin được sử dụng cho tài khoản ScanPDF của bạn.</p>
        </div>
        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-5 border-b border-slate-100 pb-7 sm:flex-row sm:items-center">
            <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-2xl font-black text-white">
              {getInitials(user?.fullName, user?.email)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-black text-slate-950">{user?.fullName}</h2>
              <p className="mt-1 flex items-center gap-2 truncate text-sm text-slate-500"><Mail size={15} /> {user?.email}</p>
              <span className="mt-3 inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Tài khoản đang hoạt động</span>
            </div>
          </div>
          <div className="grid gap-7 pt-7 sm:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Họ và tên</p>
              <p className="mt-2 font-bold text-slate-900">{user?.fullName}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Email</p>
              <p className="mt-2 break-all font-bold text-slate-900">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Gói dịch vụ</p>
              <p className="mt-2 font-bold text-slate-900">{profile.data?.plan.name ?? "Free"}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vai trò</p>
              <p className="mt-2 font-bold text-slate-900">{storedUser?.role === "ADMIN" ? "Quản trị viên" : "Người dùng"}</p>
            </div>
          </div>
        </article>

        {profile.data && !profile.data.user.emailVerifiedAt && (
          <article className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-amber-950">Email chưa được xác thực</h2>
              <p className="mt-1 text-sm text-amber-800">Xác thực email để bảo vệ tài khoản và sử dụng Public API.</p>
            </div>
            <button
              type="button"
              disabled={resendVerification.isPending}
              onClick={() => resendVerification.mutate()}
              className="rounded-xl bg-amber-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {resendVerification.isPending ? "Đang gửi..." : resendVerification.isSuccess ? "Đã gửi" : "Gửi lại email"}
            </button>
          </article>
        )}

        <div className="grid gap-5 lg:grid-cols-2">
          <form onSubmit={submitProfile} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Save size={21} />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">Cập nhật hồ sơ</h2>
                <p className="mt-1 text-sm text-slate-500">Tên này được hiển thị trong dashboard và avatar chữ cái.</p>
              </div>
            </div>
            <label className="mt-6 block text-sm font-bold text-slate-800">
              Họ và tên
              <input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="field mt-2"
                placeholder="Nhập họ và tên"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
            {updateProfile.isSuccess && (
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 size={17} /> Hồ sơ đã được cập nhật.
              </p>
            )}
            {updateProfile.isError && <p className="mt-4 text-sm font-bold text-red-600">{getErrorMessage(updateProfile.error)}</p>}
            <button disabled={updateProfile.isPending} className="btn-primary mt-6 !rounded-xl !py-3">
              {updateProfile.isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </form>

          <form onSubmit={submitPassword} className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <KeyRound size={21} />
              </span>
              <div>
                <h2 className="text-xl font-black text-slate-950">Đổi mật khẩu</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {profile.data?.user.hasPassword ? "Nhập mật khẩu hiện tại để đổi mật khẩu mới." : "Tài khoản OAuth có thể đặt mật khẩu để đăng nhập bằng email."}
                </p>
              </div>
            </div>
            {profile.data?.user.hasPassword && (
              <label className="mt-6 block text-sm font-bold text-slate-800">
                Mật khẩu hiện tại
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  className="field mt-2"
                  required
                />
              </label>
            )}
            <label className={`${profile.data?.user.hasPassword ? "mt-4" : "mt-6"} block text-sm font-bold text-slate-800`}>
              Mật khẩu mới
              <input
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="field mt-2"
                minLength={8}
                required
              />
            </label>
            {changePassword.isSuccess && (
              <p className="mt-4 flex items-center gap-2 text-sm font-bold text-emerald-700">
                <CheckCircle2 size={17} /> Mật khẩu đã được cập nhật.
              </p>
            )}
            {changePassword.isError && <p className="mt-4 text-sm font-bold text-red-600">{getErrorMessage(changePassword.error)}</p>}
            <button disabled={changePassword.isPending} className="btn-primary mt-6 !rounded-xl !py-3">
              {changePassword.isPending ? "Đang cập nhật..." : "Đổi mật khẩu"}
            </button>
          </form>
        </div>

        <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Xác thực hai lớp (2FA)</h2>
              <p className="mt-1 text-sm text-slate-500">Dùng Google Authenticator, Microsoft Authenticator hoặc ứng dụng TOTP tương thích.</p>
              <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                profile.data?.user.twoFactorEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
              }`}>
                {profile.data?.user.twoFactorEnabled ? "Đang bật" : "Chưa bật"}
              </span>
            </div>
            {!profile.data?.user.twoFactorEnabled && !twoFactorSetup && (
              <button
                type="button"
                disabled={setupTwoFactor.isPending || !profile.data?.user.emailVerifiedAt}
                onClick={() => setupTwoFactor.mutate()}
                className="btn-primary !rounded-xl"
              >
                {setupTwoFactor.isPending ? "Đang tạo..." : "Thiết lập 2FA"}
              </button>
            )}
          </div>
          {twoFactorSetup && (
            <div className="mt-6 grid gap-6 border-t border-slate-100 pt-6 md:grid-cols-[180px_1fr]">
              <img src={twoFactorSetup.qrCode} alt="QR thiết lập 2FA" className="h-44 w-44 rounded-xl border bg-white p-2" />
              <div>
                <p className="text-sm font-bold text-slate-700">Quét QR hoặc nhập secret:</p>
                <code className="mt-2 block break-all rounded-xl bg-slate-950 p-3 text-sm text-white">{twoFactorSetup.secret}</code>
                {twoFactorSetup.debugToken && (
                  <button
                    type="button"
                    onClick={() => setTwoFactorToken(twoFactorSetup.debugToken ?? "")}
                    className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700"
                  >
                    Mã test local hiện tại: {twoFactorSetup.debugToken}
                  </button>
                )}
                <p className="mt-3 text-xs font-bold text-slate-500">
                  Không nhập mã mẫu như 123456. Hãy nhập mã 6 số đang hiển thị trong ứng dụng Authenticator.
                </p>
                <input
                  value={twoFactorToken}
                  onChange={(event) => setTwoFactorToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  inputMode="numeric"
                  className="field mt-4"
                  placeholder="Nhập mã 6 số để xác nhận"
                />
                <button
                  type="button"
                  disabled={twoFactorToken.length !== 6 || enableTwoFactor.isPending}
                  onClick={() => enableTwoFactor.mutate()}
                  className="btn-primary mt-3 !rounded-xl"
                >
                  Xác nhận bật 2FA
                </button>
                {enableTwoFactor.isError && (
                  <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
                    {getErrorMessage(enableTwoFactor.error)}
                  </p>
                )}
              </div>
            </div>
          )}
          {setupTwoFactor.isError && (
            <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-600">
              {getErrorMessage(setupTwoFactor.error)}
            </p>
          )}
          {profile.data?.user.twoFactorEnabled && (
            <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row">
              <input
                value={twoFactorToken}
                onChange={(event) => setTwoFactorToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                className="field sm:max-w-xs"
                placeholder="Mã 2FA hiện tại"
              />
              <button
                type="button"
                disabled={twoFactorToken.length !== 6 || disableTwoFactor.isPending}
                onClick={() => window.confirm("Tắt xác thực hai lớp?") && disableTwoFactor.mutate()}
                className="rounded-xl border border-red-200 px-5 py-3 font-bold text-red-600 hover:bg-red-50"
              >
                Tắt 2FA
              </button>
              {disableTwoFactor.isError && (
                <p className="text-sm font-bold text-red-600">{getErrorMessage(disableTwoFactor.error)}</p>
              )}
            </div>
          )}
        </article>
      </div>
    </AccountLayout>
  );
}
