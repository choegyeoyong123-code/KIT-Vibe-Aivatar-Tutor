"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  EDUCATIONAL_PERSONAS,
  getEducationalPersonaById,
  type EducationalPersona,
  type EducationalPersonaId,
} from "@/constants/personas";

const STORAGE_ID = "kit-edu-persona-id";
const STORAGE_DONE = "kit-edu-onboarding-v1";

export interface EducationalPersonaContextValue {
  selectedPersona: EducationalPersona | null;
  selectPersona: (id: EducationalPersonaId) => void;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  educationalPersonaSystemPrompt: string;
  hydrated: boolean;
}

const EducationalPersonaContext =
  createContext<EducationalPersonaContextValue | null>(null);

export function EducationalPersonaProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState<EducationalPersona | null>(
    null,
  );
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  useEffect(() => {
    try {
      const done = window.localStorage.getItem(STORAGE_DONE) === "1";
      const id = window.localStorage.getItem(STORAGE_ID);
      const p = id ? getEducationalPersonaById(id) : undefined;
      if (p) setSelectedPersona(p);
      setOnboardingComplete(Boolean(done && p));
    } catch {
      /* private mode */
    }
    setHydrated(true);
  }, []);

  const selectPersona = useCallback((id: EducationalPersonaId) => {
    const p = EDUCATIONAL_PERSONAS.find((x) => x.id === id);
    if (!p) return;
    setSelectedPersona(p);
    try {
      window.localStorage.setItem(STORAGE_ID, p.id);
    } catch {
      /* private mode */
    }
  }, []);

  const completeOnboarding = useCallback(() => {
    if (!selectedPersona) return;
    try {
      window.localStorage.setItem(STORAGE_ID, selectedPersona.id);
      window.localStorage.setItem(STORAGE_DONE, "1");
    } catch {
      /* */
    }
    setOnboardingComplete(true);
  }, [selectedPersona]);

  const educationalPersonaSystemPrompt = selectedPersona?.systemPrompt ?? "";

  const value = useMemo(
    () => ({
      selectedPersona,
      selectPersona,
      onboardingComplete,
      completeOnboarding,
      educationalPersonaSystemPrompt,
      hydrated,
    }),
    [
      selectedPersona,
      selectPersona,
      onboardingComplete,
      completeOnboarding,
      educationalPersonaSystemPrompt,
      hydrated,
    ],
  );

  return (
    <EducationalPersonaContext.Provider value={value}>
      {children}
    </EducationalPersonaContext.Provider>
  );
}

export function useEducationalPersona(): EducationalPersonaContextValue {
  const ctx = useContext(EducationalPersonaContext);
  if (!ctx) {
    throw new Error(
      "useEducationalPersona는 EducationalPersonaProvider 안에서만 사용하세요.",
    );
  }
  return ctx;
}
