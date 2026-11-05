"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, ChevronRight, CheckCircle2, XCircle, FileText, ArrowRight, Share2 } from "lucide-react";
import api from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { CatalogPicker, type CatalogSelection } from "@/components/catalog-picker";

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  item_type: "labor" | "part" | "external";
  description: string;
  inventory_item_id?: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  gst_rate: number;
  hsn_code?: string;
}

interface Estimate {
  id: string;
  estimate_number: string;
  job_card_id: string;
  version: number;
  status: string;
  approval_status: string;
  subtotal: number;
  discount_amount: number;
  taxable_amount: number;
  cgst_amount: number;
  sgst_amount: number;
  total_tax: number;
  grand_total: number;
  notes?: string;
  valid_until?: string;
  created_at: string;
  items?: LineItem[];
}

// ─── Status badge ──────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  pending_approval: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium capitalize", STATUS_STYLES[status] ?? STATUS_STYLES.draft)}>
      {status.replace("_", " ")}
    </span>
  );
}

// ─── Empty line item ───────────────────────────────────────────────────────────
const emptyLine = (): LineItem => ({
  item_type: "labor",
  description: "",
  quantity: 1,
  unit_price: 0,
  discount_percent: 0,
  gst_rate: 18,
});

// ─── Line amount helper ────────────────────────────────────────────────────────
function lineAmount(item: LineItem) {
  const base = item.quantity * item.unit_price;
  const disc = base * (item.discount_percent / 100);
  return base - disc;
}

