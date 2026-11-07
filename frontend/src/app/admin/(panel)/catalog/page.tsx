"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, X, Loader2, Eye, EyeOff } from "lucide-react";
import api from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";

type Kind = "car" | "two_wheeler" | "spare_part" | "lubricant";

const TABS: { kind: Kind; label: string }[] = [
  { kind: "car", label: "Cars (make / models)" },
  { kind: "two_wheeler", label: "2-Wheelers (make / models)" },
  { kind: "spare_part", label: "Spare Parts" },
  { kind: "lubricant", label: "Lubes / Oils" },
];

type Field = { key: string; label: string; type?: "number" | "models"; placeholder?: string };
const FIELDS: Record<Kind, Field[]> = {
  car: [
    { key: "make", label: "Make", placeholder: "Maruti Suzuki" },
    { key: "models", label: "Models (comma separated)", type: "models", placeholder: "Alto, Swift, Dzire" },
  ],
  two_wheeler: [
    { key: "make", label: "Make", placeholder: "Honda" },
    { key: "models", label: "Models (comma separated)", type: "models", placeholder: "Activa 6G, Shine" },
  ],
  spare_part: [
    { key: "vehicle", label: "Vehicle", placeholder: "Maruti Suzuki Alto" },
    { key: "part", label: "Part name", placeholder: "Clutch Plate" },
    { key: "cost_price", label: "Cost price (₹)", type: "number" },
    { key: "selling_price", label: "Selling price (₹)", type: "number" },
    { key: "hsn_code", label: "HSN code", placeholder: "8708" },
  ],
  lubricant: [
    { key: "brand", label: "Brand", placeholder: "Castrol" },
    { key: "name", label: "Product name", placeholder: "Castrol GTX" },
    { key: "grade", label: "Grade", placeholder: "10W-30" },
    { key: "type", label: "Type", placeholder: "Engine Oil" },
    { key: "pack", label: "Pack size", placeholder: "3.5 L" },
    { key: "cost_price", label: "Cost price (₹)", type: "number" },
    { key: "selling_price", label: "Selling price (₹)", type: "number" },
    { key: "hsn_code", label: "HSN code", placeholder: "2710" },
  ],
};

function summary(kind: Kind, d: any): { title: string; sub: string } {
  if (kind === "car" || kind === "two_wheeler") return { title: d.make, sub: `${d.models?.length ?? 0} models · ${(d.models ?? []).slice(0, 6).join(", ")}${d.models?.length > 6 ? "…" : ""}` };
  if (kind === "spare_part") return { title: `${d.part} — ${d.vehicle}`, sub: `Cost ${formatINR(d.cost_price)} · Sell ${formatINR(d.selling_price)}${d.hsn_code ? ` · HSN ${d.hsn_code}` : ""}` };
  return { title: `${d.brand} ${d.name} ${d.grade}`, sub: `${d.type} · ${d.pack} · Cost ${formatINR(d.cost_price)} · Sell ${formatINR(d.selling_price)}` };
}

function ItemModal({ kind, item, onClose }: { kind: Kind; item?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>(() =>
    Object.fromEntries(FIELDS[kind].map((f) => {
      const v = item?.data?.[f.key];
      return [f.key, f.type === "models" ? (v ?? []).join(", ") : v != null ? String(v) : ""];
    })));

  const save = useMutation({
    mutationFn: (): Promise<unknown> => {
      const data: any = {};
      for (const f of FIELDS[kind]) {
        const v = form[f.key].trim();
        if (f.type === "models") data[f.key] = v.split(",").map((s) => s.trim()).filter(Boolean);
        else if (f.type === "number") data[f.key] = Number(v || 0);
        else if (v) data[f.key] = v;
      }
      return item ? api.patch(`/admin/catalog/${item.id}`, { data }) : api.post("/admin/catalog", { kind, data });
    },
    onSuccess: () => {
      toast.success(item ? "Updated — apps pick it up on their next daily sync" : "Added — apps pick it up on their next daily sync");
      qc.invalidateQueries({ queryKey: ["admin-catalog"] });
      onClose();
    },
    onError: (e: any) => toast.error(typeof e.response?.data?.detail === "string" ? e.response.data.detail : "Please fill all required fields"),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">{item ? "Edit" : "Add"} — {TABS.find((t) => t.kind === kind)?.label}</h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {FIELDS[kind].map((f) => (
            <label key={f.key} className={cn("text-sm space-y-1", (f.type === "models" || ["make", "part", "name"].includes(f.key)) && "col-span-2")}>
              <span className="text-muted-foreground">{f.label}</span>
              {f.type === "models" ? (
                <textarea rows={4} value={form[f.key]} placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" />
              ) : (
                <input type={f.type === "number" ? "number" : "text"} min={0} value={form[f.key]} placeholder={f.placeholder}
                  onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  className="w-full px-3 py-2 border border-input rounded-lg bg-background" />
              )}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={() => save.mutate()} disabled={save.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminCatalogPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("spare_part");
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ item?: any } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-catalog", kind, search],
    queryFn: () => api.get("/admin/catalog", { params: { kind, search: search || undefined } }).then((r) => r.data),
  });

  const toggle = useMutation({
    mutationFn: (it: any) => api.patch(`/admin/catalog/${it.id}`, { is_active: !it.is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-catalog"] }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/catalog/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["admin-catalog"] }); },
  });

  const items: any[] = data?.data ?? [];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Catalog</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Vehicle makes/models, spare parts and lubes shown in every garage&apos;s dropdowns. Apps sync once a day.
            {data?.version && <span className="ml-2 font-mono text-xs">v{data.version}</span>}
          </p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((t) => (
          <button key={t.kind} onClick={() => { setKind(t.kind); setSearch(""); }}
            className={cn("px-3 py-1.5 text-sm rounded-lg border font-medium",
              kind === t.kind ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
          className="w-full pl-9 pr-3 py-2 text-sm border border-input rounded-lg bg-background" />
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border">
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No entries.</p>
        ) : items.map((it) => {
          const s = summary(kind, it.data);
          return (
            <div key={it.id} className={cn("flex items-center gap-3 px-4 py-3", !it.is_active && "opacity-50")}>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{s.title}{!it.is_active && " (hidden)"}</p>
                <p className="text-xs text-muted-foreground truncate">{s.sub}</p>
              </div>
              <button title={it.is_active ? "Hide from apps" : "Show in apps"} onClick={() => toggle.mutate(it)} className="p-2 rounded-lg hover:bg-muted">
                {it.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </button>
              <button title="Edit" onClick={() => setModal({ item: it })} className="p-2 rounded-lg hover:bg-muted"><Edit2 className="w-4 h-4" /></button>
              <button title="Delete" onClick={() => { if (confirm(`Delete "${s.title}"?`)) remove.mutate(it.id); }}
                className="p-2 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
      </div>

      {modal && <ItemModal kind={kind} item={modal.item} onClose={() => setModal(null)} />}
    </div>
  );
}
