# Miraggio · Inventory Control Tower

Hero-SKU replenishment monitor. Reads live inventory from Supabase, computes days of cover
per **(SKU, facility)** pair (facility sellable units ÷ that facility's DRR), and raises alerts
when any warehouse drops below the 20-day buffer for a SKU.

## Modules
- **Login** — role-based demo access: admin / supply_chain / fulfillment (password "miraggio"), role-gated navigation
- **Dashboard** — network summary, health strip, replenishment queue, facility breakdown
- **Inventory** — all 55 hero SKUs, search / status chips / facility filter. Selecting a facility scopes the
  whole page to that warehouse alone: its sellable units, its DRR, its cover, its status — nothing network-wide
- **Replenishment orders** — one order per (SKU, facility), auto-created when a warehouse drops below the alert
  buffer; qty = *that facility's* DRR × 20 − *that facility's* sellable;
  priority tiers (Emergency/Critical/High/Watch); Approve → sends to Fulfillment; Code 128 barcode per SKU
- **Fulfillment** — task queue from approved orders: Start → receive units → Mark completed (stock & cover update live)
- **Barcode scan** — stripped handheld screen: Stock IN/OUT → Ready to scan (Zebra DataWedge keyboard-wedge
  compatible, or type the SKU) → review → confirm; adjusts stock at the chosen facility
- **Alerts** — every (SKU, facility) pair under the buffer, ordered by urgency + notifications bell on every page
- **Settings** — thresholds, team members, data-source status, setup SQL

Operational state (orders, tasks, scan adjustments, session) persists in the browser via localStorage —
demo-grade by design. Phase 2 moves it into Supabase tables.

## Data sources (Supabase project `tqiwfytpenogsxblkvja`)
- `inventory_live` — synced daily 9 AM from Azure. Columns: `id, snapshot_ts, sku, ean,
  available_inventory, not_synced_inventory, inventory_blocked, bad_inventory,
  pending_inventory, facility, synced_at`
- `facility_wise_drr` — daily run rate per SKU **per facility**. Columns: `sku, facility,
  actual_7d_drr, actual_30d_drr, actual_60d_drr, actual_mtd_drr, actual_last_month_drr,
  updated_at` — primary key `(sku, facility)`
- `sales_2026` — raw order-level sales. Not read by the app; kept for DRR derivation upstream.

> The old `sku_drr` table (one global DRR per SKU) no longer exists. DRR is facility-specific.

### Which DRR window drives cover
`actual_30d_drr`, set once in **`lib/facilities.ts`** as `DRR_WINDOW`. Change it there and cover,
alerts and order quantities all follow — it is not repeated anywhere else in the codebase.

### Facility name mapping — important
The two tables do **not** use the same facility strings. A naive join on `facility` matches only a
handful of rows and silently understates DRR for most warehouses. Every facility string from either
table is therefore resolved to a canonical key in `lib/facilities.ts` before inventory and DRR are
joined:

| Canonical | `inventory_live` | `facility_wise_drr` |
|-----------|------------------|---------------------|
| `LUH` — Ludhiana  | `miraggiolife_luh` | `miraggiolife_luh` |
| `BLR` — Bangalore | `MG_BNG`, `Miraggio Bangalore` | `MIR_BGR` |
| `MUM` — Mumbai    | `Miraggio_Mum`, `Miraggio Mum` | `MIR_MUM` |

Matching is case- and separator-insensitive, so future drift like `MG BNG` still resolves.

`Pending_GRN` and `In-Transit` are buckets, not warehouses — their units are **Incoming** and never
sellable, and their (always-zero) DRR rows are ignored.

Everything else in either feed is decommissioned and excluded from every calculation —
`Miraggio_FRK` / `MIR_FRK` / `Miraggio_Holisol_FRK`, `Miraggio_Prozo_GGN5` / `MIR_GRG` /
`Mir_PROZO_GGN4`, `MIR_PRO_BLR5`, `NUFA`, `miraggiolife` / `Miraggiolife`, `Zepto`. Settings →
*Excluded from all calculations* lists them with the stock they still hold, and flags any facility
string the registry does not recognise, so nothing disappears silently.

### Known data gap
As of 28 Jul 2026 only `MIR_BGR` and `MIR_MUM` carry non-zero DRR in `facility_wise_drr`; every
other facility is zero across all five windows — including `miraggiolife_luh`, which holds ~82% of
sellable stock. Those SKU-warehouse pairs read **No DRR**: no cover, no alert, no order. This is an
upstream gap in the job that populates the table, not an app bug. Settings → *DRR coverage per
warehouse* shows the current state.

The app falls back to an embedded 28-Jul snapshot (`lib/seed.ts`) whenever a table can't be read,
so it always renders. The Settings page shows CONNECTED / SNAPSHOT per table.

## One-time Supabase setup (SQL editor)
```sql
create policy "read_inventory" on public.inventory_live
  for select to anon using (true);

-- facility_wise_drr already exists (primary key: sku, facility) — it only needs a read policy
create policy "read_facility_wise_drr" on public.facility_wise_drr
  for select to anon using (true);
```
Note: these policies make the two tables readable to anyone holding the publishable key.
Fine for the demo; add auth before production.

## Run locally
```bash
npm install
npm run dev   # http://localhost:3000
```

## Deploy to Vercel
1. Push this folder to a Git repo (or `vercel` CLI / drag-drop import on vercel.com/new)
2. Framework preset: Next.js — no extra config needed
3. Optional env vars (defaults are baked in): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_KEY`

## Status logic
Applied per **(SKU, facility)** against that facility's own DRR. A SKU can be healthy in Ludhiana
and critical in Mumbai; the SKU-level pill on the dashboard shows the worst warehouse.

| Status     | Rule                                        |
|------------|---------------------------------------------|
| Stock-out  | 0 sellable units at this facility (with DRR)|
| Critical   | cover ≤ 5 days                              |
| Replenish  | cover < 15 days                             |
| Watch      | cover < 20 days (alert buffer)               |
| Healthy    | cover ≥ 20 days                             |
| No DRR     | no positive DRR for this (sku, facility)     |

A facility with no DRR stays quiet rather than raising a stock-out it cannot justify — no demand
signal means no cover figure. Its stock is still counted as sellable.

Sellable excludes `Pending_GRN` and `In-Transit` (shown as **Incoming**) and excludes the
decommissioned facilities listed above. Blocked and bad stock are tracked separately. Data refreshes
automatically every 60 s plus a manual Refresh.

Operational state (orders, tasks, transfers, scan adjustments) lives in `localStorage` under
`mct-ops-v2` — v1 state was per-SKU and is dropped on first load.
