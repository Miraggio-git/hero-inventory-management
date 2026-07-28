/**
 * Canonical facility registry.
 *
 * `inventory_live` and `facility_wise_drr` name the same warehouse differently — a naive
 * join on `facility` matches only a handful of rows and silently understates DRR. Every
 * facility string coming out of either table is therefore resolved to a canonical key
 * here before it is used anywhere in the app.
 *
 * Verified against the live tables on 28 Jul 2026:
 *
 *   canonical | inventory_live                      | facility_wise_drr
 *   ----------|-------------------------------------|-------------------
 *   LUH       | miraggiolife_luh                    | miraggiolife_luh
 *   BLR       | MG_BNG, Miraggio Bangalore          | MIR_BGR
 *   MUM       | Miraggio_Mum, Miraggio Mum          | MIR_MUM
 *
 * Everything else in either table is decommissioned or a pseudo-facility (see
 * LEGACY_FACILITIES / INCOMING_FACS) and is excluded from all cover, DRR and
 * replenishment maths.
 */

/**
 * The `facility_wise_drr` column that drives days-of-stock. Single source of truth —
 * change the window here and it changes everywhere (cover, alerts, order quantities).
 */
export const DRR_WINDOW = "actual_30d_drr" as const;
export const DRR_WINDOW_LABEL = "30-day";

/** Every DRR column the table offers, for reference / future switching. */
export const DRR_WINDOW_OPTIONS = [
  "actual_7d_drr",
  "actual_30d_drr",
  "actual_60d_drr",
  "actual_mtd_drr",
  "actual_last_month_drr",
] as const;
export type DrrWindow = (typeof DRR_WINDOW_OPTIONS)[number];

export type FacilityKey = "LUH" | "BLR" | "MUM";

export type FacilityDef = {
  key: FacilityKey;
  label: string;
  /** facility strings seen in inventory_live */
  invAliases: string[];
  /** facility strings seen in facility_wise_drr */
  drrAliases: string[];
};

/** Active warehouses, in the order they should be displayed. */
export const FACILITIES: FacilityDef[] = [
  { key: "LUH", label: "Ludhiana",  invAliases: ["miraggiolife_luh"],               drrAliases: ["miraggiolife_luh"] },
  { key: "BLR", label: "Bangalore", invAliases: ["MG_BNG", "Miraggio Bangalore"],   drrAliases: ["MIR_BGR"] },
  { key: "MUM", label: "Mumbai",    invAliases: ["Miraggio_Mum", "Miraggio Mum"],   drrAliases: ["MIR_MUM"] },
];

export const FACILITY_KEYS: FacilityKey[] = FACILITIES.map((f) => f.key);

/**
 * Buckets in the inventory feed that are not warehouses. Their units are "incoming",
 * never sellable. `facility_wise_drr` also carries rows for these — always zero, and
 * meaningless — so they are excluded from the DRR join too.
 */
export const INCOMING_FACS = ["Pending_GRN", "In-Transit"] as const;
export type IncomingBucket = "grn" | "transit";

/**
 * Facility strings that exist in the feeds but are decommissioned / no longer used.
 * Listed explicitly so the app can report them rather than silently swallowing stock.
 */
export const LEGACY_FACILITIES = [
  "Miraggio_FRK",          // Farrukhnagar — wound down, still reporting stock
  "MIR_FRK",               // its DRR counterpart
  "Miraggio_Holisol_FRK",  // Holisol-operated FRK
  "Miraggio_Prozo_GGN5",   // Prozo Gurgaon
  "MIR_GRG",
  "Mir_PROZO_GGN4",
  "MIR_PRO_BLR5",          // Prozo Bangalore
  "NUFA",
  "miraggiolife",          // D2C storefront codes, zero stock
  "Miraggiolife",
  "Zepto",
];

/** Loose match so future case / separator drift resolves without a code change. */
const norm = (s: string) => s.toLowerCase().replace(/[\s_\-.]+/g, "");

const INV_LOOKUP = new Map<string, FacilityKey>();
const DRR_LOOKUP = new Map<string, FacilityKey>();
for (const f of FACILITIES) {
  for (const a of f.invAliases) INV_LOOKUP.set(norm(a), f.key);
  for (const a of f.drrAliases) DRR_LOOKUP.set(norm(a), f.key);
}

const INCOMING_LOOKUP = new Map<string, IncomingBucket>([
  [norm("Pending_GRN"), "grn"],
  [norm("In-Transit"), "transit"],
]);

const LEGACY_LOOKUP = new Set(LEGACY_FACILITIES.map(norm));

/** inventory_live facility -> canonical key, or null if not an active warehouse. */
export function canonicalInvFacility(raw: string | null | undefined): FacilityKey | null {
  if (!raw) return null;
  return INV_LOOKUP.get(norm(raw)) ?? null;
}

/** facility_wise_drr facility -> canonical key, or null if not an active warehouse. */
export function canonicalDrrFacility(raw: string | null | undefined): FacilityKey | null {
  if (!raw) return null;
  return DRR_LOOKUP.get(norm(raw)) ?? null;
}

/** "Pending_GRN" -> "grn", "In-Transit" -> "transit", anything else -> null. */
export function incomingBucket(raw: string | null | undefined): IncomingBucket | null {
  if (!raw) return null;
  return INCOMING_LOOKUP.get(norm(raw)) ?? null;
}

/** True when the string is a known-decommissioned facility (not an unknown one). */
export function isLegacyFacility(raw: string | null | undefined): boolean {
  return !!raw && LEGACY_LOOKUP.has(norm(raw));
}

export const FACILITY_LABEL: Record<FacilityKey, string> = FACILITIES.reduce(
  (acc, f) => ({ ...acc, [f.key]: f.label }),
  {} as Record<FacilityKey, string>
);

export const facilityLabel = (k: FacilityKey) => FACILITY_LABEL[k] ?? k;
