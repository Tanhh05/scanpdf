"use client";

import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { AccountLayout } from "@/components/client/account-layout";
import { getInitials, type Profile } from "@/lib/account";
import { api } from "@/services/api";
import { useAuthStore } from "@/stores/auth.store";

export default function ProfilePage() {
  const token = useAuthStore((state) => state.token);
  const storedUser = useAuthStore((state) => state.user);
  const profile = useQuery<Profile>({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/profile")).data,
    enabled: !!token,
  });
  const user = profile.data?.user ?? storedUser;

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
      </div>
    </AccountLayout>
  );
}
