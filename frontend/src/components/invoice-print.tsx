"use client";
/**
 * InvoicePrint — A4 tax invoice layout.
 * Hidden on screen via CSS; revealed only when window.print() fires.
 * Injected at <body> level via a portal so sidebar/header don't appear in print.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// ── helpers ──────────────────────────────────────────────────────────────────
function fmtINR(n: number) {
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function amountInWords(amount: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven",
    "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
    "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  function conv(n: number): string {
    if (n === 0) return "";
    if (n < 20) return ones[n] + " ";
    if (n < 100) return tens[Math.floor(n / 10)] + (ones[n % 10] ? " " + ones[n % 10] : "") + " ";
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred " + conv(n % 100);
    if (n < 100000) return conv(Math.floor(n / 1000)) + "Thousand " + conv(n % 1000);
    if (n < 10000000) return conv(Math.floor(n / 100000)) + "Lakh " + conv(n % 100000);
    return conv(Math.floor(n / 10000000)) + "Crore " + conv(n % 10000000);
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let words = conv(rupees).trim() + " Rupees";
  if (paise > 0) words += " and " + conv(paise).trim() + " Paise";
  return words + " Only";
}

// ── print styles injected as a <style> tag ────────────────────────────────────
const PRINT_STYLE = `
@media print {
  body > *:not(#_inv_print_) { display: none !important; }
  #_inv_print_ { display: block !important; }
  @page { size: A4 portrait; margin: 12mm 14mm; }
}
#_inv_print_ { display: none; }
`;

// ── GST summary calculation ───────────────────────────────────────────────────
function buildGstSummary(items: any[]) {
  const map: Record<string, { taxable: number; cgst: number; sgst: number }> = {};
  for (const item of items) {
    const rate = item.gst_rate ?? 0;
    const taxable = Number(item.amount) / (1 + rate / 100);
    const tax = Number(item.amount) - taxable;
    if (!map[rate]) map[rate] = { taxable: 0, cgst: 0, sgst: 0 };
    map[rate].taxable += taxable;
    map[rate].cgst += tax / 2;
    map[rate].sgst += tax / 2;
  }
  return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b));
}

// ── main content ─────────────────────────────────────────────────────────────
interface Props {
  inv: any;
  settings?: any; // garage settings
}

function PrintDoc({ inv, settings }: Props) {
  const isPaid = Number(inv.amount_due) <= 0;
  const gstRows = buildGstSummary(inv.items ?? []);

  const s: React.CSSProperties = {};
  const th = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #bbb", padding: "4px 7px", background: "#e8f0fe",
    textAlign: "left", fontSize: "9px", fontWeight: "700",
    textTransform: "uppercase", letterSpacing: "0.3px", whiteSpace: "nowrap", ...extra,
  });
  const td = (extra?: React.CSSProperties): React.CSSProperties => ({
    border: "1px solid #ccc", padding: "4px 7px", verticalAlign: "top",
    fontSize: "10px", ...extra,
  });

  return (
    <div id="_inv_print_" style={{ fontFamily: "Arial, sans-serif", fontSize: "11px", color: "#111", background: "#fff" }}>
      {/* inject print css */}
      <style dangerouslySetInnerHTML={{ __html: PRINT_STYLE }} />

      {/* ── HEADER ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2.5px solid #1d4ed8", paddingBottom: "10px", marginBottom: "12px" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: "800", color: "#1d4ed8" }}>
            {settings?.garage_name || "Garage"}
          </div>
          {settings?.address && <div style={{ color: "#444", fontSize: "10px", marginTop: "2px" }}>{settings.address}</div>}
          {(settings?.city || settings?.state) && (
            <div style={{ color: "#444", fontSize: "10px" }}>
              {[settings.city, settings.state, settings.pincode].filter(Boolean).join(", ")}
            </div>
          )}
          {settings?.mobile && <div style={{ color: "#444", fontSize: "10px" }}>Ph: {settings.mobile}</div>}
          {settings?.email && <div style={{ color: "#444", fontSize: "10px" }}>{settings.email}</div>}
          {settings?.gstin && <div style={{ fontWeight: "700", fontSize: "10px", marginTop: "3px" }}>GSTIN: {settings.gstin}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "18px", fontWeight: "700", color: "#1d4ed8", letterSpacing: "2px", textTransform: "uppercase" }}>
            Tax Invoice
          </div>
          <table style={{ marginTop: "8px", fontSize: "10px", borderCollapse: "collapse", marginLeft: "auto" }}>
            <tbody>
              {[
                ["Invoice No.", inv.invoice_number],
                ["Date", inv.invoice_date],
                inv.job_card_number ? ["Job Card", inv.job_card_number] : null,
              ].filter(Boolean).map(([k, v]: any) => (
                <tr key={k}>
                  <td style={{ color: "#666", paddingRight: "14px", paddingBottom: "2px" }}>{k}</td>
                  <td style={{ fontWeight: "700", fontFamily: "monospace" }}>{v}</td>
                </tr>
              ))}
              <tr>
                <td style={{ color: "#666", paddingRight: "14px" }}>Status</td>
                <td style={{ fontWeight: "700", color: isPaid ? "#16a34a" : "#dc2626" }}>
                  {isPaid ? "PAID ✓" : `Due: ${fmtINR(Number(inv.amount_due))}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── BILL TO + VEHICLE ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "12px" }}>
        {[
          {
            label: "Bill To",
            rows: [
              inv.customer_name && { bold: true, text: inv.customer_name },
              inv.customer_mobile && { text: "Ph: " + inv.customer_mobile },
              inv.customer_gstin && { text: "GSTIN: " + inv.customer_gstin },
            ].filter(Boolean),
          },
          {
            label: "Vehicle",
            rows: [
              inv.vehicle_reg && { bold: true, text: inv.vehicle_reg },
              (inv.vehicle_make || inv.vehicle_model) && { text: [inv.vehicle_make, inv.vehicle_model].filter(Boolean).join(" ") },
              inv.odometer_in && { text: "Odometer In: " + inv.odometer_in + " km" },
              inv.odometer_out && { text: "Odometer Out: " + inv.odometer_out + " km" },
            ].filter(Boolean),
          },
        ].map(({ label, rows }) => (
          <div key={label} style={{ border: "1px solid #ddd", borderRadius: "4px", padding: "8px 10px" }}>
            <div style={{ fontWeight: "700", fontSize: "9px", textTransform: "uppercase", color: "#666", marginBottom: "4px", letterSpacing: "0.5px" }}>{label}</div>
            {(rows as any[]).map((r: any, i: number) => (
              <div key={i} style={{ fontSize: "10px", fontWeight: r.bold ? "700" : "400", marginBottom: "1px" }}>{r.text}</div>
            ))}
          </div>
        ))}
      </div>

      {/* ── LINE ITEMS ── */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            {["#", "Description / HSN", "Type", "Qty", "Rate (₹)", "Disc %", "GST %", "Amount (₹)"].map((h, i) => (
              <th key={h} style={th({ textAlign: i >= 3 ? "right" : "left", width: i === 0 ? "22px" : undefined })}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(inv.items ?? []).length === 0 && (
            <tr><td colSpan={8} style={td({ textAlign: "center", color: "#666" })}>No items</td></tr>
          )}
          {(inv.items ?? []).map((item: any, i: number) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
              <td style={td({ textAlign: "center" })}>{i + 1}</td>
              <td style={td()}>
                <div style={{ fontWeight: "600" }}>{item.description}</div>
                {item.hsn_code && <div style={{ fontSize: "9px", color: "#888" }}>HSN: {item.hsn_code}</div>}
              </td>
              <td style={td({ textTransform: "capitalize", fontSize: "9px", color: "#666" })}>
                {item.item_type?.replace("_", " ")}
              </td>
              <td style={td({ textAlign: "right" })}>{item.quantity}</td>
              <td style={td({ textAlign: "right" })}>{fmtINR(item.unit_price)}</td>
              <td style={td({ textAlign: "right" })}>{item.discount_percent || 0}%</td>
              <td style={td({ textAlign: "right" })}>{item.gst_rate || 0}%</td>
              <td style={td({ textAlign: "right", fontWeight: "600" })}>{fmtINR(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── TOTALS + GST SUMMARY side by side ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 230px", gap: "12px", marginTop: "10px" }}>
        {/* GST summary */}
        <div>
          <div style={{ fontWeight: "700", fontSize: "9px", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>GST Summary</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <thead>
              <tr>
                {["Rate", "Taxable Amt", "CGST", "SGST", "Total Tax"].map(h => (
                  <th key={h} style={th({ fontSize: "9px", textAlign: "right" })}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gstRows.map(([rate, v]) => (
                <tr key={rate}>
                  <td style={td({ textAlign: "right", fontSize: "9px" })}>{rate}%</td>
                  <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(v.taxable)}</td>
                  <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(v.cgst)}</td>
                  <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(v.sgst)}</td>
                  <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(v.cgst + v.sgst)}</td>
                </tr>
              ))}
              <tr style={{ background: "#e8f0fe", fontWeight: "700" }}>
                <td style={td({ textAlign: "right", fontSize: "9px" })}>Total</td>
                <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(Number(inv.taxable_amount))}</td>
                <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(Number(inv.cgst_amount))}</td>
                <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(Number(inv.sgst_amount))}</td>
                <td style={td({ textAlign: "right", fontSize: "9px" })}>{fmtINR(Number(inv.total_tax))}</td>
              </tr>
            </tbody>
          </table>

          {/* Amount in words */}
          <div style={{ marginTop: "8px", border: "1px solid #ddd", borderRadius: "4px", padding: "5px 8px", fontSize: "10px" }}>
            <span style={{ fontWeight: "700", color: "#555" }}>Rupees: </span>
            <span style={{ fontStyle: "italic" }}>{amountInWords(Number(inv.grand_total))}</span>
          </div>
        </div>

        {/* Amount box */}
        <div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10px" }}>
            <tbody>
              {[
                { label: "Subtotal", value: fmtINR(Number(inv.subtotal)) },
                Number(inv.discount_amount) > 0 ? { label: "Discount", value: "- " + fmtINR(Number(inv.discount_amount)) } : null,
                { label: "Taxable Amt", value: fmtINR(Number(inv.taxable_amount)) },
                { label: "CGST", value: fmtINR(Number(inv.cgst_amount)) },
                { label: "SGST", value: fmtINR(Number(inv.sgst_amount)) },
              ].filter(Boolean).map((row: any) => (
                <tr key={row.label}>
                  <td style={td({ color: "#555" })}>{row.label}</td>
                  <td style={td({ textAlign: "right" })}>{row.value}</td>
                </tr>
              ))}
              <tr style={{ background: "#1d4ed8" }}>
                <td style={td({ color: "#fff", fontWeight: "700", fontSize: "13px" })}>Grand Total</td>
                <td style={td({ color: "#fff", fontWeight: "700", fontSize: "13px", textAlign: "right" })}>{fmtINR(Number(inv.grand_total))}</td>
              </tr>
              <tr>
                <td style={td({ color: "#16a34a", fontWeight: "600" })}>Paid</td>
                <td style={td({ color: "#16a34a", fontWeight: "600", textAlign: "right" })}>{fmtINR(Number(inv.amount_paid))}</td>
              </tr>
              <tr>
                <td style={td({ color: Number(inv.amount_due) > 0 ? "#dc2626" : "#16a34a", fontWeight: "600" })}>Balance Due</td>
                <td style={td({ textAlign: "right", color: Number(inv.amount_due) > 0 ? "#dc2626" : "#16a34a", fontWeight: "600" })}>{fmtINR(Number(inv.amount_due))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PAYMENT HISTORY ── */}
      {inv.payments?.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          <div style={{ fontWeight: "700", fontSize: "9px", textTransform: "uppercase", color: "#666", marginBottom: "4px" }}>Payment History</div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "9px" }}>
            <thead>
              <tr>
                {["Date", "Mode", "Reference", "Amount"].map(h => (
                  <th key={h} style={th({ fontSize: "9px" })}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inv.payments.map((p: any) => (
                <tr key={p.id}>
                  <td style={td({ fontSize: "9px" })}>{p.payment_date}</td>
                  <td style={td({ fontSize: "9px", textTransform: "capitalize" })}>{p.payment_mode?.replace("_", " ")}</td>
                  <td style={td({ fontSize: "9px" })}>{p.reference_number || "—"}</td>
                  <td style={td({ fontSize: "9px", textAlign: "right" })}>{fmtINR(Number(p.amount))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── NOTES ── */}
      {inv.notes && (
        <div style={{ marginTop: "8px", fontSize: "10px", color: "#555", border: "1px solid #eee", borderRadius: "4px", padding: "5px 8px" }}>
          <span style={{ fontWeight: "700" }}>Notes: </span>{inv.notes}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ marginTop: "20px", borderTop: "1px solid #ddd", paddingTop: "10px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ fontSize: "9px", color: "#555" }}>
          <div style={{ fontWeight: "700", marginBottom: "3px" }}>Terms & Conditions</div>
          <div>1. Goods once sold will not be taken back.</div>
          <div>2. This is a computer-generated invoice.</div>
          <div>3. Disputes subject to local jurisdiction.</div>
          <div>4. E. &amp; O.E.</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ height: "40px" }} />
          <div style={{ borderTop: "1px solid #000", display: "inline-block", paddingTop: "5px", fontSize: "10px", fontWeight: "600", minWidth: "120px" }}>
            Authorised Signatory
          </div>
          <div style={{ fontSize: "9px", color: "#666" }}>{settings?.garage_name || ""}</div>
        </div>
      </div>

      <div style={{ marginTop: "10px", textAlign: "center", fontSize: "9px", color: "#bbb", borderTop: "1px dashed #eee", paddingTop: "8px" }}>
        Powered by GMS — Garage Management System
      </div>
    </div>
  );
}

// ── portal wrapper (client-only) ──────────────────────────────────────────────
export function InvoicePrint({ inv, settings }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<PrintDoc inv={inv} settings={settings} />, document.body);
}
