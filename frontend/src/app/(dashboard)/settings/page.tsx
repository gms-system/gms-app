"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import api from "@/lib/api";
import { useEffect } from "react";

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["garage-settings"],
    queryFn: () => api.get("/settings/garage").then(r => r.data.data),
  });

  const { register, handleSubmit, reset } = useForm();
  useEffect(() => { if (data) reset(data); }, [data, reset]);

  const mutation = useMutation({
    mutationFn: (formData: any) => api.put("/settings/garage", formData),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["garage-settings"] });
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  const fields = [
    { name: "garage_name", label: "Garage Name", required: true },
    { name: "owner_name", label: "Owner Name" },
    { name: "mobile", label: "Mobile" },
    { name: "email", label: "Email" },
    { name: "address", label: "Address" },
    { name: "city", label: "City" },
    { name: "state", label: "State" },
    { name: "pincode", label: "PIN Code" },
    { name: "gstin", label: "GSTIN" },
    { name: "pan", label: "PAN" },
    { name: "invoice_prefix", label: "Invoice Prefix" },
    { name: "job_card_prefix", label: "Job Card Prefix" },
  ];

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Garage profile and configuration</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="font-semibold mb-4">Garage Profile</h2>
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {fields.map(({ name, label, required }) => (
                <div key={name}>
                  <label className="block text-sm font-medium mb-1">
                    {label}{required && <span className="text-red-500"> *</span>}
                  </label>
                  <input
                    {...register(name)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-medium mb-1">Default GST Rate (%)</label>
                <select {...register("default_gst_rate")}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {[0, 5, 12, 18, 28].map(r => <option key={r} value={r}>{r}%</option>)}
                </select>
              </div>
            </div>
            <button type="submit" disabled={mutation.isPending}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Settings
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
