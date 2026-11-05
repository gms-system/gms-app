"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, Edit2, Loader2, X, ChevronDown } from "lucide-react";
import api from "@/lib/api";
import { FUEL_TYPE_LABELS } from "@/lib/utils";
import { getMakesForGarageType, getModelsForGarageType } from "@/lib/india-vehicles";

const vehicleSchema = z.object({
  registration_number: z.string().min(1, "Registration number required"),
  make: z.string().min(1, "Make required"),
  model: z.string().min(1, "Model required"),
  variant: z.string().optional(),
  manufacturing_year: z.coerce.number().int().min(1990).max(new Date().getFullYear() + 1).optional().or(z.literal("")),
  fuel_type: z.enum(["petrol","diesel","cng","electric","hybrid","lpg"]).optional().or(z.literal("")),
  transmission: z.enum(["manual","automatic","amt","dct","cvt","imt"]).optional().or(z.literal("")),
  color: z.string().optional(),
  current_odometer: z.coerce.number().int().min(0).optional().or(z.literal("")),
  owner_id: z.string().min(1, "Customer required"),
  chassis_number: z.string().optional(),
  engine_number: z.string().optional(),
  notes: z.string().optional(),
});
type VehicleForm = z.infer<typeof vehicleSchema>;

// ─── Vehicle Form Modal ────────────────────────────────────────────────────────
function VehicleModal({ vehicle, onClose, garageType = "4_wheeler" }: { vehicle?: any; onClose: () => void; garageType?: string }) {
  const qc = useQueryClient();
  const [customerSearch, setCustomerSearch] = useState(vehicle?.owner_name || "");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(vehicle ? { id: vehicle.owner_id } : null);
  const [customMake, setCustomMake] = useState(false);
  const [customModel, setCustomModel] = useState(false);
  const [selectedMake, setSelectedMake] = useState(vehicle?.make || "");

  const { data: customers } = useQuery({
    queryKey: ["customers-search-v", customerSearch],
    queryFn: () => api.get("/customers", { params: { search: customerSearch, limit: 10 } }).then(r => r.data.data),
    enabled: customerSearch.length > 1 && !selectedCustomer,
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<VehicleForm>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: vehicle ? {
      ...vehicle,
      owner_id: vehicle.owner_id,
      manufacturing_year: vehicle.manufacturing_year ?? "",
      current_odometer: vehicle.current_odometer ?? "",
      fuel_type: vehicle.fuel_type ?? "",
      transmission: vehicle.transmission ?? "",
    } : {
      manufacturing_year: "",
      current_odometer: "",
      fuel_type: "",
      transmission: "",
    },
  });

  const watchedMake = watch("make");

  // when make changes via dropdown, reset model dropdown
  useEffect(() => {
    if (watchedMake !== selectedMake) {
      setSelectedMake(watchedMake || "");
      if (!customModel) setValue("model", "");
    }
  }, [watchedMake]);

  const availableMakes = getMakesForGarageType(garageType);
  const availableModels = getModelsForGarageType(watchedMake || "", garageType);
  const isKnownMake = availableMakes.includes(watchedMake || "");

  const mutation = useMutation({
    mutationFn: (data: VehicleForm) => {
      // clean empty strings → undefined for optional fields
      const clean: any = { ...data };
      ["variant","chassis_number","engine_number","color","notes","fuel_type","transmission"].forEach(k => {
        if (clean[k] === "") clean[k] = undefined;
      });
      ["manufacturing_year","current_odometer"].forEach(k => {
        if (clean[k] === "" || clean[k] === 0) clean[k] = undefined;
      });
      return vehicle
        ? api.put(`/vehicles/${vehicle.id}`, clean)
        : api.post("/vehicles", clean);
    },
    onSuccess: () => {
      toast.success(vehicle ? "Vehicle updated" : "Vehicle registered");
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to save vehicle"),
  });

  const inputCls = "w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring";
  const labelCls = "block text-sm font-medium mb-1";
  const optionalBadge = <span className="text-xs text-muted-foreground font-normal ml-1">(optional)</span>;
  const requiredMark = <span className="text-red-500"> *</span>;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
          <h2 className="text-lg font-semibold">{vehicle ? "Edit Vehicle" : "Register Vehicle"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto flex-1 space-y-5">

            {/* ── Customer ── */}
            <div>
              <label className={labelCls}>Customer{requiredMark}</label>
              <input
                value={customerSearch}
                onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomer(null); }}
                placeholder="Search customer by name or mobile..."
                className={inputCls}
              />
              {customers && !selectedCustomer && customers.length > 0 && (
                <div className="border border-border rounded-lg mt-1 bg-popover shadow-md max-h-40 overflow-y-auto">
                  {customers.map((c: any) => (
                    <button key={c.id} type="button" className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                      onClick={() => { setSelectedCustomer(c); setCustomerSearch(c.name); setValue("owner_id", c.id); }}>
                      <span className="font-medium">{c.name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{c.mobile}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.owner_id && <p className="text-red-500 text-xs mt-1">{errors.owner_id.message}</p>}
            </div>

            {/* ── Registration Number ── */}
            <div>
              <label className={labelCls}>Registration Number{requiredMark}</label>
              <input {...register("registration_number")} placeholder="e.g. MH12AB1234"
                className={inputCls} style={{ textTransform: "uppercase" }}
                onChange={e => setValue("registration_number", e.target.value.toUpperCase())} />
              <p className="text-xs text-muted-foreground mt-1">Enter the number plate as printed on the vehicle.</p>
              {errors.registration_number && <p className="text-red-500 text-xs mt-1">{errors.registration_number.message}</p>}
            </div>

            {/* ── Make + Model ── */}
            <div className="grid grid-cols-2 gap-4">
              {/* Make */}
              <div>
                <label className={labelCls}>Make{requiredMark}</label>
                {!customMake ? (
                  <div className="relative">
                    <select {...register("make")}
                      className={inputCls + " appearance-none pr-8"}
                      onChange={e => { setValue("make", e.target.value); setSelectedMake(e.target.value); if (!customModel) setValue("model", ""); }}>
                      <option value="">Select Make...</option>
                      {availableMakes.map(m => <option key={m} value={m}>{m}</option>)}
                      <option value="__other__">Other (type manually)</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                ) : (
                  <input {...register("make")} placeholder="Type make name..."
                    className={inputCls} />
                )}
                <button type="button" onClick={() => { setCustomMake(!customMake); setValue("make", ""); setValue("model", ""); }}
                  className="text-xs text-primary mt-1 hover:underline">
                  {customMake ? "← Pick from list" : "Not in list? Type manually"}
                </button>
                {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make.message}</p>}
              </div>

              {/* Model */}
              <div>
                <label className={labelCls}>Model{requiredMark}</label>
                {!customModel && isKnownMake && availableModels.length > 0 ? (
                  <div className="relative">
                    <select {...register("model")} className={inputCls + " appearance-none pr-8"}>
                      <option value="">Select Model...</option>
                      {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                      <option value="__other__">Other</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  </div>
                ) : (
                  <input {...register("model")} placeholder="Type model name..."
                    className={inputCls} />
                )}
                {isKnownMake && (
                  <button type="button" onClick={() => setCustomModel(!customModel)}
                    className="text-xs text-primary mt-1 hover:underline">
                    {customModel ? "← Pick from list" : "Not in list? Type manually"}
                  </button>
                )}
                {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
              </div>
            </div>

            {/* ── Variant + Year ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Variant{optionalBadge}</label>
                <input {...register("variant")} placeholder="e.g. ZXi, VXI, S, VX"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Manufacturing Year{optionalBadge}</label>
                <input {...register("manufacturing_year")} type="number"
                  placeholder={`e.g. ${new Date().getFullYear()}`}
                  min="1990" max={new Date().getFullYear() + 1}
                  className={inputCls} />
              </div>
            </div>

            {/* ── Fuel + Transmission ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fuel Type{optionalBadge}</label>
                <select {...register("fuel_type")} className={inputCls}>
                  <option value="">Select...</option>
                  {Object.entries(FUEL_TYPE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Transmission{optionalBadge}</label>
                <select {...register("transmission")} className={inputCls}>
                  <option value="">Select...</option>
                  {[["manual","Manual"],["automatic","Automatic"],["amt","AMT"],["dct","DCT"],["cvt","CVT"],["imt","iMT"]].map(([v,l]) =>
                    <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            {/* ── Color + Odometer ── */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Color{optionalBadge}</label>
                <input {...register("color")} placeholder="e.g. White, Silver, Red"
                  className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Odometer (km){optionalBadge}</label>
                <input {...register("current_odometer")} type="number" min="0"
                  placeholder="e.g. 45000"
                  className={inputCls} />
              </div>
            </div>

            {/* ── Chassis + Engine — clearly optional ── */}
            <div className="border border-border rounded-xl p-4 bg-muted/30">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Technical Details — Optional
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Chassis Number{optionalBadge}</label>
                  <input {...register("chassis_number")} placeholder="VIN / Chassis no."
                    className={inputCls} />
                  <p className="text-xs text-muted-foreground mt-1">Found on RC book or door frame.</p>
                </div>
                <div>
                  <label className={labelCls}>Engine Number{optionalBadge}</label>
                  <input {...register("engine_number")} placeholder="Engine no."
                    className={inputCls} />
                  <p className="text-xs text-muted-foreground mt-1">Found on RC book.</p>
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            <div>
              <label className={labelCls}>Notes{optionalBadge}</label>
              <textarea {...register("notes")} rows={2}
                placeholder="Any additional notes about the vehicle..."
                className={inputCls + " resize-none"} />
            </div>
          </div>

          {/* ── Footer ── */}
          <div className="flex gap-3 p-6 border-t border-border shrink-0">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-border rounded-xl text-sm hover:bg-accent">
              Cancel
            </button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {vehicle ? "Update Vehicle" : "Register Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function VehiclesPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<null | "create" | any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["vehicles", search, page],
    queryFn: () => api.get("/vehicles", { params: { search, page, limit: 20 } }).then(r => r.data),
    placeholderData: prev => prev,
  });

  // Fetch garage type so the vehicle dropdown shows the right catalog (4-wheeler / 2-wheeler / both)
  const { data: subscriptionData } = useQuery({
    queryKey: ["settings-subscription"],
    queryFn: () => api.get("/settings/subscription").then(r => r.data.data),
    staleTime: 5 * 60 * 1000,
  });
  const garageType: string = subscriptionData?.garage_type ?? "4_wheeler";

  const vehicles = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {modal && (
        <VehicleModal
          vehicle={modal === "create" ? undefined : modal}
          onClose={() => setModal(null)}
          garageType={garageType}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} vehicles</p>
        </div>
        <button onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Register Vehicle
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by registration number, make, or model..."
          className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                {["Reg. Number","Make & Model","Variant","Fuel","Year","Color","Actions"].map(h => (
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
              ) : vehicles.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No vehicles found</td></tr>
              ) : (
                vehicles.map((v: any) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-semibold">{v.registration_number}</td>
                    <td className="px-4 py-3 font-medium">{v.make} {v.model}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.variant || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{FUEL_TYPE_LABELS[v.fuel_type] || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.manufacturing_year || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{v.color || "—"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setModal(v)}
                        className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta && meta.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
            <span>Page {meta.page} of {meta.pages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40">Prev</button>
              <button onClick={() => setPage(p => Math.min(meta.pages, p + 1))} disabled={page === meta.pages}
                className="px-3 py-1.5 rounded-lg border border-border hover:bg-accent disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
