import { SEED, SEED_DRR, SEED_TS, HERO, type SkuAgg } from "./seed";
import {
  DRR_WINDOW,
  DRR_WINDOW_LABEL,
  FACILITY_KEYS,
  canonicalDrrFacility,
  canonicalInvFacility,
  facilityLabel,
  incomingBucket,
  isLegacyFacility,
  type FacilityKey,
} from "./facilities";

export { DRR_WINDOW, DRR_WINDOW_LABEL, FACILITY_KEYS, facilityLabel };
export { INCOMING_FACS } from "./facilities";
export type { FacilityKey };

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://tqiwfytpenogsxblkvja.supabase.co";
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_KEY || "sb_publishable_5kZmoHWaIsrXemVk3YWQYg_qYXz18vh";

export type Status = "Stock-out" | "Critical" | "Replenish" | "Watch" | "Healthy" | "No DRR";

/** Days-of-stock for one (sku, facility) pair, using that facility's own DRR. */
export type FacRow = {
  facility: FacilityKey;
  label: string;
  avail: number;
  drr: number | null;   // units / day at this facility, null when there is no signal
  cover: number | null; // days of stock at this facility
  status: Status;
};

export type Row = SkuAgg & {
  rank: number;
  sales: number;
  incoming: number;
  drr: number | null;    // network DRR = sum of the active facilities' DRR
  cover: number | null;  // network days of cover
  status: Status;        // worst facility status (stock-out wins when nothing is sellable)
  facRows: FacRow[];     // one row per active facility — the actionable unit
};

export type Thresholds = { alert: number; replenish: number; critical: number };
export const DEFAULT_THRESHOLDS: Thresholds = { alert: 20, replenish: 15, critical: 5 };

/** How much of each facility's SKU list actually has a usable DRR number. */
export type DrrCoverage = {
  facility: FacilityKey;
  label: string;
  skusWithDrr: number;
  totalDrr: number;
};

/** Facility strings dropped from every calculation, with the stock they hold. */
export type ExcludedFacility = { facility: string; units: number; known: boolean };

export type Snapshot = {
  rows: Row[];
  live: boolean;
  drrLive: boolean;
  ts: string;
  facilities: FacilityKey[];
  drrWindow: string;
  drrCoverage: DrrCoverage[];
  excluded: ExcludedFacility[];
  /** facility_wise_drr names that resolve to no active warehouse */
  unmappedDrr: string[];
};

const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` };

/** sku -> facility -> DRR (only strictly positive values are kept) */
type DrrMap = Record<string, Partial<Record<FacilityKey, number>>>;

type InvResult = { aggs: SkuAgg[]; ts: string; excluded: ExcludedFacility[] };

async function fetchInventory(): Promise<InvResult | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/inventory_live?select=sku,facility,available_inventory,inventory_blocked,bad_inventory,snapshot_ts&limit=5000`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return null;
    const raw: any[] = await res.json();
    if (!Array.isArray(raw) || raw.length === 0) return null;

    const map: Record<string, SkuAgg> = {};
    const dropped = new Map<string, ExcludedFacility>();
    let ts = "";

    for (const r of raw) {
      const sku = r.sku as string;
      if (!sku) continue;
      if (r.snapshot_ts && (!ts || r.snapshot_ts > ts)) ts = r.snapshot_ts;

      const av = Number(r.available_inventory) || 0;
      const bucket = incomingBucket(r.facility);
      const key = bucket ? null : canonicalInvFacility(r.facility);

      // Decommissioned or unrecognised warehouse — excluded from every calculation,
      // but tracked so the Settings page can show what was left out.
      if (!bucket && !key) {
        const name = String(r.facility ?? "(blank)");
        const cur = dropped.get(name) ?? { facility: name, units: 0, known: isLegacyFacility(name) };
        cur.units += av;
        dropped.set(name, cur);
        continue;
      }

      if (!map[sku]) map[sku] = { sku, avail: 0, grn: 0, transit: 0, blocked: 0, bad: 0, fac: {} };
      const a = map[sku];

      if (bucket === "grn") a.grn += av;
      else if (bucket === "transit") a.transit += av;
      else if (key) {
        a.avail += av;
        a.fac[key] = (a.fac[key] || 0) + av;
        a.blocked += Number(r.inventory_blocked) || 0;
        a.bad += Number(r.bad_inventory) || 0;
      }
    }

    // Every active facility gets an entry, even at zero units, so that a warehouse
    // holding nothing still produces a (sku, facility) row and can raise an alert.
    for (const a of Object.values(map)) {
      for (const k of FACILITY_KEYS) if (a.fac[k] == null) a.fac[k] = 0;
    }

    return {
      aggs: Object.values(map),
      ts: ts || new Date().toISOString(),
      excluded: Array.from(dropped.values()).sort((x, y) => y.units - x.units),
    };
  } catch {
    return null;
  }
}

