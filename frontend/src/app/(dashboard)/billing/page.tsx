"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function BillingPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["invoices", search, page],
    queryFn: () => api.get("/invoices", { params: { search, page, limit: 20 } }).then(r => r.data).catch(() => ({ data: [], meta: { total: 0, page: 1, limit: 20, pages: 1 } })),
    placeholderData: prev => prev,
  });

  const invoices = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Invoices</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} invoices</p>
        </div>
        <Link href="/billing/new"
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoices..."
          className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Invoice #","Date","Customer","Total","Paid","Due","Status",""].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}</tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No invoices yet</td></tr>
              ) : (
                invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-muted/30 cursor-pointer" onClick={() => router.push(`/billing/${inv.id}`)}>
                    <td className="px-4 py-3 font-mono text-sm font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3">{inv.customer_name || "—"}</td>
                    <td className="px-4 py-3 font-medium">{formatINR(inv.grand_total)}</td>
                    <td className="px-4 py-3 text-green-600">{formatINR(inv.amount_paid)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("font-medium", inv.amount_due > 0 ? "text-red-600" : "text-muted-foreground")}>
                        {formatINR(inv.amount_due)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium",
                        inv.is_cancelled ? "bg-red-100 text-red-800" :
                        inv.amount_due <= 0 ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" :
                        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200")}>
                        {inv.is_cancelled ? "Cancelled" : inv.amount_due <= 0 ? "Paid" : "Partial"}
                      </span>
                    </td>
                    <td className="px-4 py-3"><ChevronRight className="w-4 h-4 text-muted-foreground" /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
