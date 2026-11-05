"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit2, Trash2, Phone, MapPin, Loader2, X, History } from "lucide-react";
import Link from "next/link";
import api from "@/lib/api";
import { formatINR, formatDate } from "@/lib/utils";

const customerSchema = z.object({
  name: z.string().min(2, "Name is required"),
  mobile: z.string().min(10, "Valid mobile required"),
  alternate_mobile: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  gstin: z.string().optional(),
  pan_number: z.string().optional(),
  notes: z.string().optional(),
});
type CustomerForm = z.infer<typeof customerSchema>;

function CustomerModal({
  customer,
  onClose,
}: {
  customer?: any;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const { register, handleSubmit, formState: { errors } } = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {},
  });

  const mutation = useMutation({
    mutationFn: (data: CustomerForm) =>
      customer
        ? api.put(`/customers/${customer.id}`, data)
        : api.post("/customers", data),
    onSuccess: () => {
      toast.success(customer ? "Customer updated" : "Customer created");
      qc.invalidateQueries({ queryKey: ["customers"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const fields: { name: keyof CustomerForm; label: string; type?: string; required?: boolean }[] = [
    { name: "name", label: "Full Name", required: true },
    { name: "mobile", label: "Mobile Number", required: true },
    { name: "alternate_mobile", label: "Alternate Mobile" },
    { name: "email", label: "Email", type: "email" },
    { name: "address", label: "Address" },
    { name: "city", label: "City" },
    { name: "gstin", label: "GST Number" },
    { name: "pan_number", label: "PAN Number" },
    { name: "notes", label: "Notes" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{customer ? "Edit Customer" : "Add Customer"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            {fields.map(({ name, label, type, required }) => (
              <div key={name} className={name === "notes" || name === "address" ? "col-span-2" : ""}>
                <label className="block text-sm font-medium text-foreground mb-1">
                  {label} {required && <span className="text-red-500">*</span>}
                </label>
                {name === "notes" ? (
                  <textarea
                    {...register(name)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                ) : (
                  <input
                    {...register(name)}
                    type={type || "text"}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                )}
                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name]?.message}</p>}
              </div>
            ))}
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
              {customer ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<null | "create" | any>(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["customers", search, page],
    queryFn: () =>
      api.get("/customers", { params: { search, page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customers/${id}`),
    onSuccess: () => {
      toast.success("Customer deleted");
      qc.invalidateQueries({ queryKey: ["customers"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete"),
  });

  const customers = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} customers total</p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by name, mobile, or customer code..."
          className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mobile</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">City</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Outstanding</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Lifetime</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted animate-pulse rounded" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No customers found. Add your first customer!
                  </td>
                </tr>
              ) : (
                customers.map((c: any) => (
                  <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{c.customer_code}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        {c.mobile}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.city ? (
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />
                          {c.city}
                        </div>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={c.outstanding_balance > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}>
                        {formatINR(c.outstanding_balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(c.lifetime_spending)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <Link href={`/customers/${c.id}`}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground inline-flex"
                          title="View History">
                          <History className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => setModal(c)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete customer ${c.name}?`)) deleteMutation.mutate(c.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Page {meta.page} of {meta.pages} ({meta.total} records)
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                disabled={page === meta.pages}
                className="px-3 py-1.5 text-sm border border-border rounded-lg disabled:opacity-40 hover:bg-accent"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {modal && (
        <CustomerModal
          customer={modal === "create" ? undefined : modal}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
