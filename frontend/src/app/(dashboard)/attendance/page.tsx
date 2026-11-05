"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, UserX, Clock, Users, Plus, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUSES = ["present", "absent", "half_day", "leave"] as const;
const STATUS_LABELS: Record<string, string> = {
  present: "Present", absent: "Absent", half_day: "Half Day", leave: "Leave",
};
const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  absent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  half_day: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  leave: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ─── Mark Attendance Modal ─────────────────────────────────────────────────────
function MarkModal({ onClose, date }: { onClose: () => void; date: string }) {
  const qc = useQueryClient();
  const [empId, setEmpId] = useState("");
  const [status, setStatus] = useState<string>("present");
  const [punchIn, setPunchIn] = useState("09:00");
  const [punchOut, setPunchOut] = useState("18:00");
  const [notes, setNotes] = useState("");

  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get("/employees", { params: { limit: 100 } }).then(r => r.data.data),
  });

  const mutation = useMutation({
    mutationFn: (body: object) => api.post("/attendance", body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["attendance"] });
      toast.success("Attendance marked");
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed"),
  });

  function submit() {
    if (!empId) { toast.error("Select an employee"); return; }
    const body: any = { employee_id: empId, attendance_date: date, status, notes: notes || null };
    if (status === "present" || status === "half_day") {
      body.punch_in = punchIn ? `${date}T${punchIn}:00` : null;
      body.punch_out = punchOut ? `${date}T${punchOut}:00` : null;
    }
    mutation.mutate(body);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Mark Attendance — {date}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Employee *</label>
            <select value={empId} onChange={e => setEmpId(e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none">
              <option value="">Select employee...</option>
              {(employees ?? []).filter((e: any) => e.is_active).map((e: any) => (
                <option key={e.id} value={e.id}>{e.full_name} — {e.role}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Status *</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {STATUSES.map(s => (
                <button key={s} onClick={() => setStatus(s)}
                  className={cn("px-3 py-2 text-sm rounded-xl border font-medium transition-colors",
                    status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          {(status === "present" || status === "half_day") && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Punch In</label>
                <input type="time" value={punchIn} onChange={e => setPunchIn(e.target.value)}
                  className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">Punch Out</label>
                <input type="time" value={punchOut} onChange={e => setPunchOut(e.target.value)}
                  className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
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
          <button onClick={submit} disabled={mutation.isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <UserCheck className="w-4 h-4" />
            {mutation.isPending ? "Saving..." : "Mark Attendance"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Mark Modal ───────────────────────────────────────────────────────────
function BulkMarkModal({ onClose, date }: { onClose: () => void; date: string }) {
  const qc = useQueryClient();
  const { data: employees } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get("/employees", { params: { limit: 100 } }).then(r => r.data.data),
  });

  const active = (employees ?? []).filter((e: any) => e.is_active);
  const [statuses, setStatuses] = useState<Record<string, string>>(() =>
    Object.fromEntries(active.map((e: any) => [e.id, "present"]))
  );

  const [loading, setLoading] = useState(false);

  async function submitAll() {
    setLoading(true);
    let success = 0, failed = 0;
    for (const [empId, status] of Object.entries(statuses)) {
      try {
        await api.post("/attendance", { employee_id: empId, attendance_date: date, status });
        success++;
      } catch { failed++; }
    }
    setLoading(false);
    qc.invalidateQueries({ queryKey: ["attendance"] });
    toast.success(`Marked ${success} employees${failed > 0 ? `, ${failed} already marked or failed` : ""}`);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg mx-4 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Bulk Mark Attendance — {date}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
          {active.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-8">No active employees found</p>
          ) : (
            active.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{e.full_name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{e.role.replace("_", " ")}</p>
                </div>
                <div className="flex gap-1">
                  {STATUSES.map(s => (
                    <button key={s} onClick={() => setStatuses(p => ({ ...p, [e.id]: s }))}
                      className={cn("px-2.5 py-1 text-xs rounded-lg border font-medium transition-colors",
                        statuses[e.id] === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted")}>
                      {STATUS_LABELS[s].slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={submitAll} disabled={loading || active.length === 0}
            className="flex items-center gap-2 px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            <Users className="w-4 h-4" />
            {loading ? "Saving..." : `Mark All (${active.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AttendancePage() {
  const [viewDate, setViewDate] = useState(todayStr());
  const [showMark, setShowMark] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [empFilter, setEmpFilter] = useState("");

  const isToday = viewDate === todayStr();

  // Today's summary
  const { data: todaySummary, isLoading: summaryLoading } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: () => api.get("/attendance/today").then(r => r.data.data),
    refetchInterval: 60_000,
  });

  // Date's attendance records
  const { data: dateRecords, isLoading: recordsLoading } = useQuery({
    queryKey: ["attendance", viewDate],
    queryFn: () => api.get("/attendance", { params: { from_date: viewDate, to_date: viewDate, limit: 100 } }).then(r => r.data.data),
  });

  // Employee names map
  const { data: allEmps } = useQuery({
    queryKey: ["employees-all"],
    queryFn: () => api.get("/employees", { params: { limit: 100 } }).then(r => r.data.data),
  });
  const empMap: Record<string, string> = Object.fromEntries((allEmps ?? []).map((e: any) => [e.id, e.full_name]));

  const records = (dateRecords ?? []).filter((r: any) =>
    !empFilter || empMap[r.employee_id]?.toLowerCase().includes(empFilter.toLowerCase())
  );

  const summary = isToday
    ? (todaySummary ?? { present: 0, absent: 0, half_day: 0, leave: 0 })
    : {
        present: records.filter((r: any) => r.status === "present").length,
        absent: records.filter((r: any) => r.status === "absent").length,
        half_day: records.filter((r: any) => r.status === "half_day").length,
        leave: records.filter((r: any) => r.status === "leave").length,
      };

  function moveDay(delta: number) {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + delta);
    setViewDate(d.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-6">
      {showMark && <MarkModal date={viewDate} onClose={() => setShowMark(false)} />}
      {showBulk && <BulkMarkModal date={viewDate} onClose={() => setShowBulk(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Attendance</h1>
          <p className="text-muted-foreground text-sm mt-1">{isToday ? "Today's attendance" : `Attendance for ${viewDate}`}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowMark(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">
            <Plus className="w-4 h-4" /> Mark Single
          </button>
          <button onClick={() => setShowBulk(true)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            <Users className="w-4 h-4" /> Bulk Mark
          </button>
        </div>
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <button onClick={() => moveDay(-1)} className="p-2 rounded-xl border border-border hover:bg-muted">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-muted-foreground" />
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)}
            className="border border-input rounded-xl px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <button onClick={() => moveDay(1)} disabled={viewDate >= todayStr()}
          className="p-2 rounded-xl border border-border hover:bg-muted disabled:opacity-40">
          <ChevronRight className="w-4 h-4" />
        </button>
        {!isToday && (
          <button onClick={() => setViewDate(todayStr())}
            className="px-3 py-2 text-sm rounded-xl border border-border hover:bg-muted text-primary">
            Today
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Present", value: summary.present, icon: UserCheck, color: "bg-green-600" },
          { label: "Absent", value: summary.absent, icon: UserX, color: "bg-red-600" },
          { label: "Half Day", value: summary.half_day, icon: Clock, color: "bg-yellow-600" },
          { label: "On Leave", value: summary.leave, icon: Users, color: "bg-blue-600" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className={cn("p-3 rounded-xl", color)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{label}</p>
              {(summaryLoading || recordsLoading)
                ? <div className="h-7 w-10 bg-muted animate-pulse rounded mt-1" />
                : <p className="text-2xl font-bold">{value}</p>
              }
            </div>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border gap-3">
          <h2 className="font-semibold text-sm">{records.length} records</h2>
          <input value={empFilter} onChange={e => setEmpFilter(e.target.value)}
            placeholder="Filter by name..."
            className="border border-input rounded-xl px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring w-48" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Employee", "Status", "Punch In", "Punch Out", "Hours", "Notes"].map(h => (
                  <th key={h} className="text-left px-4 py-3 font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recordsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}</tr>
                ))
              ) : records.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                  No attendance records for {viewDate}. Use "Mark Single" or "Bulk Mark" to add records.
                </td></tr>
              ) : (
                records.map((r: any) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{empMap[r.employee_id] ?? r.employee_id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-md font-medium", STATUS_COLORS[r.status])}>
                        {STATUS_LABELS[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.punch_in ? new Date(r.punch_in).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.punch_out ? new Date(r.punch_out).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {r.working_hours ? `${r.working_hours} hrs` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{r.notes ?? "—"}</td>
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
