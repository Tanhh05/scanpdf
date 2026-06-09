"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { FormEvent, useState } from "react";
import { AccountLayout } from "@/components/client/account-layout";
import { Pagination } from "@/components/common/pagination";
import { api } from "@/services/api";

type Team = {
  id: string;
  name: string;
  ownerId: string;
  members: Array<{
    id: string;
    userId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    user: { id: string; email: string; fullName: string };
  }>;
  invites: Array<{
    id: string;
    email: string;
    role: "ADMIN" | "MEMBER";
    expiresAt: string;
    inviteUrl?: string;
  }>;
};

type Usage = {
  plan: { name: string; dailyLimit: number; maxFileSizeMb: number };
  usedToday: number;
  remainingToday: number;
  totalConversions: number;
};

function message(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message ?? "Thao tác thất bại" : "Thao tác thất bại";
}

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [teamName, setTeamName] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [notice, setNotice] = useState("");
  const [memberPage, setMemberPage] = useState(1);
  const [invitePage, setInvitePage] = useState(1);
  const teams = useQuery<Team[]>({
    queryKey: ["teams"],
    queryFn: async () => (await api.get("/teams")).data,
  });
  const activeTeam = teams.data?.find((team) => team.id === selectedTeamId) ?? teams.data?.[0];
  const memberLimit = 5;
  const inviteLimit = 5;
  const memberPages = Math.max(1, Math.ceil((activeTeam?.members.length ?? 0) / memberLimit));
  const invitePages = Math.max(1, Math.ceil((activeTeam?.invites.length ?? 0) / inviteLimit));
  const visibleMembers = activeTeam?.members.slice((memberPage - 1) * memberLimit, memberPage * memberLimit) ?? [];
  const visibleInvites = activeTeam?.invites.slice((invitePage - 1) * inviteLimit, invitePage * inviteLimit) ?? [];
  const usage = useQuery<Usage>({
    queryKey: ["team-usage", activeTeam?.id],
    queryFn: async () => (await api.get(`/teams/${activeTeam!.id}/usage`)).data,
    enabled: Boolean(activeTeam?.id),
  });
  const createTeam = useMutation({
    mutationFn: async () => (await api.post("/teams", { name: teamName })).data,
    onSuccess: (team: Team) => {
      setTeamName("");
      setSelectedTeamId(team.id);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
  });
  const invite = useMutation({
    mutationFn: async () => (await api.post(`/teams/${activeTeam?.id}/invites`, {
      email: inviteEmail,
      role: inviteRole,
    })).data,
    onSuccess: async (data) => {
      setInviteEmail("");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      if (data.inviteUrl) {
        await navigator.clipboard.writeText(data.inviteUrl);
        setNotice("Đã tạo lời mời và sao chép link invite local.");
      } else {
        setNotice("Đã gửi lời mời qua email.");
      }
    },
  });
  const updateRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "ADMIN" | "MEMBER" }) =>
      api.patch(`/teams/${activeTeam?.id}/members/${userId}`, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });
  const removeMember = useMutation({
    mutationFn: async (userId: string) => api.delete(`/teams/${activeTeam?.id}/members/${userId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teams"] }),
  });

  function submitTeam(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createTeam.mutate();
  }

  function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    invite.mutate();
  }

  return (
    <AccountLayout>
      <div className="space-y-7">
        <div>
          <p className="text-sm font-bold text-indigo-600">BUSINESS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Team workspace</h1>
          <p className="mt-2 text-slate-500">Mời thành viên, phân quyền và dùng quota theo team Business.</p>
        </div>

        <form onSubmit={submitTeam} className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-xl font-black">Tạo team</h2>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={teamName} onChange={(event) => setTeamName(event.target.value)} className="field flex-1" placeholder="Tên team" minLength={2} required />
            <button disabled={createTeam.isPending} className="btn-primary">{createTeam.isPending ? "Đang tạo..." : "Tạo team"}</button>
          </div>
          {createTeam.isError && <p className="mt-3 text-sm font-bold text-red-600">{message(createTeam.error)}</p>}
        </form>

        {teams.data && teams.data.length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <label className="text-sm font-bold text-slate-700">
              Chọn team
              <select value={activeTeam?.id ?? ""} onChange={(event) => { setSelectedTeamId(event.target.value); setMemberPage(1); setInvitePage(1); }} className="field mt-2 max-w-sm">
                {teams.data.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}
              </select>
            </label>
          </div>
        )}

        {activeTeam && (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              {[
                ["Gói owner", usage.data?.plan.name ?? "-"],
                ["Đã dùng hôm nay", usage.data?.usedToday ?? "-"],
                ["Còn lại", usage.data?.remainingToday ?? "-"],
                ["Tổng convert", usage.data?.totalConversions ?? "-"],
              ].map(([label, value]) => (
                <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
                  <p className="text-sm text-slate-500">{label}</p>
                  <strong className="mt-2 block text-2xl text-slate-950">{value}</strong>
                </article>
              ))}
            </div>

            <form onSubmit={submitInvite} className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-xl font-black">Mời thành viên</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_auto]">
                <input value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} type="email" className="field" placeholder="member@example.com" required />
                <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as "ADMIN" | "MEMBER")} className="field">
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button disabled={invite.isPending} className="btn-primary">{invite.isPending ? "Đang gửi..." : "Gửi lời mời"}</button>
              </div>
              {notice && <p className="mt-3 text-sm font-bold text-indigo-700">{notice}</p>}
              {invite.isError && <p className="mt-3 text-sm font-bold text-red-600">{message(invite.error)}</p>}
            </form>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-black">Thành viên</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleMembers.map((member) => (
                  <div key={member.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black">{member.user.fullName}</p>
                      <p className="text-sm text-slate-500">{member.user.email}</p>
                    </div>
                    <div className="flex gap-2">
                      <select
                        value={member.role}
                        disabled={member.role === "OWNER" || updateRole.isPending}
                        onChange={(event) => updateRole.mutate({ userId: member.userId, role: event.target.value as "ADMIN" | "MEMBER" })}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                      >
                        <option value="OWNER">Owner</option>
                        <option value="ADMIN">Admin</option>
                        <option value="MEMBER">Member</option>
                      </select>
                      <button
                        type="button"
                        disabled={member.role === "OWNER" || removeMember.isPending}
                        onClick={() => window.confirm("Xóa thành viên khỏi team?") && removeMember.mutate(member.userId)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-bold text-red-600 disabled:opacity-40"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {memberPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  <span>{activeTeam.members.length} thành viên</span>
                  <Pagination page={memberPage} pages={memberPages} onPageChange={setMemberPage} />
                </div>
              )}
            </article>

            <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 p-5">
                <h2 className="text-xl font-black">Lời mời đang chờ</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {visibleInvites.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-5">
                    <div>
                      <p className="font-bold">{item.email}</p>
                      <p className="text-sm text-slate-500">{item.role} · hết hạn {new Date(item.expiresAt).toLocaleString("vi-VN")}</p>
                    </div>
                  </div>
                ))}
                {!activeTeam.invites.length && <p className="p-8 text-center text-slate-500">Không có lời mời đang chờ.</p>}
              </div>
              {invitePages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                  <span>{activeTeam.invites.length} lời mời</span>
                  <Pagination page={invitePage} pages={invitePages} onPageChange={setInvitePage} />
                </div>
              )}
            </article>
          </>
        )}
      </div>
    </AccountLayout>
  );
}
