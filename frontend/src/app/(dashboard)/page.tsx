"use client";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, ClipboardList, Package, DollarSign,
  AlertTriangle, Users, Calendar, Activity
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar
} from "recharts";
import api from "@/lib/api";
import { formatINR, formatDate, JOB_CARD_STATUS_LABELS, JOB_CARD_STATUS_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

function StatCard({
  title, value, sub, icon: Icon, color, loading,
}: {
  title: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{title}</p>
        {loading ? (
          <div className="h-7 bg-muted animate-pulse rounded mt-1 w-24" />
        ) : (
          <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get("/dashboard/summary").then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const { data: trend } = useQuery({
    queryKey: ["revenue-trend"],
    queryFn: () => api.get("/dashboard/revenue-trend?days=30").then((r) => r.data.data),
  });

  const { data: topCustomers } = useQuery({
    queryKey: ["top-customers"],
    queryFn: () => api.get("/dashboard/top-customers?limit=5").then((r) => r.data.data),
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-activity"],
    queryFn: () => api.get("/dashboard/recent-activity").then((r) => r.data.data),
  });

  const statusDist = summary?.job_card_status_distribution || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatINR(summary?.today_revenue ?? 0)}
          icon={DollarSign}
          color="bg-green-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatINR(summary?.monthly_revenue ?? 0)}
          sub="Current month"
          icon={TrendingUp}
          color="bg-blue-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Open Job Cards"
          value={String(summary?.open_job_cards ?? 0)}
          sub={`${summary?.today_job_cards ?? 0} opened today`}
          icon={ClipboardList}
          color="bg-orange-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Outstanding"
          value={formatINR(summary?.outstanding ?? 0)}
          sub="Total receivable"
          icon={AlertTriangle}
          color="bg-red-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Low Stock Items"
          value={String(summary?.low_stock_count ?? 0)}
          sub="Need restocking"
          icon={Package}
          color="bg-yellow-600"
          loading={summaryLoading}
        />
        <StatCard
          title="Present Today"
          value={String(summary?.present_today ?? 0)}
          sub="Employees"
          icon={Users}
          color="bg-purple-600"
          loading={summaryLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Revenue Trend (Last 30 Days)</h2>
          {trend ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} className="fill-muted-foreground" />
                <Tooltip
                  formatter={(v: number) => [formatINR(v), "Revenue"]}
                  labelFormatter={(l) => formatDate(l)}
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#colorRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground">Loading chart…</div>
          )}
        </div>

        {/* Job Card Status */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Job Card Status</h2>
          <div className="space-y-3">
            {Object.entries(statusDist).length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-8">No active job cards</p>
            ) : (
              Object.entries(statusDist).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between gap-3">
                  <span className={cn("text-xs px-2 py-1 rounded-md font-medium", JOB_CARD_STATUS_COLORS[status])}>
                    {JOB_CARD_STATUS_LABELS[status] || status}
                  </span>
                  <span className="font-bold text-foreground">{count as number}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Customers */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Top Customers</h2>
          {topCustomers?.length ? (
            <div className="space-y-3">
              {topCustomers.map((c: any, i: number) => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center font-bold">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.mobile}</p>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{formatINR(c.lifetime_spending)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No customer data yet</p>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold text-foreground mb-4">Recent Job Cards</h2>
          {recent?.length ? (
            <div className="space-y-3">
              {recent.map((jc: any) => (
                <div key={jc.id} className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{jc.job_card_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(jc.updated_at)}</p>
                  </div>
                  <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", JOB_CARD_STATUS_COLORS[jc.status])}>
                    {JOB_CARD_STATUS_LABELS[jc.status]}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-sm text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
