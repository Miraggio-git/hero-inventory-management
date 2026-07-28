"use client";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Topbar, Kpi, Panel, HealthStrip, StatusPill, FacStrip, facColor } from "@/components/ui";
import { fmt, lakh, facilityAlerts, facilityLabel, DRR_WINDOW_LABEL } from "@/lib/data";

export default function Dashboard() {
  const { snap, rows, thresholds } = useStore();
  if (!snap)
    return (
      <div className="flex h-[70vh] items-center justify-center text-sub">Loading inventory…</div>
    );

  const sellable = rows.reduce((s, r) => s + r.avail, 0);
  const incoming = rows.reduce((s, r) => s + r.incoming, 0);
  const held = rows.reduce((s, r) => s + r.blocked + r.bad, 0);

  // Everything below the buffer is now a (sku, facility) pair — DRR is facility-specific.
  const alerting = facilityAlerts(rows);
  const critCount = alerting.filter((a) => a.fac.status === "Stock-out" || a.fac.status === "Critical").length;

  // health strip over facility rows, so a healthy network cannot hide a starving warehouse
  const facStatuses = rows.flatMap((r) => r.facRows.map((f) => f.status));
  const noDrrPairs = facStatuses.filter((s) => s === "No DRR").length;

  const facTotals = snap.facilities.map((f) => {
    const frs = rows.map((r) => r.facRows.find((x) => x.facility === f)!).filter(Boolean);
    return {
      f,
      units: frs.reduce((s, x) => s + x.avail, 0),
      drr: Number(frs.reduce((s, x) => s + (x.drr ?? 0), 0).toFixed(2)),
      alerts: frs.filter((x) => x.status !== "Healthy" && x.status !== "No DRR").length,
    };
  });
  const maxFac = Math.max(...facTotals.map((x) => x.units), 1);

  const movers = [...rows].sort((a, b) => a.rank - b.rank).slice(0, 6);

  return (
    <>
      <Topbar
        title="Inventory control tower"
        sub={`${rows.length} hero SKUs across ${snap.facilities.length} warehouses · alert when a facility drops below ${thresholds.alert} days of its own cover`}
      />

      {/* Fixoria-style summary band */}
      <Panel className="mb-5">
        <div className="flex flex-col gap-5 px-6 py-5 lg:flex-row lg:items-center">
          <div className="lg:w-56">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sub">Sellable units</div>
            <div className="mt-1 text-[32px] font-bold leading-none tracking-tight">{fmt(sellable)}</div>
            <div className="mt-1.5 text-[12px] text-sub">across {facTotals.filter((x) => x.units > 0).length} active warehouses</div>
          </div>
          <div className="hidden h-14 w-px bg-line lg:block" />
          <div className="flex-1">
            <div className="mb-2 text-[12.5px] text-gray-600">
              <strong>{facStatuses.length}</strong> SKU-warehouse pairs
              {snap.drrLive ? ` · ${DRR_WINDOW_LABEL} DRR` : " · DRR table unreachable — statuses limited to stock-outs"}
            </div>
            <HealthStrip statuses={facStatuses} />
          </div>
        </div>
      </Panel>

      <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Needs action" value={String(alerting.length)} note={`SKU-warehouse pairs below ${thresholds.alert} days`} tone={alerting.length ? "low" : "ok"} />
        <Kpi label="Critical / stock-out" value={String(critCount)} note="replenish immediately" tone={critCount ? "crit" : "ok"} />
        <Kpi label="Incoming" value={fmt(incoming)} note="pending GRN + in-transit" />
        <Kpi label="Blocked + bad" value={fmt(held)} note="not sellable — review" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-5">
        {/* At-risk queue — per warehouse */}
        <Panel
          title="Replenishment queue"
          className="lg:col-span-3"
          right={<Link href="/alerts" className="text-[12px] font-semibold text-brand hover:underline">Open alerts →</Link>}
        >
          {alerting.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px] text-sub">
              {snap.drrLive
                ? "Every warehouse is above its buffer. Nothing to do."
                : "facility_wise_drr could not be read — days-of-cover alerts are inactive."}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {alerting.slice(0, 6).map(({ row, fac }) => (
                <li key={`${row.sku}-${fac.facility}`} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-[13px] font-semibold">{row.sku}</span>
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: facColor(fac.facility) }} />
                        {fac.label}
                      </span>
                      <StatusPill s={fac.status} />
                    </div>
                    <div className="mt-1 truncate text-[12px] text-sub">
                      {fmt(fac.avail)} units here · DRR {fac.drr ?? "—"}/day
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[15px] font-bold">{fac.cover !== null ? `${fac.cover.toFixed(1)}d` : "—"}</div>
                    <div className="text-[11px] text-sub">at {fac.facility}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Facility breakdown */}
        <Panel title="Sellable units by warehouse" className="lg:col-span-2">
          <div className="flex flex-col gap-3 px-5 py-4">
            {facTotals.map(({ f, units, drr, alerts }) => (
              <div key={f}>
                <div className="mb-1 flex items-center justify-between text-[12px]">
                  <span className="flex items-center gap-2 text-gray-700">
                    <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />
                    {facilityLabel(f)}
                  </span>
                  <span className="font-semibold">{fmt(units)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full" style={{ width: `${(units / maxFac) * 100}%`, background: facColor(f) }} />
                </div>
                <div className="mt-1 text-[11px] text-sub">
                  DRR {drr}/day · {alerts} SKU{alerts === 1 ? "" : "s"} below buffer
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
                <th className="px-5 py-3">Worst warehouse</th>
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

      {noDrrPairs > 0 && snap.drrLive && (
        <p className="mt-4 text-[12px] text-sub">
          {noDrrPairs} of {facStatuses.length} SKU-warehouse pairs have no {DRR_WINDOW_LABEL} DRR in{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">facility_wise_drr</code> — they show
          as “No DRR” and raise no alert. See Settings → Data sources for the per-warehouse breakdown.
        </p>
      )}
    </>
  );
}