// ─── Create Estimate Modal ─────────────────────────────────────────────────────
function CreateEstimateModal({ onClose, prefillJobCardId }: { onClose: () => void; prefillJobCardId?: string }) {
  const qc = useQueryClient();
  const [jobCardId, setJobCardId] = useState(prefillJobCardId ?? "");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountValue, setDiscountValue] = useState(0);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [pickerRow, setPickerRow] = useState<number | null>(null);

  const subtotal = items.reduce((s, i) => s + lineAmount(i), 0);
  const discAmt = discountType === "percent" ? subtotal * discountValue / 100 : discountValue;
  const taxable = subtotal - discAmt;
  const totalTax = items.reduce((s, i) => s + lineAmount(i) * i.gst_rate / 100, 0);
  const grandTotal = taxable + totalTax;

  const mutation = useMutation({
    mutationFn: (body: object) => api.post("/estimates", body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["estimates"] });
      toast.success("Estimate created");
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to create estimate"),
  });

  function updateLine(idx: number, field: keyof LineItem, value: unknown) {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  }

  // Fill a line from the parts/lubes catalog ("Others" leaves it for manual entry)
  function applyCatalog(idx: number, sel: CatalogSelection | null) {
    if (sel) {
      setItems(prev => prev.map((item, i) => i === idx
        ? { ...item, item_type: "part", description: sel.name, unit_price: sel.selling_price, hsn_code: sel.hsn_code }
        : item));
    }
    setPickerRow(null);
  }

  function submit() {
    if (!jobCardId.trim()) { toast.error("Job Card ID is required"); return; }
    if (items.some(i => !i.description.trim())) { toast.error("All line items need a description"); return; }
    mutation.mutate({
      job_card_id: jobCardId,
      items: items.map(i => ({ ...i, quantity: Number(i.quantity), unit_price: Number(i.unit_price), discount_percent: Number(i.discount_percent), gst_rate: Number(i.gst_rate) })),
      discount_type: discountType,
      discount_value: discountValue,
      notes,
      valid_until: validUntil || null,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-4xl mx-4 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">New Estimate</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-6">
          {/* Job Card ID */}
          <div>
            <label className="text-sm font-medium">Job Card ID *</label>
            <input value={jobCardId} onChange={e => setJobCardId(e.target.value)}
              placeholder="Paste the Job Card ID"
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring font-mono" />
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Line Items</label>
              <button onClick={() => setItems(p => [...p, emptyLine()])}
                className="text-xs text-primary hover:underline flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add line
              </button>
            </div>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50 text-muted-foreground">
                    <th className="text-left px-3 py-2 w-20">Type</th>
                    <th className="text-left px-3 py-2">Description</th>
                    <th className="text-right px-3 py-2 w-16">Qty</th>
                    <th className="text-right px-3 py-2 w-24">Price (₹)</th>
                    <th className="text-right px-3 py-2 w-16">Disc%</th>
                    <th className="text-right px-3 py-2 w-16">GST%</th>
                    <th className="text-right px-3 py-2 w-24">Amount</th>
                    <th className="px-2 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-2">
                        <select value={item.item_type} onChange={e => updateLine(idx, "item_type", e.target.value)}
                          className="w-full border border-input rounded-lg px-1.5 py-1.5 text-xs bg-background focus:outline-none">
                          <option value="labor">Labor</option>
                          <option value="part">Part</option>
                          <option value="external">External</option>
                        </select>
                      </td>
                      <td className="px-2 py-2 space-y-1.5">
                        <input value={item.description} onChange={e => updateLine(idx, "description", e.target.value)}
                          placeholder="Description"
                          className="w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                        {item.item_type !== "labor" && (
                          pickerRow === idx
                            ? <CatalogPicker compact onSelect={sel => applyCatalog(idx, sel)} />
                            : <button type="button" onClick={() => setPickerRow(idx)} className="text-xs text-primary hover:underline">
                                Pick from parts / lubes catalog
                              </button>
                        )}
                      </td>
                      {(["quantity", "unit_price", "discount_percent", "gst_rate"] as const).map(field => (
                        <td key={field} className="px-2 py-2 text-right">
                          <input type="number" min="0" value={item[field]}
                            onChange={e => updateLine(idx, field, parseFloat(e.target.value) || 0)}
                            className="w-full border border-input rounded-lg px-2 py-1.5 text-sm text-right bg-background focus:outline-none focus:ring-1 focus:ring-ring" />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right font-medium text-sm">
                        {formatINR(lineAmount(item))}
                      </td>
                      <td className="px-2 py-2">
                        {items.length > 1 && (
                          <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))}
                            className="text-muted-foreground hover:text-destructive text-xs">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discount + Summary */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Discount</label>
                <div className="flex gap-2 mt-1.5">
                  <select value={discountType} onChange={e => setDiscountType(e.target.value as any)}
                    className="border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none">
                    <option value="flat">Flat (₹)</option>
                    <option value="percent">Percent (%)</option>
                  </select>
                  <input type="number" min="0" value={discountValue} onChange={e => setDiscountValue(parseFloat(e.target.value) || 0)}
                    className="flex-1 border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Valid Until</label>
                <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)}
                  className="mt-1.5 w-full border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  className="mt-1.5 w-full border border-input rounded-xl px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            </div>
            <div className="bg-muted/40 rounded-xl p-4 space-y-2 text-sm self-start">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">-{formatINR(discAmt)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Taxable</span><span>{formatINR(taxable)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">GST</span><span>{formatINR(totalTax)}</span></div>
              <div className="flex justify-between font-semibold text-base border-t border-border pt-2 mt-2">
                <span>Grand Total</span><span className="text-primary">{formatINR(grandTotal)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={mutation.isPending}
            className="px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? "Creating..." : "Create Estimate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Estimate Detail Panel ─────────────────────────────────────────────────────
function EstimateDetailPanel({ estimate, onClose }: { estimate: Estimate; onClose: () => void }) {
  const qc = useQueryClient();

  const { data: detail } = useQuery({
    queryKey: ["estimate", estimate.id],
    queryFn: () => api.get(`/estimates/${estimate.id}`).then(r => r.data.data),
    initialData: estimate,
  });

  const approveMut = useMutation({
    mutationFn: (approved: boolean) => api.patch(`/estimates/${estimate.id}/approval`, { approved }).then(r => r.data),
    onSuccess: (_, approved) => { qc.invalidateQueries({ queryKey: ["estimates"] }); qc.invalidateQueries({ queryKey: ["estimate", estimate.id] }); toast.success(approved ? "Estimate approved" : "Estimate rejected"); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Action failed"),
  });

  const sendMut = useMutation({
    mutationFn: () => api.patch(`/estimates/${estimate.id}/send`).then(r => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["estimates"] }); toast.success("Estimate marked as sent"); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Action failed"),
  });

  const convertMut = useMutation({
    mutationFn: () => api.post(`/estimates/${estimate.id}/convert-to-invoice`).then(r => r.data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["estimates"] }); toast.success(`Invoice ${res.data.invoice_number} created`); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Conversion failed"),
  });

  const d = detail ?? estimate;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl mx-4 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="text-lg font-semibold font-mono">{d.estimate_number}</h2>
            <div className="mt-1 flex gap-2">
              <StatusBadge status={d.status} />
              {d.approval_status !== "pending" && <StatusBadge status={d.approval_status} />}
            </div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Line Items */}
          {d.items && d.items.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Line Items</p>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted/50 text-muted-foreground">
                      <th className="text-left px-3 py-2">Description</th>
                      <th className="text-right px-3 py-2">Qty</th>
                      <th className="text-right px-3 py-2">Rate</th>
                      <th className="text-right px-3 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {d.items.map((item: any, idx: number) => (
                      <tr key={idx}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{item.description}</div>
                          <div className="text-xs text-muted-foreground capitalize">{item.item_type} · GST {item.gst_rate}%</div>
                        </td>
                        <td className="px-3 py-2 text-right">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">{formatINR(item.unit_price)}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatINR(item.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Totals */}
          <div className="bg-muted/40 rounded-xl p-4 space-y-1.5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(d.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">-{formatINR(d.discount_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatINR(d.cgst_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatINR(d.sgst_amount)}</span></div>
            <div className="flex justify-between font-semibold text-base border-t border-border pt-2">
              <span>Grand Total</span><span className="text-primary">{formatINR(d.grand_total)}</span>
            </div>
          </div>

          {d.notes && <p className="text-sm text-muted-foreground bg-muted/40 rounded-xl p-3">{d.notes}</p>}
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 px-6 py-4 border-t border-border">
          {d.status === "draft" && (
            <button onClick={() => sendMut.mutate()} disabled={sendMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">
              <FileText className="w-4 h-4" /> Mark as Sent
            </button>
          )}
          {(d.status === "sent" || d.status === "draft") && d.approval_status === "pending" && (
            <>
              <button onClick={() => approveMut.mutate(true)} disabled={approveMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-green-600 text-white hover:bg-green-700">
                <CheckCircle2 className="w-4 h-4" /> Approve
              </button>
              <button onClick={() => approveMut.mutate(false)} disabled={approveMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </>
          )}
          {d.approval_status === "approved" && d.status !== "converted" && (
            <button onClick={() => convertMut.mutate()} disabled={convertMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <ArrowRight className="w-4 h-4" /> Convert to Invoice
            </button>
          )}
          {/* WhatsApp share */}
          <button onClick={() => {
            const msg = [
              `*Estimate from ${d.garage_name || "Garage"}*`,
              ``,
              `Estimate No: *${d.estimate_number}*`,
              `Date: ${d.estimate_date}`,
              ``,
              `Amount: *${Number(d.grand_total).toLocaleString("en-IN", { style: "currency", currency: "INR" })}*`,
              `Valid until: ${d.valid_until ?? "—"}`,
              ``,
              `Please approve or reject this estimate. Thank you! 🙏`,
            ].join("\n");
            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
          }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-xl border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={onClose} className="ml-auto px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">Close</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EstimatesPage() {
  const searchParams = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [prefillJobCardId, setPrefillJobCardId] = useState<string | undefined>(undefined);
  const [selected, setSelected] = useState<Estimate | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  // Auto-open create modal if navigated from job card
  useEffect(() => {
    const newParam = searchParams.get("new");
    const jcId = searchParams.get("job_card_id");
    if (newParam === "1" && jcId) {
      setPrefillJobCardId(jcId);
      setShowCreate(true);
    }
  }, [searchParams]);

  const { data, isLoading } = useQuery({
    queryKey: ["estimates", search, statusFilter, page],
    queryFn: () => api.get("/estimates", { params: { page, limit: 20, status: statusFilter || undefined } }).then(r => r.data).catch(() => ({ data: [], meta: { total: 0, pages: 1 } })),
    placeholderData: prev => prev,
  });

  const estimates: Estimate[] = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {showCreate && <CreateEstimateModal onClose={() => { setShowCreate(false); setPrefillJobCardId(undefined); }} prefillJobCardId={prefillJobCardId} />}
      {selected && <EstimateDetailPanel estimate={selected} onClose={() => setSelected(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estimates</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} estimates</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Estimate
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search estimates..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-input rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none">
          <option value="">All Statuses</option>
          {["draft","sent","pending_approval","approved","rejected","converted"].map(s => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Estimate #", "Job Card", "Version", "Status", "Approval", "Total", "Valid Until", ""].map(h => (
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
              ) : estimates.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                  No estimates found. Create one from a job card.
                </td></tr>
              ) : (
                estimates.map(est => (
                  <tr key={est.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => setSelected(est)}>
                    <td className="px-4 py-3 font-mono text-sm font-medium">{est.estimate_number}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{est.job_card_id.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-center text-muted-foreground">v{est.version}</td>
                    <td className="px-4 py-3"><StatusBadge status={est.status} /></td>
                    <td className="px-4 py-3"><StatusBadge status={est.approval_status} /></td>
                    <td className="px-4 py-3 font-semibold">{formatINR(est.grand_total)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{est.valid_until ? formatDate(est.valid_until) : "—"}</td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
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
