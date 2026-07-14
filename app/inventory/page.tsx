"use client";
import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { Topbar, Panel, StatusPill, FacStrip, facColor } from "@/components/ui";
import { fmt, lakh, recommend, type Row, type Status } from "@/lib/data";

const CHIP_ORDER: (Status | "All")[] = ["All", "Stock-out", "Critical", "Replenish", "Watch", "Healthy", "No DRR"];
type SortKey = "rank" | "sku" | "avail" | "cover" | "incoming";

export default function Inventory() {
  const { snap, thresholds } = useStore();
  const [q, setQ] = useState("");
  const [chip, setChip] = useState<Status | "All">("All");
  const [fac, setFac] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cover");
  const [asc, setAsc] = useState(true);
  const [sel, setSel] = useState<string | null>(null);

  const rows = snap?.rows ?? [];
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

  const selected: Row | undefined = rows.find((r) => r.sku === sel);

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
      <Topbar title="Inventory" sub="Every hero SKU across the network — click a row for the facility split and recommendation" />

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
          {snap.facilities.map((f) => (
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

      <div className="grid gap-4 xl:grid-cols-3">
        {/* table */}
        <Panel className="xl:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]">
              <thead>
                <tr className="border-b border-line text-left text-[10.5px] text-sub">
                  <th className="px-5 py-3">{sortBtn("rank", "#")}</th>
                  <th className="px-3 py-3">{sortBtn("sku", "SKU")}</th>
                  <th className="px-3 py-3 text-right">{sortBtn("avail", "Sellable", true)}</th>
                  <th className="px-3 py-3 text-right">{sortBtn("incoming", "Incoming", true)}</th>
                  <th className="px-3 py-3 text-right"><span className="font-semibold uppercase tracking-[0.12em]">DRR</span></th>
                  <th className="px-3 py-3 text-right">{sortBtn("cover", "Cover", true)}</th>
                  <th className="px-5 py-3"><span className="font-semibold uppercase tracking-[0.12em]">Status</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((r) => (
                  <tr
                    key={r.sku}
                    onClick={() => setSel(r.sku === sel ? null : r.sku)}
                    className={`cursor-pointer transition-colors ${sel === r.sku ? "bg-brand-soft/60" : "hover:bg-gray-50/70"}`}
                  >
                    <td className="px-5 py-3 font-mono text-[12px] text-sub">{r.rank}</td>
                    <td className="px-3 py-3 font-mono font-semibold">{r.sku}</td>
                    <td className="px-3 py-3 text-right font-semibold">{fmt(r.avail)}</td>
                    <td className="px-3 py-3 text-right text-sub">{r.incoming ? fmt(r.incoming) : "—"}</td>
                    <td className="px-3 py-3 text-right text-sub">{r.drr ?? "—"}</td>
                    <td className="px-3 py-3 text-right font-semibold">{r.cover !== null ? `${r.cover.toFixed(1)}d` : "—"}</td>
                    <td className="px-5 py-3"><StatusPill s={r.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-sub">No SKUs match these filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="border-t border-line px-5 py-3 text-[12px] text-sub">
            {filtered.length} of {rows.length} hero SKUs
          </div>
        </Panel>

        {/* detail pane */}
        <Panel title={selected ? "SKU detail" : undefined} className="h-fit xl:sticky xl:top-6">
          {!selected ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-lg text-gray-400">◈</div>
              <div className="text-[14px] font-semibold">Select a SKU row</div>
              <p className="mt-1 text-[12.5px] text-sub">Stock split, incoming and the recommended action appear here.</p>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[16px] font-bold">{selected.sku}</div>
                  <div className="mt-0.5 text-[12px] text-sub">Hero rank #{selected.rank} · {lakh(selected.sales)} lifetime sales</div>
                </div>
                <StatusPill s={selected.status} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {[
                  ["Sellable", fmt(selected.avail)],
                  ["Cover", selected.cover !== null ? `${selected.cover.toFixed(1)} days` : "no DRR"],
                  ["DRR", selected.drr ? `${selected.drr}/day` : "—"],
                  ["Incoming", fmt(selected.incoming)],
                  ["Blocked", fmt(selected.blocked)],
                  ["Bad stock", fmt(selected.bad)],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-lg bg-gray-50 px-3 py-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sub">{l}</div>
                    <div className="mt-0.5 text-[15px] font-bold">{v}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Where it sits</div>
                <FacStrip r={selected} />
                <ul className="mt-2.5 space-y-1.5">
                  {Object.entries(selected.fac).sort((a, b) => b[1] - a[1]).map(([f, v]) => (
                    <li key={f} className="flex items-center justify-between text-[12.5px]">
                      <span className="flex items-center gap-2 font-mono text-gray-700">
                        <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />{f}
                      </span>
                      <span className="font-semibold">{fmt(v)}</span>
                    </li>
                  ))}
                  {Object.keys(selected.fac).length === 0 && <li className="text-[12.5px] text-sub">No sellable stock in any facility.</li>}
                </ul>
              </div>

              <div className="mt-4 rounded-lg border border-brand/20 bg-brand-soft px-3.5 py-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">Recommended action</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-gray-800">{recommend(selected, thresholds)}</p>
              </div>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
