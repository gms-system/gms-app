"use client";
import { useQuery } from "@tanstack/react-query";
import { Building2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import api from "@/lib/api";

function StatCard({ title, value, icon: Icon, color }: { title: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-muted-foreground font-medium">{title}</span>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => api.get("/admin/dashboard").then(r => r.data.data),
    refetchInterval: 60000,
  });

  const { data: recentGarages, isLoading: garagesLoading } = useQuery({
    queryKey: ["admin-garages-recent"],
    queryFn: () => api.get("/admin/garages", { params: { limit: 5, page: 1 } }).then(r => r.data.data),
  });

  if (isLoading) return (
    <div className="space-y-4">
      <div className="h-8 bg-muted animate-pulse rounded-xl w-48" />
      <div className="grid grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-32 bg-muted animate-pulse rounded-2xl" />)}
      </div>
    </div>
  );

  const d = data ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Super Admin Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Overview of all garage tenants</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Garages" value={d.total_garages ?? 0} icon={Building2} color="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" />
        <StatCard title="Active" value={d.active_garages ?? 0} icon={CheckCircle2} color="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" />
        <StatCard title="Inactive" value={d.inactive_garages ?? 0} icon={XCircle} color="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400" />
        <StatCard title="Expiring Soon" value={d.expiring_soon ?? 0} icon={AlertTriangle} color="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" />
      </div>

      {/* Recent garages */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold">Recent Garages</h2>
          <a href="/admin/garages" className="text-sm text-primary hover:underline">View all</a>
        </div>
        <div className="divide-y divide-border">
          {garagesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4">
                <div className="h-4 bg-muted animate-pulse rounded flex-1" />
              </div>
            ))
          ) : (recentGarages ?? []).length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">No garages yet</div>
          ) : (
            (recentGarages ?? []).map((g: any) => (
              <a key={g.id} href={`/admin/garages/${g.id}`} className="flex items-center justify-between px-6 py-4 hover:bg-muted/30">
                <div>
                  <p className="font-medium">{g.name}</p>
                  <p className="text-sm text-muted-foreground">{g.mobile} · {g.city ?? "—"} · Plan: {g.plan}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${g.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}>
                  {g.is_active ? "Active" : "Inactive"}
                </span>
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
