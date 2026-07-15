"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useStore, type Order } from "@/lib/store";
import { Topbar, Panel, PriorityPill, StatusPill, facColor } from "@/components/ui";
import { fmt } from "@/lib/data";
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
  const { orders, rows, thresholds, approveOrder, session } = useStore();
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);

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
  const canApprove = session?.role === "admin" || session?.role === "supply_chain";

  const stockoutDate = (cover: number | null) =>
    cover === null ? "—" : new Date(Date.now() + cover * 86400000).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <>
      <Topbar
        title="Replenishment orders"
        sub={`Auto-created when a hero SKU drops below ${thresholds.alert} days of cover. Review, then approve to send to Fulfillment.`}
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
            {filtered.map((o) => (
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
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-3 text-[12px] text-sub">{filtered.length} of {orders.length} orders</div>
        </Panel>

        <Panel title={selected ? "Order detail" : undefined} className="h-fit xl:sticky xl:top-6">
          {!selected ? (
            <div className="px-6 py-14 text-center">
              <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-lg text-gray-400">⟳</div>
              <div className="text-[14px] font-semibold">Select an order</div>
              <p className="mt-1 text-[12.5px] text-sub">Recommendation, stock context and approval live here.</p>
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

              {row && Object.keys(row.fac).length > 0 && (
                <div className="mt-4">
                  <div className="mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Current split</div>
                  <ul className="space-y-1">
                    {Object.entries(row.fac).sort((a, b) => b[1] - a[1]).map(([f, v]) => (
                      <li key={f} className="flex items-center justify-between text-[12px]">
                        <span className="flex items-center gap-2 font-mono text-gray-700">
                          <span className="h-2 w-2 rounded-full" style={{ background: facColor(f) }} />{f}
                        </span>
                        <span className="font-semibold">{fmt(v)}</span>
                      </li>
                    ))}
                  </ul>
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
