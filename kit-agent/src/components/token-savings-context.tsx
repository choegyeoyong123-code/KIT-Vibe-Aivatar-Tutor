"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { AgentStateSnapshot } from "@/lib/agent/types";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import {
  DEFAULT_DYNAMIC_PERSONA_ID,
  DYNAMIC_PERSONA_IDS,
  isDynamicPersonaId,
  personaLabelKo,
} from "@/lib/agent/persona/persona-presets";

export type PersonaSavingsRow = {
  personaId: DynamicPersonaId;
  labelKo: string;
  runs: number;
  savedTokens: number;
};

type Ctx = {
  /** CFO 증류 완료 시점마다 누적(중복 ledger nonce 방지) */
  recordFromSnapshot: (snap: AgentStateSnapshot, ledgerNonce: number) => void;
  cumulativeSavedTokens: number;
  cumulativeRunsRecorded: number;
  byPersona: Record<DynamicPersonaId, { runs: number; savedTokens: number }>;
  personaRows: PersonaSavingsRow[];
  liveSnapshot: AgentStateSnapshot | null;
  setLiveSnapshot: (snap: AgentStateSnapshot | null) => void;
};

const TokenSavingsContext = createContext<Ctx | null>(null);

function emptyByPersona(): Record<
  DynamicPersonaId,
  { runs: number; savedTokens: number }
> {
  const o = {} as Record<DynamicPersonaId, { runs: number; savedTokens: number }>;
  for (const id of DYNAMIC_PERSONA_IDS) {
    o[id] = { runs: 0, savedTokens: 0 };
  }
  return o;
}

export function TokenSavingsProvider({ children }: { children: ReactNode }) {
  const [cumulativeSavedTokens, setCumulativeSavedTokens] = useState(0);
  const [cumulativeRunsRecorded, setCumulativeRunsRecorded] = useState(0);
  const [byPersona, setByPersona] = useState(emptyByPersona);
  const [liveSnapshot, setLiveSnapshot] = useState<AgentStateSnapshot | null>(null);
  const seenNonces = useRef(new Set<number>());

  const recordFromSnapshot = useCallback((snap: AgentStateSnapshot, ledgerNonce: number) => {
    if (seenNonces.current.has(ledgerNonce)) return;
    seenNonces.current.add(ledgerNonce);

    const m = snap.lastPromptInjectionMetrics;
    if (!m || m.estimatedSavedTokens <= 0) return;

    const raw = snap.currentPersonaId;
    const pid: DynamicPersonaId =
      typeof raw === "string" && isDynamicPersonaId(raw)
        ? raw
        : DEFAULT_DYNAMIC_PERSONA_ID;

    setCumulativeSavedTokens((t) => t + m.estimatedSavedTokens);
    setCumulativeRunsRecorded((n) => n + 1);
    setByPersona((prev) => {
      const next = { ...prev };
      const cur = next[pid];
      next[pid] = {
        runs: cur.runs + 1,
        savedTokens: cur.savedTokens + m.estimatedSavedTokens,
      };
      return next;
    });
  }, []);

  const personaRows = useMemo((): PersonaSavingsRow[] => {
    return DYNAMIC_PERSONA_IDS.map((personaId) => ({
      personaId,
      labelKo: personaLabelKo(personaId),
      runs: byPersona[personaId].runs,
      savedTokens: byPersona[personaId].savedTokens,
    }));
  }, [byPersona]);

  const value = useMemo(
    () => ({
      recordFromSnapshot,
      cumulativeSavedTokens,
      cumulativeRunsRecorded,
      byPersona,
      personaRows,
      liveSnapshot,
      setLiveSnapshot,
    }),
    [
      recordFromSnapshot,
      cumulativeSavedTokens,
      cumulativeRunsRecorded,
      byPersona,
      personaRows,
      liveSnapshot,
    ],
  );

  return (
    <TokenSavingsContext.Provider value={value}>{children}</TokenSavingsContext.Provider>
  );
}

export function useTokenSavings(): Ctx {
  const ctx = useContext(TokenSavingsContext);
  if (!ctx) {
    throw new Error("useTokenSavings must be used within TokenSavingsProvider");
  }
  return ctx;
}
