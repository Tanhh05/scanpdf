"use client";

import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import { api } from "@/services/api";

function AcceptTeamInviteContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const accept = useMutation({
    mutationFn: async () => (await api.post("/teams/invites/accept", { token })).data,
  });

  useEffect(() => {
    if (token && accept.isIdle) accept.mutate();
  }, [accept, token]);

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center py-16">
      <div className="card w-full max-w-lg p-8 text-center">
        <h1 className="text-3xl font-black">Lời mời team</h1>
        {accept.isPending && <p className="mt-3 text-slate-500">Đang chấp nhận lời mời...</p>}
        {accept.isSuccess && (
          <>
            <p className="mt-3 text-emerald-700">Bạn đã tham gia team thành công.</p>
            <Link href="/dashboard/teams" className="btn-primary mt-6">Mở team</Link>
          </>
        )}
        {accept.isError && (
          <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {axios.isAxiosError(accept.error) ? accept.error.response?.data?.message : "Không thể chấp nhận lời mời"}
          </p>
        )}
        {!token && <p className="mt-3 text-red-600">Thiếu token lời mời.</p>}
      </div>
    </section>
  );
}

export default function AcceptTeamInvitePage() {
  return <Suspense><AcceptTeamInviteContent /></Suspense>;
}
