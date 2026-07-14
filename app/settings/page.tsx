"use client";
import { useStore } from "@/lib/store";
import { Topbar, Panel } from "@/components/ui";
import { SUPABASE_URL } from "@/lib/data";

export default function Settings() {
  const { snap, thresholds, setThresholds } = useStore();

  const Num = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint: string }) => (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <div className="text-[13.5px] font-semibold">{label}</div>
        <div className="mt-0.5 text-[12px] text-sub">{hint}</div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number" min={0} value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-20 rounded-lg border border-line px-3 py-2 text-right font-mono text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <span className="text-[12px] text-sub">days</span>
      </div>
    </div>
  );

  return (
    <>
      <Topbar title="Settings" sub="Buffers, data sources and connection status" />

      <div className="grid max-w-3xl gap-4">
        <Panel title="Cover thresholds">
          <div className="divide-y divide-line">
            <Num label="Alert buffer" value={thresholds.alert} hint="Below this, a SKU enters the alert queue (Watch)" onChange={(n) => setThresholds({ ...thresholds, alert: n })} />
            <Num label="Replenish" value={thresholds.replenish} hint="Below this, a transfer or reorder is recommended" onChange={(n) => setThresholds({ ...thresholds, replenish: n })} />
            <Num label="Critical" value={thresholds.critical} hint="At or below this, act today" onChange={(n) => setThresholds({ ...thresholds, critical: n })} />
          </div>
        </Panel>

        <Panel title="Data sources">
          <div className="divide-y divide-line text-[13px]">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-semibold">inventory_live</div>
                <div className="mt-0.5 text-[12px] text-sub">Sellable, blocked, bad & incoming per facility · synced from Azure daily at 9 AM</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${snap?.live ? "bg-ok-bg text-ok" : "bg-gray-100 text-gray-500"}`}>
                {snap?.live ? "CONNECTED" : "SNAPSHOT"}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-semibold">sku_drr</div>
                <div className="mt-0.5 text-[12px] text-sub">Daily run rate per SKU — drives days-of-cover · columns: sku (text), drr (numeric)</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${snap?.drrLive ? "bg-ok-bg text-ok" : "bg-watch-bg text-watch"}`}>
                {snap?.drrLive ? "CONNECTED" : "NOT FOUND"}
              </span>
            </div>
            <div className="px-5 py-4 text-[12px] text-sub">
              Project: <span className="font-mono">{SUPABASE_URL.replace("https://", "")}</span>
              {snap && <> · Snapshot: <span className="font-mono">{new Date(snap.ts).toLocaleString("en-IN")}</span></>}
            </div>
          </div>
        </Panel>

        <Panel title="Setup notes">
          <div className="px-5 py-4 text-[12.5px] leading-relaxed text-gray-700">
            <p className="mb-2">To activate live reads, run once in the Supabase SQL editor:</p>
            <pre className="overflow-x-auto rounded-lg bg-ink p-3.5 font-mono text-[11.5px] leading-relaxed text-gray-100">{`-- read access for the dashboard (publishable key)
create policy "read_inventory" on public.inventory_live
  for select to anon using (true);

-- DRR table + read access
create table if not exists public.sku_drr (
  sku text primary key,
  drr numeric not null check (drr >= 0),
  updated_at timestamptz default now()
);
alter table public.sku_drr enable row level security;
create policy "read_drr" on public.sku_drr
  for select to anon using (true);`}</pre>
            <p className="mt-2.5">These make both tables publicly readable to anyone holding the publishable key — fine for an internal demo, revisit before production.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
