"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { SecurityPulseSnapshot } from "@/lib/security-pulse-state";

const defaultSnapshot: SecurityPulseSnapshot = {
  phase: "idle",
  isPhotoDeleted: false,
};

type Ctx = {
  snapshot: SecurityPulseSnapshot;
  setSnapshot: (s: SecurityPulseSnapshot) => void;
};

const SecurityPulseContext = createContext<Ctx | null>(null);

export function SecurityPulseProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState<SecurityPulseSnapshot>(defaultSnapshot);

  const value = useMemo(
    () => ({
      snapshot,
      setSnapshot,
    }),
    [snapshot],
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
