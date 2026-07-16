"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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

export function PriorityPill({ p }: { p: "Emergency" | "Critical" | "High" | "Watch" }) {
  const map = {
    Emergency: "bg-crit text-white",
    Critical: "bg-crit-bg text-crit",
    High: "bg-low-bg text-low",
    Watch: "bg-watch-bg text-watch",
  } as const;
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${map[p]}`}>{p}</span>;
}

/* ---------- navigation ---------- */
const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/inventory", label: "Inventory", icon: "◈" },
  { href: "/orders", label: "Replenishment", icon: "⟳" },
  { href: "/fulfillment", label: "Fulfillment", icon: "▤" },
  { href: "/scan", label: "Barcode Scan", icon: "⌗" },
  { href: "/alerts", label: "Alerts", icon: "◉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

/* ---------- auth gate ---------- */
export function Gate({ children }: { children: React.ReactNode }) {
  const { session, authReady } = useStore();
  const path = usePathname();
  const router = useRouter();
  const isPublic = path === "/login";
  const bare = isPublic || path === "/scan";

  useEffect(() => {
    if (!authReady) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [authReady, session, path, isPublic, router]);

  if (!authReady) return <div className="flex h-screen items-center justify-center text-sub">Loading…</div>;
  if (!session && !isPublic) return null;

  if (bare) return <main className="min-h-screen">{children}</main>;
  return (
    <>
      <Sidebar />
      <main className="min-h-screen px-5 py-7 md:ml-60 md:px-9">{children}</main>
    </>
  );
}

/* ---------- sidebar ---------- */
export function Sidebar() {
  const { session, signOut, rows, thresholds, tasks, orders } = useStore();
  const path = usePathname();
  const router = useRouter();
  if (!session) return null;

  const alertCount = rows.filter((r) => r.status !== "Healthy" && r.status !== "No DRR").length;
  const taskCount = tasks.filter((t) => t.status !== "Completed").length;
  const openOrders = orders.filter((o) => o.status === "Open").length;
  const badge = (href: string) =>
    href === "/alerts" ? alertCount : href === "/fulfillment" ? taskCount : href === "/orders" ? openOrders : 0;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-white md:flex">
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
          const b = badge(n.href);
          return (
            <Link key={n.href} href={n.href}
              className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
                active ? "bg-ink text-white" : "text-gray-700 hover:bg-gray-50"}`}>
              <span className="flex items-center gap-3">
                <span className={`text-[15px] ${active ? "text-white" : "text-gray-400"}`}>{n.icon}</span>
                {n.label}
              </span>
              {b > 0 && (
                <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-bold ${active ? "bg-white text-ink" : n.href === "/alerts" ? "bg-crit text-white" : "bg-ink text-white"}`}>{b}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-4 pb-5">
        <div className="rounded-xl2 border border-line bg-gray-50/60 px-4 py-3.5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sub">Signed in</div>
          <div className="mt-1 text-[13.5px] font-bold">{session.name}</div>
          <div className="text-[11.5px] text-sub">{session.email}</div>
          <div className="mt-0.5 text-[10px] font-bold tracking-[0.12em] text-gray-500">SUPPLY CHAIN</div>
          <button onClick={() => { signOut(); router.replace("/login"); }}
            className="mt-3 w-full rounded-lg border border-line bg-white py-2 text-[12px] font-semibold hover:bg-gray-50">
            Sign out
          </button>
        </div>
      </div>
    </aside>
  );
}

/* ---------- notifications bell ---------- */
function Bell() {
  const { orders, unreadCount, markAlertsRead, session } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const active = orders.filter((o) => o.status === "Open" || o.status === "In Progress").slice(0, 8);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen(!open); if (!open) markAlertsRead(); }}
        aria-label="Notifications"
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white hover:bg-gray-50">
        <span className="text-[15px]">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-crit px-1 text-[10px] font-bold text-white">{unreadCount}</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-11 z-30 w-96 rounded-xl2 border border-line bg-white shadow-lg">
          <div className="border-b border-line px-4 py-3">
            <div className="text-[13.5px] font-bold">Notifications</div>
            <div className="text-[11.5px] text-sub">{active.length} active replenishment alerts</div>
          </div>
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {active.length === 0 && <li className="px-4 py-8 text-center text-[12.5px] text-sub">All clear — nothing below the buffer.</li>}
            {active.map((o) => (
              <li key={o.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[12.5px] font-bold">{o.sku}</span>
                  <PriorityPill p={o.priority} />
                </div>
                <div className="mt-1 line-clamp-2 text-[11.5px] leading-snug text-sub">{o.reason}</div>
                <div className="mt-1 text-[10.5px] text-gray-400">{o.id} · {new Date(o.createdAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
              </li>
            ))}
          </ul>
          <Link href="/orders" onClick={() => setOpen(false)}
            className="block rounded-b-xl2 bg-ink px-4 py-3 text-center text-[12.5px] font-semibold text-white hover:opacity-90">
            View all replenishment orders
          </Link>
        </div>
      )}
    </div>
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
        <Bell />
        <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] font-semibold ${
          snap?.live ? "border-ok/30 bg-ok-bg text-ok" : "border-line bg-white text-sub"}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${snap?.live ? "bg-ok animate-pulse" : "bg-gray-400"}`} />
          {snap?.live ? "Live · Supabase" : "Snapshot mode"}
        </span>
        <button onClick={refresh}
          className="rounded-full bg-ink px-4 py-1.5 text-[11.5px] font-semibold text-white transition-opacity hover:opacity-85">
          {loading ? "Syncing…" : "Refresh"}
        </button>
        {lastSync && <span className="hidden text-[11px] text-sub sm:block">synced {lastSync.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span>}
      </div>
    </div>
  );
}

/* ---------- KPI / strip / panel (unchanged primitives) ---------- */
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

export function HealthStrip({ rows }: { rows: Row[] }) {
  const groups: { key: Status; cls: string }[] = [
    { key: "Healthy", cls: "bg-ok" }, { key: "Watch", cls: "bg-watch" },
    { key: "Replenish", cls: "bg-low" }, { key: "Critical", cls: "bg-crit" },
    { key: "Stock-out", cls: "bg-crit/70" }, { key: "No DRR", cls: "bg-gray-300" },
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

const FAC_COLORS: Record<string, string> = {
  miraggiolife_luh: "#4F46E5", MG_BNG: "#0EA5E9", Miraggio_FRK: "#8B5CF6",
  Miraggio_Mum: "#14B8A6", Zepto: "#F59E0B",
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
