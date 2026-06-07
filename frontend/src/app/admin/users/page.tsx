"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { api } from "@/services/api";

type UserItem = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  status: "ACTIVE" | "SUSPENDED";
  createdAt: string;
  subscriptions: { plan: { name: string } }[];
  _count: { conversions: number };
};

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const users = useQuery<{ items: UserItem[] }>({
    queryKey: ["admin-users", search],
    queryFn: async () => (await api.get("/admin/users", { params: { search } })).data,
  });
  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserItem["status"] }) =>
      api.patch(`/admin/users/${id}/status`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <section className="container-page py-14">
      <AdminNav />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-black">Quản lý người dùng</h1>
        <input className="field max-w-xs" placeholder="Tìm email hoặc họ tên" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="card mt-7 overflow-x-auto">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Người dùng</th><th>Gói</th><th>Convert</th><th>Vai trò</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
          <tbody>{users.data?.items.map((user) => (
            <tr key={user.id} className="border-t border-slate-100">
              <td className="p-4"><strong>{user.fullName}</strong><span className="block text-slate-500">{user.email}</span></td>
              <td>{user.subscriptions[0]?.plan.name ?? "Free"}</td>
              <td>{user._count.conversions}</td>
              <td>{user.role}</td>
              <td><span className={`rounded-full px-3 py-1 text-xs font-bold ${user.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{user.status}</span></td>
              <td><button disabled={updateStatus.isPending || user.role === "ADMIN"} className="rounded-lg border px-3 py-2 font-semibold disabled:opacity-40" onClick={() => updateStatus.mutate({ id: user.id, status: user.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE" })}>{user.status === "ACTIVE" ? "Khóa" : "Mở khóa"}</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </section>
  );
}
