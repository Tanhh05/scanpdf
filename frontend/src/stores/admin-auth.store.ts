import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "./auth.store";

type AdminAuthState = {
  token: string | null;
  user: AuthUser | null;
  hasHydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  setHasHydrated: (value: boolean) => void;
  logout: () => void;
};

export const useAdminAuthStore = create<AdminAuthState>()(persist(
  (set) => ({
    token: null,
    user: null,
    hasHydrated: false,
    setSession: (token, user) => set({ token, user }),
    setHasHydrated: (hasHydrated) => set({ hasHydrated }),
    logout: () => set({ token: null, user: null }),
  }),
  {
    name: "scanpdf-admin-auth",
    partialize: (state) => ({ token: state.token, user: state.user }),
    onRehydrateStorage: () => (state) => {
      state?.setHasHydrated(true);
    },
  },
));
