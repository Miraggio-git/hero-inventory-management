"use client";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useStore, type Order } from "@/lib/store";
import { Topbar, Panel, PriorityPill, StatusPill, facColor } from "@/components/ui";
import { fmt, lakh, facilityLabel, DRR_WINDOW_LABEL, type FacilityKey } from "@/lib/data";
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

  // Per-facility view for the selected SKU: each warehouse against its OWN DRR.
  const facView = useMemo(() => {
    if (!row) return [];
    return [...row.facRows]
      .map((fr) => {
        let tag: "Surplus" | "OK" | "Low" | "None";
        if (fr.avail === 0) tag = "None";
        else if (fr.cover !== null && fr.cover >= thresholds.alert * 1.5) tag = "Surplus";
        else if (fr.cover !== null && fr.cover < thresholds.replenish) tag = "Low";
        else if (fr.cover !== null) tag = "OK";
        // No DRR at this facility — fall back to relative holding size.
        else if (fr.avail >= Math.max(5, row.avail * 0.6)) tag = "Surplus";
        else if (fr.avail <= 2) tag = "Low";
        else tag = "OK";
        return { f: fr.facility, label: fr.label, units: fr.avail, cover: fr.cover, drr: fr.drr, tag };
      })
      .sort((a, b) => b.units - a.units);
  }, [row, thresholds]);

  const thin = facView.filter((x) => x.tag === "Low" || x.tag === "None");
  const sources = facView.filter((x) => x.tag === "Surplus" || (x.tag === "OK" && x.units > 0));
  const defaultDest: FacilityKey | undefined =
    selected?.facility ?? (thin.length ? thin[thin.length - 1].f : facilities[0]);
  const [dest, setDest] = useState<FacilityKey | "">("");
  useEffect(() => { setDest(""); setJustCreated(null); }, [sel]);

  const existingSOs = selected ? sos.filter((s) => s.sku === selected.sku && s.status !== "Completed") : [];
  const createdSO = justCreated ? sos.find((s) => s.id === justCreated) : undefined;

  const canApprove = true; // single sign-in — everyone can approve

  const stockoutDate = (cover: number | null) =>
    cover === null ? "—" : new Date(Date.now() + cover * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const handleCreateSO = (fromFac: FacilityKey, units: number) => {
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
        sub={`One order per SKU per warehouse, auto-created when a facility drops below ${thresholds.alert} days of its own cover. Qty = facility DRR x ${thresholds.alert} - facility sellable.`}
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

      <Panel>
        <ul className="divide-y divide-line">
          {filtered.length === 0 && (
            <li className="px-6 py-12 text-center text-[13px] text-sub">No orders here — everything is above the buffer.</li>
          )}
          {filtered.map((o) => {
            const orderRow = rows.find((r) => r.sku === o.sku);
            const orderSources = orderRow
              ? orderRow.facRows
                  .map((fr) => {
                    const tag: "Surplus" | "OK" | "Low" | "None" =
                      fr.avail === 0
                        ? "None"
                        : fr.cover !== null && fr.cover >= thresholds.alert * 1.5
                        ? "Surplus"
                        : fr.cover !== null && fr.cover < thresholds.replenish
                        ? "Low"
                        : fr.cover !== null
                        ? "OK"
                        : fr.avail >= Math.max(5, orderRow.avail * 0.6)
                        ? "Surplus"
                        : fr.avail <= 2
                        ? "Low"
                        : "OK";
                    return { f: fr.facility, units: fr.avail, tag };
                  })
                  .filter((x) => x.f !== o.facility)
                  .filter((x) => x.tag === "Surplus" || (x.tag === "OK" && x.units > 0))
              : [];
            const hasCreateSO = orderSources.length > 0;
            const isOpen = sel === o.id;
            return (
              <Fragment key={o.id}>
                <li onClick={() => setSel(isOpen ? null : o.id)}
                  className={`flex cursor-pointer items-center gap-4 px-5 py-3.5 transition-colors ${isOpen ? "bg-brand-soft/60" : "hover:bg-gray-50/70"}`}>
                  <div className="w-20 font-mono text-[12px] text-sub">{o.id}</div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[13px] font-semibold">{o.sku}</span>
                      <span className="flex items-center gap-1.5 rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-semibold text-gray-700">
                        <span className="h-1.5 w-1.5 rounded-full" style={{ background: facColor(o.facility) }} />
                        {facilityLabel(o.facility)}
                      </span>
                    </div>
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
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSel(isOpen ? null : o.id); }}
                    className="rounded-full border border-line bg-white px-3 py-1 text-[11px] font-semibold text-gray-700 hover:bg-gray-100">
                    {isOpen ? "Hide" : hasCreateSO ? "Create SO" : "View"}
                  </button>
                </li>

                {isOpen && selected && (
                  <li className="bg-gray-50/60 px-4 py-4">
                    <div className="rounded-xl2 border border-line bg-white px-5 py-4 shadow-card">
                      {/* header */}
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-mono text-[12px] text-sub">{selected.id}</div>
                          <div className="font-mono text-[16px] font-bold">{selected.sku}</div>
                          <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-sub">
                            <span className="h-2 w-2 rounded-full" style={{ background: facColor(selected.facility) }} />
                            Short at <strong className="text-ink">{facilityLabel(selected.facility)}</strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <PriorityPill p={selected.priority} />
                          <button onClick={(e) => { e.stopPropagation(); setSel(null); }}
                            className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12px] font-semibold text-sub hover:bg-gray-50">
                            ✕ Close
                          </button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-5 lg:grid-cols-2">
                        {/* LEFT: metrics, rationale, barcode */}
                        <div>
                          {row && (
                            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                              {(() => {
                                const fr = row.facRows.find((x) => x.facility === selected.facility);
                                return [
                                  [`Sellable at ${facilityLabel(selected.facility)}`, fmt(fr?.avail ?? 0)],
                                  ["Cover here", fr && fr.cover !== null ? `${fr.cover.toFixed(1)} days` : "no DRR"],
                                  [`DRR here (${DRR_WINDOW_LABEL})`, fr?.drr ? `${fr.drr}/day` : "—"],
                                  ["Expected stock-out", stockoutDate(fr?.cover ?? null)],
                                  ["Recommended qty", selected.qty !== null ? `${fmt(selected.qty)} units` : "set manually"],
                                  ["Network sellable", fmt(row.avail)],
                                ] as [string, string][];
                              })().map(([l, v]) => (
                                <div key={l} className="rounded-lg bg-gray-50 px-3 py-2.5">
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-sub">{l}</div>
                                  <div className="mt-0.5 text-[14px] font-bold">{v}</div>
                                </div>
                              ))}
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
                        </div>

                        {/* RIGHT: warehouse comparison, transfer, SO */}
                        <div>
                          {row && (
                            <div>
                              <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Warehouse comparison</div>
                              <ul className="space-y-1.5">
                                {facView.map(({ f, label, units, cover, tag }) => (
                                  <li key={f} className="flex items-center justify-between gap-2 text-[12px]">
                                    <span className="flex min-w-0 items-center gap-2 text-gray-700">
                                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: facColor(f) }} />
                                      <span className="truncate">{label}</span>
                                      {f === selected.facility && <span className="shrink-0 text-[10px] font-bold text-brand">THIS ORDER</span>}
                                    </span>
                                    <span className="flex items-center gap-2">
                                      <span className="text-[11px] text-sub">{cover !== null ? `${cover.toFixed(1)}d` : "no DRR"}</span>
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
                                  <strong className="text-ink">{sources[0].label}</strong> holds the most stock ({fmt(sources[0].units)} units) —
                                  transfer from there to <strong className="text-ink">{thin.map((t) => t.label).join(", ")}</strong>.
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
                                <select value={dest || defaultDest} onChange={(e) => setDest(e.target.value as FacilityKey)}
                                  className="flex-1 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-brand">
                                  {facilities.map((f) => (
                                    <option key={f} value={f}>
                                      {facilityLabel(f)}{f === selected.facility ? " · this order" : thin.some((t) => t.f === f) ? " · low" : ""}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <ul className="mt-2.5 space-y-2">
                                {sources.filter((s) => s.f !== (dest || defaultDest)).map(({ f, label, units }) => (
                                  <li key={f} className="flex items-center justify-between gap-2">
                                    <span className="flex min-w-0 items-center gap-2 text-[12px] text-gray-700">
                                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: facColor(f) }} />
                                      <span className="truncate">{label}</span>
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
                                <span className="font-semibold">{facilityLabel(createdSO.fromFac)}</span> →{" "}
                                <span className="font-semibold">{facilityLabel(createdSO.toFac)}</span>.
                              </p>
                              <ul className="mt-2 space-y-1 text-[12px]">
                                {facView.filter((x) => x.tag === "Low" || x.tag === "None").map(({ f, label, units, tag }) => (
                                  <li key={f} className="flex items-center justify-between">
                                    <span className="text-gray-700">{label}</span>
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
                        </div>
                      </div>

                      {/* full-width action / status footer */}
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
                  </li>
                )}
              </Fragment>
            );
          })}
        </ul>
        <div className="border-t border-line px-5 py-3 text-[12px] text-sub">{filtered.length} of {orders.length} orders</div>
      </Panel>
    </>
  );
}
