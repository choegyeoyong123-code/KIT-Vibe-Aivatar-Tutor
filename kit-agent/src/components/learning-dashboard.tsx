"use client";

import { memo, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Loader2,
  Sparkles,
  BookOpen,
  ClipboardList,
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  Zap,
  Video,
  Bot,
  Shield,
  Send,
} from "lucide-react";
import type { PrivacyTerminalPhase } from "@/components/privacy-security-terminal";
import { AgentTraceTerminal } from "@/components/dashboard/agent-trace-terminal";
import { CharacterDressingOverlay } from "@/components/dashboard/character-dressing-overlay";
import { SummaryStreamSkeleton } from "@/components/dashboard/summary-stream-skeleton";
import { SafeHydration } from "@/components/safe-hydration";
import { TrustInnovationSection } from "@/components/trust-innovation-section";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type {
  AgentAsyncJobStatus,
  AgentStateSnapshot,
  FeedbackLogEntry,
  FinalQuiz,
  HitlResumeAction,
  InterAgentMessage,
} from "@/lib/agent/types";
import { pollAgentJobUntilSettled } from "@/lib/agent/agent-job-poll";
import {
  DEFAULT_LEARNING_PERSONA,
  LEARNING_PERSONA_IDS,
  LEARNING_PERSONA_LABELS,
  type LearningPersonaId,
} from "@/lib/agent/learning-persona";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { tutorToneLabel } from "@/lib/agent/tutor-tone";
import {
  isDynamicPersonaId,
  personaLabelKo,
} from "@/lib/agent/persona/persona-presets";
import { usePersonaGallery } from "@/components/persona-gallery-context";
import { useEducationalPersona } from "@/components/educational-persona-context";
import { KitLearningHeader } from "@/components/kit-learning-header";
import {
  inferenceModeToVendorModelId,
  type InferenceCostMode,
} from "@/constants/vendor-models";
import { useSecurityPulse } from "@/components/security-pulse-context";
import { useTokenSavings } from "@/components/token-savings-context";
import { computeSecurityPulseSnapshot } from "@/lib/security-pulse-state";
import { kitSidebarRailClass } from "@/lib/glass-styles";
import { LearningControlSidebar } from "@/components/learning-control-sidebar";
import { TokenSavingsReport } from "@/components/token-savings-report";
import { TutorMarkdown } from "@/components/tutor-markdown";
import { TutorReplyShell, UserChatBubble } from "@/components/chat-bubbles";
import { TodayLearningProgress } from "@/components/today-learning-progress";
import { CollaborationPathStepper } from "@/components/collaboration-path-stepper";
import { FinOpsModelInsightWidget } from "@/components/award/finops-model-insight-widget";
import { AgentDebateCard } from "@/components/award/agent-debate-card";
import { SecurityAuditPulseIndicator } from "@/components/award/security-audit-pulse-indicator";
import { SessionReceiptDrawer } from "@/components/award/session-receipt";
import { GrowthRadarChart } from "@/components/career/growth-radar-chart";
import { ImpactPortfolioWidget } from "@/components/career/impact-portfolio-widget";
import {
  RADAR_LABELS_KO,
  bumpRadarOnCompletion,
  defaultRadarScores,
  deriveRadarScores,
  type RadarAxisKey,
  type RadarScores,
} from "@/lib/employability-radar";

/** 학습 카드 — Ultra-Clean: 순백 · border-2 gray-100 · rounded-2xl */
const dashCardGlass =
  "rounded-2xl border-2 border-gray-100 bg-white transition-colors duration-200 hover:border-gray-200 !ring-0";
const dashShellBg = "flex min-h-0 flex-1 flex-col bg-white";

const INPUT_USD_SAVINGS_PER_1K = 0.0025;

/** UI 미터 스케일 (USD) */
const COST_METER_MAX_USD = 1;

/** 서버·클라이언트 동일 출력(하이드레이션 안전) — 트레이스 ISO 시각 표시 */
const GUARDIAN_TRACE_CLOCK = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

function formatGuardianTraceTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return GUARDIAN_TRACE_CLOCK.format(d);
}

/** 데모용 합성 로그 — 렌더 시점 시계를 쓰면 SSR/CSR 1초 차이로 하이드레이션 실패 */
const GUARDIAN_SYNTHETIC_TIME = "—";

// OPTIMIZE: 매 렌더마다 새 배열을 만들지 않아 하위 map·참조 동일성 유지
const SMART_SUGGESTIONS: readonly { label: string; text: string }[] = [
  {
    label: "진행 상황만 정리해 저장",
    text: "Wrap up: summarize only what we have so far as the final document.",
  },
  {
    label: "저렴한 모델로 이어가기",
    text: "Switch to a cheaper smaller model for the remaining distill/validate steps.",
  },
  {
    label: "짧게 질문에 답한 뒤 종료",
    text: "What is the single most important takeaway from the summary so far?",
  },
  {
    label: "앞 절반만 마무리",
    text: "Just finish the first half of the topics we covered; ignore the rest.",
  },
];

type VideoCtx = Record<string, { transcript: string; visualCues: string }>;

