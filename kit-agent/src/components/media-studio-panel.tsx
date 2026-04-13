"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Clapperboard,
  DollarSign,
  Mic,
  CheckCircle2,
  Info,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SecurityTrustDialog } from "@/components/security-trust-dialog";
import { VoiceWaveformOverlay } from "@/components/voice-waveform-overlay";
import { GoldenPathCoach } from "@/components/golden-path-coach";
import { shieldStringFields } from "@/lib/client/pii-shield";
import { createVoiceProfileEcdhClientSession } from "@/lib/client/voice-response-ecdh";
import type { VoiceProfileCryptoEnvelope } from "@/lib/media-persona/voice-crypto-types";
import type { MediaVoiceOutputMode } from "@/lib/media-persona/job-store";
import type { PersonaId } from "@/lib/media-persona/types";
import {
  EDUCATIONAL_PERSONAS,
  type EducationalPersonaId,
  getEducationalPersonaById,
} from "@/constants/personas";

interface PipelineResponse {
  jobId: string;
  personaId: PersonaId;
  script: unknown;
  videoPrompts: unknown;
  costs: {
    phase12LlmUsd: number;
    phase3VideoEstimateUsd: number;
    phase3TtsEstimateUsd: number;
    phase3TotalEstimateUsd: number;
    grandTotalEstimateUsd: number;
  };
  hitlRequired: boolean;
  cfoMessage: string;
  render?: {
    sceneAudioPaths: string[];
    combinedAudioUrl: string | null;
    mp4Url: string | null;
    ffmpegOk: boolean;
    ttsEstimateUsd: number;
    ttsAnyOk: boolean;
  } | null;
}

const RECORD_MIN_S = 5;
const RECORD_MAX_S = 10;
const RING_R = 44;
const RING_C = 2 * Math.PI * RING_R;

type VoiceUiPhase = "idle" | "recording" | "analyzing" | "ready";