/**
 * Reads facility_wise_drr (primary key: sku, facility) and folds the facility names
 * onto canonical keys. Zero and null DRR are treated as "no signal" rather than as a
 * run rate of zero — a facility with no demand data must not read as infinite cover.
 */
async function fetchDrr(): Promise<{ map: DrrMap; unmapped: string[] } | null> {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/facility_wise_drr?select=sku,facility,${DRR_WINDOW}&limit=5000`,
      { headers, cache: "no-store" }
    );
    if (!res.ok) return null;
    const raw: any[] = await res.json();
    if (!Array.isArray(raw)) return null;

    const map: DrrMap = {};
    const unmapped = new Set<string>();

    for (const r of raw) {
      const sku = r.sku as string;
      if (!sku) continue;
      const key = canonicalDrrFacility(r.facility);
      if (!key) {
        if (!incomingBucket(r.facility)) unmapped.add(String(r.facility ?? "(blank)"));
        continue;
      }
      const v = Number(r[DRR_WINDOW]);
      if (!Number.isFinite(v) || v <= 0) continue;
      if (!map[sku]) map[sku] = {};
      map[sku][key] = (map[sku][key] || 0) + v; // sum when several aliases collapse to one key
    }
    // A successful read with no usable numbers is still a live connection.
    return { map, unmapped: Array.from(unmapped).sort() };
  } catch {
    return null;
  }
}

/* ---------------- status ---------------- */

export function computeStatus(cover: number | null, avail: number, t: Thresholds): Status {
  if (cover === null) return avail <= 0 ? "Stock-out" : "No DRR";
  if (avail <= 0) return "Stock-out";
  if (cover <= t.critical) return "Critical";
  if (cover < t.replenish) return "Replenish";
  if (cover < t.alert) return "Watch";
  return "Healthy";
}

/**
 * Facility-level status. Without a DRR for this facility there is no demand signal, so
 * the row stays quiet ("No DRR") instead of raising a stock-out it cannot justify.
 */
export function computeFacStatus(
  cover: number | null,
  avail: number,
  drr: number | null,
  t: Thresholds
): Status {
  if (drr === null || drr <= 0) return "No DRR";
  if (avail <= 0) return "Stock-out";
  return computeStatus(cover, avail, t);
}

const SEVERITY: Record<Status, number> = {
  "No DRR": 0,
  Healthy: 1,
  Watch: 2,
  Replenish: 3,
  Critical: 4,
  "Stock-out": 5,
};

export const ALERT_STATUSES: Status[] = ["Stock-out", "Critical", "Replenish", "Watch"];
export const isAlerting = (s: Status) => ALERT_STATUSES.includes(s);

/** Worst status across a SKU's facilities — that is what needs a human. */
export function worstStatus(statuses: Status[]): Status {
  if (!statuses.length) return "No DRR";
  return statuses.reduce((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), statuses[0]);
}

export function buildFacRows(agg: SkuAgg, drr: Partial<Record<FacilityKey, number>> | undefined, t: Thresholds): FacRow[] {
  return FACILITY_KEYS.map((facility) => {
    const avail = agg.fac[facility] ?? 0;
    const d = drr?.[facility] ?? null;
    const drrVal = d != null && d > 0 ? d : null;
    const cover = drrVal ? avail / drrVal : null;
    return {
      facility,
      label: facilityLabel(facility),
      avail,
      drr: drrVal,
      cover,
      status: computeFacStatus(cover, avail, drrVal, t),
    };
  });
}

function assemble(agg: SkuAgg, drr: Partial<Record<FacilityKey, number>> | undefined, t: Thresholds): Row {
  const [rank, sales] = HERO[agg.sku] || [99, 0];
  const facRows = buildFacRows(agg, drr, t);
  const drrTotal = facRows.reduce((s, f) => s + (f.drr ?? 0), 0);
  const networkDrr = drrTotal > 0 ? drrTotal : null;
  const cover = networkDrr ? agg.avail / networkDrr : null;
  const status: Status = agg.avail <= 0 ? "Stock-out" : worstStatus(facRows.map((f) => f.status));
  return {
    ...agg,
    rank,
    sales,
    incoming: agg.grn + agg.transit,
    drr: networkDrr,
    cover,
    status,
    facRows,
  };
}

export async function loadSnapshot(t: Thresholds): Promise<Snapshot> {
  const [inv, drrRes] = await Promise.all([fetchInventory(), fetchDrr()]);
  const aggs = inv ? inv.aggs : SEED;
  const drrMap: DrrMap = drrRes ? drrRes.map : SEED_DRR;

  const rows: Row[] = aggs.map((a) => assemble(a, drrMap[a.sku], t));

  const drrCoverage: DrrCoverage[] = FACILITY_KEYS.map((facility) => {
    const withDrr = rows.filter((r) => r.facRows.some((f) => f.facility === facility && f.drr !== null));
    return {
      facility,
      label: facilityLabel(facility),
      skusWithDrr: withDrr.length,
      totalDrr: Number(
        rows
          .reduce((s, r) => s + (r.facRows.find((f) => f.facility === facility)?.drr ?? 0), 0)
          .toFixed(2)
      ),
    };
  });

  return {
    rows,
    live: !!inv,
    drrLive: !!drrRes,
    ts: inv ? inv.ts : SEED_TS,
    facilities: [...FACILITY_KEYS],
    drrWindow: DRR_WINDOW,
    drrCoverage,
    excluded: inv ? inv.excluded : [],
    unmappedDrr: drrRes ? drrRes.unmapped : [],
  };
}

/* ---------------- replenishment sizing ---------------- */

/**
 * Order quantity for one facility: bring that facility up to `alertDays` of its own
 * cover. Unchanged business rule (DRR x 20 - sellable), now driven by the facility's
 * own DRR rather than a single network-wide number.
 */
export function orderQty(drr: number, avail: number, alertDays: number): number {
  return Math.max(1, Math.ceil(drr * alertDays - avail));
}

/** Facilities that could supply a transfer, largest holding first. */
export function transferSources(r: Row, exclude: FacilityKey): FacRow[] {
  return r.facRows.filter((f) => f.facility !== exclude && f.avail > 0).sort((a, b) => b.avail - a.avail);
}

/** Recommendation for one (sku, facility) pair. */
export function recommendFac(r: Row, fr: FacRow, t: Thresholds): string {
  if (fr.drr === null) {
    return `No ${DRR_WINDOW_LABEL} DRR for ${fr.label} — days of cover cannot be sized until the DRR feed covers this facility.`;
  }
  const target = orderQty(fr.drr, fr.avail, t.alert);
  const sources = transferSources(r, fr.facility);
  const top = sources[0];

  if (fr.avail <= 0) {
    if (top) {
      return `Stock-out at ${fr.label} (DRR ${fr.drr}/day). ${top.label} holds ${fmt(top.avail)} units — raise a transfer of ~${fmt(target)} units to reach the ${t.alert}-day target.`;
    }
    if (r.incoming > 0) {
      return `Stock-out at ${fr.label} with ${fmt(r.incoming)} units incoming (GRN/transit) — expedite receiving, then allocate ~${fmt(target)} units here.`;
    }
    return `Stock-out at ${fr.label} and nothing to pull from. Raise a purchase order for ~${fmt(target)} units (${t.alert}-day target).`;
  }

  const coverTxt = fr.cover !== null ? `${fr.cover.toFixed(1)}d cover` : "no cover";
  if (top) {
    return `${fr.label} has ${fmt(fr.avail)} units (${coverTxt}) against DRR ${fr.drr}/day. ${top.label} holds ${fmt(top.avail)} — transfer ~${fmt(target)} units to restore ${t.alert} days.`;
  }
  return `Reorder ~${fmt(target)} units to restore ${t.alert} days of cover at ${fr.label} (DRR ${fr.drr}/day, ${DRR_WINDOW_LABEL} window).`;
}

/** SKU-level summary — delegates to whichever facility is in the worst shape. */
export function recommend(r: Row, t: Thresholds): string {
  const ranked = [...r.facRows].sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]);
  const worst = ranked.find((f) => isAlerting(f.status)) ?? ranked[0];
  if (!worst) return "No active facility holds this SKU.";
  return recommendFac(r, worst, t);
}

/** Every alerting (sku, facility) pair, most urgent first. */
export type FacAlert = { row: Row; fac: FacRow };

export function facilityAlerts(rows: Row[], facility?: FacilityKey | ""): FacAlert[] {
  const out: FacAlert[] = [];
  for (const row of rows) {
    for (const fac of row.facRows) {
      if (facility && fac.facility !== facility) continue;
      if (isAlerting(fac.status)) out.push({ row, fac });
    }
  }
  return out.sort((a, b) => {
    const sev = SEVERITY[b.fac.status] - SEVERITY[a.fac.status];
    if (sev !== 0) return sev;
    return (a.fac.cover ?? 9999) - (b.fac.cover ?? 9999);
  });
}

export const fmt = (n: number) => n.toLocaleString("en-IN");
export const lakh = (n: number) => `₹${(n / 100000).toFixed(1)}L`;
