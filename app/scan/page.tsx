"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { StatusPill } from "@/components/ui";
import { fmt } from "@/lib/data";
import JsBarcode from "jsbarcode";

type Mode = "in" | "out";

export default function Scan() {
  const { rows, snap, scanAdjust, session, signOut } = useStore();
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);
  const [armed, setArmed] = useState(false);
  const [code, setCode] = useState("");
  const [found, setFound] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [facility, setFacility] = useState("");
  const [log, setLog] = useState<{ sku: string; qty: number; dir: Mode; fac: string; at: string }[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const row = useMemo(() => rows.find((r) => r.sku === found), [rows, found]);
  const facilities = snap?.facilities ?? [];

  useEffect(() => { if (armed) inputRef.current?.focus(); }, [armed]);
  useEffect(() => {
    if (found && svgRef.current) {
      try { JsBarcode(svgRef.current, found, { format: "CODE128", height: 40, displayValue: false, margin: 0, background: "transparent" }); } catch {}
    }
  }, [found]);
  useEffect(() => {
    if (row) {
      const top = Object.entries(row.fac).sort((a, b) => b[1] - a[1])[0];
      setFacility(top ? top[0] : facilities[0] || "MG_BNG");
    }
  }, [row, facilities]);

  const lookup = (raw: string) => {
    const c = raw.trim().toUpperCase();
    if (!c) return;
    const hit = rows.find((r) => r.sku.toUpperCase() === c) || rows.find((r) => r.sku.toUpperCase().includes(c));
    setFound(hit ? hit.sku : null);
    setCode(c);
    setArmed(false);
    setQty(1);
  };

  const confirm = () => {
    if (!found || !mode || qty <= 0 || !facility) return;
    scanAdjust(found, facility, qty, mode);
    setLog([{ sku: found, qty, dir: mode, fac: facility, at: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }, ...log].slice(0, 8));
    setFound(null); setCode(""); setQty(1);
  };

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-5 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sub">Warehouse floor · Miraggio</div>
          <h1 className="mt-1 text-[26px] font-bold tracking-tight">Barcode scan</h1>
        </div>
        <Link href="/" className="rounded-lg border border-line bg-white px-4 py-2 text-[12.5px] font-semibold hover:bg-gray-50">Dashboard</Link>
      </div>

      <div className="mb-5 rounded-xl2 border border-sky-100 bg-sky-50 px-5 py-4 text-[13px] leading-relaxed text-sky-900">
        <strong>Scan workflow</strong>
        <ol className="mt-1 list-decimal pl-5">
          <li>Select <strong>Stock IN</strong> or <strong>Stock OUT</strong></li>
          <li>Tap <strong>Ready to scan</strong>, then scan with the Zebra (DataWedge keyboard wedge) — or type the SKU</li>
          <li>Review the product, set quantity and facility, tap <strong>Confirm</strong></li>
        </ol>
      </div>

      {/* mode select */}
      <div className="grid grid-cols-2 gap-3">
        {(["in", "out"] as Mode[]).map((m) => (
          <button key={m} onClick={() => { setMode(m); setFound(null); setCode(""); }}
            className={`rounded-xl2 border px-4 py-6 text-center transition-colors ${
              mode === m ? "border-ink bg-ink text-white" : "border-line bg-white hover:border-gray-300"}`}>
            <div className="text-xl">{m === "in" ? "↓" : "↑"}</div>
            <div className="mt-1 text-[15px] font-bold">{m === "in" ? "Stock IN" : "Stock OUT"}</div>
            <div className={`mt-0.5 text-[11.5px] ${mode === m ? "text-gray-300" : "text-sub"}`}>{m === "in" ? "Receive · replenish" : "Pick · dispatch"}</div>
          </button>
        ))}
      </div>

      {/* arm + input */}
      {mode && !found && (
        <div className="mt-5 rounded-xl2 border border-line bg-white p-5 text-center shadow-card">
          {!armed ? (
            <button onClick={() => setArmed(true)}
              className="w-full rounded-lg bg-brand py-3.5 text-[14px] font-bold text-white hover:opacity-90">
              Ready to scan
            </button>
          ) : (
            <>
              <div className="mb-2 inline-flex items-center gap-2 text-[12.5px] font-semibold text-brand">
                <span className="h-2 w-2 animate-pulse rounded-full bg-brand" /> Waiting for scan…
              </div>
              <input ref={inputRef} value={code} autoFocus
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && lookup(code)}
                placeholder="Scan barcode or type SKU, then Enter"
                className="w-full rounded-lg border border-brand/40 px-4 py-3 text-center font-mono text-[15px] outline-none focus:ring-2 focus:ring-brand/20" />
              <button onClick={() => lookup(code)} className="mt-3 rounded-lg border border-line px-5 py-2 text-[12.5px] font-semibold hover:bg-gray-50">Look up</button>
            </>
          )}
          {code && found === null && !armed && (
            <p className="mt-3 text-[12.5px] font-semibold text-crit">“{code}” isn't a hero SKU — try again.</p>
          )}
        </div>
      )}

      {/* review + confirm */}
      {mode && found && row && (
        <div className="mt-5 rounded-xl2 border border-line bg-white p-5 shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mono text-[17px] font-bold">{row.sku}</div>
              <div className="mt-0.5 text-[12px] text-sub">Hero rank #{row.rank} · {fmt(row.avail)} sellable · {row.cover !== null ? `${row.cover.toFixed(1)}d cover` : "no DRR"}</div>
            </div>
            <StatusPill s={row.status} />
          </div>
          <div className="mt-3"><svg ref={svgRef} className="max-w-full" /></div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Quantity</label>
              <div className="mt-1 flex items-center gap-2">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="h-10 w-10 rounded-lg border border-line text-lg font-bold hover:bg-gray-50">−</button>
                <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                  className="h-10 w-full rounded-lg border border-line text-center font-mono text-[15px] outline-none focus:border-brand" />
                <button onClick={() => setQty(qty + 1)} className="h-10 w-10 rounded-lg border border-line text-lg font-bold hover:bg-gray-50">+</button>
              </div>
            </div>
            <div>
              <label className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-sub">Facility</label>
              <select value={facility} onChange={(e) => setFacility(e.target.value)}
                className="mt-1 h-10 w-full rounded-lg border border-line bg-white px-3 font-mono text-[12.5px] outline-none focus:border-brand">
                {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex gap-2.5">
            <button onClick={() => { setFound(null); setCode(""); }}
              className="flex-1 rounded-lg border border-line py-2.5 text-[13px] font-semibold hover:bg-gray-50">Cancel</button>
            <button onClick={confirm}
              className={`flex-[2] rounded-lg py-2.5 text-[13px] font-bold text-white hover:opacity-90 ${mode === "in" ? "bg-ok" : "bg-crit"}`}>
              Confirm {mode === "in" ? "Stock IN" : "Stock OUT"} · {qty} unit{qty > 1 ? "s" : ""}
            </button>
          </div>
        </div>
      )}

      {/* recent scans */}
      {log.length > 0 && (
        <div className="mt-5 rounded-xl2 border border-line bg-white shadow-card">
          <div className="border-b border-line px-5 py-3 text-[13px] font-semibold">Recent scans</div>
          <ul className="divide-y divide-line">
            {log.map((l, i) => (
              <li key={i} className="flex items-center justify-between px-5 py-2.5 text-[12.5px]">
                <span className="font-mono font-semibold">{l.sku}</span>
                <span className={`font-bold ${l.dir === "in" ? "text-ok" : "text-crit"}`}>{l.dir === "in" ? "+" : "−"}{l.qty}</span>
                <span className="font-mono text-[11px] text-sub">{l.fac}</span>
                <span className="text-[11px] text-sub">{l.at}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 flex items-center justify-between border-t border-line pt-4 text-[12px] text-sub">
        <span>{session?.name}</span>
        <button onClick={() => { signOut(); router.replace("/login"); }} className="font-semibold underline hover:text-ink">Sign out</button>
      </div>
    </div>
  );
}
