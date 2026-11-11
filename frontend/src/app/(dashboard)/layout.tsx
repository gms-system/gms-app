"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore } from "@/store/auth-store";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { PWAInstallBanner } from "@/components/pwa/install-banner";
import { SubscriptionBanner } from "@/components/subscription-banner";
import { VoiceLanguagePrompt } from "@/components/voice/language-picker";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ClipboardList, Receipt, Package,
} from "lucide-react";

const BOTTOM_NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/job-cards", label: "Job Cards", icon: ClipboardList },
  { href: "/billing", label: "Billing", icon: Receipt },
  { href: "/inventory", label: "Inventory", icon: Package },
];

function MobileBottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border md:hidden safe-area-pb">
      <div className="flex items-center justify-around px-2 py-1">
        {BOTTOM_NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-0",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}>
              <Icon className={cn("w-5 h-5 shrink-0", active && "text-primary")} />
              <span className="text-[10px] font-medium leading-none truncate">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);

  useEffect(() => {
    if (!user) router.push("/login");
  }, [user, router]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <Sidebar />

      {/* Main content — shifted right on desktop, full width on mobile */}
      <div className={cn(
        "transition-all duration-300",
        "md:ml-16",                              // collapsed sidebar width on md+
        sidebarOpen ? "md:ml-64" : "md:ml-16",  // expanded on desktop
      )}>
        <Header />
        {/* Subscription expiry banner — shown when plan is expiring or expired */}
        <SubscriptionBanner />
        {/* Extra bottom padding on mobile so content isn't hidden behind bottom nav */}
        <main className="p-4 md:p-6 pb-24 md:pb-6">{children}</main>
      </div>

      {/* Mobile bottom navigation */}
      <MobileBottomNav />

      {/* PWA install prompt (shows on Android Chrome automatically) */}
      <PWAInstallBanner />

      {/* First launch: choose voice language (English / Hindi) */}
      <VoiceLanguagePrompt />
    </div>
  );
}
