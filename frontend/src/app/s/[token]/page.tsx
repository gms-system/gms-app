"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Download, Loader2, MapPin, Phone } from "lucide-react";
import { cn, formatDate, formatINR, JOB_CARD_STATUS_LABELS, JOB_CARD_STATUS_COLORS } from "@/lib/utils";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

/** Customer-facing view of a shared invoice / job card. No login required. */
export default function SharedDocumentPage() {
  const { token } = useParams<{ token: string }>();
  const [doc, setDoc] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/v1/public/share/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.detail || "This link is invalid or has expired");
        setDoc(body.data);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <AlertCircle className="w-12 h-12 text-muted-foreground mb-3" />
      <p className="font-medium">{error}</p>
      <p className="text-sm text-muted-foreground mt-1">Please ask the garage to send a new link.</p>
    </div>
  );
  if (!doc) return (
    <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  );

  const g = doc.garage;
  const isInvoice = doc.doc === "invoice";
  const address = [g.address, g.city, g.state].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-muted/40 py-6 px-4 print:bg-white print:p-0">
      <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-sm overflow-hidden print:border-0 print:shadow-none">
        {/* Garage header */}
        <div className="bg-primary text-primary-foreground px-6 py-5">
          <h1 className="text-xl font-bold">{g.name}</h1>
          <div className="text-sm opacity-90 mt-1 space-y-0.5">
            {address && <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{address}</p>}
            {g.mobile && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /><a href={`tel:${g.mobile}`}>{g.mobile}</a></p>}
            {g.gstin && <p>GSTIN: {g.gstin}</p>}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{isInvoice ? "Invoice" : "Job Card"}</p>
              <p className="text-lg font-bold font-mono">{doc.number}</p>
              {doc.date && <p className="text-sm text-muted-foreground">{formatDate(doc.date)}</p>}
            </div>
            {isInvoice ? (
              doc.is_cancelled ? <span className="text-xs px-2 py-1 rounded-md bg-red-100 text-red-700 font-medium">Cancelled</span>
              : doc.amount_due <= 0
                ? <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-green-100 text-green-800 font-medium"><CheckCircle2 className="w-3.5 h-3.5" />Paid</span>
                : <span className="text-xs px-2 py-1 rounded-md bg-amber-100 text-amber-800 font-medium">Due {formatINR(doc.amount_due)}</span>
            ) : (
              <span className={cn("text-xs px-2 py-1 rounded-md font-medium", JOB_CARD_STATUS_COLORS[doc.status])}>
                {JOB_CARD_STATUS_LABELS[doc.status] ?? doc.status}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Customer</p>
              <p className="font-medium">{doc.customer_name || "—"}</p>
            </div>
            <div className="rounded-xl bg-muted/60 p-3">
              <p className="text-xs text-muted-foreground">Vehicle</p>
              <p className="font-medium font-mono">{doc.vehicle?.registration_number || "—"}</p>
              {doc.vehicle && <p className="text-xs text-muted-foreground">{doc.vehicle.make} {doc.vehicle.model}</p>}
            </div>
          </div>

          {isInvoice ? <InvoiceBody doc={doc} /> : <JobCardBody doc={doc} />}

          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-border hover:bg-muted text-sm font-medium print:hidden">
            <Download className="w-4 h-4" /> Download / Print PDF
          </button>
        </div>
      </div>
      <p className="text-center text-xs text-muted-foreground mt-4 print:hidden">Powered by GMS — Garage Management System</p>
    </div>
  );
}

function InvoiceBody({ doc }: { doc: any }) {
  const row = (label: string, value: number, bold = false) => (
    <div className={cn("flex justify-between", bold && "font-bold text-base pt-2 border-t border-border")}>
      <span>{label}</span><span>{formatINR(value)}</span>
    </div>
  );
  return (
    <>
      <div className="border border-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr><th className="text-left p-2.5">Item</th><th className="text-right p-2.5">Qty</th><th className="text-right p-2.5">Amount</th></tr>
          </thead>
          <tbody>
            {doc.items.map((it: any, i: number) => (
              <tr key={i} className="border-t border-border">
                <td className="p-2.5">{it.description}<div className="text-xs text-muted-foreground">{formatINR(it.unit_price)} each{it.gst_rate ? ` · GST ${it.gst_rate}%` : ""}</div></td>
                <td className="p-2.5 text-right">{it.quantity}</td>
                <td className="p-2.5 text-right">{formatINR(it.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-1.5 text-sm">
        {row("Subtotal", doc.subtotal)}
        {doc.discount_amount > 0 && row("Discount", -doc.discount_amount)}
        {doc.cgst_amount > 0 && row("CGST", doc.cgst_amount)}
        {doc.sgst_amount > 0 && row("SGST", doc.sgst_amount)}
        {doc.round_off !== 0 && row("Round off", doc.round_off)}
        {row("Grand Total", doc.grand_total, true)}
        {doc.amount_paid > 0 && row("Paid", doc.amount_paid)}
        {doc.amount_due > 0 && row("Balance Due", doc.amount_due)}
      </div>
    </>
  );
}

function JobCardBody({ doc }: { doc: any }) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {doc.expected_delivery_date && (
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Expected delivery</p>
            <p className="font-medium">{formatDate(doc.expected_delivery_date)}</p>
          </div>
        )}
        {doc.odometer_in != null && (
          <div className="rounded-xl bg-muted/60 p-3">
            <p className="text-xs text-muted-foreground">Odometer (in)</p>
            <p className="font-medium">{Number(doc.odometer_in).toLocaleString("en-IN")} km</p>
          </div>
        )}
      </div>
      {doc.customer_complaint && (
        <div className="text-sm">
          <p className="text-xs text-muted-foreground mb-1">Reported issue</p>
          <p className="rounded-xl bg-muted/60 p-3 whitespace-pre-line">{doc.customer_complaint}</p>
        </div>
      )}
      <div>
        <p className="text-xs text-muted-foreground mb-2">Progress</p>
        <ol className="space-y-2">
          {doc.status_history.map((h: any, i: number) => (
            <li key={i} className="flex items-center gap-3 text-sm">
              <span className={cn("w-2.5 h-2.5 rounded-full", i === doc.status_history.length - 1 ? "bg-primary" : "bg-muted-foreground/40")} />
              <span className="font-medium">{JOB_CARD_STATUS_LABELS[h.status] ?? h.status}</span>
              <span className="text-muted-foreground text-xs ml-auto">{formatDate(h.changed_at)}</span>
            </li>
          ))}
        </ol>
      </div>
    </>
  );
}
