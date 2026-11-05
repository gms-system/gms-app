"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Moon, Sun, Monitor, LogOut, Bell, KeyRound, ChevronDown, Loader2 } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { toast } from "sonner";
import api from "@/lib/api";
import { getInitials, EMPLOYEE_ROLE_LABELS } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";

// ─── Change Password modal ─────────────────────────────────────────────────────
function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      api.put("/auth/change-password", { current_password: current, new_password: next }),
    onSuccess: () => {
      toast.success("Password changed successfully");
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to change password"),
  });

  function submit() {
    if (!current || !next) { toast.error("Fill all fields"); return; }
    if (next.length < 8) { toast.error("New password must be at least 8 characters"); return; }
    if (next !== confirm) { toast.error("Passwords do not match"); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Change Password</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {[
            { label: "Current Password", value: current, set: setCurrent },
            { label: "New Password (min 8 chars)", value: next, set: setNext },
            { label: "Confirm New Password", value: confirm, set: setConfirm },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="text-sm font-medium">{label}</label>
              <input type="password" value={value} onChange={e => set(e.target.value)}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={mutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? "Saving..." : "Change Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Header ────────────────────────────────────────────────────────────────────
export function Header({ title }: { title?: string }) {
  const router = useRouter();
  const { theme, setTheme } = useUIStore();
  const { user, logout } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showChangePwd, setShowChangePwd] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    try { await api.post("/auth/logout"); } catch {}
    logout();
    router.push("/login");
    toast.success("Logged out");
  };

  const cycleTheme = () => {
    setTheme(theme === "light" ? "dark" : theme === "dark" ? "system" : "light");
  };
  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    <>
      {showChangePwd && <ChangePasswordModal onClose={() => setShowChangePwd(false)} />}

      <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
        <div>
          {title && <h1 className="text-lg font-semibold text-foreground">{title}</h1>}
        </div>

        <div className="flex items-center gap-2">
          {/* Theme toggle */}
          <button onClick={cycleTheme} title={`Theme: ${theme}`}
            className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <ThemeIcon className="w-5 h-5" />
          </button>

          {/* Notifications */}
          <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
            <Bell className="w-5 h-5" />
          </button>

          {/* User dropdown */}
          {user && (
            <div className="relative pl-2 border-l border-border" ref={menuRef}>
              <button onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-accent transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                  {getInitials(user.name)}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-foreground leading-none">{user.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{EMPLOYEE_ROLE_LABELS[user.role] ?? user.role}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-muted-foreground hidden md:block transition-transform ${menuOpen ? "rotate-180" : ""}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-card border border-border rounded-xl shadow-xl py-1 z-50">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-border">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{user.mobile}</p>
                    <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium capitalize">
                      {EMPLOYEE_ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </div>

                  {/* Change password */}
                  <button onClick={() => { setMenuOpen(false); setShowChangePwd(true); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted text-left">
                    <KeyRound className="w-4 h-4 text-muted-foreground" />
                    Change Password
                  </button>

                  {/* Logout */}
                  <button onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-destructive/10 text-destructive text-left">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </header>
    </>
  );
}
