"use client";
import { Fragment, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Topbar, Panel, StatusPill, FacStrip, facColor } from "@/components/ui";
import {
  fmt, lakh, recommend, recommendFac, facilityLabel, DRR_WINDOW_LABEL,
  type Row, type Status, type FacilityKey, type Thresholds,
} from "@/lib/data";

const CHIP_ORDER: (Status | "All")[] = ["All", "Stock-out", "Critical", "Replenish", "Watch", "Healthy", "No DRR"];
type SortKey = "rank" | "sku" | "avail" | "cover" | "incoming";

/** One table line — network-wide, or scoped to a single warehouse. */
type ViewRow = {
  row: Row;
  avail: number;
  drr: number | null;
  cover: number | null;
  status: Status;
  incoming: number;
  rank: number;
  sku: string;
};

export default function Inventory() {
  const { snap, rows, thresholds } = useStore();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Status | "All">("All");
  const [fac, setFac] = useState<FacilityKey | "">("");
  const [sortKey, setSortKey] = useState<SortKey>("cover");
  const [asc, setAsc] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  const facilities = snap?.facilities ?? [];

  /**
   * With a facility selected the page becomes that warehouse only: its own sellable
   * units, its own DRR, its own cover and status. Nothing network-wide is mixed in.
   */
  const view: ViewRow[] = useMemo(() => {
    if (!fac) {
      return rows.map((row) => ({
        row, avail: row.avail, drr: row.drr, cover: row.cover, status: row.status,
        incoming: row.incoming, rank: row.rank, sku: row.sku,
      }));
    }
    return rows
      .map((row) => {
        const fr = row.facRows.find((f) => f.facility === fac);
        if (!fr) return null;
        return {
          row, avail: fr.avail, drr: fr.drr, cover: fr.cover, status: fr.status,
          incoming: row.incoming, rank: row.rank, sku: row.sku,
        } as ViewRow;
      })
      .filter((v): v is ViewRow => !!v && (v.avail > 0 || v.drr !== null));
  }, [rows, fac]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: view.length };
    for (const v of view) c[v.status] = (c[v.status] || 0) + 1;
    return c;
  }, [view]);

  const filtered = useMemo(() => {
    let d = view;
    if (q) d = d.filter((v) => v.sku.toUpperCase().includes(q.trim().toUpperCase()));
    if (chip !== "All") d = d.filter((v) => v.status === chip);
    const dir = asc ? 1 : -1;
    return [...d].sort((a, b) => {
      if (sortKey === "sku") return a.sku.localeCompare(b.sku) * dir;
      const av = sortKey === "cover" ? a.cover ?? (a.avail <= 0 ? -1 : 9999) : (a as any)[sortKey];
      const bv = sortKey === "cover" ? b.cover ?? (b.avail <= 0 ? -1 : 9999) : (b as any)[sortKey];
      return (av - bv) * dir;
    });
  }, [view, q, chip, sortKey, asc]);

  // 3 fixed cols + facility columns (only in network view) + incoming/DRR/cover/status
  const nCols = fac ? 7 : 7 + facilities.length;

  // Per-warehouse rollup: sellable units, SKUs held, and DRR coverage.
  const facSummary = useMemo(
    () =>
      facilities.map((f) => {
        const frs = rows.map((r) => r.facRows.find((x) => x.facility === f)).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.find>>[];
        return {
          f,
          units: frs.reduce((s, x: any) => s + x.avail, 0),
          skus: frs.filter((x: any) => x.avail > 0).length,
          withDrr: frs.filter((x: any) => x.drr !== null).length,
        };
      }),
    [rows, facilities]
  );

  const selectedSummary = fac ? facSummary.find((x) => x.f === fac) : null;

  const sortBtn = (k: SortKey, label: string, right = false) => (
    <button
      onClick={() => (sortKey === k ? setAsc(!asc) : (setSortKey(k), setAsc(true)))}
      className={`inline-flex items-center gap-1 ${right ? "justify-end" : ""} font-semibold uppercase tracking-[0.12em] hover:text-ink`}
    >
      {label}
      {sortKey === k && <span className="text-brand">{asc ? "↑" : "↓"}</span>}
    </button>
  );

  if (!snap) return <div className="flex h-[70vh] items-center justify-center text-sub">Loading inventory…</div>;

  return (
    <>
      <Topbar
        title={fac ? `Inventory · ${facilityLabel(fac)}` : "Inventory"}
        sub={
          fac
            ? `${facilityLabel(fac)} only — sellable units, ${DRR_WINDOW_LABEL} DRR and cover for this warehouse alone.`
            : "Every hero SKU across the network — warehouse-by-warehouse. Click a row to open the SKU detail right there."
        }
      />

      {/* warehouse rollup — click to scope the whole page to one warehouse */}
      <Panel className="mb-4">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-5 py-4">
          {facSummary.map(({ f, units, skus, withDrr }) => {
            const active = fac === f;
            return (
              <button
                key={f}
                onClick={() => { setFac(active ? "" : f); setChip("All"); setSel(null); }}
                title={active ? "Show the whole network" : `Show ${facilityLabel(f)} only`}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors ${active ? "bg-brand-soft ring-1 ring-brand/30" : "hover:bg-gray-50"}`}
              >
                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: facColor(f) }} />
                <span>
                  <span className="block text-[12.5px] font-semibold text-gray-700">
                    {facilityLabel(f)} <span className="font-mono text-[11px] text-sub">{f}</span>
                  </span>
                  <span className="block text-[11px] text-sub">
                    <strong className="text-ink">{fmt(units)}</strong> units · {skus} SKUs · {withDrr} with DRR
                  </span>
                </span>
              </button>
            );
          })}
          {fac && (
            <button
              onClick={() => { setFac(""); setChip("All"); setSel(null); }}
              className="ml-auto rounded-lg border border-line px-3 py-1.5 text-[12px] font-semibold text-sub hover:bg-gray-50"
            >
              ✕ Clear — show whole network
            </button>
          )}
        </div>
      </Panel>

      {/* the selected warehouse has no usable DRR — say so plainly */}
      {selectedSummary && selectedSummary.withDrr === 0 && (
        <Panel className="mb-4">
          <div className="px-5 py-4 text-[12.5px] leading-relaxed text-gray-700">
            <strong>{facilityLabel(fac as FacilityKey)} has no {DRR_WINDOW_LABEL} DRR in <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[11.5px]">facility_wise_drr</code>.</strong>{" "}
            Every row below reads <em>No DRR</em> — cover cannot be computed and no replenishment is raised for this
            warehouse until the DRR feed populates it. Stock figures are live and correct.
          </div>
        </Panel>
      )}

      {/* controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search SKU code…"
          className="w-64 rounded-lg border border-line bg-white px-3.5 py-2 font-mono text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15"
        />
        <select
          value={fac}
          onChange={(e) => { setFac(e.target.value as FacilityKey | ""); setChip("All"); setSel(null); }}
          className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
        >
          <option value="">All facilities (network view)</option>
          {facilities.map((f) => (
            <option key={f} value={f}>{facilityLabel(f)} — {f}</option>
          ))}
        </select>
        {fac && (
          <span className="rounded-full bg-brand-soft px-3 py-1.5 text-[11.5px] font-semibold text-brand">
            Showing {facilityLabel(fac)} only
          </span>
        )}
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {CHIP_ORDER.map((c) => {
          const n = counts[c] || 0;
          if (c !== "All" && n === 0) return null;
          const active = chip === c;
          return (
            <button
              key={c}
              onClick={() => setChip(c)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active ? "border-ink bg-ink text-white" : "border-line bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {c} <span className={active ? "text-white/70" : "text-sub"}>{n}</span>
            </button>
          );
        })}
      </div>

      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-b border-line text-left text-[10.5px] text-sub">
                <th className="px-5 py-3">{sortBtn("rank", "#")}</th>
                <th className="px-3 py-3">{sortBtn("sku", "SKU")}</th>
                <th className="px-3 py-3 text-right">{sortBtn("avail", fac ? `${fac} sellable` : "Sellable", true)}</th>
                {!fac && facilities.map((f) => (
                  <th key={f} className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-semibold normal-case tracking-normal" title={facilityLabel(f)}>
                      <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />
                      {facilityLabel(f)}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">{sortBtn("incoming", "Incoming", true)}</th>
                <th className="px-3 py-3 text-right"><span className="font-semibold uppercase tracking-[0.12em]">DRR</span></th>
                <th className="px-3 py-3 text-right">{sortBtn("cover", "Cover", true)}</th>
                <th className="px-5 py-3"><span className="font-semibold uppercase tracking-[0.12em]">Status</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map((v) => (
                <Fragment key={v.sku}>
                  <tr
                    onClick={() => setSel(v.sku === sel ? null : v.sku)}
                    className={`cursor-pointer transition-colors ${sel === v.sku ? "bg-brand-soft/60" : "hover:bg-gray-50/70"}`}
                  >
                    <td className="px-5 py-3 font-mono text-[12px] text-sub">{v.rank}</td>
                    <td className="px-3 py-3 font-mono font-semibold">{v.sku}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmt(v.avail)}</td>
                    {!fac && facilities.map((f) => {
                      const u = v.row.fac[f] || 0;
                      return (
                        <td key={f} className={`px-3 py-3 text-right font-mono ${u ? "font-semibold" : "text-gray-300"}`}>
                          {u ? fmt(u) : "0"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right text-sub">{v.incoming ? fmt(v.incoming) : "—"}</td>
                    <td className="px-3 py-3 text-right text-sub">{v.drr ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-semibold">{v.cover !== null ? `${v.cover.toFixed(1)}d` : "—"}</td>
                    <td className="px-5 py-3"><StatusPill s={v.status} /></td>
                  </tr>
                  {sel === v.sku && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={nCols} className="px-5 py-0">
                        <SkuDetail r={v.row} facilities={facilities} scope={fac} thresholds={thresholds} onClose={() => setSel(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={nCols} className="px-5 py-10 text-center text-sub">No SKUs match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-line px-5 py-3 text-[12px] text-sub">
          {filtered.length} of {view.length} {fac ? `SKUs at ${facilityLabel(fac)}` : "hero SKUs"} · click a row to expand its detail
        </div>
      </Panel>
    </>
  );
}

/* Inline SKU detail — opens directly under the clicked row */
function SkuDetail({
  r, facilities, scope, thresholds, onClose,
}: {
  r: Row; facilities: FacilityKey[]; scope: FacilityKey | ""; thresholds: Thresholds; onClose: () => void;
}) {
  const scoped = scope ? r.facRows.find((f) => f.facility === scope) ?? null : null;
  const maxFac = Math.max(...r.facRows.map((f) => f.avail), 1);

  const tiles: [string, string][] = scoped
    ? [
        ["Sellable here", fmt(scoped.avail)],
        ["Cover here", scoped.cover !== null ? `${scoped.cover.toFixed(1)} days` : "no DRR"],
        [`DRR (${DRR_WINDOW_LABEL})`, scoped.drr ? `${scoped.drr}/day` : "—"],
        ["Incoming (network)", fmt(r.incoming)],
        ["Blocked", fmt(r.blocked)],
        ["Bad stock", fmt(r.bad)],
      ]
    : [
        ["Sellable", fmt(r.avail)],
        ["Cover", r.cover !== null ? `${r.cover.toFixed(1)} days` : "no DRR"],
        [`DRR (${DRR_WINDOW_LABEL})`, r.drr ? `${r.drr.toFixed(2)}/day` : "—"],
        ["Incoming", fmt(r.incoming)],
        ["Blocked", fmt(r.blocked)],
        ["Bad stock", fmt(r.bad)],
      ];

  return (
    <div className="my-3 rounded-xl2 border border-line bg-white px-5 py-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[16px] font-bold">{r.sku}</div>
          <div className="mt-0.5 text-[12px] text-sub">
            Hero rank #{r.rank} · {lakh(r.sales)} lifetime sales
            {scoped && <> · scoped to <strong>{scoped.label}</strong></>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill s={scoped ? scoped.status : r.status} />
          <button onClick={onClose} className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-sub hover:bg-gray-50">✕ Close</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="grid grid-cols-3 gap-2.5">
            {tiles.map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sub">{l}</div>
                <div className="mt-0.5 text-[15px] font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-brand/20 bg-brand-soft px-3.5 py-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">Recommended action</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-gray-800">
              {scoped ? recommendFac(r, scoped, thresholds) : recommend(r, thresholds)}
            </p>
          </div>
        </div>

        {/* per-facility cover — each warehouse against its own DRR */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">
              {scope ? "All warehouses — for context" : "Cover by warehouse — each against its own DRR"}
            </div>
            <FacStrip r={r} />
          </div>
          <ul className="space-y-2.5">
            {r.facRows.map((fr) => {
              const dim = !!scope && fr.facility !== scope;
              return (
                <li key={fr.facility} className={dim ? "opacity-45" : ""}>
                  <div className="mb-0.5 flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-gray-700">
                      <span className="h-2 w-2 rounded-full" style={{ background: facColor(fr.facility) }} />
                      {fr.label}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="text-[11.5px] text-sub">
                        {fr.drr ? `DRR ${fr.drr}/d · ` : "no DRR · "}
                        {fr.cover !== null ? `${fr.cover.toFixed(1)}d` : "—"}
                      </span>
                      <span className={`font-semibold ${fr.avail === 0 ? "text-crit" : ""}`}>{fmt(fr.avail)}</span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${(fr.avail / maxFac) * 100}%`, background: facColor(fr.facility) }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
