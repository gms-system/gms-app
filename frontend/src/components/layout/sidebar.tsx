"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/ui-store";
import { useAuthStore, atLeastRole } from "@/store/auth-store";
import {
  LayoutDashboard, Users, Car, ClipboardList, FileText,
  Package, ShoppingCart, Receipt, UserCheck, Users2,
  BarChart3, Settings, Wrench, ChevronLeft
} from "lucide-react";

// role field = minimum role required to see this item (owner always sees everything)
const NAV_ITEMS = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard, minRole: "technician"    },
  { href: "/customers",  label: "Customers",  icon: Users,           minRole: "receptionist"  },
  { href: "/vehicles",   label: "Vehicles",   icon: Car,             minRole: "receptionist"  },
  { href: "/job-cards",  label: "Job Cards",  icon: ClipboardList,   minRole: "technician"    },
  { href: "/estimates",  label: "Estimates",  icon: FileText,        minRole: "service_advisor"},
  { href: "/billing",    label: "Billing",    icon: Receipt,         minRole: "manager"       },
  { href: "/inventory",  label: "Inventory",  icon: Package,         minRole: "store_manager" },
  { href: "/purchases",  label: "Purchases",  icon: ShoppingCart,    minRole: "store_manager" },
  { href: "/employees",  label: "Employees",  icon: Users2,          minRole: "manager"       },
  { href: "/attendance", label: "Attendance", icon: UserCheck,       minRole: "manager"       },
  { href: "/reports",    label: "Reports",    icon: BarChart3,       minRole: "manager"       },
  { href: "/settings",   label: "Settings",   icon: Settings,        minRole: "owner"         },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const user = useAuthStore((s) => s.user);

  const visibleItems = NAV_ITEMS.filter(item => atLeastRole(user, item.minRole));

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-full bg-sidebar text-sidebar-foreground z-30 transition-all duration-300 flex flex-col",
      "hidden md:flex",   // hide on mobile — bottom nav handles it
      sidebarOpen ? "w-64" : "w-16"
    )}>
      {/* Header */}
      <div className="flex items-center h-16 px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <Wrench className="w-4 h-4 text-sidebar-primary-foreground" />
          </div>
          {sidebarOpen && <span className="font-bold text-lg truncate">GMS</span>}
        </div>
        <button onClick={toggleSidebar}
          className="p-1 rounded-md hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-foreground shrink-0">
          <ChevronLeft className={cn("w-4 h-4 transition-transform", !sidebarOpen && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {visibleItems.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link href={href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  title={!sidebarOpen ? label : undefined}>
                  <Icon className="w-5 h-5 shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-xs text-sidebar-foreground/40 text-center">GMS v1.0 • Made in India</p>
        </div>
      )}
    </aside>
  );
}
