"use client";

import { useQuery } from "@tanstack/react-query";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/services/api";
import { type AuthUser, useAuthStore } from "@/stores/auth.store";

export default function OAuthCallbackPage() {
  const router = useRouter();
  const setSession = useAuthStore((state) => state.setSession);
  const [token, setToken] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.hash.slice(1)).get("token"));
  }, []);

  const profile = useQuery<AuthUser>({
    queryKey: ["oauth-profile", token],
    queryFn: async () => (await api.get("/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })).data,
    enabled: Boolean(token),
    retry: false,
  });

  useEffect(() => {
    if (token && profile.data) {
      setSession(token, profile.data);
      router.replace("/dashboard");
    }
  }, [profile.data, router, setSession, token]);

  return (
    <section className="container-page flex min-h-[70vh] items-center justify-center">
      <div className="card p-10 text-center">
        {profile.isError || token === null
          ? <p className="text-red-700">Không thể hoàn tất đăng nhập OAuth.</p>
          : <p className="flex items-center gap-3 font-bold"><LoaderCircle className="animate-spin text-[#10aee8]" /> Đang hoàn tất đăng nhập...</p>}
      </div>
    </section>
  );
}
