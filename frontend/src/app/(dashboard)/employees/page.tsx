"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Copy, CheckCheck, Share2 } from "lucide-react";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Credentials modal shown after adding a new employee ──────────────────────
function CredentialsModal({ mobile, password, name, onClose }: {
  mobile: string; password: string; name: string; onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const credText = `GMS Login Credentials\nName: ${name}\nMobile: ${mobile}\nPassword: ${password}\n\nDownload GMS app and login with these details.`;

  const copy = async () => {
    await navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Credentials copied!");
  };

  const shareWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(credText)}`, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm mx-4 shadow-2xl">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-lg">Employee Added ✓</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Share these login credentials with the employee.</p>
        </div>
        <div className="p-6">
          <div className="bg-muted rounded-xl p-4 font-mono text-sm space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Name</span>
              <span className="font-semibold">{name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Mobile</span>
              <span className="font-semibold tracking-wider">{mobile}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-xs">Password</span>
              <span className="font-semibold tracking-wider">{password}</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Ask the employee to change their password after first login.
          </p>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-border">
          <button onClick={shareWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
          <button onClick={copy}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">
            {copied ? <CheckCheck className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

const ROLES = ["manager", "service_advisor", "technician", "receptionist", "store_manager"] as const;
const ROLE_LABELS: Record<string, string> = {
  owner: "Owner", manager: "Manager", service_advisor: "Service Advisor",
  technician: "Technician", receptionist: "Receptionist", store_manager: "Store Manager",
};
const ROLE_COLORS: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  manager: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  service_advisor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  technician: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  receptionist: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  store_manager: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200",
};

type EmpForm = {
  first_name: string; last_name: string; mobile: string; email: string;
  role: string; password: string; date_of_joining: string; address: string;
  city: string; salary: string;
};

const emptyForm = (): EmpForm => ({
  first_name: "", last_name: "", mobile: "", email: "", role: "technician",
  password: "", date_of_joining: "", address: "", city: "", salary: "",
});

// ─── Employee Form Modal ───────────────────────────────────────────────────────
function EmployeeModal({ emp, onClose, onCreated }: {
  emp?: any;
  onClose: () => void;
  onCreated?: (mobile: string, password: string, name: string) => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!emp;
  const [form, setForm] = useState<EmpForm>(emp ? {
    first_name: emp.first_name ?? "",
    last_name: emp.last_name ?? "",
    mobile: emp.mobile ?? "",
    email: emp.email ?? "",
    role: emp.role ?? "technician",
    password: "",
    date_of_joining: emp.date_of_joining ?? "",
    address: emp.address ?? "",
    city: emp.city ?? "",
    salary: emp.salary?.toString() ?? "",
  } : emptyForm());

  const set = (k: keyof EmpForm, v: string) => setForm(p => ({ ...p, [k]: v }));

  const mutation = useMutation({
    mutationFn: (body: object) =>
      isEdit
        ? api.put(`/employees/${emp.id}`, body).then(r => r.data)
        : api.post("/employees", body).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["employees"] });
      if (!isEdit && onCreated) {
        const pwd = form.password || "Password@123";
        onCreated(form.mobile, pwd, `${form.first_name} ${form.last_name}`.trim());
      } else {
        toast.success(isEdit ? "Employee updated" : "Employee added");
      }
      onClose();
    },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Failed"),
  });

  function submit() {
    if (!form.first_name || !form.mobile || !form.role) {
      toast.error("Name, mobile, and role are required"); return;
    }
    const body: any = { ...form, salary: form.salary ? parseFloat(form.salary) : null };
    if (!body.password) delete body.password;
    if (!body.date_of_joining) delete body.date_of_joining;
    mutation.mutate(body);
  }

  const fields: { key: keyof EmpForm; label: string; type?: string; required?: boolean }[] = [
    { key: "first_name", label: "First Name", required: true },
    { key: "last_name", label: "Last Name" },
    { key: "mobile", label: "Mobile *", required: true },
    { key: "email", label: "Email", type: "email" },
    { key: "date_of_joining", label: "Date of Joining", type: "date" },
    { key: "address", label: "Address" },
    { key: "city", label: "City" },
    { key: "salary", label: "Monthly Salary (₹)", type: "number" },
    { key: "password", label: isEdit ? "New Password (leave blank to keep)" : "Password (default: Password@123)" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center pt-8 overflow-y-auto">
      <div className="bg-card border border-border rounded-2xl w-full max-w-xl mx-4 mb-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">{isEdit ? "Edit Employee" : "Add Employee"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          {fields.map(({ key, label, type }) => (
            <div key={key} className={key === "address" ? "col-span-2" : ""}>
              <label className="text-sm font-medium">{label}</label>
              <input
                type={type ?? "text"}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          ))}
          <div>
            <label className="text-sm font-medium">Role *</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}
              className="mt-1.5 w-full border border-input rounded-xl px-3 py-2.5 text-sm bg-background focus:outline-none">
              {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm rounded-xl border border-border hover:bg-muted">Cancel</button>
          <button onClick={submit} disabled={mutation.isPending}
            className="px-5 py-2.5 text-sm rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {mutation.isPending ? "Saving..." : isEdit ? "Update" : "Add Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("");
  const [modal, setModal] = useState<"create" | { emp: any } | null>(null);
  const [creds, setCreds] = useState<{ mobile: string; password: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["employees", search, roleFilter, page],
    queryFn: () => api.get("/employees", { params: { search, role: roleFilter || undefined, page, limit: 20 } }).then(r => r.data),
    placeholderData: prev => prev,
  });

  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active
        ? api.patch(`/employees/${id}/deactivate`).then(r => r.data)
        : api.patch(`/employees/${id}/reactivate`).then(r => r.data),
    onSuccess: (res) => { qc.invalidateQueries({ queryKey: ["employees"] }); toast.success(res.message ?? "Done"); },
    onError: (e: any) => toast.error(e?.response?.data?.detail ?? "Action failed"),
  });

  const employees = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {creds && (
        <CredentialsModal
          mobile={creds.mobile} password={creds.password} name={creds.name}
          onClose={() => setCreds(null)}
        />
      )}
      {modal === "create" && (
        <EmployeeModal
          onClose={() => setModal(null)}
          onCreated={(mobile, password, name) => { setCreds({ mobile, password, name }); }}
        />
      )}
      {modal !== null && modal !== "create" && (
        <EmployeeModal emp={modal.emp} onClose={() => setModal(null)} />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Employees</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} employees</p>
        </div>
        <button onClick={() => setModal("create")}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or mobile..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
          className="border border-input rounded-xl px-3 py-2.5 bg-background text-sm focus:outline-none">
          <option value="">All Roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Code", "Name", "Mobile", "Role", "Joined", "Status", ""].map(h => (
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
              ) : employees.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                  No employees found. Add your first employee.
                </td></tr>
              ) : (
                employees.map((e: any) => (
                  <tr key={e.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.employee_code}</td>
                    <td className="px-4 py-3 font-medium">{e.full_name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.mobile}</td>
                    <td className="px-4 py-3">
                      <span className={cn("text-xs px-2 py-1 rounded-md font-medium", ROLE_COLORS[e.role] ?? "bg-muted text-muted-foreground")}>
                        {ROLE_LABELS[e.role] ?? e.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{e.date_of_joining ?? "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleMut.mutate({ id: e.id, active: e.is_active })}
                        disabled={e.role === "owner"}
                        className="flex items-center gap-1.5 disabled:cursor-not-allowed">
                        {e.is_active
                          ? <><ToggleRight className="w-5 h-5 text-green-600" /><span className="text-xs text-green-700 dark:text-green-400 font-medium">Active</span></>
                          : <><ToggleLeft className="w-5 h-5 text-muted-foreground" /><span className="text-xs text-muted-foreground">Inactive</span></>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      {e.role !== "owner" && (
                        <button onClick={() => setModal({ emp: e })}
                          className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
            <span className="text-muted-foreground">Page {page} of {meta.pages}</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Prev</button>
              <button disabled={page >= meta.pages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
