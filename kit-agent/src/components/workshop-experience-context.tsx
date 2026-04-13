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
import { useEducationalPersona } from "@/components/educational-persona-context";
import type { InferenceCostMode } from "@/constants/vendor-models";

export type WorkshopToast = { id: string; message: string };

export type VisualLabView = "workspace" | "quiz";

export interface WorkshopExperienceValue {
  inferenceMode: InferenceCostMode;
  setInferenceMode: (m: InferenceCostMode) => void;
  /** 세션 누적 추정 비용 (데모 HUD, 2초마다 증가) */
  sessionCostUsd: number;
  emotionalFeedback: string;
  accentHex: string;
  toasts: WorkshopToast[];
  pushToast: (message: string) => void;
  dismissToast: (id: string) => void;
  settingsOpen: boolean;
  setSettingsOpen: (v: boolean) => void;
  helpOpen: boolean;
  setHelpOpen: (v: boolean) => void;
  visualLabPhase: "idle" | "analyzing" | "done";
  visualLabStatusText: string;
  visualLabView: VisualLabView;
  startVisualLabSimulation: () => void;
  resetVisualLabToWorkspace: () => void;
  mediaStudioBusy: boolean;
  mediaStudioStatusText: string;
  startMediaStudioSimulation: () => void;
}

export const WorkshopExperienceContext =
  createContext<WorkshopExperienceValue | null>(null);

const VISUAL_STATUS = [
  "Vision Agent가 다이어그램을 파싱하는 중…",
  "개념 노드를 추출하고 엣지 관계를 정렬하는 중…",
  "인터랙티브 퀴즈 스캐폴드를 조립하는 중…",
] as const;

const MEDIA_STATUS = [
  "스크립트 에이전트가 페르소나 톤에 맞춰 대본을 정렬하는 중…",
  "TTS 라우팅과 자막 타임라인을 맞추는 중…",
  "렌더 잡을 큐에 밀어 넣고 세션 영수증을 갱신하는 중…",
] as const;

