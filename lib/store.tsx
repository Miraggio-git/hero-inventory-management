"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_THRESHOLDS, loadSnapshot, computeStatus, recommend,
  type Snapshot, type Thresholds, type Row,
} from "./data";

/* ---------------- types ---------------- */
export type Session = { name: string; email: string };

export const DEMO_USER = {
  name: "Rahul Mehta",
  email: "supply@miraggio.com",
  password: "miraggio",
};

export type OrderStatus = "Open" | "In Progress" | "Completed" | "Resolved";
export type Priority = "Emergency" | "Critical" | "High" | "Watch";

export type Order = {
  id: string;           // RO-1001
  sku: string;
  qty: number | null;   // recommended units (null when no DRR)
  priority: Priority;
  status: OrderStatus;
  reason: string;
  coverAt: number | null;
  createdAt: string;
  approvedAt?: string;
  completedAt?: string;
  read: boolean;
};

export type Task = {
  id: string;           // FUL-1001
  orderId: string;
  sku: string;
  qty: number | null;
  received: number;
  status: "Pending" | "In Progress" | "Completed";
  facility: string;     // receiving facility
  startedAt?: string;
  completedAt?: string;
};

// Sales order: an inter-warehouse stock transfer raised from a replenishment order.
export type SO = {
  id: string;           // SO-1001
  orderId?: string;     // originating RO, if any
  sku: string;
  qty: number;
  fromFac: string;      // source warehouse (has surplus)
  toFac: string;        // destination warehouse (low / critical)
  received: number;
  status: "Open" | "In Progress" | "Completed";
  createdAt: string;
  completedAt?: string;
};

type Adj = Record<string, Record<string, number>>; // sku -> facility -> delta units

type Ops = { orders: Order[]; tasks: Task[]; sos: SO[]; adj: Adj; seq: number };
const EMPTY_OPS: Ops = { orders: [], tasks: [], sos: [], adj: {}, seq: 1000 };

/* ---------------- store ---------------- */
type Store = {
  snap: Snapshot | null;
  rows: Row[];                       // snapshot merged with local adjustments
  loading: boolean;
  thresholds: Thresholds;
  setThresholds: (t: Thresholds) => void;
  refresh: () => void;
  lastSync: Date | null;
  // auth
  session: Session | null;
  authReady: boolean;
  signIn: (email: string, password: string) => string | null; // returns error msg or null
  signOut: () => void;
  // ops
  orders: Order[];
  tasks: Task[];
  sos: SO[];
  approveOrder: (id: string) => void;
  createSO: (sku: string, fromFac: string, toFac: string, qty: number, orderId?: string) => string; // returns SO id
  startSO: (id: string) => void;
  receiveSO: (id: string, units: number) => void;
  startTask: (id: string) => void;
  receiveTask: (id: string, units: number) => void;
  completeTask: (id: string) => void;
  scanAdjust: (sku: string, facility: string, units: number, dir: "in" | "out") => void;
  markAlertsRead: () => void;
  unreadCount: number;
};

const Ctx = createContext<Store | null>(null);

function mergeRows(snap: Snapshot | null, adj: Adj, t: Thresholds): Row[] {
  if (!snap) return [];
  return snap.rows.map((r) => {
    const a = adj[r.sku];
    if (!a) return r;
    const fac = { ...r.fac };
    let delta = 0;
    for (const [f, d] of Object.entries(a)) {
      const cur = fac[f] || 0;
      const next = Math.max(0, cur + d);
      delta += next - cur;
      if (next > 0) fac[f] = next; else delete fac[f];
    }
    const avail = Math.max(0, r.avail + delta);
    const cover = r.drr ? avail / r.drr : null;
    return { ...r, avail, fac, cover, status: computeStatus(cover, avail, t) };
  });
}

