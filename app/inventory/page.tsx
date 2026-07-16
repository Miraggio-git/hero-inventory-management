"use client";
import { Fragment, useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Topbar, Panel, StatusPill, FacStrip, facColor } from "@/components/ui";
import { fmt, lakh, recommend, type Row, type Status } from "@/lib/data";

const CHIP_ORDER: (Status | "All")[] = ["All", "Stock-out", "Critical", "Replenish", "Watch", "Healthy", "No DRR"];
type SortKey = "rank" | "sku" | "avail" | "cover" | "incoming";

export default function Inventory() {
  const { snap, rows, thresholds } = useStore();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Status | "All">("All");
  const [fac, setFac] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cover");
  const [asc, setAsc] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: rows.length };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let d = rows;
    if (q) d = d.filter((r) => r.sku.toUpperCase().includes(q.trim().toUpperCase()));
    if (chip !== "All") d = d.filter((r) => r.status === chip);
    if (fac) d = d.filter((r) => (r.fac[fac] || 0) > 0);
    const dir = asc ? 1 : -1;
    return [...d].sort((a, b) => {
      if (sortKey === "sku") return a.sku.localeCompare(b.sku) * dir;
      const av = sortKey === "cover" ? a.cover ?? (a.avail <= 0 ? -1 : 9999) : (a as any)[sortKey];
      const bv = sortKey === "cover" ? b.cover ?? (b.avail <= 0 ? -1 : 9999) : (b as any)[sortKey];
      return (av - bv) * dir;
    });
  }, [rows, q, chip, fac, sortKey, asc]);

  const facilities = snap?.facilities ?? [];
  const nCols = 7 + facilities.length;

  // Per-warehouse rollup: total sellable units + how many SKUs sit in each.
  const facSummary = useMemo(
    () =>
      facilities
        .map((f) => ({
          f,
          units: rows.reduce((s, r) => s + (r.fac[f] || 0), 0),
          skus: rows.reduce((s, r) => s + ((r.fac[f] || 0) > 0 ? 1 : 0), 0),
        }))
        .sort((a, b) => b.units - a.units),
    [rows, facilities]
  );

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
      <Topbar title="Inventory" sub="Every hero SKU across the network — warehouse-by-warehouse. Click a row to open the SKU detail right there." />

      {/* warehouse rollup — units + SKUs held per warehouse */}
      <Panel className="mb-4">
        <div className="flex flex-wrap gap-x-8 gap-y-3 px-5 py-4">
          {facSummary.map(({ f, units, skus }) => {
            const active = fac === f;
            return (
              <button
                key={f}
                onClick={() => setFac(active ? "" : f)}
                title={active ? "Clear filter" : `Show only SKUs stocked at ${f}`}
                className={`flex items-center gap-2.5 rounded-lg px-2 py-1 text-left transition-colors ${active ? "bg-brand-soft" : "hover:bg-gray-50"}`}
              >
                <span className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: facColor(f) }} />
                <span>
                  <span className="block font-mono text-[12.5px] font-semibold text-gray-700">{f}</span>
                  <span className="block text-[11px] text-sub">
                    <strong className="text-ink">{fmt(units)}</strong> units · {skus} SKUs
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </Panel>

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
          onChange={(e) => setFac(e.target.value)}
          className="rounded-lg border border-line bg-white px-3 py-2 text-[13px] outline-none focus:border-brand"
        >
          <option value="">All facilities</option>
          {facilities.map((f) => (
            <option key={f} value={f}>{f}</option>
          ))}
        </select>
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
                <th className="px-3 py-3 text-right">{sortBtn("avail", "Sellable", true)}</th>
                {facilities.map((f) => (
                  <th key={f} className="px-3 py-3 text-right">
                    <span className="inline-flex items-center gap-1.5 font-mono font-semibold normal-case tracking-normal" title={f}>
                      <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />
                      {f.length > 12 ? f.slice(0, 11) + "…" : f}
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
              {filtered.map((r) => (
                <Fragment key={r.sku}>
                  <tr
                    onClick={() => setSel(r.sku === sel ? null : r.sku)}
                    className={`cursor-pointer transition-colors ${sel === r.sku ? "bg-brand-soft/60" : "hover:bg-gray-50/70"}`}
                  >
                    <td className="px-5 py-3 font-mono text-[12px] text-sub">{r.rank}</td>
                    <td className="px-3 py-3 font-mono font-semibold">{r.sku}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmt(r.avail)}</td>
                    {facilities.map((f) => {
                      const v = r.fac[f] || 0;
                      return (
                        <td key={f} className={`px-3 py-3 text-right font-mono ${v ? "font-semibold" : "text-gray-300"}`}>
                          {v ? fmt(v) : "0"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right text-sub">{r.incoming ? fmt(r.incoming) : "—"}</td>
                    <td className="px-3 py-3 text-right text-sub">{r.drr ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-semibold">{r.cover !== null ? `${r.cover.toFixed(1)}d` : "—"}</td>
                    <td className="px-5 py-3"><StatusPill s={r.status} /></td>
                  </tr>
                  {sel === r.sku && (
                    <tr className="bg-gray-50/60">
                      <td colSpan={nCols} className="px-5 py-0">
                        <SkuDetail r={r} facilities={facilities} thresholds={thresholds} onClose={() => setSel(null)} />
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
          {filtered.length} of {rows.length} hero SKUs · click a row to expand its detail
        </div>
      </Panel>
    </>
  );
}

/* Inline SKU detail — opens directly under the clicked row */
function SkuDetail({ r, facilities, thresholds, onClose }: { r: Row; facilities: string[]; thresholds: any; onClose: () => void }) {
  const maxFac = Math.max(...facilities.map((f) => r.fac[f] || 0), 1);
  return (
    <div className="my-3 rounded-xl2 border border-line bg-white px-5 py-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[16px] font-bold">{r.sku}</div>
          <div className="mt-0.5 text-[12px] text-sub">Hero rank #{r.rank} · {lakh(r.sales)} lifetime sales</div>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill s={r.status} />
          <button onClick={onClose} className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-sub hover:bg-gray-50">✕ Close</button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              ["Sellable", fmt(r.avail)],
              ["Cover", r.cover !== null ? `${r.cover.toFixed(1)} days` : "no DRR"],
              ["DRR", r.drr ? `${r.drr}/day` : "—"],
              ["Incoming", fmt(r.incoming)],
              ["Blocked", fmt(r.blocked)],
              ["Bad stock", fmt(r.bad)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg bg-gray-50 px-3 py-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sub">{l}</div>
                <div className="mt-0.5 text-[15px] font-bold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-lg border border-brand/20 bg-brand-soft px-3.5 py-3">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">Recommended action</div>
            <p className="mt-1 text-[12.5px] leading-relaxed text-gray-800">{recommend(r, thresholds)}</p>
          </div>
        </div>

        {/* warehouse comparison */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Stock by warehouse — compare</div>
            <FacStrip r={r} />
          </div>
          <ul className="space-y-2">
            {facilities.map((f) => {
              const v = r.fac[f] || 0;
              return (
                <li key={f}>
                  <div className="mb-0.5 flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 font-mono text-gray-700">
                      <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />{f}
                    </span>
                    <span className={`font-semibold ${v === 0 ? "text-crit" : ""}`}>{fmt(v)}{v === 0 && " · none"}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                    <div className="h-full rounded-full" style={{ width: `${(v / maxFac) * 100}%`, background: facColor(f) }} />
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
