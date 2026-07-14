"use client";
import { useStore } from "@/lib/store";
import { Topbar, Panel, StatusPill } from "@/components/ui";
import { fmt, recommend } from "@/lib/data";

export default function Alerts() {
  const { snap, thresholds } = useStore();
  if (!snap) return <div className="flex h-[70vh] items-center justify-center text-sub">Loading…</div>;

  const alerting = snap.rows
    .filter((r) => r.status !== "Healthy" && r.status !== "No DRR")
    .sort((a, b) => (a.cover ?? (a.avail <= 0 ? -1 : 999)) - (b.cover ?? (b.avail <= 0 ? -1 : 999)));

  return (
    <>
      <Topbar
        title="Alerts"
        sub={`Every hero SKU with less than ${thresholds.alert} days of cover — ordered by urgency`}
      />

      {!snap.drrLive && (
        <Panel className="mb-5">
          <div className="px-6 py-5 text-[13px] leading-relaxed text-gray-700">
            <strong>DRR feed not connected yet.</strong> Days-of-cover alerts activate once the{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">sku_drr</code> table exists in
            Supabase (columns: <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">sku</code>,{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">drr</code>). Until then only
            stock-outs are flagged.
          </div>
        </Panel>
      )}

      {alerting.length === 0 ? (
        <Panel><div className="px-6 py-14 text-center text-sub">No SKU is below the {thresholds.alert}-day buffer. All clear.</div></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {alerting.map((r) => (
            <Panel key={r.sku}>
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex w-40 flex-col">
                  <span className="font-mono text-[14px] font-bold">{r.sku}</span>
                  <span className="mt-1 text-[11.5px] text-sub">rank #{r.rank}</span>
                </div>
                <div className="flex w-40 flex-col">
                  <span className="text-[20px] font-bold leading-none">{r.cover !== null ? `${r.cover.toFixed(1)}d` : "0d"}</span>
                  <span className="mt-1 text-[11.5px] text-sub">{fmt(r.avail)} sellable{r.incoming ? ` · ${fmt(r.incoming)} incoming` : ""}</span>
                </div>
                <div className="flex-1 text-[12.5px] leading-relaxed text-gray-700">{recommend(r, thresholds)}</div>
                <StatusPill s={r.status} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
