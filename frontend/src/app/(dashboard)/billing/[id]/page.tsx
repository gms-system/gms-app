"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Printer, CreditCard, CheckCircle2, AlertCircle, Share2 } from "lucide-react";
import api from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { InvoicePrint } from "@/components/invoice-print";
import { shareOnWhatsApp, openPrintableCopy } from "@/lib/share";
import { isNativeApp } from "@/lib/native";

const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "credit"] as const;

// ─── Payment Modal ─────────────────────────────────────────────────────────────
function PaymentModal({ invoiceId, amountDue, onClose }: { invoiceId: string; amountDue: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(amountDue.toFixed(2));
  const [mode, setMode] = useState<string>("cash");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const today = new Date().toISOString().slice(0, 10);

  const mutation = useMutation({
    mutationFn: (body: object) => api.post(`/invoices/${invoiceId}/payments`, body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success("Payment recorded successfully");
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Payment failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Record Payment</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Amount (₹) *</label>
            <input type="number" step="0.01" min="0.01" max={amountDue} value={amount}
              onChange={e => setAmount(e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            <p className="text-xs text-muted-foreground mt-1">Outstanding: {formatINR(amountDue)}</p>
          </div>
          <div>
            <label className="text-sm font-medium">Payment Mode *</label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {PAYMENT_MODES.map(m => (
                <button key={m} onClick={() => setMode(m)}
                  className={cn("px-3 py-2 text-sm rounded-xl border capitalize font-medium transition-colors",
                    mode === m ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                  {m === "bank_transfer" ? "Bank" : m === "upi" ? "UPI" : m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
          {(mode === "upi" || mode === "card" || mode === "bank_transfer") && (
            <div>
              <label className="text-sm font-medium">Reference / UTR Number</label>
              <input value={ref} onChange={e => setRef(e.target.value)}
                placeholder={mode === "upi" ? "UPI Transaction ID" : mode === "card" ? "Last 4 digits / Auth code" : "UTR / NEFT reference"}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">Notes</label>
            <input value={notes} onChange={e => setNotes(e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button
            onClick={() => mutation.mutate({ payment_date: today, amount: parseFloat(amount), payment_mode: mode, reference_number: ref || null, notes: notes || null })}
            disabled={mutation.isPending || !amount || parseFloat(amount) <= 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <CreditCard className="w-4 h-4" />
            {mutation.isPending ? "Processing..." : "Record Payment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── WhatsApp share helper ─────────────────────────────────────────────────────
function buildWhatsAppMessage(inv: any, garageName: string, link: string): string {
  const paid = Number(inv.amount_due) <= 0;
  const lines = [
    `*${garageName} — Invoice*`,
    ``,
    `Invoice No: *${inv.invoice_number}*`,
    `Date: ${inv.invoice_date}`,
    `Customer: ${inv.customer_name || "—"}`,
    `Vehicle: ${inv.vehicle_reg || "—"}`,
    ``,
    `Amount: *${Number(inv.grand_total).toLocaleString("en-IN", { style: "currency", currency: "INR" })}*`,
    paid
      ? `Status: ✅ *PAID*`
      : `Amount Due: *${Number(inv.amount_due).toLocaleString("en-IN", { style: "currency", currency: "INR" })}*`,
    ``,
    `View / download your invoice:`,
    link,
    ``,
    `Thank you for choosing us! 🙏`,
  ];
  return lines.join("\n");
}

// ─── Invoice Detail Page ───────────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [showPayment, setShowPayment] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => api.get(`/invoices/${id}`).then(r => r.data.data),
    enabled: !!id,
  });

  const { data: settings } = useQuery({
    queryKey: ["garage-settings"],
    queryFn: () => api.get("/settings/garage").then(r => r.data.data),
    staleTime: 10 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 bg-muted animate-pulse rounded-xl" />
      ))}
    </div>
  );

  if (isError || !data) return (
    <div className="text-center py-16">
      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">Invoice not found</p>
      <button onClick={() => router.back()} className="mt-4 text-primary hover:underline text-sm">Go back</button>
    </div>
  );

  const inv = data;
  const isPaid = inv.amount_due <= 0 && !inv.is_cancelled;
  const isPartial = inv.amount_due > 0 && inv.amount_paid > 0 && !inv.is_cancelled;

  const handlePrint = () => isNativeApp()
    ? openPrintableCopy("invoice", id).catch(() => toast.error("Could not open the printable copy"))
    : window.print();

  const handleWhatsApp = () =>
    shareOnWhatsApp("invoice", id, (link, { garageName }) => buildWhatsAppMessage(inv, garageName, link))
      .catch(() => toast.error("Could not create the share link"));

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Print-only A4 invoice — hidden on screen, shown on print */}
      {data && <InvoicePrint inv={inv} settings={settings} />}

      {showPayment && <PaymentModal invoiceId={id} amountDue={inv.amount_due} onClose={() => setShowPayment(false)} />}

      {/* ── Header ── */}
      <div className="flex items-start justify-between no-print">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-xl border border-border hover:bg-muted">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold font-mono">{inv.invoice_number}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{formatDate(inv.invoice_date)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* WhatsApp share */}
          <button onClick={handleWhatsApp}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-border hover:bg-green-50 hover:border-green-300 hover:text-green-700 dark:hover:bg-green-900/20 transition-colors">
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
          {/* Print / PDF */}
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl border border-border hover:bg-muted">
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print / PDF</span>
          </button>
          {/* Record payment */}
          {!isPaid && !inv.is_cancelled && (
            <button onClick={() => setShowPayment(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Record Payment</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Status banners ── */}
      {inv.is_cancelled && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-red-700 dark:text-red-400 text-sm no-print">
          <AlertCircle className="w-4 h-4" /> Cancelled. {inv.cancellation_reason && `Reason: ${inv.cancellation_reason}`}
        </div>
      )}
      {isPaid && (
        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 text-green-700 dark:text-green-400 text-sm no-print">
          <CheckCircle2 className="w-4 h-4" /> Fully paid
        </div>
      )}
      {isPartial && (
        <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3 text-yellow-700 dark:text-yellow-400 text-sm no-print">
          <AlertCircle className="w-4 h-4" /> Partially paid — {formatINR(inv.amount_due)} remaining
        </div>
      )}

      {/* ── On-screen invoice card ── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden no-print">
        {/* Garage letterhead (screen version) */}
        {settings && (
          <div className="px-6 py-4 bg-primary/5 border-b border-border flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-primary">{settings.garage_name}</p>
              {settings.address && <p className="text-xs text-muted-foreground">{settings.address}</p>}
              {(settings.city || settings.state) && (
                <p className="text-xs text-muted-foreground">{[settings.city, settings.state].filter(Boolean).join(", ")}</p>
              )}
              {settings.mobile && <p className="text-xs text-muted-foreground">Ph: {settings.mobile}</p>}
              {settings.gstin && <p className="text-xs font-medium mt-1">GSTIN: {settings.gstin}</p>}
            </div>
            <div className="text-right shrink-0">
              <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold",
                isPaid ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                : inv.is_cancelled ? "bg-red-100 text-red-800"
                : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200")}>
                {isPaid ? "PAID" : inv.is_cancelled ? "CANCELLED" : "UNPAID"}
              </span>
            </div>
          </div>
        )}

        {/* Customer + vehicle */}
        <div className="grid grid-cols-2 gap-6 p-6 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Bill To</p>
            <p className="font-semibold">{inv.customer_name || "—"}</p>
            {inv.customer_mobile && <p className="text-xs text-muted-foreground">{inv.customer_mobile}</p>}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Vehicle</p>
            <p className="font-semibold">{inv.vehicle_reg || "—"}</p>
            {(inv.vehicle_make || inv.vehicle_model) && (
              <p className="text-xs text-muted-foreground">{[inv.vehicle_make, inv.vehicle_model].filter(Boolean).join(" ")}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Invoice Type</p>
            <p className="capitalize">{inv.invoice_type?.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Invoice Date</p>
            <p>{formatDate(inv.invoice_date)}</p>
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <th className="text-left px-6 py-3">#</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-right px-4 py-3">Rate</th>
                <th className="text-right px-4 py-3">Disc%</th>
                <th className="text-right px-4 py-3">GST%</th>
                <th className="text-right px-6 py-3">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(inv.items ?? []).map((item: any, idx: number) => (
                <tr key={idx}>
                  <td className="px-6 py-3 text-muted-foreground">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{item.description}</div>
                    {item.hsn_code && <div className="text-xs text-muted-foreground">HSN: {item.hsn_code}</div>}
                    <div className="text-xs text-muted-foreground capitalize">{item.item_type}</div>
                  </td>
                  <td className="px-4 py-3 text-right">{item.quantity}</td>
                  <td className="px-4 py-3 text-right">{formatINR(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right">{item.discount_percent}%</td>
                  <td className="px-4 py-3 text-right">{item.gst_rate}%</td>
                  <td className="px-6 py-3 text-right font-medium">{formatINR(item.amount)}</td>
                </tr>
              ))}
              {(!inv.items || inv.items.length === 0) && (
                <tr><td colSpan={7} className="px-6 py-6 text-center text-muted-foreground">No line items</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="flex justify-end border-t border-border">
          <div className="w-72 p-6 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(inv.subtotal)}</span></div>
            {inv.discount_amount > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Discount</span><span className="text-red-600">- {formatINR(inv.discount_amount)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Taxable Amount</span><span>{formatINR(inv.taxable_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">CGST</span><span>{formatINR(inv.cgst_amount)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">SGST</span><span>{formatINR(inv.sgst_amount)}</span></div>
            {inv.round_off !== 0 && <div className="flex justify-between"><span className="text-muted-foreground">Round off</span><span>{formatINR(inv.round_off)}</span></div>}
            <div className="flex justify-between font-bold text-base border-t border-border pt-2">
              <span>Grand Total</span><span>{formatINR(inv.grand_total)}</span>
            </div>
            <div className="flex justify-between text-green-600 font-medium">
              <span>Amount Paid</span><span>{formatINR(inv.amount_paid)}</span>
            </div>
            <div className={cn("flex justify-between font-semibold", inv.amount_due > 0 ? "text-red-600" : "text-muted-foreground")}>
              <span>Amount Due</span><span>{formatINR(inv.amount_due)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Payment History ── */}
      {inv.payments && inv.payments.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden no-print">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold">Payment History</h2>
          </div>
          <div className="divide-y divide-border">
            {inv.payments.map((p: any) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-4">
                <div>
                  <p className="font-medium capitalize">{p.payment_mode.replace("_", " ")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatDate(p.payment_date)}
                    {p.reference_number && ` · Ref: ${p.reference_number}`}
                    {p.notes && ` · ${p.notes}`}
                  </p>
                </div>
                <span className="font-semibold text-green-600">{formatINR(p.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
