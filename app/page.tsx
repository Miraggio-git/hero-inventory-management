"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Topbar, Kpi, Panel, HealthStrip, StatusPill, FacStrip, facColor } from "@/components/ui";
import { fmt, lakh, recommend } from "@/lib/data";

export default function Dashboard() {
  const { snap, thresholds } = useStore();
  if (!snap)
    return (
      <div className="flex h-[70vh] items-center justify-center text-sub">Loading inventory…</div>
    );

  const rows = snap.rows;
  const sellable = rows.reduce((s, r) => s + r.avail, 0);
  const incoming = rows.reduce((s, r) => s + r.incoming, 0);
  const held = rows.reduce((s, r) => s + r.blocked + r.bad, 0);
  const alerting = rows
    .filter((r) => r.status === "Stock-out" || r.status === "Critical" || r.status === "Replenish" || r.status === "Watch")
    .sort((a, b) => (a.cover ?? (a.avail <= 0 ? -1 : 999)) - (b.cover ?? (b.avail <= 0 ? -1 : 999)));
  const critCount = rows.filter((r) => r.status === "Stock-out" || r.status === "Critical").length;
  const noDrr = rows.filter((r) => r.status === "No DRR").length;

  const facTotals = snap.facilities
    .map((f) => ({ f, units: rows.reduce((s, r) => s + (r.fac[f] || 0), 0) }))
    .filter((x) => x.units > 0);
  const maxFac = Math.max(...facTotals.map((x) => x.units), 1);

  const movers = [...rows].sort((a, b) => a.rank - b.rank).slice(0, 6);

  return (
    <>
      <Topbar
        title="Inventory control tower"
        sub={`${rows.length} hero SKUs · alert when cover drops below ${thresholds.alert} days`}
      />

      {/* Fixoria-style summary band */}
      <Panel className="mb-5">
        <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center">
          <div className="lg:w-56">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sub">Sellable units</div>
            <div className="mt-1 text-[32px] font-bold leading-none tracking-tight">{fmt(sellable)}</div>
            <div className="mt-1.5 text-[12px] text-sub">across {facTotals.length} facilities</div>
          </div>
          <div className="hidden h-14 w-px bg-line lg:block" />
          <div className="flex-1">
            <div className="mb-2 text-[12.5px] text-gray-600">
              <strong>{rows.length}</strong> hero SKUs
              {snap.drrLive ? "" : " · DRR table not found yet — statuses below are limited to stock-outs"}
            </div>
            <HealthStrip rows={rows} />
          </div>
        </div>
      </Panel>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Needs action" value={String(alerting.length)} note={`cover below ${thresholds.alert} days`} tone={alerting.length ? "low" : "ok"} />
        <Kpi label="Critical / stock-out" value={String(critCount)} note="replenish immediately" tone={critCount ? "crit" : "ok"} />
        <Kpi label="Incoming" value={fmt(incoming)} note="pending GRN + in-transit" />
        <Kpi label="Blocked + bad" value={fmt(held)} note="not sellable — review" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-5">
        {/* At-risk queue */}
        <Panel
          title="Replenishment queue"
          className="lg:col-span-3"
          right={<Link href="/alerts" className="text-[12px] font-semibold text-brand hover:underline">Open alerts →</Link>}
        >
          {alerting.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-sub">
              {snap.drrLive ? "Everything is above the buffer. Nothing to do." : "Add the sku_drr table to activate days-of-cover alerts."}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {alerting.slice(0, 6).map((r) => (
                <li key={r.sku} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[13px] font-semibold">{r.sku}</span>
                      <StatusPill s={r.status} />
                    </div>
                    <div className="mt-1 truncate text-[12px] text-sub">{recommend(r, thresholds)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold">{r.cover !== null ? `${r.cover.toFixed(1)}d` : "—"}</div>
                    <div className="text-[11px] text-sub">{fmt(r.avail)} units</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Facility breakdown */}
        <Panel title="Sellable units by facility" className="lg:col-span-2">
          <div className="flex flex-col gap-3 px-5 py-4">
            {facTotals.map(({ f, units }) => (
              <div key={f}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 font-mono text-gray-700">
                    <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />
                    {f}
                  </span>
                  <span className="font-semibold">{fmt(units)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${(units / maxFac) * 100}%`, background: facColor(f) }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Top movers */}
      <Panel title="Top hero SKUs by lifetime sales" right={<Link href="/inventory" className="text-[12px] font-semibold text-brand hover:underline">Full inventory →</Link>}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">
                <th className="px-5 py-3">#</th>
                <th className="px-3 py-3">SKU</th>
                <th className="px-3 py-3">Lifetime sales</th>
                <th className="px-3 py-3 text-right">Sellable</th>
                <th className="px-3 py-3">Where it sits</th>
                <th className="px-3 py-3 text-right">Cover</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movers.map((r) => (
                <tr key={r.sku} className="hover:bg-gray-50/70">
                  <td className="px-5 py-3 font-mono text-[12px] text-sub">{r.rank}</td>
                  <td className="px-3 py-3 font-mono font-semibold">{r.sku}</td>
                  <td className="px-3 py-3 text-sub">{lakh(r.sales)}</td>
                  <td className="px-3 py-3 text-right font-semibold">{fmt(r.avail)}</td>
                  <td className="px-3 py-3"><FacStrip r={r} /></td>
                  <td className="px-3 py-3 text-right font-semibold">{r.cover !== null ? `${r.cover.toFixed(0)}d` : "—"}</td>
                  <td className="px-5 py-3"><StatusPill s={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {noDrr > 0 && snap.drrLive && (
        <p className="mt-4 text-[12px] text-sub">{noDrr} SKUs have no DRR row yet — they show as “No DRR” until added to sku_drr.</p>
      )}
    </>
  );
}
