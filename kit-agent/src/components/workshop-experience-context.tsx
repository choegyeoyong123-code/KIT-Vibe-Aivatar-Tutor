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
export type LearningCognitiveDepth = "beginner" | "intermediate" | "advanced";

export interface WorkshopExperienceValue {
  inferenceMode: InferenceCostMode;
  setInferenceMode: (m: InferenceCostMode) => void;
  /** 세션 누적 추정 비용 (2초마다 갱신). null = 아직 측정 전(배지 비표시). */
  sessionCostUsd: number | null;
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
  learningSpeechRate: 0.8 | 1 | 1.2 | 1.5;
  setLearningSpeechRate: (v: 0.8 | 1 | 1.2 | 1.5) => void;
  learningCognitiveDepth: LearningCognitiveDepth;
  setLearningCognitiveDepth: (v: LearningCognitiveDepth) => void;
  darkModeEnabled: boolean;
  setDarkModeEnabled: (v: boolean) => void;
  learningPromptPrefix: string;
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

const LS_SPEECH_RATE_KEY = "kit-learning-speech-rate";
const LS_COGNITIVE_DEPTH_KEY = "kit-learning-cognitive-depth";
const LS_DARK_MODE_KEY = "kit-dark-mode-enabled";

export function WorkshopExperienceProvider({ children }: { children: ReactNode }) {
  const { selectedPersona } = useEducationalPersona();
  const [inferenceMode, setInferenceMode] = useState<InferenceCostMode>("eco");
  const [sessionCostUsd, setSessionCostUsd] = useState<number | null>(null);
  const [toasts, setToasts] = useState<WorkshopToast[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const [visualLabPhase, setVisualLabPhase] = useState<"idle" | "analyzing" | "done">("idle");
  const [visualLabStatusText, setVisualLabStatusText] = useState("");
  const [visualLabView, setVisualLabView] = useState<VisualLabView>("workspace");

  const [mediaStudioBusy, setMediaStudioBusy] = useState(false);
  const [mediaStudioStatusText, setMediaStudioStatusText] = useState("");
  const [learningSpeechRate, setLearningSpeechRate] = useState<0.8 | 1 | 1.2 | 1.5>(() => {
    if (typeof window === "undefined") return 1;
    const v = Number(window.localStorage.getItem(LS_SPEECH_RATE_KEY));
    if (v === 0.8 || v === 1 || v === 1.2 || v === 1.5) return v;
    return 1;
  });
  const [learningCognitiveDepth, setLearningCognitiveDepth] = useState<LearningCognitiveDepth>(
    () => {
      if (typeof window === "undefined") return "intermediate";
      const v = window.localStorage.getItem(LS_COGNITIVE_DEPTH_KEY);
      if (v === "beginner" || v === "intermediate" || v === "advanced") return v;
      return "intermediate";
    },
  );
  const [darkModeEnabled, setDarkModeEnabled] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(LS_DARK_MODE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const simTimersRef = useRef<number[]>([]);

  const clearSimTimers = useCallback(() => {
    simTimersRef.current.forEach((id) => window.clearTimeout(id));
    simTimersRef.current = [];
  }, []);

  useEffect(() => () => clearSimTimers(), [clearSimTimers]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_SPEECH_RATE_KEY, String(learningSpeechRate));
    } catch {
      // ignore
    }
  }, [learningSpeechRate]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_COGNITIVE_DEPTH_KEY, learningCognitiveDepth);
    } catch {
      // ignore
    }
  }, [learningCognitiveDepth]);

  useEffect(() => {
    try {
      window.localStorage.setItem(LS_DARK_MODE_KEY, darkModeEnabled ? "1" : "0");
    } catch {
      // ignore
    }
    document.documentElement.classList.toggle("dark", darkModeEnabled);
  }, [darkModeEnabled]);

  useEffect(() => {
    const step = inferenceMode === "eco" ? 0.0001 : 0.0005;
    const tick = () => {
      setSessionCostUsd((prev) => {
        const base = prev ?? 0;
        return Number((base + step).toFixed(6));
      });
    };
    tick();
    const id = window.setInterval(tick, 2000);
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

  const learningPromptPrefix = useMemo(() => {
    const depthKo =
      learningCognitiveDepth === "beginner"
        ? "비유 중심(Beginner)"
        : learningCognitiveDepth === "advanced"
          ? "심층 분석(Advanced)"
          : "핵심 요약(Intermediate)";
    return [
      "[Learning Preferences]",
      `- AI Speech Rate: ${learningSpeechRate.toFixed(1)}x`,
      `- Cognitive Depth: ${depthKo}`,
      "- Apply this preference consistently in response tone and structure.",
    ].join("\n");
  }, [learningCognitiveDepth, learningSpeechRate]);

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
      learningSpeechRate,
      setLearningSpeechRate,
      learningCognitiveDepth,
      setLearningCognitiveDepth,
      darkModeEnabled,
      setDarkModeEnabled,
      learningPromptPrefix,
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
      learningSpeechRate,
      learningCognitiveDepth,
      darkModeEnabled,
      learningPromptPrefix,
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
