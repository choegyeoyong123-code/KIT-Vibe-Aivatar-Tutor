"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SecurityPulseSnapshot } from "@/lib/security-pulse-state";
import type { DeletionReceipt } from "@/lib/security/deletion-receipt";

const defaultSnapshot: SecurityPulseSnapshot = {
  phase: "idle",
  isPhotoDeleted: false,
};

type Ctx = {
  snapshot: SecurityPulseSnapshot;
  setSnapshot: (s: SecurityPulseSnapshot) => void;
  setDeletionReceipt: (r: DeletionReceipt | null) => void;
};

const SecurityPulseContext = createContext<Ctx | null>(null);

export function SecurityPulseProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SecurityPulseSnapshot>(defaultSnapshot);
  const setDeletionReceipt = useCallback((r: DeletionReceipt | null) => {
    setSnapshot((prev) => ({ ...prev, deletion_receipt: r }));
  }, []);
  const setSnapshotMerged = useCallback((s: SecurityPulseSnapshot) => {
    setSnapshot((prev) => ({
      ...s,
      deletion_receipt: s.deletion_receipt ?? prev.deletion_receipt ?? null,
    }));
  }, []);

  const value = useMemo(
    () => ({
      snapshot,
      setSnapshot: setSnapshotMerged,
      setDeletionReceipt,
    }),
    [snapshot, setSnapshotMerged, setDeletionReceipt],
  );

  return (
    <SecurityPulseContext.Provider value={value}>{children}</SecurityPulseContext.Provider>
  );
}

export function useSecurityPulse(): Ctx {
  const ctx = useContext(SecurityPulseContext);
  if (!ctx) {
    throw new Error("useSecurityPulse must be used within SecurityPulseProvider");
  }
  return ctx;
}
