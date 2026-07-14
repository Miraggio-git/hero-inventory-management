import { SEED, SEED_TS, HERO, type SkuAgg } from "./seed";

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tqiwfytpenogsxblkvja.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_5kZmoHWaIsrXemVk3YWQYg_qYXz18vh";

export const INCOMING_FACS = ["Pending_GRN", "In-Transit"];

export type Status = "Stock-out" | "Critical" | "Replenish" | "Watch" | "Healthy" | "No DRR";

export type Row = SkuAgg & {
  rank: number;
  sales: number;
  incoming: number;
  drr: number | null;       // units / day
  cover: number | null;     // days of cover
  status: Status;
};

export type Thresholds = { alert: number; replenish: number; critical: number };
export const DEFAULT_THRESHOLDS: Thresholds = { alert: 20, replenish: 15, critical: 5 };

export type Snapshot = {
  rows: Row[];
  live: boolean;
  drrLive: boolean;
  ts: string;
  facilities: string[];
};

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

async function fetchInventory(): Promise<{ aggs: SkuAgg[]; ts: string } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/inventory_live?select=sku,facility,available_inventory,inventory_blocked,bad_inventory,snapshot_ts`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return null;
    const raw: any[] = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const map: Record<string, SkuAgg> = {};
    let ts = "";
    for (const r of raw) {
      const s = r.sku as string;
      if (!s) continue;
      if (r.snapshot_ts && !ts) ts = r.snapshot_ts;
      if (!map[s]) map[s] = { sku: s, avail: 0, grn: 0, transit: 0, blocked: 0, bad: 0, fac: {} };
      const av = Number(r.available_inventory) || 0;
      if (r.facility === "Pending_GRN") map[s].grn += av;
      else if (r.facility === "In-Transit") map[s].transit += av;
      else {
        map[s].avail += av;
        if (av > 0) map[s].fac[r.facility] = (map[s].fac[r.facility] || 0) + av;
      }
      map[s].blocked += Number(r.inventory_blocked) || 0;
      map[s].bad += Number(r.bad_inventory) || 0;
    }
    return { aggs: Object.values(map), ts: ts || new Date().toISOString() };
  } catch {
    return null;
  }
}

// Expected table:  create table sku_drr (sku text primary key, drr numeric);
async function fetchDrr(): Promise<Record<string, number> | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/sku_drr?select=sku,drr`, {
      headers,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const raw: any[] = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;
    const out: Record<string, number> = {};
    for (const r of raw) if (r.sku && r.drr != null) out[r.sku] = Number(r.drr);
    return out;
  } catch {
    return null;
  }
}

export function computeStatus(cover: number | null, avail: number, t: Thresholds): Status {
  if (cover === null) return avail <= 0 ? "Stock-out" : "No DRR";
  if (avail <= 0) return "Stock-out";
  if (cover <= t.critical) return "Critical";
  if (cover < t.replenish) return "Replenish";
  if (cover < t.alert) return "Watch";
  return "Healthy";
}

export async function loadSnapshot(t: Thresholds): Promise<Snapshot> {
  const [inv, drrMap] = await Promise.all([fetchInventory(), fetchDrr()]);
  const aggs = inv ? inv.aggs : SEED;
  const rows: Row[] = aggs.map((a) => {
    const [rank, sales] = HERO[a.sku] || [99, 0];
    const drr = drrMap && drrMap[a.sku] != null && drrMap[a.sku] > 0 ? drrMap[a.sku] : null;
    const cover = drr ? a.avail / drr : null;
    return {
      ...a,
      rank,
      sales,
      incoming: a.grn + a.transit,
      drr,
      cover,
      status: computeStatus(cover, a.avail, t),
    };
  });
  const facilities = Array.from(
    new Set(rows.flatMap((r) => Object.keys(r.fac)))
  ).sort((a, b) => facTotal(rows, b) - facTotal(rows, a));
  return {
    rows,
    live: !!inv,
    drrLive: !!drrMap,
    ts: inv ? inv.ts : SEED_TS,
    facilities,
  };
}

function facTotal(rows: Row[], f: string) {
  return rows.reduce((s, r) => s + (r.fac[f] || 0), 0);
}

// Recommendation for an alerting SKU: transfer from the largest holding, or reorder.
export function recommend(r: Row, t: Thresholds): string {
  const entries = Object.entries(r.fac).sort((a, b) => b[1] - a[1]);
  const targetUnits = r.drr ? Math.max(0, Math.ceil(r.drr * t.alert - r.avail)) : null;
  if (r.avail <= 0) {
    if (r.incoming > 0)
      return `Stock-out. ${r.incoming} units incoming (GRN/transit) — expedite receiving, then reorder${targetUnits ? ` ~${targetUnits} units` : ""}.`;
    return `Stock-out with nothing incoming. Raise a purchase order${targetUnits ? ` for ~${targetUnits} units (${t.alert}-day target)` : ""}.`;
  }
  if (entries.length > 1) {
    const [top, topUnits] = entries[0];
    return `Rebalance: ${top} holds ${topUnits} of ${r.avail} sellable units. Consider transferring to thin locations${targetUnits ? `; reorder ~${targetUnits} units to reach the ${t.alert}-day target` : ""}.`;
  }
  return targetUnits
    ? `Reorder ~${targetUnits} units to restore ${t.alert} days of cover (DRR ${r.drr}/day).`
    : `Below buffer. Add DRR data to size the reorder.`;
}

export const fmt = (n: number) => n.toLocaleString("en-IN");
export const lakh = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
