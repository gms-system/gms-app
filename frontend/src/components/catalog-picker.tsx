"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  SPARE_PARTS, LUBES, PART_VEHICLES, LUBE_BRANDS,
  type SparePart, type Lube,
} from "@/lib/parts-catalog";

export type CatalogKind = "spare_part" | "lubricant";

/** Normalised result handed back to the caller when an entry is chosen. */
export interface CatalogSelection {
  kind: CatalogKind;
  /** Suggested item name / description, e.g. "Clutch Plate (Maruti Suzuki Alto)" */
  name: string;
  brand?: string;
  vehicle?: string;
  cost_price: number;
  selling_price: number;
  hsn_code?: string;
  unit_of_measure: string;
}

export const OTHERS_VALUE = "__others__";

interface Props {
  /** Restrict to one kind, or allow switching between both (default). */
  kind?: CatalogKind | "both";
  /** Called with a selection, or `null` when "Others" is chosen. */
  onSelect: (sel: CatalogSelection | null) => void;
  className?: string;
  compact?: boolean;
}

function toSelection(kind: CatalogKind, p: SparePart | Lube): CatalogSelection {
  if (kind === "spare_part") {
    const sp = p as SparePart;
    return {
      kind, name: `${sp.part} (${sp.vehicle})`, vehicle: sp.vehicle,
      cost_price: sp.cost_price, selling_price: sp.selling_price, hsn_code: sp.hsn_code, unit_of_measure: "pcs",
    };
  }
  const l = p as Lube;
  return {
    kind, name: `${l.brand} ${l.name} ${l.grade} ${l.type} - ${l.pack}`, brand: l.brand,
    cost_price: l.cost_price, selling_price: l.selling_price, hsn_code: l.hsn_code, unit_of_measure: "ltr",
  };
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/**
 * Quick-pick dropdown for spare parts (grouped by vehicle) and lubes (grouped by brand),
 * with an "Others (type manually)" escape hatch at the end.
 */
export function CatalogPicker({ kind = "both", onSelect, className, compact }: Props) {
  const [activeKind, setActiveKind] = useState<CatalogKind>(kind === "lubricant" ? "lubricant" : "spare_part");
  const [value, setValue] = useState("");

  const groups = useMemo(() => {
    if (activeKind === "spare_part") {
      return PART_VEHICLES.map((v) => ({
        label: v,
        options: SPARE_PARTS.map((p, i) => ({ p, i })).filter(({ p }) => p.vehicle === v)
          .map(({ p, i }) => ({ value: `sp:${i}`, label: `${p.part} — ${inr(p.selling_price)} (cost ${inr(p.cost_price)})` })),
      }));
    }
    return LUBE_BRANDS.map((b) => ({
      label: b,
      options: LUBES.map((l, i) => ({ l, i })).filter(({ l }) => l.brand === b)
        .map(({ l, i }) => ({ value: `lb:${i}`, label: `${l.name} ${l.grade} · ${l.type} · ${l.pack} — ${inr(l.selling_price)} (cost ${inr(l.cost_price)})` })),
    }));
  }, [activeKind]);

  function handleChange(v: string) {
    setValue(v);
    if (!v) return;
    if (v === OTHERS_VALUE) { onSelect(null); return; }
    const [prefix, idx] = v.split(":");
    const i = Number(idx);
    if (prefix === "sp") onSelect(toSelection("spare_part", SPARE_PARTS[i]));
    else onSelect(toSelection("lubricant", LUBES[i]));
  }

  const selectCls = cn(
    "w-full border border-input rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-ring",
    compact ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm",
  );

  return (
    <div className={cn("space-y-1.5", className)}>
      {kind === "both" && (
        <div className="flex gap-1 text-xs">
          {([["spare_part", "Spare Parts"], ["lubricant", "Lubes / Oils"]] as const).map(([k, label]) => (
            <button key={k} type="button"
              onClick={() => { setActiveKind(k); setValue(""); }}
              className={cn("px-2.5 py-1 rounded-md border font-medium transition-colors",
                activeKind === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:bg-muted")}>
              {label}
            </button>
          ))}
        </div>
      )}
      <select value={value} onChange={(e) => handleChange(e.target.value)} className={selectCls}>
        <option value="">
          {activeKind === "spare_part" ? "Pick a spare part (by vehicle)…" : "Pick a lube / oil (by brand)…"}
        </option>
        {groups.map((g) => (
          <optgroup key={g.label} label={g.label}>
            {g.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </optgroup>
        ))}
        <optgroup label="Not listed?">
          <option value={OTHERS_VALUE}>Others — type manually</option>
        </optgroup>
      </select>
    </div>
  );
}