// OPTIMIZE: quiz prop이 같을 때 불필요 리렌더 방지
const QuizPanel = memo(function QuizPanel({ quiz }: { quiz: FinalQuiz }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden"
    >
      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="size-5" />
            {quiz.title}
          </CardTitle>
          <CardDescription>
            요약이 확정된 뒤 표시되는 인터랙티브 복습 퀴즈입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {quiz.questions.map((q, idx) => (
            <div key={q.id} className="space-y-3 rounded-lg border bg-muted/30 p-4">
              <p className="font-medium leading-snug">
                {idx + 1}. {q.prompt}
              </p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {q.choices.map((c, cIdx) => (
                  <li
                    key={`${q.id}-choice-${cIdx}`}
                    className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <details className="text-sm text-muted-foreground">
                <summary className="cursor-pointer font-medium text-foreground">
                  정답 및 해설
                </summary>
                <p className="mt-2">
                  <span className="font-medium text-foreground">정답:</span>{" "}
                  {q.correctAnswer}
                </p>
                {q.explanation ? <p className="mt-1">{q.explanation}</p> : null}
              </details>
            </div>
          ))}
        </CardContent>
      </Card>
    </motion.div>
  );
});

QuizPanel.displayName = "QuizPanel";

export function LearningDashboard() {
  const { educationalPersonaSystemPrompt } = useEducationalPersona();
  const { selectedPersonaId } = usePersonaGallery();
  const { recordFromSnapshot, setLiveSnapshot, cumulativeSavedTokens } =
    useTokenSavings();
  const [finOpsReportOpen, setFinOpsReportOpen] = useState(false);
  const [sessionReceiptOpen, setSessionReceiptOpen] = useState(false);
  const { setSnapshot: setSecurityPulseSnapshot } = useSecurityPulse();
  const finOpsLedgerRef = useRef(0);
  const lastRunHadVideoOrImageRef = useRef(false);
  const formId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [videoCtx, setVideoCtx] = useState<VideoCtx>({});
  const [threadId] = useState(() => crypto.randomUUID());
  const [summarizationInstruction, setSummarizationInstruction] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<AgentStateSnapshot | null>(null);
  const [pendingInterrupt, setPendingInterrupt] = useState(false);
  const [hitlCommandText, setHitlCommandText] = useState("");
  const [streamSummary, setStreamSummary] = useState("");
  const [orchestratorLines, setOrchestratorLines] = useState<string[]>([]);
  const [privacyEpoch, setPrivacyEpoch] = useState(0);
  const [learningPersona, setLearningPersona] = useState<LearningPersonaId>(
    DEFAULT_LEARNING_PERSONA,
  );
  const [vercelAsyncJobs, setVercelAsyncJobs] = useState(false);
  const [asyncJobStatus, setAsyncJobStatus] = useState<AgentAsyncJobStatus | null>(null);
  const [studentName, setStudentName] = useState("");
  const [inferenceMode, setInferenceMode] = useState<InferenceCostMode>("eco");

  useEffect(() => {
    if (pendingInterrupt) setHitlCommandText("");
  }, [pendingInterrupt]);

  useEffect(() => {
    setLiveSnapshot(state);
  }, [state, setLiveSnapshot]);

  const videoFiles = useMemo(
    () => files.filter((f) => f.type.startsWith("video/")),
    [files],
  );

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...list]);
  }, []);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }, []);

  // OPTIMIZE: 핸들러 참조 안정화로 하위·의존 effect 불필요 갱신 감소
  const runPipeline = useCallback(async () => {
    lastRunHadVideoOrImageRef.current = files.some(
      (f) => f.type.startsWith("video/") || f.type.startsWith("image/"),
    );
    setError(null);
    setLoading(true);
    setPendingInterrupt(false);
    setState(null);
    setStreamSummary("");
    setOrchestratorLines([]);
    setPrivacyEpoch((e) => e + 1);
    setAsyncJobStatus(null);
    try {
      const fd = new FormData();
      fd.set("threadId", threadId);
      fd.set("learningPersona", learningPersona);
      fd.set("galleryPersonaId", selectedPersonaId);
      fd.set("vendorModelId", inferenceModeToVendorModelId(inferenceMode));
      if (educationalPersonaSystemPrompt.trim()) {
        fd.set("educationalPersonaSystemPrompt", educationalPersonaSystemPrompt.trim());
      }
      if (studentName.trim()) {
        fd.set("studentName", studentName.trim());
      }
      if (summarizationInstruction.trim()) {
        fd.set("summarizationInstruction", summarizationInstruction.trim());
      }
      const ctxPayload: Record<string, { transcript?: string; visualCues?: string }> =
        {};
      for (const vf of videoFiles) {
        const c = videoCtx[vf.name];
        if (c?.transcript?.trim() || c?.visualCues?.trim()) {
          ctxPayload[vf.name] = {
            transcript: c.transcript?.trim() || undefined,
            visualCues: c.visualCues?.trim() || undefined,
          };
        }
      }
      if (Object.keys(ctxPayload).length) {
        fd.set("videoContexts", JSON.stringify(ctxPayload));
      }
      for (const f of files) fd.append("files", f);

      if (vercelAsyncJobs) {
        const accept = await fetch("/api/agent/jobs", { method: "POST", body: fd });
        if (accept.status !== 202) {
          const t = await accept.text();
          let msg = `HTTP ${accept.status}`;
          try {
            const j = JSON.parse(t) as { error?: string };
            if (j.error) msg = j.error;
          } catch {
            if (t) msg = t;
          }
          throw new Error(msg);
        }
        let meta: { jobId: string };
        try {
          meta = (await accept.json()) as { jobId: string };
        } catch {
          throw new Error("작업 메타 응답을 해석할 수 없습니다.");
        }
        if (!meta.jobId) throw new Error("jobId가 없습니다.");
        setAsyncJobStatus("queued");
        setOrchestratorLines((p) => [
          ...p,
          `Strategy 11: 202 Accepted — job ${meta.jobId}. Long-run 경로 호출 후 폴링합니다.`,
        ]);
        // FIX: fire-and-forget 실패 시 unhandled rejection 방지(폴링으로 최종 상태 확인)
        void fetch(`/api/agent/jobs/${meta.jobId}/run`, { method: "POST" }).catch(() => {});
        const settled = await pollAgentJobUntilSettled(meta.jobId, {
          intervalMs: 2000,
          onTick: (r) => setAsyncJobStatus(r.status),
        });
        if (settled.status === "failed") {
          throw new Error(settled.error || "비동기 작업 실패");
        }
        const st = settled.state as AgentStateSnapshot | undefined;
        if (!st) throw new Error("완료 상태인데 스냅샷이 없습니다.");
        finOpsLedgerRef.current += 1;
        recordFromSnapshot(st, finOpsLedgerRef.current);
        setState(st);
        setPendingInterrupt(settled.status === "interrupted");
        setStreamSummary(st.structuredSummary ?? "");
        return;
      }

      const res = await fetch("/api/agent/run-stream", { method: "POST", body: fd });
      if (!res.ok) {
        const errText = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(errText) as { error?: string };
          if (j.error) msg = j.error;
        } catch {
          if (errText) msg = errText;
        }
        throw new Error(msg);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("스트림을 읽을 수 없습니다.");

      const decoder = new TextDecoder();
      let buffer = "";
      let gotDone = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n");
          buffer = parts.pop() ?? "";
          for (const line of parts) {
            if (!line.trim()) continue;
            let ev: Record<string, unknown>;
            try {
              ev = JSON.parse(line) as Record<string, unknown>;
            } catch {
              continue;
            }
            const t = typeof ev.type === "string" ? ev.type : "";
            if (t === "orchestrator" && typeof ev.message === "string") {
              const msg = ev.message;
              setOrchestratorLines((prev) => [...prev, msg]);
            } else if (t === "ingest") {
              const kinds = ev.kinds;
              const k = Array.isArray(kinds)
                ? kinds.filter((x): x is string => typeof x === "string").join(", ")
                : "";
              const n = typeof ev.fileCount === "number" ? ev.fileCount : 0;
              setOrchestratorLines((prev) => [
                ...prev,
                `자료 ${n}건 수신 (${k}) — Knowledge Distiller 준비.`,
              ]);
            } else if (t === "summary" && typeof ev.delta === "string") {
              setStreamSummary((prev) => prev + ev.delta);
            } else if (t === "done") {
              gotDone = true;
              const st = ev.state as AgentStateSnapshot | undefined;
              if (!st) throw new Error("상태가 비어 있습니다.");
              finOpsLedgerRef.current += 1;
              recordFromSnapshot(st, finOpsLedgerRef.current);
              setState(st);
              setPendingInterrupt(Boolean(ev.interrupted));
            } else if (t === "error") {
              throw new Error(
                typeof ev.message === "string" ? ev.message : "스트림 오류",
              );
            }
          }
        }

        if (!gotDone) throw new Error("스트림이 비정상 종료되었습니다.");
      } finally {
        // FIX: 중단/예외 시에도 ReadableStream reader lock 해제로 경고·누수 방지
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [
    files,
    videoFiles,
    videoCtx,
    threadId,
    learningPersona,
    selectedPersonaId,
    studentName,
    summarizationInstruction,
    vercelAsyncJobs,
    recordFromSnapshot,
    educationalPersonaSystemPrompt,
    inferenceMode,
  ]);

  // OPTIMIZE: HITL 재개 핸들러 참조 안정화
  const sendResume = useCallback(
    async (action: HitlResumeAction, exitInstructionOverride?: string) => {
    setError(null);
    setResumeLoading(true);
    try {
      const exitInstruction =
        exitInstructionOverride !== undefined
          ? exitInstructionOverride
          : hitlCommandText;
      const res = await fetch("/api/agent/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, action, exitInstruction }),
      });
      const raw = await res.text();
      let data: {
        error?: string;
        interrupted?: boolean;
        state?: AgentStateSnapshot;
      };
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error(
          res.ok ? "재개 응답 형식이 올바르지 않습니다." : `HTTP ${res.status}`,
        );
      }
      if (!res.ok) throw new Error(data.error || "재개 실패");
      if (!data.state) throw new Error("상태가 비어 있습니다.");
      finOpsLedgerRef.current += 1;
      recordFromSnapshot(data.state, finOpsLedgerRef.current);
      setState(data.state);
      setPendingInterrupt(Boolean(data.interrupted));
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setResumeLoading(false);
    }
    },
    [threadId, hitlCommandText, recordFromSnapshot],
  );

  const trace = state?.feedbackLog ?? [];
  const interAgent: InterAgentMessage[] = state?.interAgentMessages ?? [];

  const traceUnified = useMemo((): FeedbackLogEntry[] => {
    const protocolEntries: FeedbackLogEntry[] = interAgent.map((m) => ({
      at: m.at,
      phase: "protocol",
      message: [m.terminalLine, m.bulletSummary].filter(Boolean).join("\n\n"),
      metadata: {
        protocol: true,
        from: m.from,
        to: m.to,
        tokenEstimate: m.tokenEstimate,
        structured: m.structured,
        errors: m.errors,
      },
    }));
    return [...trace, ...protocolEntries].sort(
      (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
    );
  }, [trace, interAgent]);

  const guardianFeed = useMemo(() => {
    const rows: { key: string; time: string; text: string; kind: "info" | "warn" | "alert" }[] = [];
    rows.push({
      key: "g-boot",
      time: GUARDIAN_SYNTHETIC_TIME,
      kind: "info",
      text: "[Security Guardian] Zero-trust 업로드 채널 — 정적 분석 대기",
    });
    if (loading || resumeLoading) {
      rows.push({
        key: "g-run",
        time: GUARDIAN_SYNTHETIC_TIME,
        kind: "warn",
        text: "[Security Guardian] 에이전트 샌드박스 실행 · I/O 격리 유지",
      });
    }
    const watchPhases = new Set<FeedbackLogEntry["phase"]>([
      "admin",
      "cfo",
      "validate",
      "policy",
      "hitl",
    ]);
    for (const e of traceUnified.filter((x) => watchPhases.has(x.phase)).slice(-6)) {
      const clip =
        e.message.length > 140 ? `${e.message.slice(0, 137)}…` : e.message;
      rows.push({
        key: `${e.at}-${e.phase}`,
        time: formatGuardianTraceTime(e.at),
        kind: e.phase === "admin" ? "alert" : "info",
        text: `[${e.phase}] ${clip}`,
      });
    }
    return rows.slice(-14);
  }, [loading, resumeLoading, traceUnified]);

  const videoSynthesisActive = useMemo(() => {
    if (!loading) return false;
    const hint = orchestratorLines.some((l) =>
      /synthesis|합성|avatar|lip|render|오케스트|wardrobe|의상|video|영상/i.test(l),
    );
    return videoFiles.length > 0 || hint;
  }, [loading, orchestratorLines, videoFiles.length]);
  const displaySummary = useMemo(() => {
    if (!loading && state?.structuredSummary) return state.structuredSummary;
    return streamSummary;
  }, [loading, state?.structuredSummary, streamSummary]);
  const summary = displaySummary;
  const quiz = state?.finalQuiz;
  const accCost = state?.accumulatedCost ?? 0;
  const estCost = state?.estimatedCost ?? 0;
  const tokens = state?.totalTokenUsage ?? 0;
  const loops = state?.loopCount ?? 0;
  const qualityScore = state?.qualityScore;
  const trustScore = state?.trustScore;
  const todayLearnProgressValue = useMemo(() => {
    if (loading) return 62;
    if (state?.structuredSummary && summary.trim()) return 100;
    if (summary.trim()) return 88;
    return 10;
  }, [loading, state?.structuredSummary, summary]);

  /** 역량 진단(0) → 탐색(1) → 분석(2) → 보안검사(3) */
  const agentPathStep = useMemo((): 0 | 1 | 2 | 3 => {
    const hasResult = Boolean(state?.structuredSummary || summary.trim());
    if (hasResult && !loading && !resumeLoading) return 3;
    if (loading || resumeLoading) return 2;
    const exploring =
      files.length > 0 ||
      summarizationInstruction.trim().length > 0 ||
      Boolean(state);
    if (exploring && !hasResult) return 1;
    return 0;
  }, [
    loading,
    resumeLoading,
    state?.structuredSummary,
    summary,
    files.length,
    summarizationInstruction,
    state != null,
  ]);

  const [radarScores, setRadarScores] = useState<RadarScores>(() => defaultRadarScores());
  const [radarBump, setRadarBump] = useState<{ axis: RadarAxisKey; delta: number } | null>(null);
  const [stepperSkillBump, setStepperSkillBump] = useState<{
    label: string;
    points: number;
  } | null>(null);
  const employabilityBaselineRef = useRef(false);
  const prevPipelineBusyRef = useRef(loading || resumeLoading);
  const radarBumpTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (employabilityBaselineRef.current) return;
    const blob = (state?.structuredSummary ?? summary).trim();
    if (!blob) return;
    setRadarScores(
      deriveRadarScores({
        trustScore: trustScore ?? null,
        qualityScore: qualityScore ?? null,
        loopCount: loops,
        summaryLength: blob.length,
      }),
    );
    employabilityBaselineRef.current = true;
  }, [state?.structuredSummary, summary, trustScore, qualityScore, loops]);

  useEffect(() => {
    const busy = loading || resumeLoading;
    const ended = prevPipelineBusyRef.current && !busy;
    prevPipelineBusyRef.current = busy;
    if (!ended) return;
    const text = (state?.structuredSummary ?? summary).trim();
    if (text.length < 24) return;

    let bumpResult: ReturnType<typeof bumpRadarOnCompletion> | undefined;
    setRadarScores((prev) => {
      bumpResult = bumpRadarOnCompletion(prev, text);
      return bumpResult.next;
    });

    queueMicrotask(() => {
      if (!bumpResult) return;
      if (radarBumpTimerRef.current !== undefined) {
        window.clearTimeout(radarBumpTimerRef.current);
      }
      setRadarBump({ axis: bumpResult.axis, delta: bumpResult.delta });
      setStepperSkillBump({
        label: RADAR_LABELS_KO[bumpResult.axis],
        points: bumpResult.delta,
      });
      radarBumpTimerRef.current = window.setTimeout(() => {
        setRadarBump(null);
        setStepperSkillBump(null);
        radarBumpTimerRef.current = undefined;
      }, 2600);
    });

    return () => {
      if (radarBumpTimerRef.current !== undefined) {
        window.clearTimeout(radarBumpTimerRef.current);
        radarBumpTimerRef.current = undefined;
      }
    };
  }, [loading, resumeLoading, state?.structuredSummary, summary]);

  const careerProofLabel = useMemo(() => {
    const c = state?.distilledData?.technical_concepts?.[0]?.concept?.trim();
    const o = state?.distilledData?.core_learning_objectives?.[0]?.trim();
    const fallback = summarizationInstruction.trim().slice(0, 40) || "세션 핵심 학습 주제";
    return (c || o || fallback).slice(0, 56);
  }, [state?.distilledData, summarizationInstruction]);
  const distillRound = state?.distillRound ?? 0;
  const admin = state?.adminNotification;
  const hitlReasons = state?.hitlBlockReasons ?? [];
  const showManualReviewTitle =
    pendingInterrupt &&
    (Boolean(state?.interruptRequired) ||
      hitlReasons.some((r) =>
        /수동 검토|거버넌스|품질 점수|Manual Review|governance/i.test(r),
      ));
  const sessionBudget = state?.sessionBudgetUsd ?? 2;
  const consensusNotes = state?.consensusAuditNotes?.trim() ?? "";
  const policyReco = state?.policyRecommendation?.trim() ?? "";
  const policyMatch = state?.policyMatchScore;
  const sourceMappings = state?.sourceMappings ?? [];
  const remainingBudget = Math.max(0, sessionBudget - accCost);
  const budgetBurnPct = Math.min(
    100,
    Math.round((accCost / Math.max(sessionBudget, 0.01)) * 100),
  );
  const costMeterPct = Math.min(
    100,
    Math.round((accCost / COST_METER_MAX_USD) * 100),
  );

  const finMeasuredPct = useMemo(() => {
    const m = state?.finOps?.measured_performance?.savingsPercentage;
    if (m != null && Number.isFinite(m)) return Math.min(100, Math.max(0, m));
    const e = state?.finOps?.estimated_savings?.savingsPercentage;
    if (e != null && Number.isFinite(e)) return Math.min(100, Math.max(0, e));
    return 82;
  }, [state?.finOps]);

  const finTotalSavingsUsd = useMemo(
    () => (cumulativeSavedTokens / 1000) * INPUT_USD_SAVINGS_PER_1K,
    [cumulativeSavedTokens],
  );

  const modelTier = useMemo((): "high" | "eco" => {
    return state?.personaMediaCostTier === "high" ? "high" : "eco";
  }, [state?.personaMediaCostTier]);

  const agentDebateContent = useMemo(() => {
    const agreedBody =
      consensusNotes ||
      "파이프라인이 완료되면 Knowledge_Distiller와 Evidence_Validator의 합의 감사 노트가 여기에 표시됩니다.";
    return {
      agentA: {
        title: "노트 구조·페르소나 톤",
        body: "핵심 개념을 한 페이지 치트시트 형태로 압축하고, 선택된 페르소나 톤에 맞춰 문장을 다듬습니다.",
      },
      agentB: {
        title: "근거·톤 일관성",
        body: "영상·PDF 정렬 맵과 인용 후보를 대조하고, 품질 점수가 낮은 구간은 재검토 큐에 올립니다.",
      },
      agreed: {
        title: consensusNotes ? "합의 감사 반영" : "합의안 (대기)",
        body: agreedBody,
      },
    };
  }, [consensusNotes]);

  const sessionReceiptPayload = useMemo(
    () => ({
      threadId,
      learningScorePct: todayLearnProgressValue,
      tokensUsed: tokens,
      trustScore: trustScore ?? null,
      modelLabel: modelTier === "high" ? "High · 멀티모달" : "Eco · 비용 최적",
      summarizationInstruction,
      structuredSummary: summary,
      qualityScore: qualityScore ?? null,
      distillRound,
      loopCount: loops,
      technicalConcepts:
        state?.distilledData?.technical_concepts?.map((c) => ({ concept: c.concept })) ?? [],
      coreObjectives: state?.distilledData?.core_learning_objectives ?? [],
      careerProofLabel,
    }),
    [
      threadId,
      todayLearnProgressValue,
      tokens,
      trustScore,
      modelTier,
      summarizationInstruction,
      summary,
      qualityScore,
      distillRound,
      loops,
      state?.distilledData?.technical_concepts,
      state?.distilledData?.core_learning_objectives,
      careerProofLabel,
    ],
  );

  const securityAuditActive = loading || resumeLoading || Boolean(state);

  const privacyPhase: PrivacyTerminalPhase = useMemo(() => {
    if (loading || resumeLoading) return "processing";
    if (pendingInterrupt) return "idle";
    if (state) return "complete";
    return "idle";
  }, [loading, resumeLoading, pendingInterrupt, state]);

  useEffect(() => {
    setSecurityPulseSnapshot(
      computeSecurityPulseSnapshot({
        videoSynthesisActive,
        loading,
        resumeLoading,
        pendingInterrupt,
        state,
        privacyPhase,
        lastRunHadVideoOrImage: lastRunHadVideoOrImageRef.current,
      }),
    );
  }, [
    setSecurityPulseSnapshot,
    videoSynthesisActive,
    loading,
    resumeLoading,
    pendingInterrupt,
    state,
    privacyPhase,
  ]);

  return (
    <SafeHydration
      fallback={
        <div className={dashShellBg}>
          <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-4 overflow-hidden p-4 lg:flex-row lg:p-6">
            <div className={cn(dashCardGlass, "h-40 w-full shrink-0 lg:w-64")} />
            <div className={cn(dashCardGlass, "min-h-[200px] flex-1")} />
            <div className={cn(dashCardGlass, "h-56 w-full shrink-0 lg:w-72")} />
          </div>
        </div>
      }
    >
      <div className={cn(dashShellBg, "flex min-h-0 flex-1 flex-col")}>
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col overflow-hidden lg:flex-row">
        <LearningControlSidebar
          measuredSavingsPct={finMeasuredPct}
          totalSavingsUsd={finTotalSavingsUsd}
          tokensSaved={cumulativeSavedTokens}
          onOpenFinOpsReport={() => setFinOpsReportOpen(true)}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 md:gap-6">
          <KitLearningHeader
            inferenceMode={inferenceMode}
            onInferenceModeChange={setInferenceMode}
            onSessionReceipt={() => setSessionReceiptOpen(true)}
            disabled={loading}
          />
          <main
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden px-5 pb-28 md:gap-6 md:px-6 md:pb-8"
            aria-busy={loading || resumeLoading}
          >
          <FinOpsModelInsightWidget
            activeModelTier={state?.activeModelTier}
            personaMediaCostTier={state?.personaMediaCostTier}
            totalTokenUsage={tokens}
            finOps={state?.finOps ?? null}
            loading={loading || resumeLoading}
            summarizationInstruction={summarizationInstruction}
            className="shrink-0"
          />

          <div className="shrink-0 space-y-3 border-b border-gray-100 pb-4">
            <p className="max-w-3xl font-sans text-sm font-medium leading-relaxed text-[#4B4B4B]">
              자료를 올리고 파이프라인을 실행하면 요약이 스트리밍됩니다. 에이전트 로그는 하단에서만
              펼칩니다.
            </p>
            <TodayLearningProgress
              value={todayLearnProgressValue}
              loading={loading || resumeLoading}
            />
          </div>

          <AgentDebateCard
            agentA={agentDebateContent.agentA}
            agentB={agentDebateContent.agentB}
            agreed={agentDebateContent.agreed}
            className="shrink-0"
          />

          {admin ? (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${
                admin.level === "critical"
                  ? "border-destructive/50 bg-destructive/10"
                  : "border-amber-500/40 bg-amber-500/10"
              }`}
            >
              <ShieldAlert className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-medium">Admin / CFO 알림</p>
                <p className="text-muted-foreground">{admin.message}</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  누적 비용 약 ${admin.accumulatedCostUsd.toFixed(4)} USD
                </p>
              </div>
            </motion.div>
          ) : null}

          <Card className={cn(dashCardGlass, "shrink-0")}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" />
            자료 업로드
          </CardTitle>
          <CardDescription>
            KIT 강의 PDF와 MP4를 올리면 서버 API에서 PDF는 고정밀 파싱, 영상은 멀티모달
            모델로 시각·대본형 요약을 시도합니다(키는 서버에만 보관). 수동 대본이 있으면
            그것을 우선합니다. 요약 스타일 요청 문구는{" "}
            <span className="font-medium text-foreground">학습 요약</span> 카드 하단 입력창에서
            작성합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-name`}>Elite KIT Tutor — 표시 이름 (선택)</Label>
            <Input
              id={`${formId}-name`}
              placeholder="비우면 인사: Fellow Innovator님"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              maxLength={48}
              autoComplete="name"
              className="max-w-md"
            />
            <p className="text-muted-foreground text-xs">
              Knowledge_Distiller가 노트 서두에 이름으로 인사합니다. 비어 있으면 Fellow Innovator로
              호명합니다.
            </p>
            {state?.currentPersonaId ? (
              <p className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs">
                <span>Persona_Manager:</span>
                <Badge variant="outline" className="font-normal">
                  {isDynamicPersonaId(state.currentPersonaId)
                    ? personaLabelKo(state.currentPersonaId)
                    : state.currentPersonaId}
                </Badge>
                {state.personaMediaCostTier === "high" ? (
                  <span className="text-amber-700">(멀티모달 고비용 전환 — CFO 알림)</span>
                ) : null}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-persona`}>Learning Persona (Strategy 10)</Label>
              <select
                id={`${formId}-persona`}
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={learningPersona}
                onChange={(e) => setLearningPersona(e.target.value as LearningPersonaId)}
              >
                {LEARNING_PERSONA_IDS.map((id) => (
                  <option key={id} value={id}>
                    {LEARNING_PERSONA_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-end gap-2 pb-1 text-sm">
              <input
                type="checkbox"
                className="size-4 rounded border-input"
                checked={vercelAsyncJobs}
                onChange={(e) => setVercelAsyncJobs(e.target.checked)}
              />
              <span>
                Vercel Edge 대응: <strong>202 + jobId</strong> 비동기·폴링 (Strategy 11)
              </span>
            </label>
          </div>
          <label
            htmlFor={formId}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/20 px-6 py-12 transition-colors hover:border-muted-foreground/40 hover:bg-muted/30"
          >
            <Sparkles className="mb-2 size-8 text-muted-foreground" />
            <span className="text-sm font-medium">끌어다 놓기 또는 클릭하여 선택</span>
            <span className="mt-1 text-muted-foreground text-xs">
              PDF · MP4 등 video/*
            </span>
            <input
              id={formId}
              type="file"
              multiple
              accept="application/pdf,video/*"
              className="sr-only"
              onChange={onFileInput}
            />
          </label>

          {files.length > 0 ? (
            <ul className="flex flex-wrap gap-2 text-sm">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`}>
                  <Badge variant="secondary">{f.name}</Badge>
                </li>
              ))}
            </ul>
          ) : null}

          <AnimatePresence>
            {videoFiles.length > 0 ? (
              <motion.div
                key="video-ctx"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 overflow-hidden"
              >
                <Separator />
                <p className="font-medium text-sm">영상별 멀티모달 컨텍스트 (선택)</p>
                {videoFiles.map((vf) => (
                  <div
                    key={vf.name}
                    className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-2"
                  >
                    <div className="md:col-span-2 font-medium text-sm">{vf.name}</div>
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-tr-${vf.name}`}>대본 / 자막</Label>
                      <Textarea
                        id={`${formId}-tr-${vf.name}`}
                        placeholder="STT 대본 또는 제공된 스크립트"
                        className="min-h-[88px] resize-y"
                        value={videoCtx[vf.name]?.transcript ?? ""}
                        onChange={(e) =>
                          setVideoCtx((prev) => ({
                            ...prev,
                            [vf.name]: {
                              transcript: e.target.value,
                              visualCues: prev[vf.name]?.visualCues ?? "",
                            },
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-vi-${vf.name}`}>
                        시각 단서 (슬라이드·화면 요약)
                      </Label>
                      <Textarea
                        id={`${formId}-vi-${vf.name}`}
                        placeholder="시각 분석으로 추출한 슬라이드 텍스트·다이어그램 설명"
                        className="min-h-[88px] resize-y"
                        value={videoCtx[vf.name]?.visualCues ?? ""}
                        onChange={(e) =>
                          setVideoCtx((prev) => ({
                            ...prev,
                            [vf.name]: {
                              transcript: prev[vf.name]?.transcript ?? "",
                              visualCues: e.target.value,
                            },
                          }))
                        }
                      />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {loading ? (
            <div className="space-y-2">
              <Progress value={66} className="h-1" />
              <p className="flex items-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                {asyncJobStatus
                  ? `비동기 작업: ${asyncJobStatus} — 폴링 중…`
                  : "에이전트 파이프라인 실행 중…"}
              </p>
            </div>
          ) : null}

          {error ? (
            <div
              className="rounded-2xl border-2 border-destructive/25 bg-destructive/[0.06] p-4"
              role="alert"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="min-w-0 flex-1 break-words text-sm leading-relaxed text-destructive">
                  {error}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0 self-start rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={() => setError(null)}
                >
                  닫기
                </Button>
              </div>
            </div>
          ) : null}

          <motion.div
            className="w-full sm:w-auto"
            whileHover={loading || files.length === 0 ? undefined : { scale: 1.05 }}
            whileTap={loading || files.length === 0 ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 24 }}
          >
            <Button
              type="button"
              variant="chunky"
              size="lg"
              className="h-11 min-w-[200px] px-5"
              disabled={loading || files.length === 0}
              onClick={runPipeline}
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  처리 중
                </>
              ) : (
                <>
                  <BookOpen className="size-4" />
                  학습 파이프라인 실행
                </>
              )}
            </Button>
          </motion.div>
        </CardContent>
      </Card>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-6 lg:min-h-0">
            <Card
              className={cn(
                dashCardGlass,
                "relative flex min-h-[260px] flex-col overflow-hidden lg:max-h-[min(calc(100vh-11rem),700px)] lg:min-h-0",
              )}
            >
              <CharacterDressingOverlay active={videoSynthesisActive} />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base text-[#4B4B4B]">
                  <Video className="size-5 text-[#1CB0F6]" aria-hidden />
                  AI Avatar Player
                </CardTitle>
                <CardDescription>
                  아바타·영상 합성 플로우와 연동되는 프리뷰 영역입니다.{" "}
                  <span className="text-foreground/80">Video_Synthesis_Orchestrator</span> 실행 시
                  드레싱 애니메이션이 켜집니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-gray-100 bg-[#FAFAFA]">
                  <motion.div
                    className="flex flex-col items-center gap-2 text-center"
                    animate={{
                      scale: loading ? [1, 1.03, 1] : 1,
                    }}
                    transition={{ duration: 2.4, repeat: loading ? Infinity : 0, ease: "easeInOut" }}
                  >
                    <div className="flex size-20 items-center justify-center rounded-2xl border-2 border-gray-100 bg-white">
                      <Bot className="size-10 text-[#1CB0F6]" aria-hidden />
                    </div>
                    <p className="max-w-[220px] text-[#4B4B4B]/70 text-xs leading-relaxed">
                      스트리밍 요약과 병렬로 아바타 출력을 배치하는 AI-Native 레이아웃입니다.
                    </p>
                  </motion.div>
                  {loading ? (
                    <motion.div
                      className="absolute inset-x-0 bottom-0 h-1 bg-gray-100"
                      initial={false}
                    >
                      <motion.div
                        className="h-full bg-[#58CC02]"
                        animate={{ width: ["0%", "88%", "60%", "100%"] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </motion.div>
                  ) : null}
                </div>
                <Link
                  href="/avatar-lecture"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "lg" }),
                    "w-full justify-center rounded-2xl border-2 border-gray-100 bg-white text-[#4B4B4B] hover:bg-[#FAFAFA]",
                  )}
                >
                  아바타 스튜디오 열기
                </Link>
              </CardContent>
            </Card>

            <Card
              className={cn(
                dashCardGlass,
                "flex min-h-[280px] flex-1 flex-col overflow-hidden lg:max-h-[min(calc(100vh-11rem),700px)] lg:min-h-0",
              )}
            >
              <CardHeader className="shrink-0 space-y-3 border-b border-gray-100 pb-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base text-[#4B4B4B]">
                    <Sparkles className="size-5 text-[#58CC02]" aria-hidden />
                    학습 요약
                  </CardTitle>
                  {state?.tutorToneMode ? (
                    <Badge
                      variant="secondary"
                      className="max-w-[min(100%,280px)] rounded-xl border-2 border-gray-100 text-[10px] leading-snug sm:text-xs"
                    >
                      {tutorToneLabel(state.tutorToneMode)}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription className="text-[#4B4B4B]/85">
                  대화는 위에서 스크롤되며, 요약 스타일 요청은 하단 입력창에서 작성합니다.
                </CardDescription>
              </CardHeader>

              <CollaborationPathStepper
                agentPathStep={agentPathStep}
                skillBump={stepperSkillBump}
              />

              <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-6">
                    {summarizationInstruction.trim() ? (
                      <UserChatBubble label="학습 요청">
                        <p className="whitespace-pre-wrap break-words">{summarizationInstruction.trim()}</p>
                      </UserChatBubble>
                    ) : null}
                    <AnimatePresence mode="wait">
                      {loading && !summary.trim() ? (
                        <motion.div
                          key="skel"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="py-1"
                        >
                          <TutorReplyShell>
                            <SummaryStreamSkeleton />
                            <p className="mt-3 text-xs text-[#4B4B4B]/75">
                              요약을 준비하는 중입니다…
                            </p>
                          </TutorReplyShell>
                        </motion.div>
                      ) : summary ? (
                        <motion.div
                          key="note"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="space-y-4"
                        >
                          <TutorReplyShell>
                            <TutorMarkdown>{summary}</TutorMarkdown>
                          </TutorReplyShell>
                          <ImpactPortfolioWidget
                            summarizationInstruction={summarizationInstruction}
                            summaryMarkdown={summary}
                            qualityScore={qualityScore ?? null}
                            disabled={loading || resumeLoading}
                          />
                          {sourceMappings.length > 0 ? (
                            <details className="rounded-2xl border-2 border-gray-100 bg-gray-50/80 p-3 text-xs text-[#4B4B4B]">
                              <summary className="cursor-pointer font-medium text-[#4B4B4B]">
                                영상↔PDF 정렬 맵 ({sourceMappings.length}개)
                              </summary>
                              <ul className="mt-2 space-y-2 text-[#4B4B4B]/90">
                                {sourceMappings.slice(0, 24).map((m) => (
                                  <li
                                    key={m.id}
                                    className="border-b border-gray-100 pb-2 last:border-0"
                                  >
                                    <span className="font-mono text-[#4B4B4B]">
                                      {m.videoTimestampLabel} → p.{m.pdfPage}
                                    </span>{" "}
                                    <span className="text-[10px] opacity-80">
                                      (sim {m.cosineSimilarity.toFixed(3)})
                                    </span>
                                    <p className="mt-0.5 line-clamp-2 break-words">{m.videoConceptExcerpt}</p>
                                  </li>
                                ))}
                                {sourceMappings.length > 24 ? (
                                  <li className="italic text-[#4B4B4B]/70">
                                    … 외 {sourceMappings.length - 24}개
                                  </li>
                                ) : null}
                              </ul>
                            </details>
                          ) : null}
                        </motion.div>
                      ) : (
                        <motion.p
                          key="empty"
                          className="text-sm text-[#4B4B4B]/65"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                        >
                          파이프라인을 실행하면 이 영역에 요약이 이어집니다.
                        </motion.p>
                      )}
                    </AnimatePresence>

                    {state?.pedagogyPack &&
                    state.pedagogyPack.variants &&
                    state.pedagogyPack.variants.length > 0 ? (
                      <div className="border-t border-gray-100 pt-4">
                        {state?.distilledData?.reasoning_rationale?.trim() ? (
                          <div className="mb-3 rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#4B4B4B]/70">
                              Reasoning Rationale
                            </p>
                            <p className="mt-1 text-muted-foreground text-xs leading-relaxed">
                              {state.distilledData.reasoning_rationale}
                            </p>
                          </div>
                        ) : null}
                        <p className="mb-2 font-medium text-sm">페르소나별 요약 (동일 근거)</p>
                        <Tabs defaultValue={state.pedagogyPack.selected_persona_id}>
                          <TabsList className="mb-2 h-auto w-full flex-wrap gap-1">
                            {state.pedagogyPack.variants.map((v) => (
                              <TabsTrigger
                                key={v.persona_id}
                                value={v.persona_id}
                                className="text-xs sm:text-sm"
                              >
                                {v.label}
                                {v.persona_id === state.pedagogyPack?.selected_persona_id
                                  ? " · 선택됨"
                                  : ""}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          {state.pedagogyPack.variants.map((v) => (
                            <TabsContent key={v.persona_id} value={v.persona_id} className="mt-0">
                              {v.tone_notes ? (
                                <p className="mb-2 text-muted-foreground text-xs">{v.tone_notes}</p>
                              ) : null}
                              <div className="min-w-0 rounded-2xl border-2 border-gray-100 bg-white px-3 py-3">
                                <TutorMarkdown>
                                  {v.study_note_markdown || "_(비어 있음)_"}
                                </TutorMarkdown>
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                        {state.pedagogyPack.selection_rationale ? (
                          <p className="mt-3 text-muted-foreground text-xs leading-relaxed">
                            <span className="font-medium text-foreground">선택 근거:</span>{" "}
                            {state.pedagogyPack.selection_rationale}
                          </p>
                        ) : null}
                        {state.pedagogyPack.avatar_tone_alignment ? (
                          <p className="mt-1 text-muted-foreground text-xs">
                            <span className="font-medium text-foreground">아바타 톤:</span>{" "}
                            {state.pedagogyPack.avatar_tone_alignment}
                          </p>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-col gap-2 border-t-2 border-gray-100 bg-white p-4">
                    <Label htmlFor={`${formId}-sum`} className="font-sans text-xs font-medium text-[#4B4B4B]/75">
                      요약 스타일 요청
                    </Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                      <Textarea
                        id={`${formId}-sum`}
                        placeholder='예: "치트시트 형태로 한 페이지에 정리"'
                        className="min-h-[88px] min-w-0 flex-1 resize-y break-words"
                        value={summarizationInstruction}
                        onChange={(e) => setSummarizationInstruction(e.target.value)}
                      />
                      <Button
                        type="button"
                        variant="chunky"
                        size="lg"
                        disabled={loading || files.length === 0}
                        onClick={() => void runPipeline()}
                        className="h-11 shrink-0 gap-2 !rounded-full px-6 disabled:!border-b-gray-300 disabled:!bg-gray-200 disabled:!text-gray-500 disabled:!shadow-none"
                      >
                        {loading ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : (
                          <Send className="size-4" aria-hidden />
                        )}
                        전송
                      </Button>
                    </div>
                    {files.length === 0 ? (
                      <p className="font-sans text-[11px] text-[#4B4B4B]/55">
                        자료 업로드 카드에서 PDF·영상을 추가한 뒤 전송할 수 있습니다.
                      </p>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <details className="rounded-2xl border-2 border-gray-100 bg-white p-4">
            <summary className="cursor-pointer list-none font-sans text-sm font-semibold text-[#4B4B4B] [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <Terminal className="size-4 text-[#4B4B4B]/60" aria-hidden />
                에이전트 로그 (고급)
              </span>
            </summary>
            <div className="mt-4 border-t-2 border-gray-100 pt-4">
              <AgentTraceTerminal
                orchestratorLines={orchestratorLines}
                traceUnified={traceUnified}
                pipelineActive={loading}
              />
            </div>
          </details>

          <TrustInnovationSection phase={privacyPhase} privacyEpoch={privacyEpoch} />

          <AnimatePresence>
            {quiz && quiz.questions.length > 0 ? (
              <QuizPanel key="quiz" quiz={quiz} />
            ) : null}
          </AnimatePresence>
        </main>
        </div>

        <aside
          className={cn(
            kitSidebarRailClass,
            "flex min-h-0 w-full shrink-0 flex-col gap-4 overflow-y-auto border-t-2 border-gray-100 p-5 lg:h-[calc(100vh-80px)] lg:max-h-[calc(100vh-80px)] lg:w-80 lg:border-l-2 lg:border-t-0 lg:p-6",
          )}
        >
          <GrowthRadarChart
            className="w-full shrink-0"
            scores={radarScores}
            bump={radarBump}
            meterTitle="Verified Learning Growth Meter"
          />
          <Card className={dashCardGlass}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-sans text-sm">
                <DollarSign className="size-4 text-amber-500" />
                CFO AI · 비용 모니터
              </CardTitle>
              <CardDescription className="font-sans text-xs">
                토큰·예산·품질·Trust. 검증 루프·비용 한도에서 HITL로 전환됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                  누적 USD
                </p>
                <p className="font-mono text-sm font-semibold">${accCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                  잔여 USD
                </p>
                <p
                  className={`font-mono text-sm font-semibold ${remainingBudget < sessionBudget * 0.15 ? "text-destructive" : ""}`}
                >
                  ${remainingBudget.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                  예산
                </p>
                <p className="font-mono text-sm font-semibold">${sessionBudget.toFixed(2)}</p>
              </div>
              <div>
                <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                  예상 USD
                </p>
                <p className="font-mono text-sm font-semibold">${estCost.toFixed(4)}</p>
              </div>
              <div className="col-span-2">
                <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                  토큰 · 루프 · 품질 · r
                </p>
                <p className="font-mono text-sm font-semibold">
                  {tokens.toLocaleString()} · {loops} ·{" "}
                  {qualityScore != null ? `${qualityScore}/10` : "—"} · r{distillRound}
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0 text-[#58CC02]" aria-hidden />
                <div>
                  <p className="font-sans text-[10px] uppercase tracking-wide text-muted-foreground">
                    Trust
                  </p>
                  <p className="font-mono text-sm font-semibold">
                    {trustScore != null && Number.isFinite(trustScore)
                      ? `${Math.round(trustScore)}/100`
                      : "—"}
                  </p>
                </div>
              </div>
              <div className="col-span-2 space-y-2">
                <p className="font-sans text-[10px] text-muted-foreground">예산 소진</p>
                <Progress value={budgetBurnPct} className="h-1.5 bg-gray-100 [&>div]:bg-[#58CC02]" />
                <p className="font-sans text-[10px] text-muted-foreground">
                  비용 미터 (0–${COST_METER_MAX_USD})
                </p>
                <Progress value={costMeterPct} className="h-1.5 bg-gray-100 [&>div]:bg-[#1CB0F6]" />
              </div>
              {consensusNotes ? (
                <p className="col-span-2 font-sans text-[10px] leading-snug text-muted-foreground">
                  <span className="font-medium text-foreground">감사:</span>{" "}
                  {consensusNotes.length > 160
                    ? `${consensusNotes.slice(0, 160)}…`
                    : consensusNotes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card
            className={cn(
              dashCardGlass,
              "border-emerald-200 bg-emerald-50/40 text-slate-800",
            )}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 font-sans text-sm text-emerald-800">
                <Shield className="size-4" />
                Security Guardian 로그
              </CardTitle>
              <CardDescription className="font-sans text-xs text-slate-600">
                정책·CFO·검증 이벤트 스냅샷(데모 UI).
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-40 overflow-y-auto pr-1 font-mono text-[10px] leading-relaxed text-slate-700 sm:text-[11px]">
              <ul className="space-y-2">
                {guardianFeed.map((g) => (
                  <li
                    key={g.key}
                    className={cn(
                      "break-words",
                      g.kind === "warn" && "text-amber-800",
                      g.kind === "alert" && "text-rose-700",
                      g.kind === "info" && "text-slate-800",
                    )}
                  >
                    <span className="text-slate-500">{g.time}</span> {g.text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>
      </div>

      <TokenSavingsReport open={finOpsReportOpen} onOpenChange={setFinOpsReportOpen} />

      <Dialog
        open={pendingInterrupt}
        onOpenChange={(open) => {
          if (!open && !resumeLoading) setPendingInterrupt(false);
        }}
      >
        <DialogContent
          className="max-w-lg rounded-2xl border-2 border-gray-100 bg-white text-[#4B4B4B] shadow-sm sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2 text-[#1CB0F6]">
              <Terminal className="size-5" aria-hidden />
              <span className="font-mono text-xs tracking-widest uppercase">
                Strategy Commander
              </span>
            </div>
            <DialogTitle className="text-xl text-[#4B4B4B]">
              {showManualReviewTitle
                ? "Manual Review Required"
                : "CFO 대기 — 승인 또는 종료 전략 선택"}
            </DialogTitle>
            <DialogDescription className="text-[#4B4B4B]/75">
              {showManualReviewTitle ? (
                <>
                  CFO 거버넌스: 검증 루프와 품질 점수 기준으로 자동 재시도를 멈췄습니다. 아래 비용·
                  진행 상태를 확인한 뒤 승인하거나 종료 전략을 선택하세요.
                </>
              ) : (
                <>
                  interruptBefore(
                  <code className="mx-0.5 rounded-md border border-gray-100 bg-[#FAFAFA] px-1 text-[#1CB0F6]">
                    waiting_for_approval
                  </code>
                  ) 상태입니다. 자연어 지시를 파싱해 Exit Processor 또는 워크플로로 라우팅합니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-4 font-mono text-sm">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-gray-100 pb-3">
              <div>
                <p className="text-[#4B4B4B]/55 text-xs uppercase tracking-wide">Current burn</p>
                <p className="text-lg text-[#1CB0F6]">${accCost.toFixed(4)}</p>
              </div>
              <div className="text-right">
                <p className="text-[#4B4B4B]/55 text-xs uppercase tracking-wide">Remaining budget</p>
                <p
                  className={`text-lg ${remainingBudget < sessionBudget * 0.15 ? "text-red-600" : "text-[#58CC02]"}`}
                >
                  ${remainingBudget.toFixed(4)}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-[#4B4B4B]/55 text-xs">Budget envelope</p>
              <Progress value={budgetBurnPct} className="h-2 bg-gray-100 [&>div]:bg-[#58CC02]" />
            </div>
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[#4B4B4B]/55 text-xs uppercase tracking-wide">Progress</p>
              <p className="text-[#4B4B4B] text-sm">
                검증 루프 <span className="font-mono text-[#1CB0F6]">{loops}</span> · 품질{" "}
                <span className="font-mono text-[#1CB0F6]">
                  {qualityScore != null ? `${qualityScore}/10` : "—"}
                </span>{" "}
                · 증류 라운드{" "}
                <span className="font-mono text-[#1CB0F6]">{distillRound}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium text-sm text-slate-800">CFO 중단 사유</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
              {hitlReasons.length ? (
                hitlReasons.map((r) => <li key={r}>{r}</li>)
              ) : (
                <li>사유 없음 — 로그를 확인하세요.</li>
              )}
            </ul>
          </div>

          {policyReco ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
              <p className="mb-1 font-medium text-amber-800">Policy 추천 (과거 유사 시나리오)</p>
              <p className="leading-relaxed text-slate-800">{policyReco}</p>
              {policyMatch != null && Number.isFinite(policyMatch) ? (
                <p className="mt-2 text-xs text-amber-700">
                  유사도(코사인) 약 {policyMatch.toFixed(3)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label
              htmlFor={`${formId}-hitl-cmd`}
              className="flex items-center gap-2 text-[#4B4B4B]"
            >
              <Zap className="size-3.5 text-[#58CC02]" aria-hidden />
              Custom Exit Instruction
            </Label>
            <Textarea
              id={`${formId}-hitl-cmd`}
              placeholder='예: "Just finish the first half" / "Switch to cheaper model" / 질문 한 줄'
              className="min-h-[100px] resize-y rounded-2xl border-2 border-gray-100 bg-white text-[#4B4B4B] placeholder:text-[#4B4B4B]/40"
              value={hitlCommandText}
              onChange={(e) => setHitlCommandText(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-[#4B4B4B]/75">Smart Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {SMART_SUGGESTIONS.map((s) => (
                <Button
                  key={s.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-2xl border-2 border-gray-100 bg-white text-xs text-[#4B4B4B] hover:border-gray-200 hover:bg-[#FAFAFA]"
                  disabled={resumeLoading}
                  onClick={() => setHitlCommandText(s.text)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-gray-100 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-2 border-gray-100 bg-white text-[#4B4B4B] hover:bg-[#FAFAFA]"
              disabled={resumeLoading}
              onClick={() => sendResume("finalize_as_is", hitlCommandText)}
            >
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              저장 후 종료 (Finalize)
            </Button>
            <Button
              type="button"
              variant="chunky"
              className="rounded-2xl"
              disabled={resumeLoading}
              onClick={() => sendResume("approve_continue")}
            >
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              승인 후 계속 (Approve)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SecurityAuditPulseIndicator active={securityAuditActive} />
      <SessionReceiptDrawer
        open={sessionReceiptOpen}
        onOpenChange={setSessionReceiptOpen}
        payload={sessionReceiptPayload}
      />
      </div>
    </SafeHydration>
  );
}
