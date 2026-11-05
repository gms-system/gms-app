"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowLeft, ToggleLeft, ToggleRight, KeyRound, Users, RefreshCw, CalendarClock, Loader2,
  Car, ClipboardList, Receipt, Package, IndianRupee, AlertTriangle, Database,
} from "lucide-react";
import api from "@/lib/api";
import { formatDate, formatINR, JOB_CARD_STATUS_LABELS, JOB_CARD_STATUS_COLORS, ITEM_CATEGORY_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Garage Data (super admin visibility into each garage) ────────────────────
type DataTab = "customers" | "vehicles" | "job-cards" | "invoices" | "inventory";
const DATA_TABS: { key: DataTab; label: string; icon: any }[] = [
  { key: "customers", label: "Customers", icon: Users },
  { key: "vehicles", label: "Vehicles", icon: Car },
  { key: "job-cards", label: "Job Cards", icon: ClipboardList },
  { key: "invoices", label: "Invoices", icon: Receipt },
  { key: "inventory", label: "Inventory", icon: Package },
];

function GarageDataPanel({ garageId }: { garageId: string }) {
  const [tab, setTab] = useState<DataTab>("job-cards");
  const [page, setPage] = useState(1);

  const { data: ov } = useQuery({
    queryKey: ["admin-garage-overview", garageId],
    queryFn: () => api.get(`/admin/garages/${garageId}/overview`).then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["admin-garage-data", garageId, tab, page],
    queryFn: () => api.get(`/admin/garages/${garageId}/${tab}`, { params: { page, limit: 10 } }).then(r => r.data),
    placeholderData: prev => prev,
  });
  const rows: any[] = data?.data ?? [];
  const meta = data?.meta;

  const stats = ov ? [
    { label: "Customers", value: ov.customers, icon: Users },
    { label: "Vehicles", value: ov.vehicles, icon: Car },
    { label: "Open Job Cards", value: `${ov.job_cards_open} / ${ov.job_cards_total}`, icon: ClipboardList },
    { label: "Invoices", value: ov.invoices, icon: Receipt },
    { label: "Revenue", value: formatINR(ov.revenue), icon: IndianRupee },
    { label: "Outstanding", value: formatINR(ov.outstanding), icon: AlertTriangle, warn: ov.outstanding > 0 },
    { label: "Inventory Items", value: ov.inventory_items, icon: Package },
    { label: "Low Stock", value: ov.low_stock_items, icon: AlertTriangle, warn: ov.low_stock_items > 0 },
  ] : [];

  const headers: Record<DataTab, string[]> = {
    customers: ["Code", "Name", "Mobile", "City", "Outstanding", "Lifetime"],
    vehicles: ["Reg. No", "Make / Model", "Fuel", "Color", "Added"],
    "job-cards": ["JC #", "Status", "Complaint", "Created"],
    invoices: ["Invoice #", "Date", "Type", "Total", "Paid", "Due", "Status"],
    inventory: ["SKU", "Name", "Category", "Stock", "Buy", "Sell"],
  };

  function renderRow(r: any) {
    switch (tab) {
      case "customers": return <>
        <td className="px-4 py-2.5 font-mono text-xs">{r.customer_code}</td>
        <td className="px-4 py-2.5 font-medium">{r.name}</td>
        <td className="px-4 py-2.5 font-mono text-xs">{r.mobile}</td>
        <td className="px-4 py-2.5 text-muted-foreground">{r.city || "—"}</td>
        <td className={cn("px-4 py-2.5", r.outstanding_balance > 0 && "text-red-600 font-medium")}>{formatINR(r.outstanding_balance)}</td>
        <td className="px-4 py-2.5">{formatINR(r.lifetime_spending)}</td>
      </>;
      case "vehicles": return <>
        <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.registration_number}</td>
        <td className="px-4 py-2.5">{[r.make, r.model, r.variant].filter(Boolean).join(" ")}</td>
        <td className="px-4 py-2.5 capitalize text-muted-foreground">{r.fuel_type || "—"}</td>
        <td className="px-4 py-2.5 text-muted-foreground">{r.color || "—"}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
      </>;
      case "job-cards": return <>
        <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.job_card_number}</td>
        <td className="px-4 py-2.5"><span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", JOB_CARD_STATUS_COLORS[r.status])}>{JOB_CARD_STATUS_LABELS[r.status] ?? r.status}</span></td>
        <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">{r.customer_complaint || "—"}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatDate(r.created_at)}</td>
      </>;
      case "invoices": return <>
        <td className="px-4 py-2.5 font-mono text-xs font-medium">{r.invoice_number}</td>
        <td className="px-4 py-2.5 text-muted-foreground">{formatDate(r.invoice_date)}</td>
        <td className="px-4 py-2.5 capitalize text-muted-foreground">{String(r.invoice_type).replace(/_/g, " ")}</td>
        <td className="px-4 py-2.5 font-medium">{formatINR(r.grand_total)}</td>
        <td className="px-4 py-2.5 text-green-600">{formatINR(r.amount_paid)}</td>
        <td className={cn("px-4 py-2.5", r.amount_due > 0 && "text-red-600 font-medium")}>{formatINR(r.amount_due)}</td>
        <td className="px-4 py-2.5"><span className={cn("text-xs px-2 py-0.5 rounded-md font-medium",
          r.is_cancelled ? "bg-red-100 text-red-800" : r.amount_due <= 0 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800")}>
          {r.is_cancelled ? "Cancelled" : r.amount_due <= 0 ? "Paid" : "Due"}</span></td>
      </>;
      case "inventory": return <>
        <td className="px-4 py-2.5 font-mono text-xs">{r.sku}</td>
        <td className="px-4 py-2.5 font-medium">{r.name}{r.brand && <span className="text-xs text-muted-foreground"> ({r.brand})</span>}</td>
        <td className="px-4 py-2.5 text-muted-foreground">{ITEM_CATEGORY_LABELS[r.category] ?? r.category}</td>
        <td className={cn("px-4 py-2.5", r.is_low_stock && "text-red-600 font-medium")}>{r.current_stock} {r.unit_of_measure}</td>
        <td className="px-4 py-2.5">{formatINR(r.purchase_price)}</td>
        <td className="px-4 py-2.5">{formatINR(r.selling_price)}</td>
      </>;
    }
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.length === 0
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />)
          : stats.map(s => (
            <div key={s.label} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <s.icon className={cn("w-4 h-4", s.warn ? "text-red-500" : "text-muted-foreground")} />
              </div>
              <p className={cn("text-xl font-bold mt-1", s.warn && "text-red-600")}>{s.value}</p>
            </div>
          ))}
      </div>

      {/* Tabbed data */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center gap-1 px-3 py-2 border-b border-border overflow-x-auto">
          <Database className="w-4 h-4 text-muted-foreground mx-2 shrink-0" />
          {DATA_TABS.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setPage(1); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors",
                tab === t.key ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted")}>
              <t.icon className="w-3.5 h-3.5" /> {t.label}
              {ov && <span className={cn("text-[10px] px-1.5 rounded-full", tab === t.key ? "bg-white/20" : "bg-muted")}>
                {t.key === "customers" ? ov.customers : t.key === "vehicles" ? ov.vehicles : t.key === "job-cards" ? ov.job_cards_total : t.key === "invoices" ? ov.invoices : ov.inventory_items}
              </span>}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs">
                {headers[tab].map(h => <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading && rows.length === 0 ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{headers[tab].map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>)}</tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan={headers[tab].length} className="px-4 py-10 text-center text-muted-foreground">No records</td></tr>
              ) : rows.map(r => <tr key={r.id} className="hover:bg-muted/30">{renderRow(r)}</tr>)}
            </tbody>
          </table>
        </div>
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Page {page} of {meta.pages} · {meta.total} records</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Prev</button>
              <button disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Renew Subscription Modal ──────────────────────────────────────────────────
function RenewModal({ garageId, currentPlan, onClose }: { garageId: string; currentPlan: string; onClose: () => void }) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);
  const oneYear = new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10);
  const [plan, setPlan] = useState(currentPlan ?? "basic");
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(oneYear);
  const [maxUsers, setMaxUsers] = useState(5);

  const PLANS = [
    { key: "basic", label: "Basic", users: 5, desc: "Up to 5 users" },
    { key: "pro", label: "Pro", users: 15, desc: "Up to 15 users" },
    { key: "enterprise", label: "Enterprise", users: 50, desc: "Up to 50 users" },
  ];

  const mutation = useMutation({
    mutationFn: () => api.put(`/admin/garages/${garageId}`, {
      plan, subscription_start: start, subscription_end: end, max_users: maxUsers,
    }).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-garage", garageId] });
      qc.invalidateQueries({ queryKey: ["admin-garages"] });
      toast.success("Subscription renewed");
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Renew Subscription</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-5">
          {/* Plan picker */}
          <div>
            <label className="text-sm font-medium">Plan</label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {PLANS.map(p => (
                <button key={p.key} onClick={() => { setPlan(p.key); setMaxUsers(p.users); }}
                  className={cn("py-3 rounded-xl border text-sm font-medium transition-colors",
                    plan === p.key ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                  <p>{p.label}</p>
                  <p className={cn("text-xs mt-0.5 font-normal", plan === p.key ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {p.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">Start Date</label>
              <input type="date" value={start} onChange={e => setStart(e.target.value)}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-sm font-medium">End Date</label>
              <input type="date" value={end} onChange={e => setEnd(e.target.value)}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Max Users</label>
            <input type="number" min={1} max={200} value={maxUsers} onChange={e => setMaxUsers(Number(e.target.value))}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {mutation.isPending ? "Saving..." : "Renew Subscription"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reset Password Modal ──────────────────────────────────────────────────────
function ResetPasswordModal({ garageId, onClose }: { garageId: string; onClose: () => void }) {
  const [password, setPassword] = useState("Admin@123");
  const mutation = useMutation({
    mutationFn: () => api.post(`/admin/garages/${garageId}/reset-owner-password`, null, { params: { new_password: password } }).then(r => r.data),
    onSuccess: (res) => { toast.success(res.message); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to reset password"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Reset Owner Password</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">Set a new password for this garage's owner account.</p>
          <div>
            <label className="text-sm font-medium">New Password</label>
            <input value={password} onChange={e => setPassword(e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={() => mutation.mutate()} disabled={mutation.isPending || !password}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <KeyRound className="w-4 h-4" />
            {mutation.isPending ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Garage Detail Page ────────────────────────────────────────────────────────
export default function GarageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showReset, setShowReset] = useState(false);
  const [showRenew, setShowRenew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-garage", id],
    queryFn: () => api.get(`/admin/garages/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: employees, isLoading: empLoading } = useQuery({
    queryKey: ["admin-garage-employees", id],
    queryFn: () => api.get(`/admin/garages/${id}/employees`).then(r => r.data.data),
    enabled: !!id,
  });

  const toggleMut = useMutation({
    mutationFn: () => api.patch(`/admin/garages/${id}/toggle-active`).then(r => r.data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["admin-garage", id] }); toast.success(res.message); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Action failed"),
  });

  if (isLoading) return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 bg-muted animate-pulse rounded-2xl" />)}
    </div>
  );

  if (!data) return (
    <div className="text-center py-16">
      <p className="text-muted-foreground">Garage not found</p>
      <button onClick={() => router.back()} className="mt-4 text-primary hover:underline text-sm">Go back</button>
    </div>
  );

  const g = data;
  const PLAN_COLORS: Record<string, string> = {
    enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    pro: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    basic: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {showReset && <ResetPasswordModal garageId={id} onClose={() => setShowReset(false)} />}
      {showRenew && <RenewModal garageId={id} currentPlan={g.plan} onClose={() => setShowRenew(false)} />}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-border hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">{g.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium capitalize", PLAN_COLORS[g.plan] ?? PLAN_COLORS.basic)}>{g.plan}</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                {g.garage_type === "4_wheeler" ? "4-Wheeler" : g.garage_type === "2_wheeler" ? "2-Wheeler" : "4W + 2W"}
              </span>
              <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", g.is_active ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200")}>
                {g.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRenew(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">
            <CalendarClock className="w-4 h-4" /> Renew
          </button>
          <button onClick={() => setShowReset(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">
            <KeyRound className="w-4 h-4" /> Reset Password
          </button>
          <button onClick={() => toggleMut.mutate()} disabled={toggleMut.isPending}
            className={cn("flex items-center gap-2 px-4 py-2 text-sm rounded-xl font-medium",
              g.is_active ? "bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400" : "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400")}>
            {g.is_active ? <ToggleLeft className="w-4 h-4" /> : <ToggleRight className="w-4 h-4" />}
            {toggleMut.isPending ? "..." : g.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border font-semibold">Garage Details</div>
        <div className="grid grid-cols-2 gap-0 divide-y divide-border">
          {[
            ["Owner Name", g.owner_name ?? "—"],
            ["Mobile", g.mobile],
            ["Email", g.email ?? "—"],
            ["GSTIN", g.gstin ?? "—"],
            ["Garage Type", g.garage_type === "4_wheeler" ? "4-Wheeler (Cars/SUVs)" : g.garage_type === "2_wheeler" ? "2-Wheeler (Bikes/Scooters)" : "Both 4-Wheeler & 2-Wheeler"],
            ["Address", g.address ?? "—"],
            ["City", g.city ?? "—"],
            ["State", g.state ?? "—"],
            ["Max Users", g.max_users],
            ["Subscription Start", g.subscription_start ? formatDate(g.subscription_start) : "—"],
            ["Subscription End", g.subscription_end ? formatDate(g.subscription_end) : "—"],
            ["Total Employees", g.employee_count ?? "—"],
            ["Created", formatDate(g.created_at)],
          ].map(([label, value], i) => (
            <div key={i} className={cn("px-6 py-3 flex items-center justify-between", i % 2 === 0 ? "" : "border-l border-border")}>
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>
        {g.notes && (
          <div className="px-6 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">Notes: </span>
            <span className="text-sm">{g.notes}</span>
          </div>
        )}
      </div>

      {/* Employees */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2"><Users className="w-4 h-4" /> Users</h2>
          {empLoading && <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
        <div className="divide-y divide-border">
          {empLoading ? (
            Array.from({ length: 3 }).map((_, i) => <div key={i} className="px-6 py-4"><div className="h-4 bg-muted animate-pulse rounded" /></div>)
          ) : (employees ?? []).length === 0 ? (
            <div className="px-6 py-8 text-center text-muted-foreground text-sm">No employees found</div>
          ) : (
            (employees ?? []).map((emp: any) => (
              <div key={emp.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{emp.mobile} · {emp.employee_code}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium capitalize",
                    emp.role === "owner" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                    emp.role === "manager" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")}>
                    {emp.role}
                  </span>
                  <span className={cn("text-xs px-2 py-0.5 rounded-full",
                    emp.is_active ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" : "bg-gray-100 text-gray-500")}>
                    {emp.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Garage business data — full visibility for super admin */}
      <div>
        <h2 className="font-semibold flex items-center gap-2 mb-3"><Database className="w-4 h-4" /> Garage Data</h2>
        <GarageDataPanel garageId={id} />
      </div>
    </div>
  );
}
