"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { InferenceCostMode } from "@/constants/vendor-models";
import type { EducationalPersona, EducationalPersonaId } from "@/constants/personas";
import { useEducationalPersona } from "@/components/educational-persona-context";
import { useWorkshopExperience } from "@/components/workshop-experience-context";

export type VocalOutputMode = "persona" | "user";

export interface VibeContextValue {
  selectedPersona: EducationalPersona | null;
  selectPersona: (id: EducationalPersonaId) => void;
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  educationalPersonaSystemPrompt: string;
  hydrated: boolean;
  mode: InferenceCostMode;
  setMode: (m: InferenceCostMode) => void;
  currentCostUsd: number;
  accentHex: string;
  emotionalFeedback: string;
  visualLabPhase: "idle" | "analyzing" | "done";
  visualLabStatusText: string;
  visualLabView: "workspace" | "quiz";
  startVisualLabSimulation: () => void;
  resetVisualLabToWorkspace: () => void;
  mediaStudioBusy: boolean;
  mediaStudioStatusText: string;
  startMediaStudioSimulation: () => void;
  vocalOutput: VocalOutputMode;
  setVocalOutput: (m: VocalOutputMode) => void;
  voiceTrainingActive: boolean;
  voiceTrainingProgress: number;
  /** 데모: 휘발성 버퍼만 유지(완료 시 null). 실제 업로드 경로와 동일한 보안 가정을 UI에 반영합니다. */
  simulateVoiceTraining: () => void;
}

const VibeContext = createContext<VibeContextValue | null>(null);

const DEMO_USER_DISPLAY_NAME = "Kim Pristine";

export function getWorkshopDemoUserDisplayName() {
  return DEMO_USER_DISPLAY_NAME;
}

export function VibeProvider({ children }: { children: ReactNode }) {
  const edu = useEducationalPersona();
  const ws = useWorkshopExperience();
  const [vocalOutput, setVocalOutput] = useState<VocalOutputMode>("persona");
  const [voiceTrainingActive, setVoiceTrainingActive] = useState(false);
  const [voiceTrainingProgress, setVoiceTrainingProgress] = useState(0);
  const volatileVoiceRef = useRef<Uint8Array | null>(null);
  const trainingTimersRef = useRef<number[]>([]);

  const clearTrainingTimers = useCallback(() => {
    trainingTimersRef.current.forEach((id) => window.clearTimeout(id));
    trainingTimersRef.current = [];
  }, []);

  useEffect(() => () => clearTrainingTimers(), [clearTrainingTimers]);

  const simulateVoiceTraining = useCallback(() => {
    clearTrainingTimers();
    volatileVoiceRef.current = new Uint8Array(256);
    volatileVoiceRef.current.fill(0x7);
    setVoiceTrainingActive(true);
    setVoiceTrainingProgress(0);
    const steps = [12, 28, 48, 68, 88, 100];
    steps.forEach((pct, i) => {
      const id = window.setTimeout(() => {
        setVoiceTrainingProgress(pct);
        if (pct === 100) {
          const done = window.setTimeout(() => {
            volatileVoiceRef.current = null;
            setVoiceTrainingActive(false);
            setVoiceTrainingProgress(0);
            clearTrainingTimers();
          }, 900);
          trainingTimersRef.current.push(done);
        }
      }, 380 * (i + 1));
      trainingTimersRef.current.push(id);
    });
  }, [clearTrainingTimers]);

  const value = useMemo<VibeContextValue>(
    () => ({
      selectedPersona: edu.selectedPersona,
      selectPersona: edu.selectPersona,
      onboardingComplete: edu.onboardingComplete,
      completeOnboarding: edu.completeOnboarding,
      educationalPersonaSystemPrompt: edu.educationalPersonaSystemPrompt,
      hydrated: edu.hydrated,
      mode: ws.inferenceMode,
      setMode: ws.setInferenceMode,
      currentCostUsd: ws.sessionCostUsd,
      accentHex: ws.accentHex,
      emotionalFeedback: ws.emotionalFeedback,
      visualLabPhase: ws.visualLabPhase,
      visualLabStatusText: ws.visualLabStatusText,
      visualLabView: ws.visualLabView,
      startVisualLabSimulation: ws.startVisualLabSimulation,
      resetVisualLabToWorkspace: ws.resetVisualLabToWorkspace,
      mediaStudioBusy: ws.mediaStudioBusy,
      mediaStudioStatusText: ws.mediaStudioStatusText,
      startMediaStudioSimulation: ws.startMediaStudioSimulation,
      vocalOutput,
      setVocalOutput,
      voiceTrainingActive,
      voiceTrainingProgress,
      simulateVoiceTraining,
    }),
    [
      edu.selectedPersona,
      edu.selectPersona,
      edu.onboardingComplete,
      edu.completeOnboarding,
      edu.educationalPersonaSystemPrompt,
      edu.hydrated,
      ws.inferenceMode,
      ws.setInferenceMode,
      ws.sessionCostUsd,
      ws.accentHex,
      ws.emotionalFeedback,
      ws.visualLabPhase,
      ws.visualLabStatusText,
      ws.visualLabView,
      ws.startVisualLabSimulation,
      ws.resetVisualLabToWorkspace,
      ws.mediaStudioBusy,
      ws.mediaStudioStatusText,
      ws.startMediaStudioSimulation,
      vocalOutput,
      voiceTrainingActive,
      voiceTrainingProgress,
      simulateVoiceTraining,
    ],
  );

  return <VibeContext.Provider value={value}>{children}</VibeContext.Provider>;
}

export function useVibe() {
  const ctx = useContext(VibeContext);
  if (!ctx) {
    throw new Error("useVibe는 VibeProvider 안에서만 사용할 수 있습니다.");
  }
  return ctx;
}
