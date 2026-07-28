"use client";
import { useStore } from "@/lib/store";
import { Topbar, Panel, StatusPill, facColor } from "@/components/ui";
import { fmt, recommendFac, facilityAlerts, DRR_WINDOW_LABEL } from "@/lib/data";

export default function Alerts() {
  const { snap, rows, thresholds } = useStore();
  if (!snap) return <div className="flex h-[70vh] items-center justify-center text-sub">Loading…</div>;

  // One alert per (sku, facility): a SKU can be healthy in Ludhiana and critical in Mumbai.
  const alerting = facilityAlerts(rows);

  return (
    <>
      <Topbar
        title="Alerts"
        sub={`Every SKU-warehouse pair with less than ${thresholds.alert} days of its own cover — ordered by urgency`}
      />

      {!snap.drrLive && (
        <Panel className="mb-5">
          <div className="px-6 py-5 text-[13px] leading-relaxed text-gray-700">
            <strong>DRR feed unreachable.</strong> Days-of-cover alerts need{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">facility_wise_drr</code> to be
            readable with the publishable key (columns:{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">sku</code>,{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">facility</code>,{" "}
            <code className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[12px]">actual_30d_drr</code>). Until then
            only stock-outs are flagged.
          </div>
        </Panel>
      )}

      {alerting.length === 0 ? (
        <Panel><div className="px-6 py-14 text-center text-sub">No warehouse is below the {thresholds.alert}-day buffer. All clear.</div></Panel>
      ) : (
        <div className="flex flex-col gap-3">
          {alerting.map(({ row, fac }) => (
            <Panel key={`${row.sku}-${fac.facility}`}>
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
                <div className="flex w-44 flex-col">
                  <span className="font-mono text-[14px] font-bold">{row.sku}</span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-sub">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: facColor(fac.facility) }} />
                    {fac.label} · rank #{row.rank}
                  </span>
                </div>
                <div className="flex w-44 flex-col">
                  <span className="text-[20px] font-bold leading-none">{fac.cover !== null ? `${fac.cover.toFixed(1)}d` : "0d"}</span>
                  <span className="mt-1 text-[11.5px] text-sub">
                    {fmt(fac.avail)} here · DRR {fac.drr ?? "—"}/d ({DRR_WINDOW_LABEL})
                  </span>
                </div>
                <div className="flex-1 text-[12.5px] leading-relaxed text-gray-700">{recommendFac(row, fac, thresholds)}</div>
                <StatusPill s={fac.status} />
              </div>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
