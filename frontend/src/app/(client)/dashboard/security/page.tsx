"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle2, Github, KeyRound, MailCheck, MailWarning, QrCode, ShieldCheck, ShieldOff } from "lucide-react";
import Image from "next/image";
import { FormEvent, useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import type { Profile } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

function getErrorMessage(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? "Thao tác thất bại" : "Thao tác thất bại";
}

function providerLabel(provider: string) {
  return provider === "GOOGLE" ? "Google" : provider === "GITHUB" ? "GitHub" : provider;
}

export default function DashboardSecurityPage() {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.token);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret: string;
    uri: string;
    qrCode: string;
    debugToken?: string;
  } | null>(null);

  const profile = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/profile")).data,
    enabled: !!token,
    staleTime: 300_000,
  });
  const user = profile.data?.user;
  const linkedProviders = user?.oauthAccounts ?? [];
  const hasGoogle = linkedProviders.some((item) => item.provider === "GOOGLE");
  const hasGithub = linkedProviders.some((item) => item.provider === "GITHUB");

  const resendVerification = useMutation({
    mutationFn: async () => (await api.post("/auth/resend-verification")).data,
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

  function submitPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    changePassword.mutate();
  }

  const checks = [
    {
      label: "Email",
      value: user?.emailVerifiedAt ? "Đã xác thực" : "Chưa xác thực",
      active: Boolean(user?.emailVerifiedAt),
      icon: user?.emailVerifiedAt ? MailCheck : MailWarning,
    },
    {
      label: "Mật khẩu",
      value: user?.hasPassword ? "Đã thiết lập" : "Chưa thiết lập",
      active: Boolean(user?.hasPassword),
      icon: KeyRound,
    },
    {
      label: "2FA",
      value: user?.twoFactorEnabled ? "Đang bật" : "Chưa bật",
      active: Boolean(user?.twoFactorEnabled),
      icon: user?.twoFactorEnabled ? ShieldCheck : ShieldOff,
    },
  ];

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold text-[#10aee8]">BẢO MẬT</p>
          <h1 className="mt-2 font-[var(--font-display)] text-3xl font-black tracking-normal text-[#17201d] dark:text-slate-50 sm:text-4xl">Bảo mật tài khoản</h1>
          <p className="mt-2 text-slate-500">Quản lý mật khẩu, xác thực email, 2FA và các phương thức đăng nhập.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {checks.map((item) => (
            <article key={item.label} className="rounded-lg border border-[#d8ded5] bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#101820]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-slate-500">{item.label}</p>
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.active ? "bg-[#dff4fc] text-[#10aee8]" : "bg-amber-50 text-amber-700"}`}>
                  <item.icon size={20} />
                </span>
              </div>
              <strong className={`mt-3 block text-xl ${item.active ? "text-[#17201d] dark:text-slate-50" : "text-amber-700"}`}>{profile.isLoading ? "..." : item.value}</strong>
            </article>
          ))}
        </div>

        {profile.data && !profile.data.user.emailVerifiedAt && (
          <article className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-black text-amber-950">Email chưa được xác thực</h2>
              <p className="mt-1 text-sm text-amber-800">Xác thực email để mở đủ tính năng bảo mật và Public API.</p>
            </div>
            <button
              type="button"
              disabled={resendVerification.isPending}
              onClick={() => resendVerification.mutate()}
              className="rounded-lg bg-amber-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {resendVerification.isPending ? "Đang gửi..." : resendVerification.isSuccess ? "Đã gửi" : "Gửi lại email"}
            </button>
          </article>
        )}

        <div className="grid gap-5 xl:grid-cols-[1fr_1.05fr]">
          <form onSubmit={submitPassword} className="rounded-lg border border-[#d8ded5] bg-white p-6 dark:border-slate-800 dark:bg-[#101820] sm:p-8">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e8f7fd] text-[#10aee8]">
                <KeyRound size={21} />
              </span>
              <div>
                <h2 className="text-xl font-black text-[#17201d] dark:text-slate-50">Mật khẩu đăng nhập</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {user?.hasPassword ? "Đổi mật khẩu định kỳ để giảm rủi ro bị truy cập trái phép." : "Tài khoản OAuth có thể đặt mật khẩu để đăng nhập bằng email."}
                </p>
              </div>
            </div>
            {user?.hasPassword && (
              <label className="mt-6 block text-sm font-bold text-slate-800 dark:text-slate-200">
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
            <label className={`${user?.hasPassword ? "mt-4" : "mt-6"} block text-sm font-bold text-slate-800 dark:text-slate-200`}>
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
            <button disabled={changePassword.isPending} className="btn-primary mt-6 !py-3">
              {changePassword.isPending ? "Đang cập nhật..." : user?.hasPassword ? "Đổi mật khẩu" : "Đặt mật khẩu"}
            </button>
          </form>

          <article className="rounded-lg border border-[#d8ded5] bg-white p-6 dark:border-slate-800 dark:bg-[#101820] sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <QrCode size={21} />
                </span>
                <div>
                  <h2 className="text-xl font-black text-[#17201d] dark:text-slate-50">Xác thực hai lớp</h2>
                  <p className="mt-1 text-sm text-slate-500">Dùng ứng dụng TOTP như Google Authenticator hoặc Microsoft Authenticator.</p>
                  <span className={`mt-3 inline-flex rounded-md px-3 py-1 text-xs font-bold ${user?.twoFactorEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {user?.twoFactorEnabled ? "Đang bật" : "Chưa bật"}
                  </span>
                </div>
              </div>
              {user?.role !== "ADMIN" && !user?.twoFactorEnabled && !twoFactorSetup && (
                <button
                  type="button"
                  disabled={setupTwoFactor.isPending || !user?.emailVerifiedAt}
                  onClick={() => setupTwoFactor.mutate()}
                  className="btn-primary"
                >
                  {setupTwoFactor.isPending ? "Đang tạo..." : "Thiết lập 2FA"}
                </button>
              )}
            </div>

            {user?.role === "ADMIN" && (
              <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">2FA cho tài khoản quản trị đang tạm thời bị tắt.</p>
            )}
            {!user?.emailVerifiedAt && user?.role !== "ADMIN" && (
              <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-800">Bạn cần xác thực email trước khi bật 2FA.</p>
            )}
            {twoFactorSetup && (
              <div className="mt-6 grid gap-5 border-t border-[#d8ded5] pt-6 dark:border-slate-800 md:grid-cols-[180px_1fr]">
                <Image src={twoFactorSetup.qrCode} alt="QR thiết lập 2FA" width={176} height={176} className="h-44 w-44 rounded-lg border bg-white p-2" unoptimized />
                <div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Quét QR hoặc nhập secret:</p>
                  <code className="mt-2 block break-all rounded-lg bg-slate-950 p-3 text-sm text-white">{twoFactorSetup.secret}</code>
                  {twoFactorSetup.debugToken && (
                    <button
                      type="button"
                      onClick={() => setTwoFactorToken(twoFactorSetup.debugToken ?? "")}
                      className="mt-3 rounded-lg bg-emerald-50 px-4 py-3 text-left text-sm font-bold text-emerald-700"
                    >
                      Mã test local hiện tại: {twoFactorSetup.debugToken}
                    </button>
                  )}
                  <input
                    value={twoFactorToken}
                    onChange={(event) => setTwoFactorToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    className="field mt-4"
                    placeholder="Nhập mã 6 số"
                  />
                  <button
                    type="button"
                    disabled={twoFactorToken.length !== 6 || enableTwoFactor.isPending}
                    onClick={() => enableTwoFactor.mutate()}
                    className="btn-primary mt-3"
                  >
                    Xác nhận bật 2FA
                  </button>
                  {enableTwoFactor.isError && <p className="mt-3 text-sm font-bold text-red-600">{getErrorMessage(enableTwoFactor.error)}</p>}
                </div>
              </div>
            )}
            {user?.twoFactorEnabled && (
              <div className="mt-6 flex flex-col gap-3 border-t border-[#d8ded5] pt-6 dark:border-slate-800 sm:flex-row">
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
                  className="rounded-lg border border-red-200 px-5 py-3 font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  Tắt 2FA
                </button>
              </div>
            )}
            {setupTwoFactor.isError && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-600">{getErrorMessage(setupTwoFactor.error)}</p>}
            {disableTwoFactor.isError && <p className="mt-5 rounded-lg bg-red-50 p-3 text-sm font-bold text-red-600">{getErrorMessage(disableTwoFactor.error)}</p>}
          </article>
        </div>

        <article className="rounded-lg border border-[#d8ded5] bg-white p-6 dark:border-slate-800 dark:bg-[#101820] sm:p-8">
          <h2 className="text-xl font-black text-[#17201d] dark:text-slate-50">Phương thức đăng nhập</h2>
          <p className="mt-1 text-sm text-slate-500">Các tài khoản OAuth đã liên kết với email hiện tại.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              { provider: "GOOGLE", label: "Google", linked: hasGoogle, icon: MailCheck },
              { provider: "GITHUB", label: "GitHub", linked: hasGithub, icon: Github },
            ].map((item) => {
              const linkedAt = linkedProviders.find((provider) => provider.provider === item.provider)?.createdAt;
              return (
                <div key={item.provider} className="flex items-center justify-between gap-4 rounded-lg border border-[#d8ded5] p-4 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${item.linked ? "bg-[#dff4fc] text-[#10aee8]" : "bg-slate-100 text-slate-500"}`}>
                      <item.icon size={19} />
                    </span>
                    <div>
                      <p className="font-black text-[#17201d] dark:text-slate-50">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.linked && linkedAt ? `Liên kết ${new Date(linkedAt).toLocaleDateString("vi-VN")}` : "Chưa liên kết"}</p>
                    </div>
                  </div>
                  <span className={`rounded-md px-3 py-1 text-xs font-bold ${item.linked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                    {item.linked ? "Đã kết nối" : "Trống"}
                  </span>
                </div>
              );
            })}
          </div>
        </article>
      </div>
    </AccountLayout>
  );
}
