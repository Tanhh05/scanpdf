import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string;
  role: "USER" | "ADMIN";
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
  setSession: (token: string, user: AuthUser) => void;
  updateUser: (user: Partial<AuthUser>) => void;
  logout: () => void;
};

export const useAuthStore = create<AuthState>()(persist(
  (set) => ({
    token: null,
    user: null,
    setSession: (token, user) => set({ token, user }),
    updateUser: (user) => set((state) => ({ user: state.user ? { ...state.user, ...user } : state.user })),
    logout: () => set({ token: null, user: null }),
  }),
  { name: "scanpdf-auth" },
));
