"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore, type Order } from "@/lib/store";
import { Topbar, Panel, PriorityPill, StatusPill, facColor } from "@/components/ui";
import { fmt, lakh } from "@/lib/data";
import JsBarcode from "jsbarcode";

const CHIPS = ["All", "Open", "In Progress", "Completed", "Resolved"] as const;

function Barcode({ code }: { code: string }) {
  const ref = useRef<SVGSVGElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        JsBarcode(ref.current, code, { format: "CODE128", height: 44, displayValue: false, margin: 0, background: "transparent" });
      } catch {}
    }
  }, [code]);
  return <svg ref={ref} className="max-w-full" />;
}

export default function Orders() {
  const { orders, rows, snap, thresholds, approveOrder, createSO, sos } = useStore();
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null); // SO id just raised

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: orders.length };
    for (const o of orders) c[o.status] = (c[o.status] || 0) + 1;
    return c;
  }, [orders]);

  const filtered = useMemo(() => {
    let d = orders;
    if (chip !== "All") d = d.filter((o) => o.status === chip);
    if (q) d = d.filter((o) => (o.sku + o.id).toUpperCase().includes(q.trim().toUpperCase()));
    return d;
  }, [orders, chip, q]);

  const selected: Order | undefined = orders.find((o) => o.id === sel);
  const row = selected ? rows.find((r) => r.sku === selected.sku) : undefined;
  const facilities = snap?.facilities ?? [];

  // Per-facility view for the selected SKU: how much each warehouse holds,
  // whether it can spare stock, and which warehouses are thin.
  const facView = useMemo(() => {
    if (!row) return [];
    const dailyShare = row.drr ? row.drr / Math.max(1, facilities.length) : null;
    return facilities.map((f) => {
      const units = row.fac[f] || 0;
      const coverF = dailyShare ? units / dailyShare : null;
      let tag: "Surplus" | "OK" | "Low" | "None";
      if (units === 0) tag = "None";
      else if (coverF !== null && coverF >= thresholds.alert * 1.5) tag = "Surplus";
      else if (coverF !== null && coverF < thresholds.replenish) tag = "Low";
      else if (units <= 2) tag = "Low";
      else tag = units >= Math.max(5, row.avail * 0.6) ? "Surplus" : "OK";
      return { f, units, tag };
    }).sort((a, b) => b.units - a.units);
  }, [row, facilities, thresholds]);

  const thin = facView.filter((x) => x.tag === "Low" || x.tag === "None");
  const sources = facView.filter((x) => x.tag === "Surplus" || (x.tag === "OK" && x.units > 0));
  const defaultDest = thin.length ? thin[thin.length - 1].f : facilities[0];
  const [dest, setDest] = useState<string>("");
  useEffect(() => { setDest(""); setJustCreated(null); }, [sel]);

  const existingSOs = selected ? sos.filter((s) => s.sku === selected.sku && s.status !== "Completed") : [];
  const createdSO = justCreated ? sos.find((s) => s.id === justCreated) : undefined;

  const canApprove = true; // single sign-in — everyone can approve

  const stockoutDate = (cover: number | null) =>
    cover === null ? "—" : new Date(Date.now() + cover * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const handleCreateSO = (fromFac: string, units: number) => {
    if (!selected || !row) return;
    const toFac = dest || defaultDest;
    if (!toFac || toFac === fromFac) return;
    const need = selected.qty !== null ? selected.qty : Math.max(1, Math.ceil(units / 2));
    const qty = Math.max(1, Math.min(units, need));
    const id = createSO(selected.sku, fromFac, toFac, qty, selected.id);
    setJustCreated(id);
  };

  return (
    <>
      <Topbar
        title="Replenishment orders"
        sub={`Auto-created when a hero SKU drops below ${thresholds.alert} days of cover. Click a row for warehouse comparison and to raise a stock-transfer SO.`}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search order ID or SKU…"
          className="w-64 rounded-lg border border-line bg-white px-3.5 py-2 font-mono text-[13px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/15" />
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => {
            const n = counts[c] || 0;
            if (c !== "All" && n === 0) return null;
            const active = chip === c;
            return (
              <button key={c} onClick={() => setChip(c)}
                className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                  active ? "border-ink bg-ink text-white" : "border-line bg-white text-gray-700 hover:border-gray-300"}`}>
                {c} <span className={active ? "text-white/70" : "text-sub"}>{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel className="xl:col-span-2">
          <ul className="divide-y divide-line">
            {filtered.length === 0 && (
              <li className="px-6 py-12 text-center text-[13px] text-sub">No orders here — everything is above the buffer.</li>
            )}
            {filtered.map((o) => {
              const orderRow = rows.find((r) => r.sku === o.sku);
              const orderSources = orderRow
                ? facilities.map((f) => {
                    const units = orderRow.fac[f] || 0;
                    const dailyShare = orderRow.drr ? orderRow.drr / Math.max(1, facilities.length) : null;
                    const coverF = dailyShare ? units / dailyShare : null;
                    const tag: "Surplus" | "OK" | "Low" | "None" = units === 0
                      ? "None"
                      : coverF !== null && coverF >= thresholds.alert * 1.5
                      ? "Surplus"
                      : coverF !== null && coverF < thresholds.replenish
                      ? "Low"
                      : units <= 2
                      ? "Low"
                      : units >= Math.max(5, orderRow.avail * 0.6)
                      ? "Surplus"
                      : "OK";
                    return { f, units, tag };
                  }).filter((x) => x.tag === "Surplus" || (x.tag === "OK" && x.units > 0))
                : [];
              const hasCreateSO = orderSources.length > 0;
              return (
                <li key={o.id} onClick={() => setSel(o.id === sel ? null : o.id)}
                  className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${sel === o.id ? "bg-brand-soft/60" : "hover:bg-gray-50/70"}`}>
                  <div className="w-20 font-mono text-[12px] text-sub">{o.id}</div>
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[13px] font-semibold">{o.sku}</div>
                    <div className="mt-0.5 truncate text-[11.5px] text-sub">{o.reason}</div>
                  </div>
                  <div className="w-20 text-right">
                    <div className="text-[14px] font-bold">{o.qty !== null ? fmt(o.qty) : "—"}</div>
                    <div className="text-[10.5px] text-sub">units</div>
                  </div>
                  <PriorityPill p={o.priority} />
                  <span className={`w-24 text-right text-[11.5px] font-semibold ${
                    o.status === "Open" ? "text-sky-600" : o.status === "In Progress" ? "text-watch" : o.status === "Completed" ? "text-ok" : "text-gray-400"}`}>
                    {o.status}
                  </span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSel(o.id); }}
                    className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100">
                    {hasCreateSO ? "Create SO" : "View"}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-line px-5 py-3 text-[12px] text-sub">{filtered.length} of {orders.length} orders</div>
        </Panel>

        <Panel title={selected ? "Order detail" : undefined} className="h-fit xl:sticky xl:top-6">
          {!selected ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-lg text-gray-400">⟳</div>
              <div className="text-[14px] font-semibold">Select an order</div>
              <p className="mt-1 text-[12.5px] text-sub">Warehouse comparison, transfer source and Create SO live here.</p>
            </div>
          ) : (
            <div className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[12px] text-sub">{selected.id}</div>
                  <div className="font-mono text-[16px] font-bold">{selected.sku}</div>
                </div>
                <PriorityPill p={selected.priority} />
              </div>

              {row && (
                <div className="mt-4 grid grid-cols-2 gap-2.5">
                  {[
                    ["Sellable now", fmt(row.avail)],
                    ["Cover", row.cover !== null ? `${row.cover.toFixed(1)} days` : "no DRR"],
                    ["DRR", row.drr ? `${row.drr}/day` : "—"],
                    ["Expected stock-out", stockoutDate(row.cover)],
                    ["Recommended qty", selected.qty !== null ? `${fmt(selected.qty)} units` : "set manually"],
                    ["Incoming", fmt(row.incoming)],
                  ].map(([l, v]) => (
                    <div key={l} className="rounded-lg bg-gray-50 px-3 py-2.5">
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sub">{l}</div>
                      <div className="mt-0.5 text-[14px] font-bold">{v}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* warehouse comparison: who is thin, who can supply */}
              {row && (
                <div className="mt-4">
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Warehouse comparison</div>
                  <ul className="space-y-1.5">
                    {facView.map(({ f, units, tag }) => (
                      <li key={f} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="flex min-w-0 items-center gap-2 font-mono text-gray-700">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: facColor(f) }} />
                          <span className="truncate">{f}</span>
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-semibold">{fmt(units)}</span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            tag === "Surplus" ? "bg-ok-bg text-ok"
                            : tag === "OK" ? "bg-gray-100 text-gray-600"
                            : tag === "Low" ? "bg-low-bg text-low"
                            : "bg-crit-bg text-crit"}`}>
                            {tag === "None" ? "No stock" : tag}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                  {thin.length > 0 && sources.length > 0 && (
                    <p className="mt-2 text-[11.5px] leading-snug text-sub">
                      <strong className="text-ink">{sources[0].f}</strong> holds the most stock ({fmt(sources[0].units)} units) —
                      transfer from there to <strong className="text-ink">{thin.map((t) => t.f).join(", ")}</strong>.
                    </p>
                  )}
                </div>
              )}

              {/* Create SO: raise a stock transfer from a warehouse that has the SKU */}
              {row && sources.length > 0 && selected.status !== "Completed" && selected.status !== "Resolved" && (
                <div className="mt-4 rounded-lg border border-line bg-gray-50/70 px-3.5 py-3">
                  <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Raise stock transfer (SO)</div>
                  <div className="mt-2 flex items-center gap-2 text-[12px]">
                    <span className="text-sub">Send to</span>
                    <select value={dest || defaultDest} onChange={(e) => setDest(e.target.value)}
                      className="flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 font-mono text-[12px] outline-none focus:border-brand">
                      {facilities.map((f) => <option key={f} value={f}>{f}{thin.some((t) => t.f === f) ? " · low" : ""}</option>)}
                    </select>
                  </div>
                  <ul className="mt-2.5 space-y-2">
                    {sources.filter((s) => s.f !== (dest || defaultDest)).map(({ f, units }) => (
                      <li key={f} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2 font-mono text-[12px] text-gray-700">
                          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: facColor(f) }} />
                          <span className="truncate">{f}</span>
                          <span className="text-sub">· {fmt(units)}</span>
                        </span>
                        <button onClick={() => handleCreateSO(f, units)}
                          className="shrink-0 rounded-lg bg-brand px-3 py-1.5 text-[11.5px] font-bold text-white hover:opacity-90">
                          Create SO
                        </button>
                      </li>
                    ))}
                  </ul>
                  {existingSOs.length > 0 && !createdSO && (
                    <p className="mt-2 text-[11px] text-sub">{existingSOs.length} open SO already exists for this SKU — see Fulfillment.</p>
                  )}
                </div>
              )}

              {/* SKU detail shown after Create SO — where the SKU is low/critical */}
              {createdSO && row && (
                <div className="mt-4 rounded-lg border border-brand/30 bg-brand-soft px-3.5 py-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">SO created · SKU detail</div>
                    <StatusPill s={row.status} />
                  </div>
                  <div className="mt-1.5 font-mono text-[14px] font-bold">{createdSO.id} · {row.sku}</div>
                  <div className="mt-0.5 text-[11.5px] text-sub">Hero rank #{row.rank} · {lakh(row.sales)} lifetime sales</div>
                  <p className="mt-2 text-[12.5px] leading-relaxed text-gray-800">
                    Transfer <strong>{fmt(createdSO.qty)} units</strong> of {row.sku} from{" "}
                    <span className="font-mono font-semibold">{createdSO.fromFac}</span> →{" "}
                    <span className="font-mono font-semibold">{createdSO.toFac}</span>.
                  </p>
                  <ul className="mt-2 space-y-1 text-[12px]">
                    {facView.filter((x) => x.tag === "Low" || x.tag === "None").map(({ f, units, tag }) => (
                      <li key={f} className="flex items-center justify-between">
                        <span className="font-mono text-gray-700">{f}</span>
                        <span className={`font-semibold ${tag === "None" ? "text-crit" : "text-low"}`}>
                          {tag === "None" ? "0 · critical" : `${fmt(units)} · low`}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/fulfillment"
                    className="mt-3 block rounded-lg bg-ink py-2 text-center text-[12px] font-bold text-white hover:opacity-90">
                    Track in Fulfillment →
                  </Link>
                </div>
              )}

              <div className="mt-4 rounded-lg border border-brand/20 bg-brand-soft px-3.5 py-3">
                <div className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-brand">Why this order was created</div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-gray-800">{selected.reason}</p>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">SKU barcode · Code 128</div>
                <Barcode code={selected.sku} />
              </div>

              {selected.status === "Open" && canApprove && (
                <button onClick={() => approveOrder(selected.id)}
                  className="mt-5 w-full rounded-lg bg-ink py-2.5 text-[13px] font-bold text-white transition-opacity hover:opacity-90">
                  Approve → send to Fulfillment
                </button>
              )}
              {selected.status === "In Progress" && (
                <div className="mt-5 rounded-lg bg-watch-bg px-3.5 py-2.5 text-[12px] font-semibold text-watch">
                  Approved {selected.approvedAt && new Date(selected.approvedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} — with Fulfillment now.
                </div>
              )}
              {selected.status === "Completed" && (
                <div className="mt-5 rounded-lg bg-ok-bg px-3.5 py-2.5 text-[12px] font-semibold text-ok">Completed — stock received and cover restored.</div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
