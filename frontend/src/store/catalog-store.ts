import { useEffect } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import axios from "axios";
import { INDIA_VEHICLES, INDIA_TWO_WHEELERS, type VehicleBrand } from "@/lib/india-vehicles";
import { SPARE_PARTS, LUBES, type SparePart, type Lube } from "@/lib/parts-catalog";

/**
 * Cloud catalog (vehicle makes/models, spare parts, lubes), synced from
 * GET /api/v1/catalog at most once a day and cached in localStorage.
 * The bundled lists are the fallback for first launch / offline.
 */
export interface CatalogData {
  cars: VehicleBrand[];
  two_wheelers: VehicleBrand[];
  spare_parts: SparePart[];
  lubes: Lube[];
}

const SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

export const BUNDLED_CATALOG: CatalogData = {
  cars: INDIA_VEHICLES, two_wheelers: INDIA_TWO_WHEELERS, spare_parts: SPARE_PARTS, lubes: LUBES,
};

interface CatalogState {
  version: string | null;
  lastSynced: number;
  data: CatalogData | null;
  sync: (force?: boolean) => Promise<void>;
}

let inflight: Promise<void> | null = null;

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      version: null,
      lastSynced: 0,
      data: null,
      sync: (force = false) => {
        if (!force && Date.now() - get().lastSynced < SYNC_INTERVAL_MS) return Promise.resolve();
        if (inflight) return inflight;
        // Bare axios: the catalog is public and must never trigger the auth refresh/logout flow.
        inflight = axios
          .get(`${API_URL}/v1/catalog`, { params: get().version && get().data ? { version: get().version } : {} })
          .then(({ data: res }) => {
            const d = res.data;
            if (d.changed) {
              set({ version: d.version, data: { cars: d.cars, two_wheelers: d.two_wheelers, spare_parts: d.spare_parts, lubes: d.lubes } });
            }
            set({ lastSynced: Date.now() });
          })
          .catch(() => { /* offline — keep cached / bundled data, retry next launch */ })
          .finally(() => { inflight = null; });
        return inflight;
      },
    }),
    { name: "gms-catalog", partialize: (s) => ({ version: s.version, lastSynced: s.lastSynced, data: s.data }) }
  )
);

/** Current catalog: synced cloud data, else the bundled fallback. */
export function useCatalog(): CatalogData {
  return useCatalogStore((s) => s.data) ?? BUNDLED_CATALOG;
}

const byMake = (list: VehicleBrand[], make: string) => [...(list.find((b) => b.make === make)?.models ?? [])].sort();

export function makesForGarageType(c: CatalogData, garageType: string): string[] {
  const cars = c.cars.map((b) => b.make);
  const bikes = c.two_wheelers.map((b) => b.make);
  if (garageType === "2_wheeler") return [...bikes].sort();
  if (garageType === "both") return Array.from(new Set([...cars, ...bikes])).sort();
  return [...cars].sort();
}

export function modelsForGarageType(c: CatalogData, make: string, garageType: string): string[] {
  if (garageType === "2_wheeler") return byMake(c.two_wheelers, make);
  if (garageType === "both") return [...byMake(c.cars, make), ...byMake(c.two_wheelers, make)].sort();
  return byMake(c.cars, make);
}

/** Mount once (in Providers): syncs on launch and whenever the app returns to the foreground. */
export function useCatalogAutoSync() {
  const sync = useCatalogStore((s) => s.sync);
  useEffect(() => {
    sync();
    const onVisible = () => { if (document.visibilityState === "visible") sync(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [sync]);
}
