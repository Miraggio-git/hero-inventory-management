"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { Topbar, Panel } from "@/components/ui";
import { fmt } from "@/lib/data";

const CHIPS = ["Active", "Pending", "In Progress", "Completed"] as const;

export default function Fulfillment() {
  const { tasks, startTask, receiveTask, completeTask } = useStore();
  const [chip, setChip] = useState<(typeof CHIPS)[number]>("Active");
  const [recv, setRecv] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (chip === "Active") return tasks.filter((t) => t.status !== "Completed");
    return tasks.filter((t) => t.status === chip);
  }, [tasks, chip]);

  const counts: Record<string, number> = {
    Active: tasks.filter((t) => t.status !== "Completed").length,
    Pending: tasks.filter((t) => t.status === "Pending").length,
    "In Progress": tasks.filter((t) => t.status === "In Progress").length,
    Completed: tasks.filter((t) => t.status === "Completed").length,
  };

  return (
    <>
      <Topbar
        title="Fulfillment"
        sub="Tasks created when a replenishment order is approved. Receive stock with the scanner or log units here, then mark completed."
      />

      <div className="mb-4 flex flex-wrap gap-2">
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
        Received units are added to the SKU's sellable stock at the receiving facility, and cover recalculates instantly.
      </p>
    </>
  );
}