function priorityFor(r: Row, t: Thresholds): Priority {
  if (r.avail <= 0) return "Emergency";
  if (r.cover !== null && r.cover <= t.critical) return "Critical";
  if (r.cover !== null && r.cover < t.replenish) return "High";
  return "Watch";
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholdsState] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [ops, setOps] = useState<Ops>(EMPTY_OPS);
  const hydrated = useRef(false);

  /* hydrate persisted state */
  useEffect(() => {
    try {
      const s = localStorage.getItem("mct-session");
      if (s) setSession(JSON.parse(s));
      const o = localStorage.getItem("mct-ops-v1");
      if (o) setOps({ ...EMPTY_OPS, ...JSON.parse(o) });
      const t = localStorage.getItem("mct-thresholds");
      if (t) setThresholdsState({ ...DEFAULT_THRESHOLDS, ...JSON.parse(t) });
    } catch {}
    hydrated.current = true;
    setAuthReady(true);
  }, []);
  useEffect(() => { if (hydrated.current) localStorage.setItem("mct-ops-v1", JSON.stringify(ops)); }, [ops]);
  useEffect(() => { if (hydrated.current && session) localStorage.setItem("mct-session", JSON.stringify(session)); }, [session]);
  useEffect(() => { if (hydrated.current) localStorage.setItem("mct-thresholds", JSON.stringify(thresholds)); }, [thresholds]);

  const setThresholds = (t: Thresholds) => setThresholdsState(t);

  /* data sync */
  const refresh = async () => {
    setLoading(true);
    const s = await loadSnapshot(thresholds);
    setSnap(s);
    setLastSync(new Date());
    setLoading(false);
  };
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (snap) loadSnapshot(thresholds).then(setSnap); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholds]);

  const rows = useMemo(() => mergeRows(snap, ops.adj, thresholds), [snap, ops.adj, thresholds]);

  /* auto-generate replenishment orders from merged rows */
  useEffect(() => {
    if (!rows.length) return;
    setOps((prev) => {
      let seq = prev.seq;
      const orders = [...prev.orders];
      const openBySku = new Map(orders.filter((o) => o.status === "Open" || o.status === "In Progress").map((o) => [o.sku, o]));
      let changed = false;
      for (const r of rows) {
        const alerting = r.status === "Stock-out" || r.status === "Critical" || r.status === "Replenish" || r.status === "Watch";
        const existing = openBySku.get(r.sku);
        if (alerting && !existing) {
          seq += 1;
          orders.unshift({
            id: `RO-${seq}`,
            sku: r.sku,
            qty: r.drr ? Math.max(1, Math.ceil(r.drr * thresholds.alert - r.avail)) : null,
            priority: priorityFor(r, thresholds),
            status: "Open",
            reason: recommend(r, thresholds),
            coverAt: r.cover,
            createdAt: new Date().toISOString(),
            read: false,
          });
          changed = true;
        } else if (!alerting && existing && existing.status === "Open") {
          existing.status = "Resolved";
          changed = true;
        }
      }
      return changed ? { ...prev, orders, seq } : prev;
    });
  }, [rows, thresholds]);

  /* ---------------- actions ---------------- */
  const signIn = (email: string, password: string): string | null => {
    const ok =
      email.trim().toLowerCase() === DEMO_USER.email.toLowerCase() &&
      password === DEMO_USER.password;
    if (!ok) return "Invalid email or password.";
    setSession({ name: DEMO_USER.name, email: DEMO_USER.email });
    return null;
  };
  const signOut = () => { setSession(null); localStorage.removeItem("mct-session"); };

  const approveOrder = (id: string) =>
    setOps((p) => {
      const orders = p.orders.map((o) => (o.id === id && o.status === "Open" ? { ...o, status: "In Progress" as OrderStatus, approvedAt: new Date().toISOString() } : o));
      const ord = orders.find((o) => o.id === id);
      if (!ord || p.tasks.some((t) => t.orderId === id)) return { ...p, orders };
      const row = rows.find((r) => r.sku === ord.sku);
      const facility = row && Object.keys(row.fac).length ? Object.entries(row.fac).sort((a, b) => b[1] - a[1])[0][0] : "MG_BNG";
      const task: Task = { id: `FUL-${p.seq + 1}`, orderId: id, sku: ord.sku, qty: ord.qty, received: 0, status: "Pending", facility };
      return { ...p, orders, tasks: [task, ...p.tasks], seq: p.seq + 1 };
    });

  const startTask = (id: string) =>
    setOps((p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === id ? { ...t, status: "In Progress", startedAt: new Date().toISOString() } : t)) }));

  const applyAdj = (adj: Adj, sku: string, fac: string, delta: number): Adj => ({
    ...adj, [sku]: { ...(adj[sku] || {}), [fac]: ((adj[sku] || {})[fac] || 0) + delta },
  });

  /* ----- sales orders (inter-warehouse transfers) ----- */
  const createSO = (sku: string, fromFac: string, toFac: string, qty: number, orderId?: string): string => {
    let id = "";
    setOps((p) => {
      const seq = p.seq + 1;
      id = `SO-${seq}`;
      const so: SO = {
        id, orderId, sku, qty: Math.max(1, Math.round(qty)),
        fromFac, toFac, received: 0, status: "Open",
        createdAt: new Date().toISOString(),
      };
      return { ...p, sos: [so, ...p.sos], seq };
    });
    return id;
  };

  const startSO = (id: string) =>
    setOps((p) => ({ ...p, sos: p.sos.map((s) => (s.id === id && s.status === "Open" ? { ...s, status: "In Progress" } : s)) }));

  // Receiving against an SO moves stock: out of the source, into the destination.
  // When the full qty has been received the SO auto-completes — inventory is replenished.
  const receiveSO = (id: string, units: number) =>
    setOps((p) => {
      const s = p.sos.find((x) => x.id === id);
      if (!s || units <= 0 || s.status === "Completed") return p;
      const take = Math.min(units, Math.max(0, s.qty - s.received));
      if (take <= 0) return p;
      let adj = applyAdj(p.adj, s.sku, s.fromFac, -take);
      adj = applyAdj(adj, s.sku, s.toFac, take);
      const received = s.received + take;
      const done = received >= s.qty;
      const now = new Date().toISOString();
      return {
        ...p,
        adj,
        sos: p.sos.map((x) =>
          x.id === id
            ? { ...x, received, status: done ? "Completed" : "In Progress", completedAt: done ? now : x.completedAt }
            : x
        ),
        orders: done && s.orderId
          ? p.orders.map((o) => (o.id === s.orderId && o.status !== "Completed" ? { ...o, status: "Completed", completedAt: now } : o))
          : p.orders,
      };
    });


  const receiveTask = (id: string, units: number) =>
    setOps((p) => {
      const t = p.tasks.find((x) => x.id === id);
      if (!t || units <= 0) return p;
      return {
        ...p,
        tasks: p.tasks.map((x) => (x.id === id ? { ...x, received: x.received + units, status: "In Progress" } : x)),
        adj: applyAdj(p.adj, t.sku, t.facility, units),
      };
    });

  const completeTask = (id: string) =>
    setOps((p) => {
      const t = p.tasks.find((x) => x.id === id);
      if (!t) return p;
      const now = new Date().toISOString();
      return {
        ...p,
        tasks: p.tasks.map((x) => (x.id === id ? { ...x, status: "Completed", completedAt: now } : x)),
        orders: p.orders.map((o) => (o.id === t.orderId ? { ...o, status: "Completed", completedAt: now } : o)),
      };
    });

  const scanAdjust = (sku: string, facility: string, units: number, dir: "in" | "out") =>
    setOps((p) => {
      let next = { ...p, adj: applyAdj(p.adj, sku, facility, dir === "in" ? units : -units) };
      if (dir === "in") {
        // credit any active task for this SKU
        const t = p.tasks.find((x) => x.sku === sku && x.status !== "Completed");
        if (t) next = { ...next, tasks: p.tasks.map((x) => (x.id === t.id ? { ...x, received: x.received + units, status: "In Progress" } : x)) };
      }
      return next;
    });

  const markAlertsRead = () => setOps((p) => ({ ...p, orders: p.orders.map((o) => ({ ...o, read: true })) }));
  const unreadCount = ops.orders.filter((o) => !o.read && (o.status === "Open" || o.status === "In Progress")).length;

  const value: Store = useMemo(
    () => ({
      snap, rows, loading, thresholds, setThresholds, refresh, lastSync,
      session, authReady, signIn, signOut,
      orders: ops.orders, tasks: ops.tasks, sos: ops.sos,
      approveOrder, createSO, startSO, receiveSO, startTask, receiveTask, completeTask, scanAdjust, markAlertsRead, unreadCount,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [snap, rows, loading, thresholds, lastSync, session, authReady, ops]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
