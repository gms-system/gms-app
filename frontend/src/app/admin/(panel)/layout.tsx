"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, LayoutDashboard, Building2, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/garages", label: "Garages", icon: Building2, exact: false },
];

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(true);

  useEffect(() => {
    api.get("/admin/auth/me")
      .then(r => setAdmin(r.data.data))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  async function logout() {
    try { await api.post("/admin/auth/logout"); } catch { /* ignore */ }
    router.push("/admin/login");
  }

  if (!admin) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn("fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-30 flex flex-col transition-all duration-300", menuOpen ? "w-60" : "w-16")}>
        <div className="flex items-center h-16 px-4 border-b border-sidebar-border gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4 text-primary-foreground" />
          </div>
          {menuOpen && <span className="font-bold text-base truncate">Super Admin</span>}
          <button onClick={() => setMenuOpen(p => !p)} className="ml-auto p-1 rounded-md hover:bg-sidebar-accent">
            {menuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link key={href} href={href}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground")}>
                <Icon className="w-4 h-4 shrink-0" />
                {menuOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          {menuOpen && (
            <div className="px-3 py-2 mb-1">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{admin.name}</p>
              <p className="text-xs text-sidebar-foreground/50 truncate">{admin.email}</p>
            </div>
          )}
          <button onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors">
            <LogOut className="w-4 h-4 shrink-0" />
            {menuOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className={cn("flex-1 transition-all duration-300 p-8", menuOpen ? "ml-60" : "ml-16")}>
        {children}
      </main>
    </div>
  );
}
