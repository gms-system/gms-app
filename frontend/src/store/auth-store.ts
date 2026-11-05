import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface User {
  id: string;
  name: string;
  role: string;
  mobile: string;
  email?: string;
  avatar_url?: string;
  garage_id?: string;
}

// Role hierarchy for access checks
export const ROLE_LEVEL: Record<string, number> = {
  owner: 100,
  manager: 80,
  service_advisor: 60,
  store_manager: 50,
  receptionist: 40,
  technician: 30,
};

export function hasRole(user: User | null, ...roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}

export function atLeastRole(user: User | null, minRole: string): boolean {
  if (!user) return false;
  return (ROLE_LEVEL[user.role] ?? 0) >= (ROLE_LEVEL[minRole] ?? 0);
}

interface AuthState {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    { name: "gms-auth" }
  )
);
