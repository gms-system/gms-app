"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Grid3X3, Table2, ChevronRight, Loader2, X, Car, Mic } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { cn, formatDate, JOB_CARD_STATUS_LABELS, JOB_CARD_STATUS_COLORS } from "@/lib/utils";

const jcSchema = z.object({
  customer_id: z.string().min(1, "Customer required"),
  vehicle_id: z.string().min(1, "Vehicle required"),
  customer_complaint: z.string().optional(),
  odometer_in: z.coerce.number().optional(),
  expected_delivery_date: z.string().optional(),
  internal_notes: z.string().optional(),
});
type JCForm = z.infer<typeof jcSchema>;

const STATUSES = ["received", "work_in_progress", "quality_check", "ready_for_delivery", "delivered", "cancelled"];

function NewJobCardModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const { data: customers } = useQuery({
    queryKey: ["customers-search", customerSearch],
    queryFn: () => api.get("/customers", { params: { search: customerSearch, limit: 10 } }).then((r) => r.data.data),
    enabled: customerSearch.length > 1,
  });

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles-for-customer", selectedCustomer?.id],
    queryFn: () =>
      api.get(`/customers/${selectedCustomer.id}/vehicles`).then((r) => r.data.data),
    enabled: !!selectedCustomer,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<JCForm>({
    resolver: zodResolver(jcSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: JCForm) => api.post("/job-cards", data),
    onSuccess: () => {
      toast.success("Job card created!");
      qc.invalidateQueries({ queryKey: ["job-cards"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Create Job Card</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4">
          {/* Customer Search */}
          <div>
            <label className="block text-sm font-medium mb-1">Customer <span className="text-red-500">*</span></label>
            <input
              value={customerSearch}
              onChange={(e) => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
              placeholder="Search customer by name or mobile..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {customers && customers.length > 0 && !selectedCustomer && (
              <div className="border border-border rounded-lg mt-1 bg-popover shadow-md max-h-40 overflow-y-auto">
                {customers.map((c: any) => (
                  <button
                    key={c.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                    onClick={() => {
                      setSelectedCustomer(c);
                      setCustomerSearch(c.name);
                      setValue("customer_id", c.id);
                    }}
                  >
                    <span className="font-medium">{c.name}</span>
                    <span className="text-muted-foreground ml-2">{c.mobile}</span>
                  </button>
                ))}
              </div>
            )}
            {errors.customer_id && <p className="text-red-500 text-xs mt-1">{errors.customer_id.message}</p>}
          </div>

          {/* Vehicle */}
          {selectedCustomer && (
            <div>
              <label className="block text-sm font-medium mb-1">Vehicle <span className="text-red-500">*</span></label>
              <select
                {...register("vehicle_id")}
                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Select vehicle...</option>
                {vehicles?.map((v: any) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} — {v.make} {v.model}
                  </option>
                ))}
              </select>
              {errors.vehicle_id && <p className="text-red-500 text-xs mt-1">{errors.vehicle_id.message}</p>}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Odometer (km)</label>
            <input
              {...register("odometer_in")}
              type="number"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Customer Complaint</label>
            <textarea
              {...register("customer_complaint")}
              rows={3}
              placeholder="Describe the issue reported by customer..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Expected Delivery Date</label>
            <input
              {...register("expected_delivery_date")}
              type="date"
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm hover:bg-accent">
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Job Card
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function KanbanView({ jobCards }: { jobCards: any[] }) {
  const activeStatuses = STATUSES.filter((s) => s !== "delivered" && s !== "cancelled");
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {activeStatuses.map((status) => {
        const cards = jobCards.filter((jc) => jc.status === status);
        return (
          <div key={status} className="min-w-[260px] flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <span className={cn("text-xs px-2 py-1 rounded-md font-medium", JOB_CARD_STATUS_COLORS[status])}>
                {JOB_CARD_STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-muted-foreground font-medium">{cards.length}</span>
            </div>
            <div className="space-y-3">
              {cards.map((jc) => (
                <Link
                  key={jc.id}
                  href={`/job-cards/${jc.id}`}
                  className="block bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all"
                >
                  <p className="font-mono text-xs text-muted-foreground">{jc.job_card_number}</p>
                  <p className="font-medium text-sm mt-1 text-foreground">{jc.customer_name || "—"}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                    <Car className="w-3 h-3" />
                    {jc.registration_number || "—"}
                  </div>
                  {jc.expected_delivery_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Due: {formatDate(jc.expected_delivery_date)}
                    </p>
                  )}
                </Link>
              ))}
              {cards.length === 0 && (
                <div className="border-2 border-dashed border-border rounded-xl p-6 text-center text-xs text-muted-foreground">
                  No jobs here
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function JobCardsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [view, setView] = useState<"table" | "kanban">("table");
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["job-cards", search, statusFilter, page],
    queryFn: () =>
      api.get("/job-cards", { params: { search, status: statusFilter || undefined, page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const jobCards = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Job Cards</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} total</p>
        </div>
        <div className="flex gap-2">
          {/* View toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setView("table")}
              className={cn("px-3 py-2", view === "table" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={cn("px-3 py-2", view === "kanban" ? "bg-primary text-primary-foreground" : "hover:bg-accent")}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </div>
          <Link
            href="/job-cards/voice"
            className="flex items-center gap-2 px-4 py-2 border border-primary text-primary rounded-lg text-sm font-medium hover:bg-primary/10"
          >
            <Mic className="w-4 h-4" />
            Voice
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            New Job Card
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search job card number..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{JOB_CARD_STATUS_LABELS[s]}</option>
          ))}
        </select>
      </div>

      {/* Kanban View */}
      {view === "kanban" ? (
        <KanbanView jobCards={jobCards} />
      ) : (
        /* Table View */
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Job Card #</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Created</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Expected Delivery</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-muted animate-pulse rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : jobCards.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                      No job cards found
                    </td>
                  </tr>
                ) : (
                  jobCards.map((jc: any) => (
                    <tr key={jc.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/job-cards/${jc.id}`} className="font-mono font-medium text-primary hover:underline">
                          {jc.job_card_number}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-xs px-2 py-1 rounded-md font-medium", JOB_CARD_STATUS_COLORS[jc.status])}>
                          {JOB_CARD_STATUS_LABELS[jc.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(jc.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {jc.expected_delivery_date ? formatDate(jc.expected_delivery_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/job-cards/${jc.id}`}
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                        >
                          View <ChevronRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {meta && meta.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.pages}</p>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent">Previous</button>
                <button onClick={() => setPage((p) => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                  className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {showModal && <NewJobCardModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
