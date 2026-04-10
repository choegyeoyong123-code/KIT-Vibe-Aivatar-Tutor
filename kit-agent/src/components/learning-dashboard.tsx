"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
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
  Activity,
  Shield,
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
import { ScrollArea } from "@/components/ui/scroll-area";
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
import { useSecurityPulse } from "@/components/security-pulse-context";
import { useTokenSavings } from "@/components/token-savings-context";
import { computeSecurityPulseSnapshot } from "@/lib/security-pulse-state";

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

type VideoCtx = Record<string, { transcript: string; visualCues: string }>;

function QuizPanel({ quiz }: { quiz: FinalQuiz }) {
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
                {q.choices.map((c) => (
                  <li
                    key={c}
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
}

export function LearningDashboard() {
  const { selectedPersonaId } = usePersonaGallery();
  const { recordFromSnapshot, setLiveSnapshot } = useTokenSavings();
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

  const runPipeline = async () => {
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
        const meta = (await accept.json()) as { jobId: string };
        setAsyncJobStatus("queued");
        setOrchestratorLines((p) => [
          ...p,
          `Strategy 11: 202 Accepted — job ${meta.jobId}. Long-run 경로 호출 후 폴링합니다.`,
        ]);
        void fetch(`/api/agent/jobs/${meta.jobId}/run`, { method: "POST" });
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setLoading(false);
    }
  };

  const sendResume = async (
    action: HitlResumeAction,
    exitInstructionOverride?: string,
  ) => {
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
      const data = (await res.json()) as {
        error?: string;
        interrupted?: boolean;
        state?: AgentStateSnapshot;
      };
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
  };

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
  const trustScore = state?.trustScore;
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

  const smartSuggestions: { label: string; text: string }[] = [
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

  return (
    <SafeHydration
      fallback={
        <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-background via-background to-[oklch(0.97_0.02_264)] dark:to-[oklch(0.16_0.03_264)]">
          <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-hidden p-4 md:p-6">
            <div className="grid gap-4 md:grid-cols-[320px_minmax(0,1fr)]">
              <div className="rounded-xl border bg-card/40 p-4">
                <div className="mb-3 h-4 w-40 animate-pulse rounded bg-muted/70" />
                <div className="h-24 animate-pulse rounded bg-muted/50" />
              </div>
              <div className="space-y-4">
                <div className="h-48 animate-pulse rounded-xl border bg-card/40" />
                <div className="h-64 animate-pulse rounded-xl border bg-card/40" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-background via-background to-[oklch(0.97_0.02_264)] dark:to-[oklch(0.16_0.03_264)]">
      <div className="mx-auto flex min-h-0 w-full max-w-[1920px] flex-1 flex-col overflow-hidden md:flex-row">
        <aside className="border-border bg-card/50 flex max-h-[min(52vh,440px)] w-full shrink-0 flex-col gap-4 overflow-y-auto border-b p-4 backdrop-blur-sm md:max-h-none md:w-80 md:border-b-0 md:border-r md:p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Link
                href="/visual-lab"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Visual Lab
              </Link>
              <Link
                href="/media-studio"
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Media Studio
              </Link>
              <Link
                href="/avatar-lecture"
                className={cn(
                  buttonVariants({ variant: "default", size: "sm" }),
                  "bg-gradient-to-r from-[var(--kit-brand)] to-[oklch(0.5_0.14_264)] text-white shadow-[0_0_24px_-8px_oklch(0.72_0.14_195/0.45)]",
                )}
              >
                AI Avatar
              </Link>
            </div>
            <motion.h1
              className="bg-gradient-to-r from-[var(--kit-brand)] to-[var(--kit-glow)] bg-clip-text font-bold text-xl tracking-tight text-transparent md:text-2xl"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
            >
              KIT AI-Native Learning
            </motion.h1>
            <p className="text-muted-foreground text-xs leading-relaxed">
              사이드바에서 CFO 비용·Security Guardian 상태를 고정 확인하고, 메인에서 아바타와 스트리밍
              요약을 나란히 봅니다.
            </p>
          </div>

          <Card className="border-[oklch(0.55_0.12_195/0.22)] shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <DollarSign className="size-4 text-amber-500" />
                CFO AI · 비용 모니터
              </CardTitle>
              <CardDescription className="text-xs">
                토큰·예산·품질·Trust. 검증 루프·비용 한도에서 HITL로 전환됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  누적 USD
                </p>
                <p className="font-mono text-sm font-semibold">${accCost.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  잔여 USD
                </p>
                <p
                  className={`font-mono text-sm font-semibold ${remainingBudget < sessionBudget * 0.15 ? "text-destructive" : ""}`}
                >
                  ${remainingBudget.toFixed(4)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  예산
                </p>
                <p className="font-mono text-sm font-semibold">${sessionBudget.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  예상 USD
                </p>
                <p className="font-mono text-sm font-semibold">${estCost.toFixed(4)}</p>
              </div>
              <div className="col-span-2">
                <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  토큰 · 루프 · 품질 · r
                </p>
                <p className="font-mono text-sm font-semibold">
                  {tokens.toLocaleString()} · {loops} ·{" "}
                  {qualityScore != null ? `${qualityScore}/10` : "—"} · r{distillRound}
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <ShieldCheck className="size-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
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
                <p className="text-muted-foreground text-[10px]">예산 소진</p>
                <Progress value={budgetBurnPct} className="h-1.5" />
                <p className="text-muted-foreground text-[10px]">비용 미터 (0–${COST_METER_MAX_USD})</p>
                <Progress value={costMeterPct} className="h-1.5" />
              </div>
              {consensusNotes ? (
                <p className="text-muted-foreground col-span-2 text-[10px] leading-snug">
                  <span className="font-medium text-foreground">감사:</span>{" "}
                  {consensusNotes.length > 160
                    ? `${consensusNotes.slice(0, 160)}…`
                    : consensusNotes}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-emerald-500/30 bg-zinc-950 text-zinc-100 shadow-inner dark:bg-zinc-950">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm text-emerald-400">
                <Shield className="size-4" />
                Security Guardian 로그
              </CardTitle>
              <CardDescription className="text-emerald-200/65 text-xs">
                정책·CFO·검증 이벤트 스냅샷(데모 UI).
              </CardDescription>
            </CardHeader>
            <CardContent className="max-h-44 overflow-y-auto pr-1 font-mono text-[10px] leading-relaxed sm:text-[11px]">
              <ul className="space-y-2">
                {guardianFeed.map((g) => (
                  <li
                    key={g.key}
                    className={cn(
                      "break-words",
                      g.kind === "warn" && "text-amber-300/95",
                      g.kind === "alert" && "text-rose-300/95",
                      g.kind === "info" && "text-slate-200/95",
                    )}
                  >
                    <span className="text-zinc-500">{g.time}</span> {g.text}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:gap-6 md:p-6">
          <header className="shrink-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-muted-foreground text-xs md:hidden">
              <Activity className="size-3.5 text-[var(--kit-glow)]" />
              메인 콘솔 — 업로드 후 스플릿 뷰에서 아바타·요약을 확인하세요.
            </div>
            <p className="max-w-3xl text-muted-foreground text-sm leading-relaxed">
              CFO 에이전트가 토큰·비용을 집계하고, LangGraph{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">interruptBefore</code>로
              HITL에 진입합니다. 하단{" "}
              <strong className="text-foreground">Agent Trace Terminal</strong>에서 오케스트레이터 스트림과
              에이전트 피드백 로그를 실시간으로 봅니다.
            </p>
          </header>

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

          <Card className="shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="size-4" />
            자료 업로드
          </CardTitle>
          <CardDescription>
            KIT 강의 PDF와 MP4를 올리면 서버 API에서 PDF는 고정밀 파싱, 영상은 멀티모달
            모델로 시각·대본형 요약을 시도합니다(키는 서버에만 보관). 수동 대본이 있으면
            그것을 우선합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-sum`}>요약 스타일 요청</Label>
            <Textarea
              id={`${formId}-sum`}
              placeholder='예: "치트시트 형태로 한 페이지에 정리", "초등학생에게 설명하듯 쉽게"'
              className="min-h-[72px] resize-y"
              value={summarizationInstruction}
              onChange={(e) => setSummarizationInstruction(e.target.value)}
            />
          </div>
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
                  <span className="text-amber-600 dark:text-amber-400">
                    (멀티모달 고비용 전환 — CFO 알림)
                  </span>
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
                        placeholder="GPT-4o / Gemini 등으로 추출한 슬라이드 텍스트·다이어그램 설명"
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
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="w-full sm:w-auto"
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
        </CardContent>
      </Card>

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:min-h-[min(58vh,620px)] lg:grid-cols-2 lg:gap-6">
            <Card className="relative flex min-h-[300px] flex-col overflow-hidden border-[oklch(0.55_0.12_195/0.22)] bg-gradient-to-br from-card via-card to-[oklch(0.97_0.025_264)] shadow-md dark:to-[oklch(0.22_0.05_264)]">
              <CharacterDressingOverlay active={videoSynthesisActive} />
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Video className="size-5 text-cyan-500" />
                  AI Avatar Player
                </CardTitle>
                <CardDescription>
                  아바타·영상 합성 플로우와 연동되는 프리뷰 영역입니다.{" "}
                  <span className="text-foreground/80">Video_Synthesis_Orchestrator</span> 실행 시
                  드레싱 애니메이션이 켜집니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 flex-col gap-4 p-4 pt-0">
                <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-cyan-500/25 bg-zinc-950/90">
                  <motion.div
                    className="flex flex-col items-center gap-2 text-center"
                    animate={{
                      scale: loading ? [1, 1.03, 1] : 1,
                    }}
                    transition={{ duration: 2.4, repeat: loading ? Infinity : 0, ease: "easeInOut" }}
                  >
                    <div className="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-cyan-500/20 shadow-[0_0_32px_-8px_oklch(0.72_0.14_195/0.5)]">
                      <Bot className="size-10 text-cyan-200/90" />
                    </div>
                    <p className="max-w-[220px] text-muted-foreground text-xs leading-relaxed">
                      스트리밍 요약과 병렬로 아바타 출력을 배치하는 AI-Native 레이아웃입니다.
                    </p>
                  </motion.div>
                  {loading ? (
                    <motion.div
                      className="absolute inset-x-0 bottom-0 h-1 bg-zinc-800"
                      initial={false}
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-violet-500 via-cyan-400 to-emerald-400"
                        animate={{ width: ["0%", "88%", "60%", "100%"] }}
                        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </motion.div>
                  ) : null}
                </div>
                <Link
                  href="/avatar-lecture"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "lg" }),
                    "w-full border-cyan-500/25 justify-center",
                  )}
                >
                  아바타 스튜디오 열기
                </Link>
              </CardContent>
            </Card>

            <Card className="flex min-h-[300px] flex-col border-[oklch(0.55_0.12_195/0.18)] shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="size-5 text-fuchsia-500" />
                    Streaming Text Summary
                  </CardTitle>
                  {state?.tutorToneMode ? (
                    <Badge
                      variant="secondary"
                      className="max-w-[min(100%,280px)] text-[10px] leading-snug sm:text-xs"
                    >
                      {tutorToneLabel(state.tutorToneMode)}
                    </Badge>
                  ) : null}
                </div>
                <CardDescription>
                  스트림으로 토큰이 도착하는 즉시 렌더됩니다. 완료 후{" "}
                  <strong className="text-foreground">페르소나 3버전</strong> 탭으로 비교합니다.
                  Foundation · Application · Mastery 구조와 Elite KIT Tutor 톤이 적용됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="min-h-0 flex-1 px-2 pb-4">
                <ScrollArea className="h-[min(50vh,480px)] pr-3">
                  <AnimatePresence mode="wait">
                    {loading && !summary.trim() ? (
                      <motion.div
                        key="skel"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="py-2"
                      >
                        <SummaryStreamSkeleton />
                        <p className="mt-3 text-muted-foreground text-xs">
                          Knowledge Distiller 출력 대기 중… 스켈레톤 UI
                        </p>
                      </motion.div>
                    ) : summary ? (
                      <motion.div
                        key="note"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="max-w-none space-y-3 text-sm leading-relaxed [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2 [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-medium [&_li]:my-0.5 [&_p]:leading-relaxed [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
                      >
                        <ReactMarkdown>{summary}</ReactMarkdown>
                        {sourceMappings.length > 0 ? (
                          <details className="mt-4 rounded-lg border bg-muted/20 p-3 text-xs">
                            <summary className="cursor-pointer font-medium text-foreground">
                              영상↔PDF 정렬 맵 ({sourceMappings.length}개)
                            </summary>
                            <ul className="mt-2 space-y-2 text-muted-foreground">
                              {sourceMappings.slice(0, 24).map((m) => (
                                <li
                                  key={m.id}
                                  className="border-b border-border/50 pb-2 last:border-0"
                                >
                                  <span className="font-mono text-foreground">
                                    {m.videoTimestampLabel} → p.{m.pdfPage}
                                  </span>{" "}
                                  <span className="text-[10px] opacity-80">
                                    (sim {m.cosineSimilarity.toFixed(3)})
                                  </span>
                                  <p className="mt-0.5 line-clamp-2">{m.videoConceptExcerpt}</p>
                                </li>
                              ))}
                              {sourceMappings.length > 24 ? (
                                <li className="text-muted-foreground italic">
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
                        className="text-muted-foreground text-sm"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        파이프라인 실행 후 요약이 여기에 스트리밍됩니다.
                      </motion.p>
                    )}
                  </AnimatePresence>
                </ScrollArea>
                {state?.pedagogyPack &&
                state.pedagogyPack.variants &&
                state.pedagogyPack.variants.length > 0 ? (
                  <div className="mt-4 border-t border-border pt-4">
                    {state?.distilledData?.reasoning_rationale?.trim() ? (
                      <div className="mb-3 rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-fuchsia-700 dark:text-fuchsia-300">
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
                          <div className="max-w-none space-y-2 text-sm leading-relaxed [&_h2]:pt-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:text-sm [&_h3]:font-medium [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
                            <ReactMarkdown>
                              {v.study_note_markdown || "_(비어 있음)_"}
                            </ReactMarkdown>
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
              </CardContent>
            </Card>
          </div>

          <TrustInnovationSection phase={privacyPhase} privacyEpoch={privacyEpoch} />

          <AnimatePresence>
            {quiz && quiz.questions.length > 0 ? (
              <QuizPanel key="quiz" quiz={quiz} />
            ) : null}
          </AnimatePresence>
        </main>
      </div>

      <AgentTraceTerminal orchestratorLines={orchestratorLines} traceUnified={traceUnified} />

      <Dialog open={pendingInterrupt} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-lg border border-cyan-500/35 bg-zinc-950 text-zinc-100 shadow-[0_0_40px_-10px_rgba(34,211,238,0.45)] sm:max-w-xl"
          showCloseButton={false}
        >
          <DialogHeader className="space-y-3">
            <div className="flex items-center gap-2 text-cyan-400">
              <Terminal className="size-5" />
              <span className="font-mono text-xs tracking-widest uppercase">
                Strategy Commander
              </span>
            </div>
            <DialogTitle className="text-xl text-zinc-50">
              {showManualReviewTitle
                ? "Manual Review Required"
                : "CFO 대기 — 승인 또는 종료 전략 선택"}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {showManualReviewTitle ? (
                <>
                  CFO 거버넌스: 검증 루프와 품질 점수 기준으로 자동 재시도를 멈췄습니다. 아래 비용·
                  진행 상태를 확인한 뒤 승인하거나 종료 전략을 선택하세요.
                </>
              ) : (
                <>
                  interruptBefore(
                  <code className="mx-0.5 rounded bg-zinc-800 px-1 text-cyan-300/90">
                    waiting_for_approval
                  </code>
                  ) 상태입니다. 자연어 지시를 파싱해 Exit Processor 또는 워크플로로 라우팅합니다.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 rounded-lg border border-zinc-800 bg-zinc-900/80 p-4 font-mono text-sm">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-zinc-800 pb-3">
              <div>
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Current burn</p>
                <p className="text-lg text-cyan-300">${accCost.toFixed(4)}</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-500 text-xs uppercase tracking-wide">Remaining budget</p>
                <p
                  className={`text-lg ${remainingBudget < sessionBudget * 0.15 ? "text-red-400" : "text-emerald-400"}`}
                >
                  ${remainingBudget.toFixed(4)}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-1 text-zinc-500 text-xs">Budget envelope</p>
              <Progress value={budgetBurnPct} className="h-2 bg-zinc-800 [&>div]:bg-gradient-to-r [&>div]:from-cyan-600 [&>div]:to-emerald-500" />
            </div>
            <div className="border-t border-zinc-800 pt-3">
              <p className="text-zinc-500 text-xs uppercase tracking-wide">Progress</p>
              <p className="text-zinc-300 text-sm">
                검증 루프 <span className="font-mono text-cyan-300">{loops}</span> · 품질{" "}
                <span className="font-mono text-cyan-300">
                  {qualityScore != null ? `${qualityScore}/10` : "—"}
                </span>{" "}
                · 증류 라운드{" "}
                <span className="font-mono text-cyan-300">{distillRound}</span>
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 font-medium text-sm text-zinc-300">CFO 중단 사유</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-zinc-400">
              {hitlReasons.length ? (
                hitlReasons.map((r) => <li key={r}>{r}</li>)
              ) : (
                <li>사유 없음 — 로그를 확인하세요.</li>
              )}
            </ul>
          </div>

          {policyReco ? (
            <div className="rounded-lg border border-amber-500/35 bg-amber-950/50 p-3 text-sm text-amber-50">
              <p className="mb-1 font-medium text-amber-300">Policy 추천 (과거 유사 시나리오)</p>
              <p className="leading-relaxed text-zinc-200">{policyReco}</p>
              {policyMatch != null && Number.isFinite(policyMatch) ? (
                <p className="mt-2 text-xs text-amber-400/90">
                  유사도(코사인) 약 {policyMatch.toFixed(3)}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <Label
              htmlFor={`${formId}-hitl-cmd`}
              className="flex items-center gap-2 text-zinc-300"
            >
              <Zap className="size-3.5 text-amber-400" />
              Custom Exit Instruction
            </Label>
            <Textarea
              id={`${formId}-hitl-cmd`}
              placeholder='예: "Just finish the first half" / "Switch to cheaper model" / 질문 한 줄'
              className="min-h-[100px] resize-y border-zinc-700 bg-zinc-900 text-zinc-100 placeholder:text-zinc-600"
              value={hitlCommandText}
              onChange={(e) => setHitlCommandText(e.target.value)}
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-zinc-400">Smart Suggestions</p>
            <div className="flex flex-wrap gap-2">
              {smartSuggestions.map((s) => (
                <Button
                  key={s.label}
                  type="button"
                  size="sm"
                  variant="outline"
                  className="border-zinc-600 bg-zinc-900 text-xs text-zinc-200 hover:bg-zinc-800 hover:text-white"
                  disabled={resumeLoading}
                  onClick={() => setHitlCommandText(s.text)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 border-t border-zinc-800 pt-4 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="border-zinc-600 bg-transparent text-zinc-200 hover:bg-zinc-800"
              disabled={resumeLoading}
              onClick={() => sendResume("finalize_as_is", hitlCommandText)}
            >
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              저장 후 종료 (Finalize)
            </Button>
            <Button
              type="button"
              className="bg-gradient-to-r from-cyan-600 to-emerald-600 text-white hover:from-cyan-500 hover:to-emerald-500"
              disabled={resumeLoading}
              onClick={() => sendResume("approve_continue")}
            >
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              승인 후 계속 (Approve)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </SafeHydration>
  );
}
