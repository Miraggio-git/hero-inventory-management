"use client";
import { useStore, DEMO_USER } from "@/lib/store";
import { Topbar, Panel } from "@/components/ui";
import { SUPABASE_URL, DRR_WINDOW, DRR_WINDOW_LABEL, fmt } from "@/lib/data";
import { FACILITIES } from "@/lib/facilities";

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

  const totalSkus = snap?.rows.length ?? 0;
  const coverage = snap?.drrCoverage ?? [];
  const excluded = snap?.excluded ?? [];
  const excludedUnits = excluded.reduce((s, e) => s + e.units, 0);
  const unmapped = snap?.unmappedDrr ?? [];

  return (
    <>
      <Topbar title="Settings" sub="Buffers, data sources and connection status" />

      <div className="grid max-w-3xl gap-4">
        <Panel title="Cover thresholds">
          <div className="divide-y divide-line">
            <Num label="Alert buffer" value={thresholds.alert} hint="Below this, a SKU-warehouse pair enters the alert queue (Watch)" onChange={(n) => setThresholds({ ...thresholds, alert: n })} />
            <Num label="Replenish" value={thresholds.replenish} hint="Below this, a transfer or reorder is recommended" onChange={(n) => setThresholds({ ...thresholds, replenish: n })} />
            <Num label="Critical" value={thresholds.critical} hint="At or below this, act today" onChange={(n) => setThresholds({ ...thresholds, critical: n })} />
          </div>
        </Panel>

        <Panel title="Data sources">
          <div className="divide-y divide-line text-[13px]">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-semibold">inventory_live</div>
                <div className="mt-0.5 text-[12px] text-sub">Sellable, blocked, bad &amp; incoming per facility · synced from Azure daily at 9 AM</div>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${snap?.live ? "bg-ok-bg text-ok" : "bg-gray-100 text-gray-500"}`}>
                {snap?.live ? "CONNECTED" : "SNAPSHOT"}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <div className="font-mono font-semibold">facility_wise_drr</div>
                <div className="mt-0.5 text-[12px] text-sub">
                  Daily run rate per SKU <strong>per facility</strong> — drives days-of-cover · primary key (sku, facility) ·
                  window in use: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">{DRR_WINDOW}</code>
                </div>
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

        {/* How much of each warehouse actually has a DRR number */}
        <Panel title={`DRR coverage per warehouse (${DRR_WINDOW_LABEL})`}>
          <ul className="divide-y divide-line text-[13px]">
            {coverage.map((c) => {
              const gap = totalSkus - c.skusWithDrr;
              return (
                <li key={c.facility} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <div className="font-semibold">{c.label} <span className="font-mono text-[11.5px] text-sub">{c.facility}</span></div>
                    <div className="mt-0.5 text-[12px] text-sub">
                      {c.skusWithDrr} of {totalSkus} hero SKUs have a DRR · total {c.totalDrr}/day
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                    c.skusWithDrr === 0 ? "bg-crit-bg text-crit" : gap > 0 ? "bg-watch-bg text-watch" : "bg-ok-bg text-ok"}`}>
                    {c.skusWithDrr === 0 ? "NO DATA" : gap > 0 ? `${gap} MISSING` : "COMPLETE"}
                  </span>
                </li>
              );
            })}
          </ul>
          {coverage.some((c) => c.skusWithDrr === 0) && (
            <div className="border-t border-line px-5 py-3.5 text-[12px] leading-relaxed text-gray-700">
              A warehouse with <strong>no DRR data</strong> cannot have days-of-cover computed. Its SKUs read “No DRR”,
              raise no replenishment order, and its stock is still counted as sellable. Fix the upstream job that
              populates <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">facility_wise_drr</code>{" "}
              to close the gap — the app needs no change once the rows arrive.
            </div>
          )}
        </Panel>

        {/* Facility name mapping — the two feeds do not agree, so it is explicit */}
        <Panel title="Facility name mapping">
          <div className="px-5 py-4 text-[12.5px] leading-relaxed text-gray-700">
            <p className="mb-3">
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">inventory_live</code> and{" "}
              <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">facility_wise_drr</code> use
              different names for the same warehouse, so every facility string is resolved to a canonical key before
              inventory and DRR are joined.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-line text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">
                    <th className="py-2 pr-3">Canonical</th>
                    <th className="py-2 pr-3">inventory_live</th>
                    <th className="py-2">facility_wise_drr</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {FACILITIES.map((f) => (
                    <tr key={f.key}>
                      <td className="py-2 pr-3 font-semibold">{f.label} <span className="font-mono text-[11px] text-sub">{f.key}</span></td>
                      <td className="py-2 pr-3 font-mono text-[11px] text-gray-600">{f.invAliases.join(", ")}</td>
                      <td className="py-2 font-mono text-[11px] text-gray-600">{f.drrAliases.join(", ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Panel>

        {/* Anything the app deliberately left out */}
        {(excluded.length > 0 || unmapped.length > 0) && (
          <Panel title="Excluded from all calculations">
            <div className="px-5 py-4 text-[12.5px] leading-relaxed text-gray-700">
              {excluded.length > 0 && (
                <>
                  <p className="mb-2">
                    These <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">inventory_live</code>{" "}
                    facilities are decommissioned or unused. Their stock — <strong>{fmt(excludedUnits)} units</strong> — is
                    excluded from sellable totals, cover and replenishment.
                  </p>
                  <ul className="mb-3 divide-y divide-line rounded-lg border border-line">
                    {excluded.map((e) => (
                      <li key={e.facility} className="flex items-center justify-between px-3 py-2">
                        <span className="font-mono text-[11.5px]">{e.facility}</span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{fmt(e.units)} units</span>
                          {!e.known && <span className="rounded-full bg-watch-bg px-2 py-0.5 text-[10px] font-bold text-watch">UNRECOGNISED</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {unmapped.length > 0 && (
                <p>
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">facility_wise_drr</code> also
                  carries DRR rows for facilities with no active warehouse: {" "}
                  <span className="font-mono text-[11.5px]">{unmapped.join(", ")}</span>. Those rows are ignored.
                </p>
              )}
            </div>
          </Panel>
        )}

        <Panel title="Team members">
          <ul className="divide-y divide-line">
            <li className="flex items-center justify-between px-5 py-3.5 text-[13px]">
              <div>
                <div className="font-semibold">{DEMO_USER.name}</div>
                <div className="text-[12px] text-sub">{DEMO_USER.email}</div>
              </div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-[10.5px] font-bold tracking-wide text-gray-600">TEAM LOGIN</span>
            </li>
          </ul>
          <div className="border-t border-line px-5 py-3 text-[12px] text-sub">Demo access — shared password. Move to Supabase Auth before production.</div>
        </Panel>

        <Panel title="Setup notes">
          <div className="px-5 py-4 text-[12.5px] leading-relaxed text-gray-700">
            <p className="mb-2">Both tables already exist. To activate live reads, run once in the Supabase SQL editor:</p>
            <pre className="overflow-x-auto rounded-lg bg-ink p-3.5 font-mono text-[11.5px] leading-relaxed text-gray-100">{`-- read access for the dashboard (publishable key)
create policy "read_inventory" on public.inventory_live
  for select to anon using (true);

-- facility-wise DRR: primary key (sku, facility)
create policy "read_facility_wise_drr" on public.facility_wise_drr
  for select to anon using (true);`}</pre>
            <p className="mt-2.5">These make both tables publicly readable to anyone holding the publishable key — fine for an internal demo, revisit before production.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
