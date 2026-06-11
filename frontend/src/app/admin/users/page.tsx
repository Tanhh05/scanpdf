"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Filter, LockKeyhole, Search, UnlockKeyhole } from "lucide-react";
import { useState } from "react";
import {
  AdminAvatar,
  AdminEmpty,
  AdminPageHeader,
  AdminPagination,
  AdminStatusBadge,
  adminInputClass,
  adminPanelClass,
} from "@/components/admin/admin-ui";
import { adminApi } from "@/services/api";

type UserItem = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  subscriptions: { plan: { id: string; name: string } }[];
  _count: { conversions: number };
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState("");
  const users = useQuery<{ items: UserItem[]; total: number; pages: number }>({
    queryKey: ["admin-users", page, search, status],
    queryFn: async () => (await adminApi.get("/admin/users", { params: { page, limit: 5, search, status: status || undefined } })).data,
  });
  const plans = useQuery<{ id: string; name: string }[]>({
    queryKey: ["admin-plans-options"],
    queryFn: async () => (await adminApi.get("/admin/plans")).data,
  });
  const updateStatus = useMutation({
    mutationFn: async ({ id, nextStatus }: { id: string; nextStatus: UserItem["status"] }) =>
      adminApi.patch(`/admin/users/${id}/status`, { status: nextStatus }),
    onSuccess: () => {
      setMessage("Đã cập nhật trạng thái người dùng.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (error) => setMessage(axios.isAxiosError(error) ? error.response?.data?.message ?? "Cập nhật thất bại" : "Cập nhật thất bại"),
  });
  const updatePlan = useMutation({
    mutationFn: async ({ id, planId }: { id: string; planId: string }) =>
      adminApi.patch(`/admin/users/${id}/plan`, { planId, durationDays: 30 }),
    onSuccess: () => {
      setMessage("Đã đổi gói dịch vụ cho người dùng.");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  return (
    <section>
      <AdminPageHeader
        description={`Tổng số ${users.data?.total?.toLocaleString("vi-VN") ?? "..."} tài khoản trong hệ thống`}
        action={
          <button type="button" onClick={() => setStatus((value) => value ? "" : "ACTIVE")} className="inline-flex h-10 items-center gap-2 rounded-lg border border-[#aeb8d3] bg-white px-4 text-sm font-semibold dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
            <Filter size={19} /> {status ? "Bỏ lọc" : "Lọc dữ liệu"}
          </button>
        }
      />

      <div className="mt-5 flex max-w-sm items-center gap-3 rounded-full border border-[#bcc5df] bg-[#eef1ff] px-4 dark:border-slate-700 dark:bg-slate-900">
        <Search size={20} className="text-[#586075]" />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Tìm kiếm người dùng..."
        />
      </div>

      {status && (
        <div className="mt-4 max-w-xs">
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className={adminInputClass}>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="SUSPENDED">Đã khóa</option>
          </select>
        </div>
      )}
      {message && <p className="mt-4 rounded-xl bg-[#edf2ff] px-4 py-3 text-sm font-semibold text-[#0b4dcc] dark:bg-slate-800 dark:text-indigo-300">{message}</p>}

      <article className={`${adminPanelClass} mt-5 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left">
            <thead className="bg-[#eef1ff] text-xs uppercase tracking-wide text-[#293047] dark:bg-slate-800 dark:text-slate-200">
              <tr><th className="px-5 py-3.5">Người dùng</th><th className="px-4 py-3.5">Gói dịch vụ</th><th className="px-4 py-3.5">Chuyển đổi</th><th className="px-4 py-3.5">Vai trò</th><th className="px-4 py-3.5">Trạng thái</th><th className="px-4 py-3.5 text-center">Thao tác</th></tr>
            </thead>
            <tbody>
              {users.data?.items.map((user, index) => (
                <tr key={user.id} className={`border-t border-[#dfe3ee] text-sm dark:border-slate-800 ${user.status === "SUSPENDED" ? "bg-slate-50/70 text-slate-500 dark:bg-slate-800/55 dark:text-slate-400" : "dark:text-slate-100"}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <AdminAvatar name={user.fullName} tone={user.status === "SUSPENDED" ? "slate" : index % 3 === 0 ? "blue" : "slate"} />
                      <div><strong className={`block text-[15px] ${user.status === "SUSPENDED" ? "line-through text-slate-400" : "text-[#111527] dark:text-slate-50"}`}>{user.fullName}</strong><span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span></div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <select
                      value={user.subscriptions[0]?.plan.id ?? ""}
                      disabled={updatePlan.isPending}
                      onChange={(event) => {
                        if (event.target.value && window.confirm("Đổi gói người dùng này trong 30 ngày?")) {
                          updatePlan.mutate({ id: user.id, planId: event.target.value });
                        }
                      }}
                      className="max-w-40 rounded-lg border-0 bg-transparent py-2 font-medium outline-none dark:text-slate-100"
                    >
                      <option value="" disabled>Chọn gói</option>
                      {plans.data?.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3.5">{user._count.conversions.toLocaleString("vi-VN")} lượt</td>
                  <td className="px-4 py-3.5"><span className="rounded-md bg-[#dfe6fb] px-2.5 py-1 text-xs font-semibold dark:bg-slate-800 dark:text-slate-200">{user.role}</span></td>
                  <td className="px-4 py-3.5"><AdminStatusBadge status={user.status} /></td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      title={user.status === "ACTIVE" ? "Khóa tài khoản" : "Mở khóa tài khoản"}
                      disabled={updateStatus.isPending || user.role === "ADMIN"}
                      onClick={() => updateStatus.mutate({ id: user.id, nextStatus: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}
                      className={`inline-flex h-10 w-10 items-center justify-center rounded-lg transition disabled:opacity-30 ${user.status === "ACTIVE" ? "text-slate-500 hover:bg-red-50 hover:text-red-600" : "text-red-500 hover:bg-emerald-50 hover:text-emerald-600"}`}
                    >
                      {user.status === "ACTIVE" ? <LockKeyhole size={20} /> : <UnlockKeyhole size={20} />}
                    </button>
                  </td>
                </tr>
              ))}
              {!users.isLoading && !users.data?.items.length && <tr><td colSpan={6}><AdminEmpty>Không tìm thấy người dùng phù hợp.</AdminEmpty></td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col items-center justify-between gap-3 border-t border-[#d8dceb] px-5 py-3.5 text-sm dark:border-slate-800 sm:flex-row">
          <span>Đang hiển thị {users.data?.items.length ?? 0} trên tổng số {users.data?.total ?? 0}</span>
          <AdminPagination page={page} pages={users.data?.pages ?? 1} onPageChange={setPage} />
        </div>
      </article>
    </section>
  );
}
