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
  currentCostUsd: number | null;
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
  /** 마이크 허용 시 짧은 샘플을 녹음해 volatile 메모리에만 보관 후 처리·파기합니다. */
  voiceTrainingError: string | null;
  simulateVoiceTraining: () => void | Promise<void>;
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
  const [voiceTrainingError, setVoiceTrainingError] = useState<string | null>(null);
  const volatileVoiceRef = useRef<Uint8Array | null>(null);
  const trainingTimersRef = useRef<number[]>([]);

  const clearTrainingTimers = useCallback(() => {
    trainingTimersRef.current.forEach((id) => {
      window.clearTimeout(id);
      window.clearInterval(id);
    });
    trainingTimersRef.current = [];
  }, []);

  useEffect(() => () => clearTrainingTimers(), [clearTrainingTimers]);

  const simulateVoiceTraining = useCallback(async () => {
    setVoiceTrainingError(null);
    clearTrainingTimers();
    volatileVoiceRef.current = null;

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setVoiceTrainingError("이 환경에서는 마이크를 사용할 수 없습니다.");
      return;
    }

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
    } catch {
      setVoiceTrainingError(
        "마이크 접근이 거부되었거나 사용할 수 없습니다. 브라우저에서 권한을 허용한 뒤 다시 눌러 주세요.",
      );
      return;
    }

    setVoiceTrainingActive(true);
    setVoiceTrainingProgress(4);

    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setVoiceTrainingActive(false);
      setVoiceTrainingProgress(0);
      setVoiceTrainingError("이 브라우저에서 지원하는 녹음 형식이 없습니다.");
      return;
    }

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    const RECORD_MS = 5200;
    let blob: Blob;
    try {
      blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
        };
        recorder.onerror = () => {
          stream.getTracks().forEach((t) => t.stop());
          reject(new Error("recorder"));
        };
        recorder.start(250);
        const tickId = window.setInterval(() => {
          setVoiceTrainingProgress((p) => Math.min(45, p + 2));
        }, 220);
        trainingTimersRef.current.push(tickId);
        const stopId = window.setTimeout(() => {
          window.clearInterval(tickId);
          try {
            if (recorder.state === "recording") recorder.stop();
            else {
              stream.getTracks().forEach((t) => t.stop());
              resolve(new Blob(chunks, { type: recorder.mimeType || "audio/webm" }));
            }
          } catch {
            stream.getTracks().forEach((t) => t.stop());
            reject(new Error("stop"));
          }
        }, RECORD_MS);
        trainingTimersRef.current.push(stopId);
      });
    } catch {
      setVoiceTrainingError("목소리 샘플을 녹음하지 못했습니다. 다시 시도해 주세요.");
      setVoiceTrainingActive(false);
      setVoiceTrainingProgress(0);
      return;
    }

    clearTrainingTimers();

    if (!blob.size) {
      volatileVoiceRef.current = new Uint8Array(256);
      volatileVoiceRef.current.fill(0);
    } else {
      const raw = new Uint8Array(await blob.arrayBuffer());
      const cap = 600_000;
      volatileVoiceRef.current =
        raw.byteLength > cap ? raw.slice(0, cap) : raw.slice(0);
    }

    const steps = [58, 72, 86, 100];
    steps.forEach((pct, i) => {
      const id = window.setTimeout(() => {
        setVoiceTrainingProgress(pct);
        if (pct === 100) {
          const done = window.setTimeout(() => {
            volatileVoiceRef.current = null;
            setVoiceTrainingActive(false);
            setVoiceTrainingProgress(0);
            clearTrainingTimers();
          }, 700);
          trainingTimersRef.current.push(done);
        }
      }, 320 * (i + 1));
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
      voiceTrainingError,
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
      voiceTrainingError,
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
