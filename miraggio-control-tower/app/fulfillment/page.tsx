"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Topbar, Panel, facColor } from "@/components/ui";
import { fmt } from "@/lib/data";

const CHIPS = ["Active", "Pending", "In Progress", "Completed"] as const;
const SO_CHIPS = ["Active", "Open", "In Progress", "Completed"] as const;

export default function Fulfillment() {
  const { tasks, sos, rows, startTask, receiveTask, completeTask, startSO, receiveSO } = useStore();
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("Active");
  const [soChip, setSoChip] = useState<(typeof SO_CHIPS)[number]>("Active");
  const [recv, setRecv] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (chip === "Active") return tasks.filter((t) => t.status !== "Completed");
    return tasks.filter((t) => t.status === chip);
  }, [tasks, chip]);

  const filteredSOs = useMemo(() => {
    if (soChip === "Active") return sos.filter((s) => s.status !== "Completed");
    return sos.filter((s) => s.status === soChip);
  }, [sos, soChip]);

  const counts: Record<string, number> = {
    Active: tasks.filter((t) => t.status !== "Completed").length,
    Pending: tasks.filter((t) => t.status === "Pending").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
  };
  const soCounts: Record<string, number> = {
    Active: sos.filter((s) => s.status !== "Completed").length,
    Open: sos.filter((s) => s.status === "Open").length,
    "In Progress": sos.filter((s) => s.status === "In Progress").length,
    Completed: sos.filter((s) => s.status === "Completed").length,
  };

  return (
    <>
      <Topbar
        title="Fulfillment"
        sub="Sales orders (warehouse-to-warehouse transfers) and receiving tasks. Log received units — stock and cover update instantly."
      />

      {/* ---------------- Sales orders ---------------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-[15px] font-bold">Sales orders</h2>
        {SO_CHIPS.map((c) => {
          const active = soChip === c;
          return (
            <button key={c} onClick={() => setSoChip(c)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active ? "border-ink bg-ink text-white" : "border-line bg-white text-gray-700 hover:border-gray-300"}`}>
              {c} <span className={active ? "text-white/70" : "text-sub"}>{soCounts[c]}</span>
            </button>
          );
        })}
      </div>

      {filteredSOs.length === 0 ? (
        <Panel className="mb-6">
          <div className="px-6 py-10 text-center text-[13px] text-sub">
            No {soChip.toLowerCase()} sales orders. Raise one from a replenishment order (<Link href="/orders" className="font-semibold text-brand hover:underline">Replenishment → Create SO</Link>).
          </div>
        </Panel>
      ) : (
        <div className="mb-6 flex flex-col gap-3">
          {filteredSOs.map((s) => {
            const pct = Math.min(100, (s.received / s.qty) * 100);
            const row = rows.find((r) => r.sku === s.sku);
            return (
              <Panel key={s.id}>
                <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                  <div className="w-28">
                    <div className="font-mono text-[13px] font-bold">{s.id}</div>
                    {s.orderId && <div className="mt-0.5 font-mono text-[10.5px] text-sub">{s.orderId}</div>}
                  </div>
                  <div className="w-64">
                    <div className="font-mono text-[13.5px] font-semibold">{s.sku}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-sub">
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: facColor(s.fromFac) }} />
                      <span className="font-mono">{s.fromFac}</span>
                      <span>→</span>
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: facColor(s.toFac) }} />
                      <span className="font-mono">{s.toFac}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span className="text-sub">Transferred</span>
                      <span className="font-semibold">{fmt(s.received)} / {fmt(s.qty)} units{row && row.cover !== null && <span className="ml-2 text-sub">· cover now {row.cover.toFixed(1)}d</span>}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${s.status === "Completed" ? "bg-ok" : "bg-brand"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "Open" && (
                      <button onClick={() => startSO(s.id)}
                        className="rounded-lg bg-ink px-4 py-2 text-[12px] font-bold text-white hover:opacity-90">Start</button>
                    )}
                    {s.status === "In Progress" && (
                      <>
                        <input type="number" min={1} placeholder="units"
                          value={recv[s.id] || ""} onChange={(e) => setRecv({ ...recv, [s.id]: e.target.value })}
                          className="w-20 rounded-lg border border-line px-2.5 py-2 text-right font-mono text-[12.5px] outline-none focus:border-brand" />
                        <button onClick={() => { const n = Number(recv[s.id]); if (n > 0) { receiveSO(s.id, n); setRecv({ ...recv, [s.id]: "" }); } }}
                          className="rounded-lg border border-line bg-white px-3.5 py-2 text-[12px] font-bold hover:bg-gray-50">+ Receive</button>
                      </>
                    )}
                    {s.status === "Completed" && (
                      <span className="rounded-full bg-ok-bg px-3.5 py-1.5 text-[11.5px] font-bold text-ok">Replenished ✓</span>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      {/* ---------------- Receiving tasks (from approved ROs) ---------------- */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-2 text-[15px] font-bold">Receiving tasks</h2>
        {CHIPS.map((c) => {
          const active = chip === c;
          return (
            <button key={c} onClick={() => setChip(c)}
              className={`rounded-full border px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                active ? "border-ink bg-ink text-white" : "border-line bg-white text-gray-700 hover:border-gray-300"}`}>
              {c} <span className={active ? "text-white/70" : "text-sub"}>{counts[c]}</span>
            </button>
          );
        })}
        <Link href="/scan" className="ml-auto rounded-full bg-brand px-4 py-1.5 text-[12px] font-bold text-white hover:opacity-90">
          Open scanner →
        </Link>
      </div>

      {filtered.length === 0 ? (
        <Panel>
          <div className="px-6 py-14 text-center text-[13px] text-sub">
            No {chip.toLowerCase()} tasks. Approve a replenishment order to create one.
          </div>
        </Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((t) => {
            const pct = t.qty ? Math.min(100, (t.received / t.qty) * 100) : t.received > 0 ? 100 : 0;
            return (
              <Panel key={t.id}>
                <div className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center">
                  <div className="w-28">
                    <div className="font-mono text-[13px] font-bold">{t.id}</div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-sub">{t.orderId}</div>
                  </div>
                  <div className="w-44">
                    <div className="font-mono text-[13.5px] font-semibold">{t.sku}</div>
                    <div className="mt-0.5 text-[11.5px] text-sub">receive at <span className="font-mono">{t.facility}</span></div>
                  </div>
                  <div className="flex-1">
                    <div className="mb-1 flex items-center justify-between text-[11.5px]">
                      <span className="text-sub">Received</span>
                      <span className="font-semibold">{fmt(t.received)} / {t.qty !== null ? fmt(t.qty) : "?"} units</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                      <div className={`h-full rounded-full ${t.status === "Completed" ? "bg-ok" : "bg-brand"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status === "Pending" && (
                      <button onClick={() => startTask(t.id)}
                        className="rounded-lg bg-ink px-4 py-2 text-[12px] font-bold text-white hover:opacity-90">Start</button>
                    )}
                    {t.status === "In Progress" && (
                      <>
                        <input type="number" min={1} placeholder="units"
                          value={recv[t.id] || ""} onChange={(e) => setRecv({ ...recv, [t.id]: e.target.value })}
                          className="w-20 rounded-lg border border-line px-2.5 py-2 text-right font-mono text-[12.5px] outline-none focus:border-brand" />
                        <button onClick={() => { const n = Number(recv[t.id]); if (n > 0) { receiveTask(t.id, n); setRecv({ ...recv, [t.id]: "" }); } }}
                          className="rounded-lg border border-line bg-white px-3.5 py-2 text-[12px] font-bold hover:bg-gray-50">+ Receive</button>
                        <button onClick={() => completeTask(t.id)}
                          className="rounded-lg bg-ok px-4 py-2 text-[12px] font-bold text-white hover:opacity-90">Mark completed</button>
                      </>
                    )}
                    {t.status === "Completed" && (
                      <span className="rounded-full bg-ok-bg px-3.5 py-1.5 text-[11.5px] font-bold text-ok">Completed</span>
                    )}
                  </div>
                </div>
              </Panel>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-[12px] text-sub">
        Sales orders move stock out of the source warehouse and into the destination as you receive.
        When the full quantity lands, the SO auto-completes and the SKU's inventory shows as replenished.
      </p>
    </>
  );
}