export function WorkshopExperienceProvider({ children }: { children: ReactNode }) {
  const { selectedPersona } = useEducationalPersona();
  const [inferenceMode, setInferenceMode] = useState<InferenceCostMode>("eco");
  const [sessionCostUsd, setSessionCostUsd] = useState(0);
  const [toasts, setToasts] = useState<WorkshopToast[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [visualLabPhase, setVisualLabPhase] = useState<"idle" | "analyzing" | "done">("idle");
  const [visualLabStatusText, setVisualLabStatusText] = useState("");
  const [visualLabView, setVisualLabView] = useState<VisualLabView>("workspace");

  const [mediaStudioBusy, setMediaStudioBusy] = useState(false);
  const [mediaStudioStatusText, setMediaStudioStatusText] = useState("");

  const simTimersRef = useRef<number[]>([]);

  const clearSimTimers = useCallback(() => {
    simTimersRef.current.forEach((id) => window.clearTimeout(id));
    simTimersRef.current = [];
  }, []);

  useEffect(() => () => clearSimTimers(), [clearSimTimers]);

  useEffect(() => {
    const step = inferenceMode === "eco" ? 0.0001 : 0.0005;
    const id = window.setInterval(() => {
      setSessionCostUsd((prev) => Number((prev + step).toFixed(6)));
    }, 2000);
    return () => window.clearInterval(id);
  }, [inferenceMode]);

  const emotionalFeedback = useMemo(() => {
    return (
      selectedPersona?.emotionalLine ??
      "튜터를 선택하면 이곳의 감성 피드백과 테마 액센트가 함께 바뀝니다."
    );
  }, [selectedPersona?.emotionalLine]);

  const accentHex = useMemo(
    () => selectedPersona?.accentHex ?? "#34d399",
    [selectedPersona?.accentHex],
  );

  useEffect(() => {
    document.documentElement.style.setProperty("--pw-persona-accent", accentHex);
    return () => {
      document.documentElement.style.removeProperty("--pw-persona-accent");
    };
  }, [accentHex]);

  const pushToast = useCallback((message: string) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setToasts((prev) => [...prev, { id, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const startVisualLabSimulation = useCallback(() => {
    if (visualLabPhase === "analyzing") return;
    clearSimTimers();
    setVisualLabView("workspace");
    setVisualLabPhase("analyzing");
    setVisualLabStatusText(VISUAL_STATUS[0]);
    const schedule = (delay: number, fn: () => void) => {
      const tid = window.setTimeout(fn, delay);
      simTimersRef.current.push(tid);
    };
    schedule(0, () => setVisualLabStatusText(VISUAL_STATUS[0]));
    schedule(1000, () => setVisualLabStatusText(VISUAL_STATUS[1]));
    schedule(2000, () => setVisualLabStatusText(VISUAL_STATUS[2]));
    schedule(3000, () => {
      setVisualLabPhase("done");
      setVisualLabView("quiz");
      pushToast("Vision Lab 분석이 완료되었습니다. 인터랙티브 퀴즈를 열었어요.");
    });
  }, [clearSimTimers, pushToast, visualLabPhase]);

  const resetVisualLabToWorkspace = useCallback(() => {
    clearSimTimers();
    setVisualLabPhase("idle");
    setVisualLabStatusText("");
    setVisualLabView("workspace");
  }, [clearSimTimers]);

  const startMediaStudioSimulation = useCallback(() => {
    if (mediaStudioBusy) return;
    clearSimTimers();
    setMediaStudioBusy(true);
    setMediaStudioStatusText(MEDIA_STATUS[0]);
    const schedule = (delay: number, fn: () => void) => {
      const tid = window.setTimeout(fn, delay);
      simTimersRef.current.push(tid);
    };
    schedule(0, () => setMediaStudioStatusText(MEDIA_STATUS[0]));
    schedule(1000, () => setMediaStudioStatusText(MEDIA_STATUS[1]));
    schedule(2000, () => setMediaStudioStatusText(MEDIA_STATUS[2]));
    schedule(3000, () => {
      setMediaStudioBusy(false);
      setMediaStudioStatusText("");
      pushToast("Media Studio 오케스트레이션이 준비되었습니다. 상세 편집은 Media Studio 페이지에서 이어가세요.");
    });
  }, [clearSimTimers, mediaStudioBusy, pushToast]);

  const value = useMemo(
    () => ({
      inferenceMode,
      setInferenceMode,
      sessionCostUsd,
      emotionalFeedback,
      accentHex,
      toasts,
      pushToast,
      dismissToast,
      settingsOpen,
      setSettingsOpen,
      helpOpen,
      setHelpOpen,
      visualLabPhase,
      visualLabStatusText,
      visualLabView,
      startVisualLabSimulation,
      resetVisualLabToWorkspace,
      mediaStudioBusy,
      mediaStudioStatusText,
      startMediaStudioSimulation,
    }),
    [
      inferenceMode,
      sessionCostUsd,
      emotionalFeedback,
      accentHex,
      toasts,
      pushToast,
      dismissToast,
      settingsOpen,
      helpOpen,
      visualLabPhase,
      visualLabStatusText,
      visualLabView,
      startVisualLabSimulation,
      resetVisualLabToWorkspace,
      mediaStudioBusy,
      mediaStudioStatusText,
      startMediaStudioSimulation,
    ],
  );

  return (
    <WorkshopExperienceContext.Provider value={value}>
      {children}
    </WorkshopExperienceContext.Provider>
  );
}

export function useWorkshopExperience(): WorkshopExperienceValue {
  const ctx = useContext(WorkshopExperienceContext);
  if (!ctx) {
    throw new Error("useWorkshopExperience는 WorkshopExperienceProvider 내부에서만 사용하세요.");
  }
  return ctx;
}

export function useWorkshopExperienceOptional(): WorkshopExperienceValue | null {
  return useContext(WorkshopExperienceContext);
}
