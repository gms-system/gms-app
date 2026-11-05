"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, ChevronRight, ToggleLeft, ToggleRight } from "lucide-react";
import api from "@/lib/api";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Create Garage Modal ───────────────────────────────────────────────────────
function CreateGarageModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", owner_name: "", mobile: "", email: "", address: "", city: "", state: "",
    gstin: "", garage_type: "4_wheeler", plan: "basic", max_users: 5, owner_password: "Admin@123",
    subscription_start: "", subscription_end: "", notes: "",
  });

  const mutation = useMutation({
    mutationFn: (body: object) => api.post("/admin/garages", body).then(r => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["admin-garages"] });
      toast.success(`Garage created — ${res.message}`);
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to create garage"),
  });

  const set = (field: string, value: unknown) => setForm(p => ({ ...p, [field]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl mx-4 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Create New Garage</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {[
            { label: "Garage Name *", field: "name", placeholder: "Avni Motors" },
            { label: "Owner Name *", field: "owner_name", placeholder: "Ramesh Kumar" },
            { label: "Mobile *", field: "mobile", placeholder: "9876543210" },
            { label: "Email", field: "email", placeholder: "owner@garage.com" },
            { label: "Address", field: "address", placeholder: "Shop no, Street" },
            { label: "City", field: "city", placeholder: "Mumbai" },
            { label: "State", field: "state", placeholder: "Maharashtra" },
            { label: "GSTIN", field: "gstin", placeholder: "27AAAAA0000A1Z5" },
            { label: "Subscription Start", field: "subscription_start", placeholder: "", type: "date" },
            { label: "Subscription End", field: "subscription_end", placeholder: "", type: "date" },
            { label: "Owner Login Password", field: "owner_password", placeholder: "Admin@123" },
          ].map(({ label, field, placeholder, type }) => (
            <div key={field}>
              <label className="text-sm font-medium">{label}</label>
              <input type={type ?? "text"} value={(form as any)[field]} onChange={e => set(field, e.target.value)}
                placeholder={placeholder}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium">Garage Type</label>
            <select value={form.garage_type} onChange={e => set("garage_type", e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none">
              <option value="4_wheeler">4-Wheeler (Cars / SUVs)</option>
              <option value="2_wheeler">2-Wheeler (Bikes / Scooters)</option>
              <option value="both">Both 4-Wheeler &amp; 2-Wheeler</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Plan</label>
            <select value={form.plan} onChange={e => set("plan", e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none">
              <option value="basic">Basic</option>
              <option value="pro">Pro</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Max Users</label>
            <input type="number" min="1" value={form.max_users} onChange={e => set("max_users", parseInt(e.target.value))}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div className="col-span-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea value={form.notes} onChange={e => set("notes", e.target.value)} rows={2}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button
            onClick={() => mutation.mutate({ ...form, subscription_start: form.subscription_start || null, subscription_end: form.subscription_end || null })}
            disabled={mutation.isPending || !form.name || !form.owner_name || !form.mobile}
            className="px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? "Creating..." : "Create Garage"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminGaragesPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "true" | "false">("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-garages", search, statusFilter, page],
    queryFn: () => api.get("/admin/garages", {
      params: { search: search || undefined, is_active: statusFilter !== "" ? statusFilter === "true" : undefined, page, limit: 20 },
    }).then(r => r.data),
    placeholderData: prev => prev,
  });

  const toggleMut = useMutation({
    mutationFn: (id: string) => api.patch(`/admin/garages/${id}/toggle-active`).then(r => r.data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["admin-garages"] }); toast.success(res.message); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Action failed"),
  });

  const garages = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {showCreate && <CreateGarageModal onClose={() => setShowCreate(false)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Garages</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} registered garages</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Garage
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or mobile..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value as any); setPage(1); }}
          className="border border-input rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none">
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Garage", "Mobile", "City", "Type", "Plan", "Max Users", "Status", "Created", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}</tr>
                ))
              ) : garages.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-muted-foreground">No garages found</td></tr>
              ) : (
                garages.map((g: any) => (
                  <tr key={g.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="font-medium">{g.name}</div>
                      {g.owner_name && <div className="text-xs text-muted-foreground">{g.owner_name}</div>}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">{g.mobile}</td>
                    <td className="px-4 py-3 text-muted-foreground">{g.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300">
                        {g.garage_type === "2_wheeler" ? "2W" : g.garage_type === "both" ? "4W+2W" : "4W"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                        g.plan === "enterprise" ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" :
                        g.plan === "pro" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" :
                        "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300")}>
                        {g.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">{g.max_users}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={e => { e.stopPropagation(); toggleMut.mutate(g.id); }}
                        className="flex items-center gap-1.5 text-sm">
                        {g.is_active
                          ? <><ToggleRight className="w-5 h-5 text-green-600" /><span className="text-green-700 dark:text-green-400 font-medium">Active</span></>
                          : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-muted-foreground">Inactive</span></>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(g.created_at)}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => router.push(`/admin/garages/${g.id}`)}
                        className="p-1.5 rounded-lg hover:bg-muted"><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Page {page} of {meta.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Prev</button>
              <button disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