/** 마이크 거부 시 주소창 자물쇠 기준 애니메이션 가이드 */
function MicLockAddressBarGuide({ footnote }: { footnote?: string | null }) {
  return (
    <div
      className="mb-3 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 text-amber-950 shadow-sm"
      role="region"
      aria-label="마이크 허용 방법"
    >
      <div className="flex items-start gap-3">
        <motion.div
          className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-amber-300/90 bg-white shadow-sm"
          animate={{ scale: [1, 1.07, 1] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          aria-hidden
        >
          <motion.div
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <Lock className="size-5 text-amber-700" />
          </motion.div>
        </motion.div>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-xs font-semibold leading-snug">
            주소창의 자물쇠 아이콘을 누른 뒤, 마이크를 「허용」으로 바꿔주세요
          </p>
          <ol className="list-decimal space-y-1.5 pl-4 text-[11px] leading-relaxed text-amber-900/95">
            <li>
              주소창 <strong className="font-semibold">왼쪽</strong>의{" "}
              <strong className="font-semibold">자물쇠</strong> 또는 사이트 정보 아이콘을
              누릅니다.
            </li>
            <li>
              권한에서 <strong className="font-semibold">마이크</strong>를 찾아{" "}
              <strong className="font-semibold">허용</strong>으로 바꿉니다.
            </li>
            <li>설정을 저장한 뒤 이 탭으로 돌아오면 버튼이 곧바로 살아납니다.</li>
          </ol>
          <motion.p
            className="text-[11px] font-medium leading-snug text-amber-800/90"
            animate={{ opacity: [0.72, 1, 0.72] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            허용으로 바꾸는 즉시 「내 목소리 학습시키기」가 다시 눌릴 수 있어요.
          </motion.p>
          {footnote ? (
            <p className="border-t border-amber-200/80 pt-2 text-[11px] leading-snug text-amber-900/85">
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MediaStudioPanel() {
  const formId = useId();
  const [masterContext, setMasterContext] = useState("");
  const [educationalPersonaId, setEducationalPersonaId] =
    useState<EducationalPersonaId>("metaphor_mage");
  const [lastRunEducationalPersonaId, setLastRunEducationalPersonaId] =
    useState<EducationalPersonaId | null>(null);
  const [micPermission, setMicPermission] = useState<PermissionState | "unknown">("unknown");
  /** getUserMedia 거부 등 — 권한 API와 별도로 짧은 안내(허용 시 초기화) */
  const [micSoftNotice, setMicSoftNotice] = useState<string | null>(null);
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [hitlOpen, setHitlOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const [outputVoice, setOutputVoice] = useState<MediaVoiceOutputMode>("persona");
  const [userTtsInstructions, setUserTtsInstructions] = useState<string | null>(
    null,
  );
  const [voiceDemo, setVoiceDemo] = useState(false);
  const [voicePhase, setVoicePhase] = useState<VoiceUiPhase>("idle");
  const [recordProgress, setRecordProgress] = useState(0);
  const [recordElapsed, setRecordElapsed] = useState(0);
  const [lastRenderVoice, setLastRenderVoice] =
    useState<MediaVoiceOutputMode>("persona");
  const [securityOpen, setSecurityOpen] = useState(false);
  const [voiceCryptoLocked, setVoiceCryptoLocked] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordMimeRef = useRef<string>("audio/webm");
  /** 녹음 경과(초) — 클릭 핸들러에서 최신 값 보장 */
  const elapsedRef = useRef(0);

  const clearTick = () => {
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
  };

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    return () => {
      clearTick();
      stopStream();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    let alive = true;
    let perm: PermissionStatus | null = null;

    const subscribeMic = async () => {
      try {
        const next = await navigator.permissions.query({
          name: "microphone" as PermissionName,
        });
        if (!alive) return;
        if (perm && perm !== next) {
          perm.onchange = null;
        }
        perm = next;
        setMicPermission(next.state);
        next.onchange = () => {
          if (alive) setMicPermission(next.state);
        };
      } catch {
        /* Safari 등: microphone PermissionName 미지원 — getUserMedia로만 확인 */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void subscribeMic();
    };

    void subscribeMic();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if (perm) perm.onchange = null;
    };
  }, []);

  useEffect(() => {
    if (micPermission === "granted") setMicSoftNotice(null);
  }, [micPermission]);

  const analyzeBlob = useCallback(async (blob: Blob) => {
    if (micPermission === "denied") {
      setVoicePhase("idle");
      setMicSoftNotice(
        "마이크 권한이 거부된 상태에서는 서버로 음성을 보내지 않습니다. 허용으로 바꾼 뒤 다시 녹음해 주세요.",
      );
      return;
    }
    setVoicePhase("analyzing");
    setError(null);
    setVoiceCryptoLocked(false);
    try {
      const buf = await blob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const audioBase64 = btoa(binary);
      const cryptoSession = await createVoiceProfileEcdhClientSession();
      const res = await fetch("/api/media/voice-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audioBase64,
          mimeType: blob.type || recordMimeRef.current,
          clientVoiceEcdhPublicKeyB64: cryptoSession.clientPublicKeyB64,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        demo?: boolean;
        voiceCryptoEnvelope?: VoiceProfileCryptoEnvelope;
      };
      if (!res.ok) throw new Error(data.error || "음성 분석 실패");
      if (!data.voiceCryptoEnvelope) {
        throw new Error("암호화된 Voice DNA 응답이 없습니다.");
      }
      const bundle = await cryptoSession.decryptEnvelope(data.voiceCryptoEnvelope);
      const instr = bundle.ttsInstructionsEn?.trim();
      if (!instr) throw new Error("분석 결과가 비어 있습니다.");
      setUserTtsInstructions(instr);
      setVoiceDemo(Boolean(data.demo));
      setVoiceCryptoLocked(true);
      window.dispatchEvent(new CustomEvent("golden-voice-sample-ready"));
      setVoicePhase("ready");
    } catch (e) {
      setVoicePhase("idle");
      setVoiceCryptoLocked(false);
      setError(e instanceof Error ? e.message : "음성 분석 오류");
    }
  }, [micPermission]);

  const finishRecording = useCallback(() => {
    clearTick();
    const mr = mediaRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    mr.stop();
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    if (voicePhase === "recording") {
      if (elapsedRef.current < RECORD_MIN_S) {
        setError(`녹음은 최소 ${RECORD_MIN_S}초 이상 진행해 주세요.`);
        return;
      }
      finishRecording();
      return;
    }

    try {
      setVoiceCryptoLocked(false);
      setMicSoftNotice(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicPermission("granted");
      setMicSoftNotice(null);
      streamRef.current = stream;
      const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "";
      recordMimeRef.current = mime || "audio/webm";
      const mr = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunksRef.current.push(ev.data);
      };
      mr.onstop = () => {
        clearTick();
        stopStream();
        const blob = new Blob(chunksRef.current, {
          type: mr.mimeType || recordMimeRef.current,
        });
        chunksRef.current = [];
        mediaRecorderRef.current = null;
        const elapsed = elapsedRef.current;
        setRecordProgress(0);
        setRecordElapsed(0);
        elapsedRef.current = 0;
        if (elapsed < RECORD_MIN_S) {
          setVoicePhase("idle");
          setError(`샘플은 ${RECORD_MIN_S}~${RECORD_MAX_S}초 사이로 녹음해 주세요.`);
          return;
        }
        void analyzeBlob(blob);
      };
      mediaRecorderRef.current = mr;
      mr.start(200);
      setVoicePhase("recording");
      setRecordElapsed(0);
      setRecordProgress(0);
      elapsedRef.current = 0;
      const t0 = Date.now();
      clearTick();
      tickRef.current = setInterval(() => {
        const sec = (Date.now() - t0) / 1000;
        elapsedRef.current = sec;
        setRecordElapsed(sec);
        const p = Math.min(1, sec / RECORD_MAX_S);
        setRecordProgress(p);
        if (sec >= RECORD_MAX_S) {
          finishRecording();
        }
      }, 100);
    } catch (e) {
      const dom = e instanceof DOMException ? e : null;
      const deniedLike =
        dom?.name === "NotAllowedError" || dom?.name === "PermissionDeniedError";
      if (deniedLike) {
        setMicPermission("denied");
        setMicSoftNotice(
          "브라우저가 마이크를 막았을 때가 많아요. 당황하지 마시고, 위 안내 순서대로 '허용'으로 바꾼 뒤 이 버튼을 다시 눌러 주세요.",
        );
        return;
      }
      setMicSoftNotice(null);
      setError("마이크를 시작할 수 없습니다. 다른 앱이 마이크를 점유 중인지 확인한 뒤 다시 시도해 주세요.");
    }
  }, [analyzeBlob, finishRecording, voicePhase]);

  const runPipeline = useCallback(async () => {
    setError(null);
    if (outputVoice === "user" && !userTtsInstructions?.trim()) {
      if (micPermission === "denied") {
        setMicSoftNotice(
          "내 목소리 모드는 마이크 허용 후 학습이 끝나야 영상 생성으로 이어질 수 있어요. 먼저 주소창 자물쇠에서 마이크를 허용해 주세요.",
        );
        return;
      }
      setError("내 목소리 모드에서는 먼저 🎙️ 내 목소리 학습시키기를 완료해 주세요.");
      return;
    }
    setMicSoftNotice(null);
    setLoading(true);
    setResult(null);
    setHitlOpen(false);
    try {
      const pipelineBody = await shieldStringFields(
        {
          masterContext,
          personaId: educationalPersonaId,
          extraInstruction: extra.trim() || "",
          voiceOutputMode: outputVoice,
          userVoiceTtsInstructions:
            outputVoice === "user" ? userTtsInstructions ?? "" : "",
        },
        ["masterContext", "extraInstruction", "userVoiceTtsInstructions"],
      );
      const res = await fetch("/api/media/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterContext: pipelineBody.masterContext,
          personaId: pipelineBody.personaId,
          extraInstruction: pipelineBody.extraInstruction.trim()
            ? pipelineBody.extraInstruction
            : undefined,
          voiceOutputMode: pipelineBody.voiceOutputMode,
          userVoiceTtsInstructions:
            outputVoice === "user"
              ? pipelineBody.userVoiceTtsInstructions.trim() || null
              : null,
        }),
      });
      const data = (await res.json()) as PipelineResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "파이프라인 실패");
      setResult(data);
      setLastRunEducationalPersonaId(educationalPersonaId);
      setLastRenderVoice(outputVoice);
      if (data.hitlRequired) setHitlOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [
    masterContext,
    educationalPersonaId,
    extra,
    outputVoice,
    userTtsInstructions,
    micPermission,
  ]);

  const approveRender = useCallback(
    async (approved: boolean) => {
      if (!result?.jobId) return;
      setResumeLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/media/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId: result.jobId,
            approved,
            voiceOutputMode: outputVoice,
            userVoiceTtsInstructions:
              outputVoice === "user" ? userTtsInstructions : null,
          }),
        });
        const data = (await res.json()) as {
          error?: string;
          render?: PipelineResponse["render"];
          status?: string;
        };
        if (!res.ok) throw new Error(data.error || "렌더 실패");
        if (!approved) {
          setHitlOpen(false);
          setResult(null);
          return;
        }
        setLastRenderVoice(outputVoice);
        setResult((prev) =>
          prev
            ? {
                ...prev,
                hitlRequired: false,
                render: data.render ?? prev.render,
                cfoMessage: "승인 후 렌더가 완료되었습니다.",
              }
            : prev,
        );
        setHitlOpen(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "오류");
      } finally {
        setResumeLoading(false);
      }
    },
    [result?.jobId, outputVoice, userTtsInstructions],
  );

  const badgePersona =
    getEducationalPersonaById(lastRunEducationalPersonaId ?? educationalPersonaId) ??
    getEducationalPersonaById("metaphor_mage");
  const vocalBadgeLabel =
    lastRenderVoice === "user"
      ? "내 목소리로 재생"
      : `페르소나 음성 · ${badgePersona?.name ?? "튜터"}`;

  const dashOffset = RING_C * (1 - recordProgress);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media Studio</h1>
          <p className="text-muted-foreground text-sm">
            학습 미디어 스튜디오: AI와 함께 나만의 강의 영상을 제작하세요
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSecurityOpen(true)}
            className={cn(
              buttonVariants({ variant: "receiptOutline", size: "sm" }),
              "gap-1.5 text-xs sm:text-sm",
            )}
            aria-label="보안 및 음성 개인정보 안내"
          >
            🔒 안전
          </button>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            ← 대시보드
          </Link>
        </div>
      </div>

      <SecurityTrustDialog open={securityOpen} onOpenChange={setSecurityOpen} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clapperboard className="size-4" />
            입력
          </CardTitle>
          <CardDescription>
            강의에 사용할 본문이나 요약을 붙여 넣고, 튜터 톤을 고른 뒤 아래에서 영상 생성을
            진행하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-ctx`}>강의 본문 / 학습 자료</Label>
              <Textarea
                id={`${formId}-ctx`}
                className="min-h-[200px] font-mono text-xs"
                placeholder="### VIDEO: ... / ### PDF: ..."
                value={masterContext}
                onChange={(e) => setMasterContext(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-persona`}>페르소나</Label>
              <select
                id={`${formId}-persona`}
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={educationalPersonaId}
                onChange={(e) =>
                  setEducationalPersonaId(e.target.value as EducationalPersonaId)
                }
              >
                {EDUCATIONAL_PERSONAS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.emoji} {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-ex`}>추가 지시 (선택)</Label>
              <Textarea
                id={`${formId}-ex`}
                className="min-h-[72px] text-sm"
                placeholder='예: "무영총·금제 관식 위주로"'
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border-2 border-gray-100 bg-gradient-to-b from-white to-slate-50/80 p-4 shadow-[0_4px_0_0_rgb(229_231_235)] sm:p-5">
            {micPermission === "denied" ? (
              <MicLockAddressBarGuide footnote={micSoftNotice} />
            ) : null}
            <div className="mb-3 flex flex-col gap-1">
              <p className="text-sm font-bold text-slate-800">
                내 목소리로 듣기{" "}
                <span className="font-medium text-slate-500">
                  (Listen with My Voice)
                </span>
              </p>
              <p className="text-xs leading-relaxed text-slate-500">
                아래 문장을 따라 읽으며{" "}
                <strong className="text-slate-700">{RECORD_MIN_S}~{RECORD_MAX_S}초</strong>{" "}
                녹음하면 Gemini 1.5 Pro가 피치·톤을 분석합니다.
              </p>
              <p className="rounded-xl bg-white/80 px-3 py-2 text-xs italic text-slate-600 ring-1 ring-slate-200/80">
                「오늘은 제 목소리로 배움을 되새깁니다. 집중 하나, 호흡 하나, 문장 하나가 모두
                저만의 리듬으로 이어집니다.」
              </p>
            </div>

            <div className="flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                {voicePhase === "recording" || voicePhase === "analyzing" ? (
                  <div
                    className={cn(
                      "relative flex size-[7.5rem] shrink-0 items-center justify-center sm:size-32",
                      voicePhase === "analyzing" && "btn-train-voice",
                    )}
                    aria-live="polite"
                  >
                    <svg
                      className="size-[7.5rem] shrink-0 -rotate-90 sm:size-32"
                      viewBox="0 0 120 120"
                      aria-hidden
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r={RING_R}
                        className="fill-none stroke-slate-200"
                        strokeWidth="10"
                      />
                      <motion.circle
                        cx="60"
                        cy="60"
                        r={RING_R}
                        className="fill-none stroke-[#1CB0F6]"
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={RING_C}
                        animate={{
                          strokeDashoffset:
                            voicePhase === "analyzing" ? RING_C * 0.25 : dashOffset,
                        }}
                        transition={{
                          strokeDashoffset: {
                            duration: 0.45,
                            ease: [0.22, 1, 0.36, 1],
                          },
                        }}
                      />
                    </svg>
                    <button
                      type="button"
                      disabled={voicePhase === "analyzing"}
                      onClick={() => {
                        if (voicePhase !== "recording") return;
                        if (elapsedRef.current < RECORD_MIN_S) {
                          setError(
                            `종료하려면 최소 ${RECORD_MIN_S}초 이상 녹음해 주세요.`,
                          );
                          return;
                        }
                        finishRecording();
                      }}
                      className="absolute inset-0 z-20 flex flex-col cursor-pointer items-center justify-center gap-1 rounded-full text-center outline-none focus-visible:ring-2 focus-visible:ring-[#1CB0F6]/40 disabled:cursor-default"
                      aria-label="녹음 종료"
                    >
                      {voicePhase === "analyzing" ? (
                        <>
                          <Loader2 className="size-7 animate-spin text-[#1CB0F6]" />
                          <span className="max-w-[9rem] text-[10px] font-semibold leading-tight text-slate-600">
                            내 목소리의 특징을 분석하고 있습니다...
                          </span>
                        </>
                      ) : (
                        <>
                          <Mic className="size-6 text-[#1CB0F6]" />
                          <span className="text-xs font-bold tabular-nums text-slate-700">
                            {recordElapsed.toFixed(1)}s
                          </span>
                          <span className="text-[10px] text-slate-500">탭하여 종료</span>
                        </>
                      )}
                    </button>
                    <VoiceWaveformOverlay
                      active={voicePhase === "analyzing"}
                      className="z-10 rounded-full"
                    />
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="cyanTactile"
                    size="lg"
                    disabled={micPermission === "denied"}
                    className="btn-train-voice relative min-h-11 gap-2 overflow-hidden rounded-2xl px-5 text-sm sm:min-h-12 sm:px-6 sm:text-base"
                    onClick={startRecording}
                  >
                    {voiceCryptoLocked ? (
                      <Lock
                        className="size-4 shrink-0 text-emerald-700"
                        aria-label="Voice DNA 세션 암호화됨"
                      />
                    ) : (
                      <span aria-hidden>🎙️</span>
                    )}
                    내 목소리 학습시키기
                  </Button>
                )}

                <div className="group relative flex items-center gap-1">
                  <button
                    type="button"
                    className="flex size-9 items-center justify-center rounded-full border-2 border-gray-100 bg-white text-slate-500 shadow-[0_4px_0_0_rgb(229_231_235)] transition hover:text-[#1CB0F6] active:translate-y-px active:shadow-none"
                    aria-label="음성 데이터 처리 안내"
                  >
                    <Info className="size-4" />
                  </button>
                  <span
                    className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-[min(100vw-2rem,280px)] -translate-x-1/2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] leading-snug text-slate-600 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 sm:left-0 sm:translate-x-0"
                    role="tooltip"
                  >
                    원본 음성은 암호화 전송 구간에서만 처리되며, 특징 추출 후 즉시 삭제합니다.
                    장기 저장되지 않습니다.
                  </span>
                </div>
              </div>

              <div
                className="flex w-full min-w-0 flex-1 flex-col gap-1 sm:max-w-md"
                role="group"
                aria-label="출력 음성 선택"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Voice switcher
                </span>
                <div className="flex rounded-full border-b-2 border-slate-200/80 bg-slate-100/90 p-1 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setOutputVoice("persona")}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-all sm:text-sm",
                      outputVoice === "persona"
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    <span aria-hidden>🎭</span>
                    <span className="truncate">페르소나 음성</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputVoice("user")}
                    className={cn(
                      "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold transition-all sm:text-sm",
                      outputVoice === "user"
                        ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80"
                        : "text-slate-500 hover:text-slate-700",
                    )}
                  >
                    <span aria-hidden>👤</span>
                    <span className="truncate">내 목소리</span>
                  </button>
                </div>
              </div>
            </div>

            {voicePhase === "ready" ? (
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-emerald-700">
                <CheckCircle2 className="size-4 shrink-0" />
                <span className="font-medium">
                  내 목소리 프로파일이 준비되었습니다.
                  {voiceDemo ? " (데모 분석)" : null}
                </span>
                <button
                  type="button"
                  className="text-[#1CB0F6] underline underline-offset-2"
                  onClick={() => {
                    setUserTtsInstructions(null);
                    setVoiceDemo(false);
                    setVoicePhase("idle");
                  }}
                >
                  초기화
                </button>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="chunky"
              disabled={loading || !masterContext.trim()}
              onClick={runPipeline}
              className="w-full min-h-11 gap-2 rounded-2xl sm:w-auto sm:min-h-12"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              학습 영상 생성하기
            </Button>
            <span
              className="inline-flex shrink-0 items-center rounded-full border border-slate-200/90 bg-slate-50 px-2 py-0.5 font-sans text-[10px] font-semibold uppercase tracking-wide text-slate-500"
              title="예상 비용이 안전 한도를 넘으면 CFO(비용 감시) 단계에서 승인을 요청할 수 있어요. 그동안 화면은 멈추지 않고 대기합니다."
            >
              CFO
            </span>
          </div>
        </CardContent>
      </Card>

      {result ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="size-4" />
              CFO · 산출물
            </CardTitle>
            <CardDescription>{result.cfoMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground text-xs">LLM (1+2)</p>
                <p className="font-mono">${result.costs.phase12LlmUsd.toFixed(4)}</p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground text-xs">비디오 추정</p>
                <p className="font-mono">
                  ${result.costs.phase3VideoEstimateUsd.toFixed(4)}
                </p>
              </div>
              <div className="rounded-lg border p-2">
                <p className="text-muted-foreground text-xs">TTS 추정</p>
                <p className="font-mono">
                  ${result.costs.phase3TtsEstimateUsd.toFixed(4)}
                </p>
              </div>
            </div>
            <p className="font-mono text-xs text-muted-foreground">
              jobId: {result.jobId}
            </p>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">스크립트 JSON</summary>
              <pre className="mt-2 max-h-56 overflow-auto text-xs">
                {JSON.stringify(result.script, null, 2)}
              </pre>
            </details>
            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer font-medium">T2V 프롬프트 팩</summary>
              <pre className="mt-2 max-h-56 overflow-auto text-xs">
                {JSON.stringify(result.videoPrompts, null, 2)}
              </pre>
            </details>
            {result.render?.mp4Url ? (
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-medium">
                  <Mic className="size-4" />
                  플레이스홀더 MP4 (검은 화면 + 나레이션)
                </p>
                <div className="max-w-xl space-y-2">
                  <video
                    className="w-full rounded-xl border-2 border-gray-100 shadow-[0_4px_0_0_rgb(229_231_235)]"
                    controls
                    src={result.render.mp4Url}
                  />
                  <div className="flex justify-center sm:justify-start">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-tight text-slate-700">
                      {vocalBadgeLabel}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
            {result.render?.combinedAudioUrl && !result.render.mp4Url ? (
              <div className="space-y-2">
                <p className="font-medium">합성 오디오 (ffmpeg 없음 또는 MP4 실패)</p>
                <div className="max-w-xl space-y-2">
                  <audio
                    controls
                    className="w-full rounded-xl border-2 border-gray-100 shadow-[0_4px_0_0_rgb(229_231_235)]"
                    src={result.render.combinedAudioUrl}
                  />
                  <div className="flex justify-center sm:justify-start">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold tracking-tight text-slate-700">
                      {vocalBadgeLabel}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
            {result.render?.sceneAudioPaths?.length ? (
              <div className="space-y-2">
                <p className="text-muted-foreground text-xs">씬별 MP3</p>
                <ul className="space-y-1">
                  {result.render.sceneAudioPaths.map((u) => (
                    <li key={u}>
                      <a
                        className="text-primary text-xs underline"
                        href={u}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {u}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <Dialog open={hitlOpen} onOpenChange={setHitlOpen}>
        <DialogContent className="max-w-md rounded-3xl border-2 border-gray-100 shadow-[0_4px_0_0_rgb(229_231_235)]">
          <DialogHeader>
            <DialogTitle>CFO — 렌더 승인 (HITL)</DialogTitle>
            <DialogDescription>
              추정 렌더 비용이 한도를 넘었거나 세션 예산을 초과할 수 있습니다. TTS·비디오 API를
              실행하려면 승인하세요.
              {outputVoice === "user" ? (
                <span className="mt-2 block text-xs font-medium text-slate-600">
                  현재 출력 음성: 내 목소리 (학습 지침이 TTS에 전달됩니다)
                </span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {result ? (
            <ul className="text-muted-foreground space-y-1 text-sm">
              <li>Phase 3 합계 추정: ${result.costs.phase3TotalEstimateUsd.toFixed(4)}</li>
              <li>전체 추정: ${result.costs.grandTotalEstimateUsd.toFixed(4)}</li>
            </ul>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={resumeLoading}
              onClick={() => approveRender(false)}
            >
              거절
            </Button>
            <Button
              type="button"
              variant="cyanTactile"
              disabled={resumeLoading}
              onClick={() => approveRender(true)}
            >
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              승인 후 TTS·렌더
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <GoldenPathCoach />
    </div>
  );
}
