# Miraggio · Inventory Control Tower

Hero-SKU replenishment monitor. Reads live inventory from Supabase, computes days of cover
(sellable units ÷ DRR), and raises alerts when any hero SKU drops below the 20-day buffer.

## Pages
- **Dashboard** — network summary, health strip, replenishment queue, facility breakdown
- **Inventory** — all 55 hero SKUs, search / status chips / facility filter, master–detail pane
- **Alerts** — every SKU under the buffer, ordered by urgency, with a recommended action
- **Settings** — editable thresholds (alert 20d / replenish 15d / critical 5d) + connection status

## Data sources (Supabase project `tqiwfytpenogsxblkvja`)
- `inventory_live` — synced daily 9 AM from Azure (already exists)
- `sku_drr` — daily run rate per SKU: `sku text primary key, drr numeric` (create it; SQL below)

The app falls back to an embedded 14-Jul snapshot whenever a table can't be read,
so it always renders. The Settings page shows CONNECTED / SNAPSHOT per table.

## One-time Supabase setup (SQL editor)
```sql
create policy "read_inventory" on public.inventory_live
  for select to anon using (true);

create table if not exists public.sku_drr (
  sku text primary key,
  drr numeric not null check (drr >= 0),
  updated_at timestamptz default now()
);
alter table public.sku_drr enable row level security;
create policy "read_drr" on public.sku_drr
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
| Status     | Rule                          |
|------------|-------------------------------|
| Stock-out  | 0 sellable units              |
| Critical   | cover ≤ 5 days                |
| Replenish  | cover < 15 days               |
| Watch      | cover < 20 days (alert buffer)|
| Healthy    | cover ≥ 20 days               |
| No DRR     | no row in `sku_drr` yet       |

Sellable excludes `Pending_GRN` and `In-Transit` (shown as **Incoming**). Blocked and bad
stock are tracked separately. Data refreshes automatically every 60 s plus a manual Refresh.
