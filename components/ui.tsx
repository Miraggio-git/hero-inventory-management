"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStore } from "@/lib/store";
import type { Row, Status } from "@/lib/data";
import { fmt } from "@/lib/data";

/* ---------- status styling ---------- */
export const STATUS_META: Record<Status, { dot: string; text: string; bg: string; label: string }> = {
  "Healthy":   { dot: "bg-ok",    text: "text-ok",    bg: "bg-ok-bg",    label: "Healthy" },
  "Watch":     { dot: "bg-watch", text: "text-watch", bg: "bg-watch-bg", label: "Watch" },
  "Replenish": { dot: "bg-low",   text: "text-low",   bg: "bg-low-bg",   label: "Replenish" },
  "Critical":  { dot: "bg-crit",  text: "text-crit",  bg: "bg-crit-bg",  label: "Critical" },
  "Stock-out": { dot: "bg-crit",  text: "text-white", bg: "bg-crit",     label: "Stock-out" },
  "No DRR":    { dot: "bg-gray-400", text: "text-gray-600", bg: "bg-gray-100", label: "No DRR" },
};

export function StatusPill({ s }: { s: Status }) {
  const m = STATUS_META[s];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${m.bg} ${m.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s === "Stock-out" ? "bg-white" : m.dot}`} />
      {m.label}
    </span>
  );
}

/* ---------- sidebar ---------- */
const NAV = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/inventory", label: "Inventory", icon: "◈" },
  { href: "/alerts", label: "Alerts", icon: "◉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

export function Sidebar() {
  const path = usePathname();
  const { snap, thresholds } = useStore();
  const alertCount = snap
    ? snap.rows.filter((r) => r.status !== "Healthy" && r.status !== "No DRR" && (r.cover === null || r.cover < thresholds.alert)).length
    : 0;
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-white md:flex">
      <div className="flex items-center gap-3 px-6 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">M</div>
        <div>
          <div className="text-[13px] font-bold tracking-[0.18em]">MIRAGGIO</div>
          <div className="text-[10px] tracking-[0.22em] text-sub">CONTROL TOWER</div>
        </div>
      </div>
      <nav className="mt-2 flex flex-col gap-1 px-3">
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                active ? "bg-ink text-white" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className={`text-[15px] ${active ? "text-white" : "text-gray-400"}`}>{n.icon}</span>
                {n.label}
              </span>
              {n.href === "/alerts" && alertCount > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${active ? "bg-white text-ink" : "bg-crit text-white"}`}>
                  {alertCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-6 py-5 text-[11px] leading-relaxed text-sub">
        Hero SKU replenishment · Phase 1<br />Bangalore pilot · daily 9 AM sync
      </div>
    </aside>
  );
}

/* ---------- topbar ---------- */
export function Topbar({ title, sub }: { title: string; sub: string }) {
  const { snap, loading, refresh, lastSync } = useStore();
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sub">Miraggio · Supply Chain</div>
        <h1 className="mt-1 text-[26px] font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-0.5 text-[13.5px] text-sub">{sub}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold ${
          snap?.live ? "border-ok/30 bg-ok-bg text-ok" : "border-line bg-white text-sub"
        }`}>
          <span className={`h-1.5 w-1.5 rounded-full ${snap?.live ? "bg-ok animate-pulse" : "bg-gray-400"}`} />
          {snap?.live ? "Live · Supabase" : "Snapshot mode"}
        </span>
        <button
          onClick={refresh}
          className="rounded-full bg-ink px-4 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-85"
        >
          {loading ? "Syncing…" : "Refresh"}
        </button>
        {lastSync && <span className="hidden text-[11px] text-sub sm:block">synced {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
    </div>
  );
}

/* ---------- KPI card ---------- */
export function Kpi({ label, value, note, tone }: { label: string; value: string; note?: string; tone?: "crit" | "low" | "ok" }) {
  const toneCls = tone === "crit" ? "text-crit" : tone === "low" ? "text-low" : tone === "ok" ? "text-ok" : "text-ink";
  return (
    <div className="rounded-xl2 border border-line bg-white px-5 py-4 shadow-card">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-sub">{label}</div>
      <div className={`mt-1.5 text-[26px] font-bold leading-none tracking-tight ${toneCls}`}>{value}</div>
      {note && <div className="mt-1.5 text-[12px] text-sub">{note}</div>}
    </div>
  );
}

/* ---------- Fixoria-style segmented health strip ---------- */
export function HealthStrip({ rows }: { rows: Row[] }) {
  const groups: { key: Status; cls: string }[] = [
    { key: "Healthy", cls: "bg-ok" },
    { key: "Watch", cls: "bg-watch" },
    { key: "Replenish", cls: "bg-low" },
    { key: "Critical", cls: "bg-crit" },
    { key: "Stock-out", cls: "bg-crit/70" },
    { key: "No DRR", cls: "bg-gray-300" },
  ];
  const total = rows.length || 1;
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-gray-100">
        {groups.map((g) => {
          const n = rows.filter((r) => r.status === g.key).length;
          if (!n) return null;
          return <div key={g.key} className={g.cls} style={{ width: `${(n / total) * 100}%` }} title={`${g.key}: ${n}`} />;
        })}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1.5">
        {groups.map((g) => {
          const n = rows.filter((r) => r.status === g.key).length;
          if (!n) return null;
          return (
            <span key={g.key} className="flex items-center gap-1.5 text-[12px] text-gray-600">
              <span className={`h-2 w-2 rounded-full ${g.cls}`} /> {g.key}: <strong>{n}</strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- facility distribution strip (per SKU) ---------- */
const FAC_COLORS: Record<string, string> = {
  miraggiolife_luh: "#4F46E5",
  MG_BNG: "#0EA5E9",
  Miraggio_FRK: "#8B5CF6",
  Miraggio_Mum: "#14B8A6",
  Zepto: "#F59E0B",
};
export const facColor = (f: string) => FAC_COLORS[f] || "#94A3B8";

export function FacStrip({ r }: { r: Row }) {
  if (r.avail <= 0) return <div className="h-2 w-full max-w-[180px] rounded-full bg-gray-100" title="No sellable stock" />;
  const segs = Object.entries(r.fac).sort((a, b) => b[1] - a[1]);
  return (
    <div className="flex h-2 w-full max-w-[180px] overflow-hidden rounded-full bg-gray-100">
      {segs.map(([f, v]) => (
        <div key={f} style={{ width: `${(v / r.avail) * 100}%`, background: facColor(f) }} title={`${f}: ${fmt(v)}`} />
      ))}
    </div>
  );
}

/* ---------- panel ---------- */
export function Panel({ title, right, children, className = "" }: { title?: string; right?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl2 border border-line bg-white shadow-card ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          {title && <h3 className="text-[13px] font-semibold text-ink">{title}</h3>}
          {right}
        </div>
      )}
      {children}
    </div>
  );
}
