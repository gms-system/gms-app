"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Search, AlertTriangle, Edit2, Loader2, X, Package } from "lucide-react";
import api from "@/lib/api";
import { formatINR, ITEM_CATEGORY_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { CatalogPicker, type CatalogSelection } from "@/components/catalog-picker";

const itemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["spare_part", "lubricant", "paint", "consumable", "external", "tool", "labour"]),
  part_number: z.string().optional(),
  brand: z.string().optional(),
  unit_of_measure: z.string().default("pcs"),
  current_stock: z.coerce.number().min(0),
  min_stock_level: z.coerce.number().min(0),
  purchase_price: z.coerce.number().min(0),
  selling_price: z.coerce.number().min(0),
  hsn_code: z.string().optional(),
  gst_rate: z.coerce.number().default(18),
  rack_location: z.string().optional(),
});
type ItemForm = z.infer<typeof itemSchema>;

function ItemModal({ item, onClose }: { item?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ItemForm>({
    resolver: zodResolver(itemSchema),
    defaultValues: item || { gst_rate: 18, unit_of_measure: "pcs", current_stock: 0, min_stock_level: 0, purchase_price: 0, selling_price: 0 },
  });

  // Pre-fill the form from the parts/lubes catalog ("Others" = fill manually)
  function applyCatalog(sel: CatalogSelection | null) {
    if (!sel) return;
    setValue("name", sel.name, { shouldDirty: true });
    setValue("category", sel.kind, { shouldDirty: true });
    setValue("purchase_price", sel.cost_price, { shouldDirty: true });
    setValue("selling_price", sel.selling_price, { shouldDirty: true });
    setValue("unit_of_measure", sel.unit_of_measure, { shouldDirty: true });
    if (sel.brand) setValue("brand", sel.brand, { shouldDirty: true });
    if (sel.hsn_code) setValue("hsn_code", sel.hsn_code, { shouldDirty: true });
  }

  const mutation = useMutation({
    mutationFn: (data: ItemForm) =>
      item ? api.put(`/inventory/${item.id}`, data) : api.post("/inventory", data),
    onSuccess: () => {
      toast.success(item ? "Item updated" : "Item added");
      qc.invalidateQueries({ queryKey: ["inventory"] });
      onClose();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed"),
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-2xl shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">{item ? "Edit Item" : "Add Inventory Item"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6">
          <div className="grid grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
            {!item && (
              <div className="col-span-2 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                <p className="text-xs font-medium text-primary mb-1.5">Quick add from catalog</p>
                <CatalogPicker onSelect={applyCatalog} />
                <p className="text-[11px] text-muted-foreground mt-1.5">Picking an item pre-fills name, category, brand, prices &amp; HSN. Choose "Others" to enter details manually.</p>
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Item Name <span className="text-red-500">*</span></label>
              <input {...register("name")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category <span className="text-red-500">*</span></label>
              <select {...register("category")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {Object.entries(ITEM_CATEGORY_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Part Number</label>
              <input {...register("part_number")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <input {...register("brand")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Unit</label>
              <input {...register("unit_of_measure")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Current Stock</label>
              <input {...register("current_stock")} type="number" step="0.001" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Min Stock Level</label>
              <input {...register("min_stock_level")} type="number" step="0.001" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Purchase Price (₹)</label>
              <input {...register("purchase_price")} type="number" step="0.01" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selling Price (₹)</label>
              <input {...register("selling_price")} type="number" step="0.01" className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">HSN Code</label>
              <input {...register("hsn_code")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">GST Rate (%)</label>
              <select {...register("gst_rate")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value={0}>0%</option>
                <option value={5}>5%</option>
                <option value={12}>12%</option>
                <option value={18}>18%</option>
                <option value={28}>28%</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Rack Location</label>
              <input {...register("rack_location")} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-3 pt-4 border-t border-border mt-4">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-sm hover:bg-accent">Cancel</button>
            <button type="submit" disabled={mutation.isPending}
              className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium flex items-center justify-center gap-2 hover:bg-primary/90 disabled:opacity-50">
              {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? "Update" : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState<null | "create" | any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", search, category, lowStock, page],
    queryFn: () =>
      api.get("/inventory", { params: { search, category: category || undefined, low_stock: lowStock, page, limit: 20 } }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const items = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">{meta?.total ?? 0} items</p>
        </div>
        <button
          onClick={() => setModal("create")}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90"
        >
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search items..."
            className="w-full pl-10 pr-4 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1); }}
          className="px-3 py-2.5 border border-input rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">All Categories</option>
          {Object.entries(ITEM_CATEGORY_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <button
          onClick={() => { setLowStock(!lowStock); setPage(1); }}
          className={cn(
            "flex items-center gap-2 px-3 py-2.5 border rounded-xl text-sm",
            lowStock ? "bg-yellow-600 text-white border-yellow-600" : "border-input hover:bg-accent"
          )}
        >
          <AlertTriangle className="w-4 h-4" />
          Low Stock Only
        </button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Name</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Min Stock</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Selling Price</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-muted animate-pulse rounded" /></td>
                  ))}</tr>
                ))
              ) : items.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No items found</td></tr>
              ) : (
                items.map((item: any) => (
                  <tr key={item.id} className={cn("hover:bg-muted/30 transition-colors", item.is_low_stock && "bg-yellow-50/50 dark:bg-yellow-950/20")}>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.is_low_stock && <AlertTriangle className="w-3.5 h-3.5 text-yellow-600 shrink-0" />}
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.brand && <span className="text-xs text-muted-foreground">({item.brand})</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                        {ITEM_CATEGORY_LABELS[item.category] || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={cn("font-medium", item.is_low_stock ? "text-yellow-600" : "text-foreground")}>
                        {item.current_stock} {item.unit_of_measure}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{item.min_stock_level} {item.unit_of_measure}</td>
                    <td className="px-4 py-3 text-right font-medium">{formatINR(item.selling_price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => setModal(item)}
                          className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
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

      {modal && (
        <ItemModal item={modal === "create" ? undefined : modal} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
