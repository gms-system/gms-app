"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import api from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const PO_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  partial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

type Tab = "suppliers" | "orders" | "grn";

export default function PurchasesPage() {
  const [tab, setTab] = useState<Tab>("orders");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const suppliersQuery = useQuery({
    queryKey: ["suppliers", search, page],
    queryFn: () =>
      api.get("/suppliers", { params: { search, page, limit: 20 } })
        .then(r => r.data)
        .catch(() => ({ data: [], meta: { total: 0, page: 1, pages: 1 } })),
    enabled: tab === "suppliers",
    placeholderData: prev => prev,
  });

  const poQuery = useQuery({
    queryKey: ["purchase-orders", search, page],
    queryFn: () =>
      api.get("/purchase-orders", { params: { search, page, limit: 20 } })
        .then(r => r.data)
        .catch(() => ({ data: [], meta: { total: 0, page: 1, pages: 1 } })),
    enabled: tab === "orders",
    placeholderData: prev => prev,
  });

  const grnQuery = useQuery({
    queryKey: ["grn", search, page],
    queryFn: () =>
      api.get("/grn", { params: { search, page, limit: 20 } })
        .then(r => r.data)
        .catch(() => ({ data: [], meta: { total: 0, page: 1, pages: 1 } })),
    enabled: tab === "grn",
    placeholderData: prev => prev,
  });

  const activeQuery = tab === "suppliers" ? suppliersQuery : tab === "orders" ? poQuery : grnQuery;
  const items = activeQuery.data?.data || [];
  const meta = activeQuery.data?.meta;

  const tabs: { key: Tab; label: string }[] = [
    { key: "orders", label: "Purchase Orders" },
    { key: "grn", label: "GRN" },
    { key: "suppliers", label: "Suppliers" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Purchases</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage procurement and suppliers</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setPage(1); setSearch(""); }}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder={`Search ${tabs.find(t => t.key === tab)?.label.toLowerCase()}...`}
          className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          {tab === "suppliers" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["Code", "Name", "Mobile", "City", "GSTIN", "Outstanding"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {suppliersQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}</tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No suppliers found</td></tr>
                ) : (
                  items.map((s: any) => (
                    <tr key={s.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{s.supplier_code}</td>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.mobile || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.city || "—"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{s.gstin || "—"}</td>
                      <td className="px-4 py-3">
                        <span className={cn("font-medium", s.outstanding_payable > 0 ? "text-red-600" : "text-muted-foreground")}>
                          {formatINR(s.outstanding_payable)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === "orders" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["PO Number", "Supplier", "Date", "Expected", "Total", "Status"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {poQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}</tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No purchase orders found</td></tr>
                ) : (
                  items.map((po: any) => (
                    <tr key={po.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-medium">{po.po_number}</td>
                      <td className="px-4 py-3">{po.supplier_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(po.po_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{po.expected_date ? formatDate(po.expected_date) : "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatINR(po.grand_total)}</td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-1 rounded-md font-medium", PO_STATUS_COLORS[po.status] || "")}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}

          {tab === "grn" && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  {["GRN Number", "Supplier", "Date", "Supplier Invoice", "Total"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {grnQuery.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                    ))}</tr>
                  ))
                ) : items.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No GRNs found</td></tr>
                ) : (
                  items.map((g: any) => (
                    <tr key={g.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono font-medium">{g.grn_number}</td>
                      <td className="px-4 py-3">{g.supplier_name || "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(g.grn_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{g.supplier_invoice_no || "—"}</td>
                      <td className="px-4 py-3 font-medium">{formatINR(g.grand_total)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.pages}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent">Previous</button>
              <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
