import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./auth.store";

type AdminAuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  logout: () => void;
};

export const useAdminAuthStore = create<AdminAuthState>()(persist(
  (set) => ({
    token: null,
    user: null,
    setSession: (token, user) => set({ token, user }),
    logout: () => set({ token: null, user: null }),
  }),
  { name: "scanpdf-admin-auth" },
));
