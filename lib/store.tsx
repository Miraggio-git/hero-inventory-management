"use client";
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DEFAULT_THRESHOLDS, loadSnapshot, type Snapshot, type Thresholds } from "./data";

type Store = {
  snap: Snapshot | null;
  loading: boolean;
  thresholds: Thresholds;
  setThresholds: (t: Thresholds) => void;
  refresh: () => void;
  lastSync: Date | null;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<Thresholds>(DEFAULT_THRESHOLDS);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const tRef = useRef(thresholds);
  tRef.current = thresholds;

  const refresh = async () => {
    setLoading(true);
    const s = await loadSnapshot(tRef.current);
    setSnap(s);
    setLastSync(new Date());
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000); // live sync · 60s
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recompute statuses when thresholds change (no refetch needed)
  useEffect(() => {
    if (!snap) return;
    loadSnapshot(thresholds).then((s) => setSnap(s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thresholds]);

  const value = useMemo(
    () => ({ snap, loading, thresholds, setThresholds, refresh, lastSync }),
    [snap, loading, thresholds, lastSync]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}
