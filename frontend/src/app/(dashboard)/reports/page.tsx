"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Download, TrendingUp, Receipt, AlertCircle, ClipboardList } from "lucide-react";
import api from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

type ReportTab = "sales" | "gst" | "inventory" | "outstanding" | "job-cards";
const TABS: { key: ReportTab; label: string }[] = [
  { key: "sales", label: "Sales" },
  { key: "gst", label: "GST" },
  { key: "inventory", label: "Inventory" },
  { key: "outstanding", label: "Outstanding" },
  { key: "job-cards", label: "Job Cards" },
];
const PIE_COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899"];

function thisMonth() {
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  return { from: first, to: today.toISOString().slice(0, 10) };
}

// ─── Date range filter ─────────────────────────────────────────────────────────
function DateFilter({ from, to, onFrom, onTo }: { from: string; to: string; onFrom: (v: string) => void; onTo: (v: string) => void }) {
  const presets = [
    { label: "This Month", ...thisMonth() },
    { label: "Last 7 Days", from: new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
    { label: "Last 30 Days", from: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10), to: new Date().toISOString().slice(0, 10) },
  ];
  return (
    <div className="flex items-end gap-3 flex-wrap">
      <div>
        <label className="block text-xs text-muted-foreground mb-1">From</label>
        <input type="date" value={from} onChange={e => onFrom(e.target.value)}
          className="px-3 py-2 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div>
        <label className="block text-xs text-muted-foreground mb-1">To</label>
        <input type="date" value={to} onChange={e => onTo(e.target.value)}
          className="px-3 py-2 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="flex gap-2 pb-0.5">
        {presets.map(p => (
          <button key={p.label} onClick={() => { onFrom(p.from); onTo(p.to); }}
            className={cn("px-3 py-2 text-xs rounded-xl border transition-colors",
              from === p.from && to === p.to ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Sales tab ─────────────────────────────────────────────────────────────────
function SalesTab() {
  const { from: df, to: dt } = thisMonth();
  const [from, setFrom] = useState(df);
  const [to, setTo] = useState(dt);

  const { data, isLoading } = useQuery({
    queryKey: ["report-sales", from, to],
    queryFn: () => api.get("/reports/sales", { params: { from_date: from, to_date: to } }).then(r => r.data.data),
    enabled: !!from && !!to,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Collected" value={formatINR(data.total_collected)} sub={`${data.transactions} payments`} />
            <StatCard label="Total Invoiced" value={formatINR(data.total_invoiced)} sub={`${data.invoices_count} invoices`} />
            <StatCard label="Avg per Invoice" value={data.invoices_count > 0 ? formatINR(data.total_invoiced / data.invoices_count) : "—"} />
            <StatCard label="Uncollected" value={formatINR(Math.max(0, data.total_invoiced - data.total_collected))} />
          </div>

          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold mb-4">Daily Revenue (₹)</h3>
            {data.daily?.some((d: any) => d.revenue > 0) ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.daily}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => [formatINR(v), "Revenue"]} labelFormatter={l => `Date: ${l}`} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No revenue data for this period</div>
            )}
          </div>

          {data.by_payment_mode?.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">By Payment Mode</h3>
              <div className="flex items-center gap-8 flex-wrap">
                <ResponsiveContainer width={200} height={180}>
                  <PieChart>
                    <Pie data={data.by_payment_mode} dataKey="amount" nameKey="mode" cx="50%" cy="50%" outerRadius={70}>
                      {data.by_payment_mode.map((_: any, i: number) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatINR(v)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {data.by_payment_mode.map((m: any, i: number) => (
                    <div key={m.mode} className="flex items-center gap-2 text-sm">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="capitalize">{m.mode.replace("_", " ")}</span>
                      <span className="font-semibold ml-auto">{formatINR(m.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Sales data will appear here once invoices and payments are recorded.</p>
        </div>
      )}
    </div>
  );
}

// ─── GST tab ───────────────────────────────────────────────────────────────────
function GSTTab() {
  const { from: df, to: dt } = thisMonth();
  const [from, setFrom] = useState(df);
  const [to, setTo] = useState(dt);

  const { data, isLoading } = useQuery({
    queryKey: ["report-gst", from, to],
    queryFn: () => api.get("/reports/gst", { params: { from_date: from, to_date: to } }).then(r => r.data.data),
    enabled: !!from && !!to,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />
        <button className="flex items-center gap-2 px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Taxable Amount" value={formatINR(data.totals?.taxable_amount ?? 0)} />
            <StatCard label="CGST" value={formatINR(data.totals?.cgst ?? 0)} />
            <StatCard label="SGST" value={formatINR(data.totals?.sgst ?? 0)} />
            <StatCard label="Total Tax" value={formatINR(data.totals?.total_tax ?? 0)} />
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border font-semibold text-sm">Invoice-wise GST ({data.invoices?.length ?? 0} invoices)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    {["Invoice #", "Date", "Taxable", "CGST", "SGST", "Total Tax", "Grand Total"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data.invoices ?? []).length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No invoices in this period</td></tr>
                  ) : (
                    (data.invoices ?? []).map((inv: any) => (
                      <tr key={inv.invoice_number} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                        <td className="px-4 py-2.5">{formatINR(inv.taxable_amount)}</td>
                        <td className="px-4 py-2.5">{formatINR(inv.cgst)}</td>
                        <td className="px-4 py-2.5">{formatINR(inv.sgst)}</td>
                        <td className="px-4 py-2.5 font-medium">{formatINR(inv.total_tax)}</td>
                        <td className="px-4 py-2.5 font-semibold">{formatINR(inv.grand_total)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>GST report will appear once tax invoices are created.</p>
        </div>
      )}
    </div>
  );
}

// ─── Inventory tab ─────────────────────────────────────────────────────────────
function InventoryTab() {
  const { data: lowStock, isLoading: lowLoading } = useQuery({
    queryKey: ["inventory-low-stock"],
    queryFn: () => api.get("/inventory/low-stock").then(r => r.data.data),
  });
  const { data: allItems } = useQuery({
    queryKey: ["inventory-all-report"],
    queryFn: () => api.get("/inventory", { params: { limit: 200 } }).then(r => r.data.data),
  });

  const categoryCount: Record<string, number> = {};
  (allItems ?? []).forEach((item: any) => {
    categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
  });
  const pieData = Object.entries(categoryCount).map(([name, value]) => ({ name, value }));

  const totalValue = (allItems ?? []).reduce((s: number, i: any) => s + i.current_stock * i.purchase_price, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total SKUs" value={String(allItems?.length ?? 0)} />
        <StatCard label="Low Stock Items" value={String(lowStock?.length ?? 0)} sub="Below minimum level" />
        <StatCard label="Inventory Value" value={formatINR(totalValue)} sub="At purchase price" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4">Items by Category</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No inventory data</div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold mb-4 text-yellow-600 dark:text-yellow-400">
            Low Stock Alert ({lowStock?.length ?? 0})
          </h3>
          <div className="space-y-2 max-h-[220px] overflow-y-auto">
            {lowLoading ? (
              Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)
            ) : !lowStock?.length ? (
              <p className="text-muted-foreground text-sm text-center py-8">All items adequately stocked</p>
            ) : (
              lowStock.map((item: any) => (
                <div key={item.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-yellow-600">{item.current_stock} {item.unit_of_measure}</p>
                    <p className="text-xs text-muted-foreground">Min: {item.min_stock_level}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Outstanding tab ───────────────────────────────────────────────────────────
function OutstandingTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["report-outstanding"],
    queryFn: () => api.get("/reports/outstanding").then(r => r.data.data),
    refetchInterval: 120000,
  });

  const ageing = data?.ageing;
  const ageingData = ageing ? [
    { label: "0–30 days", value: ageing["0_30"] },
    { label: "31–60 days", value: ageing["31_60"] },
    { label: "61–90 days", value: ageing["61_90"] },
    { label: "90+ days", value: ageing["90_plus"] },
  ] : [];

  return (
    <div className="space-y-6">
      {isLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Outstanding" value={formatINR(data.total_outstanding)} sub={`${data.count} invoices`} />
            {ageingData.map(a => (
              <StatCard key={a.label} label={a.label} value={formatINR(a.value)} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-border font-semibold text-sm">Pending Invoices</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    {["Invoice #", "Date", "Customer", "Mobile", "Total", "Paid", "Due", "Days"].map(h => (
                      <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(data.invoices ?? []).length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No outstanding invoices</td></tr>
                  ) : (
                    (data.invoices ?? []).map((inv: any) => (
                      <tr key={inv.invoice_id} className="hover:bg-muted/30">
                        <td className="px-4 py-2.5 font-mono text-xs">{inv.invoice_number}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                        <td className="px-4 py-2.5 font-medium">{inv.customer_name}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{inv.customer_mobile}</td>
                        <td className="px-4 py-2.5">{formatINR(inv.grand_total)}</td>
                        <td className="px-4 py-2.5 text-green-600">{formatINR(inv.amount_paid)}</td>
                        <td className="px-4 py-2.5 font-semibold text-red-600">{formatINR(inv.amount_due)}</td>
                        <td className="px-4 py-2.5">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                            inv.days_overdue > 90 ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" :
                            inv.days_overdue > 30 ? "bg-yellow-100 text-yellow-800" : "bg-muted text-muted-foreground")}>
                            {inv.days_overdue}d
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Outstanding report will show pending invoices.</p>
        </div>
      )}
    </div>
  );
}

// ─── Job Cards tab ─────────────────────────────────────────────────────────────
function JobCardsTab() {
  const { from: df, to: dt } = thisMonth();
  const [from, setFrom] = useState(df);
  const [to, setTo] = useState(dt);

  const { data, isLoading } = useQuery({
    queryKey: ["report-job-cards", from, to],
    queryFn: () => api.get("/reports/job-cards", { params: { from_date: from, to_date: to } }).then(r => r.data.data),
    enabled: !!from && !!to,
  });

  const STATUS_COLORS_PIE: Record<string, string> = {
    received: "#3b82f6", work_in_progress: "#f59e0b", quality_check: "#8b5cf6",
    ready_for_delivery: "#22c55e", delivered: "#10b981", cancelled: "#ef4444",
  };

  return (
    <div className="space-y-6">
      <DateFilter from={from} to={to} onFrom={setFrom} onTo={setTo} />

      {isLoading ? (
        <div className="h-40 bg-muted animate-pulse rounded-xl" />
      ) : data ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Job Cards Created" value={String(data.total_in_range)} sub={`${from} to ${to}`} />
            <StatCard label="Avg Turnaround" value={data.avg_turnaround_hours ? `${data.avg_turnaround_hours} hrs` : "N/A"} sub="For delivered cards" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Status Distribution</h3>
              {(data.by_status ?? []).length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={data.by_status} dataKey="count" nameKey="status" cx="50%" cy="50%" outerRadius={80}>
                      {(data.by_status ?? []).map((s: any, i: number) => (
                        <Cell key={i} fill={STATUS_COLORS_PIE[s.status] ?? PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v, n.replace("_", " ")]} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No data</div>
              )}
              <div className="grid grid-cols-2 gap-1 mt-2">
                {(data.by_status ?? []).map((s: any) => (
                  <div key={s.status} className="flex items-center gap-1.5 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS_PIE[s.status] }} />
                    <span className="capitalize">{s.status.replace("_", " ")}</span>
                    <span className="font-semibold ml-auto">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5">
              <h3 className="font-semibold mb-4">Daily Job Cards</h3>
              {(data.daily ?? []).some((d: any) => d.count > 0) ? (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={data.daily}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={v => v.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip labelFormatter={l => `Date: ${l}`} />
                    <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No job cards in this period</div>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="bg-card border border-border rounded-xl p-12 text-center text-muted-foreground">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Job card report will show once cards are created.</p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("sales");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">Business insights and analytics</p>
      </div>

      <div className="flex border-b border-border overflow-x-auto">
        {TABS.map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)}
            className={cn("px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
            {label}
          </button>
        ))}
      </div>

      {tab === "sales" && <SalesTab />}
      {tab === "gst" && <GSTTab />}
      {tab === "inventory" && <InventoryTab />}
      {tab === "outstanding" && <OutstandingTab />}
      {tab === "job-cards" && <JobCardsTab />}
    </div>
  );
}
