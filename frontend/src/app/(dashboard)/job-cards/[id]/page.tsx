"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, ChevronRight, Clock, Camera, Users,
  Wrench, FileText, CheckCircle2, Loader2, X, Receipt, FilePlus
} from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import {
  cn, formatDate, formatDateTime,
  JOB_CARD_STATUS_LABELS, JOB_CARD_STATUS_COLORS
} from "@/lib/utils";

const STATUS_FLOW = [
  "received",
  "work_in_progress",
  "quality_check",
  "ready_for_delivery",
  "delivered",
];

function StatusStepper({ current }: { current: string }) {
  const currentIdx = STATUS_FLOW.indexOf(current);
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {STATUS_FLOW.map((status, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={status} className="flex items-center shrink-0">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border",
              done && "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-800",
              active && "bg-primary text-primary-foreground border-primary",
              !done && !active && "bg-muted text-muted-foreground border-border",
            )}>
              {done && <CheckCircle2 className="w-3.5 h-3.5" />}
              {JOB_CARD_STATUS_LABELS[status]}
            </div>
            {i < STATUS_FLOW.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-0.5" />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ChangeStatusModal({
  currentStatus,
  jobCardId,
  onClose,
}: {
  currentStatus: string;
  jobCardId: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const currentIdx = STATUS_FLOW.indexOf(currentStatus);
  const nextStatus = STATUS_FLOW[currentIdx + 1];
  const [notes, setNotes] = useState("");
  const [selectedStatus, setSelectedStatus] = useState(nextStatus || currentStatus);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/job-cards/${jobCardId}/status`, { status: selectedStatus, notes }),
    onSuccess: () => {
      toast.success("Status updated!");
      qc.invalidateQueries({ queryKey: ["job-card", jobCardId] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">Change Status</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">New Status</label>
            <div className="space-y-2">
              {STATUS_FLOW.filter((_, i) => i > currentIdx).concat(["cancelled"]).map(s => (
                <label key={s} className={cn(
                  "flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors",
                  selectedStatus === s ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                )}>
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={selectedStatus === s}
                    onChange={() => setSelectedStatus(s)}
                    className="text-primary"
                  />
                  <span className={cn("text-xs px-2 py-1 rounded-md font-medium", JOB_CARD_STATUS_COLORS[s])}>
                    {JOB_CARD_STATUS_LABELS[s]}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Add a note about this status change..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm hover:bg-accent">Cancel</button>
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Update Status
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function JobCardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const [showStatusModal, setShowStatusModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["job-card", id],
    queryFn: () => api.get(`/job-cards/${id}`).then(r => r.data.data),
  });

  // Check if estimate exists for this job card
  const { data: estimatesData } = useQuery({
    queryKey: ["estimates-for-jc", id],
    queryFn: () => api.get("/estimates", { params: { job_card_id: id, limit: 1 } }).then(r => r.data),
    enabled: !!id,
  });
  const existingEstimate = estimatesData?.data?.[0];

  // Check if invoice exists for this job card
  const { data: invoicesData } = useQuery({
    queryKey: ["invoices-for-jc", id],
    queryFn: () => api.get("/invoices", { params: { job_card_id: id, limit: 1 } }).then(r => r.data),
    enabled: !!id,
  });
  const existingInvoice = invoicesData?.data?.[0];

  const jc = data;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded w-48" />
        <div className="h-64 bg-muted animate-pulse rounded-xl" />
      </div>
    );
  }

  if (!jc) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Job card not found.{" "}
        <Link href="/job-cards" className="text-primary hover:underline">Back to list</Link>
      </div>
    );
  }

  const isDelivered = jc.status === "delivered" || jc.status === "cancelled";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-accent text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold font-mono">{jc.job_card_number}</h1>
              <span className={cn("text-xs px-2 py-1 rounded-md font-medium", JOB_CARD_STATUS_COLORS[jc.status])}>
                {JOB_CARD_STATUS_LABELS[jc.status]}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">Created {formatDateTime(jc.created_at)}</p>
          </div>
        </div>

        {!isDelivered && (
          <button
            onClick={() => setShowStatusModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
          >
            <Wrench className="w-4 h-4" />
            Update Status
          </button>
        )}
      </div>

      {/* Status Stepper */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="text-sm font-medium text-muted-foreground mb-3">Progress</h2>
        <StatusStepper current={jc.status} />
      </div>

      {/* ── Billing Actions ── */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Receipt className="w-4 h-4" /> Billing
        </h2>
        <div className="flex flex-wrap gap-3">
          {/* Estimate */}
          {existingEstimate ? (
            <Link href={`/estimates`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">
              <FileText className="w-4 h-4 text-blue-500" />
              View Estimate — {existingEstimate.estimate_number}
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                existingEstimate.status === "converted" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                : existingEstimate.approval_status === "approved" ? "bg-blue-100 text-blue-800"
                : "bg-yellow-100 text-yellow-800")}>
                {existingEstimate.status === "converted" ? "Invoiced" : existingEstimate.approval_status}
              </span>
            </Link>
          ) : (
            <Link href={`/estimates?new=1&job_card_id=${id}&customer_id=${jc.customer_id}&vehicle_id=${jc.vehicle_id}`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">
              <FilePlus className="w-4 h-4 text-blue-500" />
              Create Estimate
            </Link>
          )}

          {/* Invoice */}
          {existingInvoice ? (
            <Link href={`/billing/${existingInvoice.id}`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-green-600 text-white hover:bg-green-700">
              <Receipt className="w-4 h-4" />
              View Invoice — {existingInvoice.invoice_number}
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                {existingInvoice.amount_due > 0 ? `Due ₹${Number(existingInvoice.amount_due).toLocaleString("en-IN")}` : "Paid ✓"}
              </span>
            </Link>
          ) : (
            !existingEstimate && (
              <Link href={`/billing/new?job_card_id=${id}&customer_id=${jc.customer_id}&vehicle_id=${jc.vehicle_id}`}
                className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
                <Receipt className="w-4 h-4" />
                Create Direct Invoice
              </Link>
            )
          )}
        </div>

        {!existingEstimate && !existingInvoice && (
          <p className="text-xs text-muted-foreground mt-3">
            Use <strong>Create Estimate</strong> to add parts &amp; labour, get customer approval, then convert to invoice.
            Or use <strong>Create Direct Invoice</strong> to bill directly without an estimate.
          </p>
        )}
      </div>

      {/* Main Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Details */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4" /> Job Details
          </h2>
          <dl className="space-y-3 text-sm">
            {[
              { label: "Odometer In", value: jc.odometer_in ? `${jc.odometer_in.toLocaleString()} km` : "—" },
              { label: "Odometer Out", value: jc.odometer_out ? `${jc.odometer_out.toLocaleString()} km` : "—" },
              { label: "Expected Delivery", value: formatDate(jc.expected_delivery_date) },
              { label: "Actual Delivery", value: formatDateTime(jc.actual_delivery_date) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium text-right">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Complaint & Notes */}
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold">Customer Complaint</h2>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {jc.customer_complaint || "No complaint recorded."}
          </p>
          {jc.inspection_notes && (
            <>
              <h2 className="font-semibold">Inspection Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{jc.inspection_notes}</p>
            </>
          )}
          {jc.internal_notes && (
            <>
              <h2 className="font-semibold">Internal Notes</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{jc.internal_notes}</p>
            </>
          )}
        </div>
      </div>

      {/* Technicians */}
      {jc.technicians && jc.technicians.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="font-semibold flex items-center gap-2 mb-3">
            <Users className="w-4 h-4" /> Assigned Technicians
          </h2>
          <div className="flex flex-wrap gap-2">
            {jc.technicians.map((t: any) => (
              <span key={t.technician_id} className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm">
                {t.technician_id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Camera className="w-4 h-4" /> Photos
        </h2>
        {jc.photos && jc.photos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {jc.photos.map((p: any) => (
              <div key={p.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
                <img
                  src={p.file_path}
                  alt={p.file_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder-image.svg";
                  }}
                />
                <div className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {p.photo_type}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground">
            <Camera className="w-8 h-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No photos uploaded yet</p>
          </div>
        )}
      </div>

      {/* Status History */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4" /> Status History
        </h2>
        {jc.status_history && jc.status_history.length > 0 ? (
          <div className="space-y-3">
            {jc.status_history.map((h: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {h.old_status && (
                      <>
                        <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", JOB_CARD_STATUS_COLORS[h.old_status])}>
                          {JOB_CARD_STATUS_LABELS[h.old_status]}
                        </span>
                        <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      </>
                    )}
                    <span className={cn("text-xs px-2 py-0.5 rounded-md font-medium", JOB_CARD_STATUS_COLORS[h.new_status])}>
                      {JOB_CARD_STATUS_LABELS[h.new_status]}
                    </span>
                  </div>
                  {h.notes && <p className="text-xs text-muted-foreground mt-1">{h.notes}</p>}
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(h.changed_at)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No history available.</p>
        )}
      </div>

      {showStatusModal && (
        <ChangeStatusModal
          currentStatus={jc.status}
          jobCardId={id}
          onClose={() => setShowStatusModal(false)}
        />
      )}
    </div>
  );
}
