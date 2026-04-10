"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import { DEFAULT_DYNAMIC_PERSONA_ID } from "@/lib/agent/persona/persona-presets";

type Ctx = {
  selectedPersonaId: DynamicPersonaId;
  setSelectedPersonaId: (id: DynamicPersonaId) => void;
};

const PersonaGalleryContext = createContext<Ctx | null>(null);

export function PersonaGalleryProvider({ children }: { children: ReactNode }) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<DynamicPersonaId>(
    DEFAULT_DYNAMIC_PERSONA_ID,
  );

  const value = useMemo(
    () => ({
      selectedPersonaId,
      setSelectedPersonaId,
    }),
    [selectedPersonaId],
  );

  return (
    <PersonaGalleryContext.Provider value={value}>{children}</PersonaGalleryContext.Provider>
  );
}

export function usePersonaGallery(): Ctx {
  const ctx = useContext(PersonaGalleryContext);
  if (!ctx) {
    throw new Error("usePersonaGallery must be used within PersonaGalleryProvider");
  }
  return ctx;
}
