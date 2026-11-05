"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Receipt, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn, formatINR } from "@/lib/utils";
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

const emptyLine = (): LineItem => ({
  item_type: "labor", description: "", quantity: 1, unit_price: 0, discount_percent: 0, gst_rate: 18,
});

const lineAmount = (i: LineItem) => {
  const base = Number(i.quantity) * Number(i.unit_price);
  return base - base * (Number(i.discount_percent) / 100);
};

const GST_RATES = [0, 5, 12, 18, 28];

// ─── Page ─────────────────────────────────────────────────────────────────────
function NewInvoiceForm() {
  const router = useRouter();
  const qc = useQueryClient();
  const params = useSearchParams();

  const jobCardId = params.get("job_card_id") ?? "";
  const [customerId, setCustomerId] = useState(params.get("customer_id") ?? "");
  const [vehicleId, setVehicleId] = useState(params.get("vehicle_id") ?? "");

  const today = new Date().toISOString().slice(0, 10);
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [invoiceType, setInvoiceType] = useState<"tax_invoice" | "non_gst_invoice">("tax_invoice");
  const [items, setItems] = useState<LineItem[]>([emptyLine()]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [roundOff, setRoundOff] = useState(0);
  const [notes, setNotes] = useState("");
  const [pickerRow, setPickerRow] = useState<number | null>(null);

  const isGst = invoiceType === "tax_invoice";

  // ── Lookups ──
  const { data: customers } = useQuery({
    queryKey: ["customers-all"],
    queryFn: () => api.get("/customers", { params: { limit: 100 } }).then((r) => r.data.data as any[]),
    enabled: !customerId,
  });
  const { data: customer } = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => api.get(`/customers/${customerId}`).then((r) => r.data.data),
    enabled: !!customerId,
  });
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-of", customerId],
    queryFn: () => api.get("/vehicles", { params: { owner_id: customerId, limit: 100 } }).then((r) => r.data.data as any[]),
    enabled: !!customerId,
  });
  const vehicle = useMemo(() => (vehicles ?? []).find((v: any) => v.id === vehicleId), [vehicles, vehicleId]);

  // Auto-pick the only vehicle if none chosen
  useEffect(() => {
    if (!vehicleId && vehicles?.length === 1) setVehicleId(vehicles[0].id);
  }, [vehicles, vehicleId]);

  // ── Totals (mirror backend: cgst = amount * (gst/2)/100, same for sgst) ──
  const subtotal = items.reduce((s, i) => s + lineAmount(i), 0);
  const taxable = subtotal - Number(discountAmount || 0);
  const totalTax = isGst ? items.reduce((s, i) => s + lineAmount(i) * (Number(i.gst_rate) / 100), 0) : 0;
  const grandTotal = taxable + totalTax + Number(roundOff || 0);

  // ── Mutation ──
  const mutation = useMutation({
    mutationFn: (body: object) => api.post("/invoices", body).then((r) => r.data),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      if (jobCardId) qc.invalidateQueries({ queryKey: ["invoices-for-jc", jobCardId] });
      toast.success(`Invoice ${res.data.invoice_number} created`);
      router.replace(`/billing/${res.data.id}`);
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed to create invoice"),
  });

  function updateLine(idx: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function applyCatalog(idx: number, sel: CatalogSelection | null) {
    if (sel) {
      updateLine(idx, {
        item_type: "part",
        description: sel.name,
        unit_price: sel.selling_price,
        hsn_code: sel.hsn_code,
      });
    }
    setPickerRow(null);
  }

  function submit() {
    if (!customerId) { toast.error("Select a customer"); return; }
    if (items.some((i) => !i.description.trim())) { toast.error("Every line item needs a description"); return; }
    if (items.some((i) => Number(i.unit_price) <= 0 || Number(i.quantity) <= 0)) { toast.error("Quantity and price must be greater than 0"); return; }

    const payloadItems = items.map((i, idx) => {
      const gst = isGst ? Number(i.gst_rate) : 0;
      return {
        item_type: i.item_type,
        inventory_item_id: i.inventory_item_id ?? null,
        description: i.description.trim(),
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        discount_percent: Number(i.discount_percent),
        amount: Number(lineAmount(i).toFixed(2)),
        hsn_code: i.hsn_code ?? null,
        gst_rate: gst,
        cgst_rate: gst / 2,
        sgst_rate: gst / 2,
        sort_order: idx,
      };
    });

    mutation.mutate({
      invoice_date: invoiceDate,
      invoice_type: invoiceType,
      job_card_id: jobCardId || null,
      customer_id: customerId,
      vehicle_id: vehicleId || null,
      items: payloadItems,
      discount_amount: Number(discountAmount || 0),
      round_off: Number(roundOff || 0),
      notes: notes || null,
    });
  }

  const inputCls = "w-full border border-input rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 rounded-xl border border-border hover:bg-muted">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Receipt className="w-6 h-6" /> New Invoice</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {jobCardId ? <>Direct bill for job card <Link href={`/job-cards/${jobCardId}`} className="text-primary hover:underline font-mono">{jobCardId.slice(0, 8)}…</Link></> : "Create a direct bill without an estimate"}
          </p>
        </div>
      </div>

      {/* Customer / Vehicle / Date / Type */}
      <div className="bg-card border border-border rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium">Customer *</label>
          {customerId && customer ? (
            <div className="mt-1.5 flex items-center justify-between border border-border rounded-xl px-3 py-2.5 bg-muted/30">
              <div>
                <p className="text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">{customer.mobile}{customer.city ? ` · ${customer.city}` : ""}</p>
              </div>
              {!params.get("customer_id") && (
                <button onClick={() => { setCustomerId(""); setVehicleId(""); }} className="text-xs text-primary hover:underline">Change</button>
              )}
            </div>
          ) : (
            <select value={customerId} onChange={(e) => { setCustomerId(e.target.value); setVehicleId(""); }}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">Select customer…</option>
              {(customers ?? []).map((c: any) => <option key={c.id} value={c.id}>{c.name} — {c.mobile}</option>)}
            </select>
          )}
        </div>
        <div>
          <label className="text-sm font-medium">Vehicle</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} disabled={!customerId}
            className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50">
            <option value="">{customerId ? "Select vehicle (optional)…" : "Select customer first"}</option>
            {(vehicles ?? []).map((v: any) => (
              <option key={v.id} value={v.id}>{v.registration_number} — {[v.make, v.model].filter(Boolean).join(" ")}</option>
            ))}
          </select>
          {vehicle && <p className="text-xs text-muted-foreground mt-1">{[vehicle.make, vehicle.model, vehicle.color].filter(Boolean).join(" · ")}</p>}
        </div>
        <div>
          <label className="text-sm font-medium">Invoice Date *</label>
          <input type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)}
            className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <div>
          <label className="text-sm font-medium">Invoice Type *</label>
          <div className="mt-1.5 grid grid-cols-2 gap-2">
            {([["tax_invoice", "GST Tax Invoice"], ["non_gst_invoice", "Non-GST Invoice"]] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => setInvoiceType(v)}
                className={cn("py-2.5 rounded-xl border text-sm font-medium transition-colors",
                  invoiceType === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="font-semibold">Line Items</h2>
          <button onClick={() => setItems((p) => [...p, emptyLine()])}
            className="text-sm text-primary hover:underline flex items-center gap-1"><Plus className="w-4 h-4" /> Add line</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-3 py-2 w-24">Type</th>
                <th className="text-left px-3 py-2 min-w-[260px]">Description</th>
                <th className="text-right px-3 py-2 w-20">Qty</th>
                <th className="text-right px-3 py-2 w-28">Price (₹)</th>
                <th className="text-right px-3 py-2 w-20">Disc%</th>
                {isGst && <th className="text-right px-3 py-2 w-20">GST%</th>}
                <th className="text-right px-3 py-2 w-28">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((item, idx) => (
                <tr key={idx} className="align-top">
                  <td className="px-2 py-2">
                    <select value={item.item_type} onChange={(e) => updateLine(idx, { item_type: e.target.value as LineItem["item_type"] })}
                      className="w-full border border-input rounded-lg px-1.5 py-1.5 text-xs bg-background focus:outline-none">
                      <option value="labor">Labour</option>
                      <option value="part">Part</option>
                      <option value="external">External</option>
                    </select>
                  </td>
                  <td className="px-2 py-2 space-y-1.5">
                    <input value={item.description} onChange={(e) => updateLine(idx, { description: e.target.value })}
                      placeholder={item.item_type === "labor" ? "e.g. General service labour" : "Part / item description"}
                      className={inputCls} />
                    {item.item_type !== "labor" && (
                      pickerRow === idx ? (
                        <CatalogPicker compact onSelect={(sel) => applyCatalog(idx, sel)} />
                      ) : (
                        <button type="button" onClick={() => setPickerRow(idx)} className="text-xs text-primary hover:underline">
                          Pick from parts / lubes catalog
                        </button>
                      )
                    )}
                    {item.hsn_code && <p className="text-[11px] text-muted-foreground">HSN {item.hsn_code}</p>}
                  </td>
                  <td className="px-2 py-2"><input type="number" min="0" step="0.001" value={item.quantity}
                    onChange={(e) => updateLine(idx, { quantity: parseFloat(e.target.value) || 0 })} className={cn(inputCls, "text-right")} /></td>
                  <td className="px-2 py-2"><input type="number" min="0" step="0.01" value={item.unit_price}
                    onChange={(e) => updateLine(idx, { unit_price: parseFloat(e.target.value) || 0 })} className={cn(inputCls, "text-right")} /></td>
                  <td className="px-2 py-2"><input type="number" min="0" max="100" value={item.discount_percent}
                    onChange={(e) => updateLine(idx, { discount_percent: parseFloat(e.target.value) || 0 })} className={cn(inputCls, "text-right")} /></td>
                  {isGst && (
                    <td className="px-2 py-2">
                      <select value={item.gst_rate} onChange={(e) => updateLine(idx, { gst_rate: Number(e.target.value) })}
                        className={cn(inputCls, "text-right")}>
                        {GST_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                  )}
                  <td className="px-3 py-2 text-right font-medium whitespace-nowrap pt-3">{formatINR(lineAmount(item))}</td>
                  <td className="px-2 py-2 pt-2.5">
                    {items.length > 1 && (
                      <button onClick={() => setItems((p) => p.filter((_, i) => i !== idx))} className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjustments + Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-sm font-medium">Discount (₹, on subtotal)</label>
            <input type="number" min="0" step="0.01" value={discountAmount} onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium">Round Off (₹, +/-)</label>
            <input type="number" step="0.01" value={roundOff} onChange={(e) => setRoundOff(parseFloat(e.target.value) || 0)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-sm font-medium">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Printed on the invoice"
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="bg-card border border-border rounded-2xl p-5 space-y-2 text-sm self-start">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
          {discountAmount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">- {formatINR(discountAmount)}</span></div>}
          <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span>{formatINR(taxable)}</span></div>
          {isGst && (
            <>
              <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatINR(totalTax / 2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatINR(totalTax / 2)}</span></div>
            </>
          )}
          {roundOff !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">Round off</span><span>{formatINR(roundOff)}</span></div>}
          <div className="flex justify-between font-bold text-base border-t border-border pt-3 mt-3">
            <span>Grand Total</span><span className="text-primary">{formatINR(grandTotal)}</span>
          </div>
          <button onClick={submit} disabled={mutation.isPending}
            className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            {mutation.isPending ? "Creating…" : "Create Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="h-64 bg-muted animate-pulse rounded-2xl" />}>
      <NewInvoiceForm />
    </Suspense>
  );
}
