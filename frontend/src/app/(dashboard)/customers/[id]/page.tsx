"use client";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, User, Car, ClipboardList, Receipt,
  Phone, Mail, MapPin, TrendingUp, AlertCircle,
} from "lucide-react";
import api from "@/lib/api";
import { formatINR, formatDate, cn } from "@/lib/utils";

const JC_STATUS_COLORS: Record<string, string> = {
  received: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  work_in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  quality_check: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  ready_for_delivery: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  delivered: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", highlight ? "bg-primary/10 border-primary/20" : "bg-card border-border")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("text-xl font-bold mt-0.5", highlight && "text-primary")}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function CustomerHistoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const { data, isLoading, error } = useQuery({
    queryKey: ["customer-history", id],
    queryFn: () => api.get(`/customers/${id}/history`).then(r => r.data.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-xl" />
        <div className="h-32 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <AlertCircle className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">Customer not found or you don't have access.</p>
        <button onClick={() => router.back()} className="px-4 py-2 border border-border rounded-xl text-sm hover:bg-muted">
          Go Back
        </button>
      </div>
    );
  }

  const { customer, vehicles, job_cards, invoices, summary } = data;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back nav */}
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Customer header */}
      <div className="bg-card border border-border rounded-2xl p-6 flex items-start gap-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
          <User className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
            {customer.mobile && (
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{customer.mobile}</span>
            )}
            {customer.email && (
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{customer.email}</span>
            )}
            {customer.city && (
              <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{customer.city}</span>
            )}
          </div>
          {customer.gstin && (
            <p className="text-xs text-muted-foreground mt-1">GSTIN: {customer.gstin}</p>
          )}
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Visits" value={String(summary.total_visits)} sub="Job cards" />
        <StatCard label="Total Invoiced" value={formatINR(summary.total_invoiced)} />
        <StatCard label="Total Paid" value={formatINR(summary.total_paid)} highlight />
        <StatCard label="Outstanding" value={formatINR(summary.total_outstanding)}
          highlight={summary.total_outstanding > 0} />
      </div>

      {/* Vehicles */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Car className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Vehicles ({vehicles.length})</h2>
        </div>
        {vehicles.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground text-sm">No vehicles registered</p>
        ) : (
          <div className="divide-y divide-border">
            {vehicles.map((v: any) => (
              <div key={v.id} className="flex items-center gap-4 px-5 py-3">
                <Car className="w-5 h-5 text-muted-foreground shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{v.registration_number}</p>
                  <p className="text-xs text-muted-foreground">
                    {[v.make, v.model, v.variant].filter(Boolean).join(" ")}
                    {v.manufacturing_year ? ` • ${v.manufacturing_year}` : ""}
                    {v.color ? ` • ${v.color}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Job Cards */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <ClipboardList className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Job Cards ({job_cards.length})</h2>
        </div>
        {job_cards.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground text-sm">No job cards yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  {["Job Card #", "Status", "Complaint", "Created", "Delivered"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {job_cards.map((jc: any) => (
                  <tr key={jc.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <Link href={`/job-cards/${jc.id}`} className="font-mono text-xs text-primary hover:underline">
                        {jc.job_card_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize",
                        JC_STATUS_COLORS[jc.status] ?? "bg-muted text-muted-foreground")}>
                        {jc.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground max-w-xs truncate">
                      {jc.customer_complaint ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(jc.created_at)}</td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">
                      {jc.actual_delivery_date ? formatDate(jc.actual_delivery_date) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoices */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
          <Receipt className="w-4 h-4 text-muted-foreground" />
          <h2 className="font-semibold">Invoices ({invoices.length})</h2>
        </div>
        {invoices.length === 0 ? (
          <p className="px-5 py-8 text-center text-muted-foreground text-sm">No invoices yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground">
                  {["Invoice #", "Date", "Total", "Paid", "Due"].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5">
                      <Link href={`/billing/${inv.id}`} className="font-mono text-xs text-primary hover:underline">
                        {inv.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground text-xs">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-2.5 font-medium">{formatINR(inv.grand_total)}</td>
                    <td className="px-4 py-2.5 text-green-600">{formatINR(inv.amount_paid)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn("font-medium", inv.amount_due > 0 ? "text-red-600" : "text-green-600")}>
                        {inv.amount_due > 0 ? formatINR(inv.amount_due) : "Paid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
