"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AnalyzePayloadError, assertAllowedImageFile } from "@/lib/client/multimodal-analyze-payload";
import type {
  LogicGraphJson,
  ZenInteractiveQuiz,
  ZenQuizPack,
} from "@/lib/visual-lab/logic-graph-schema";
import { Loader2, Sparkles, UploadCloud, Volume2 } from "lucide-react";
import { ZenAudioPlayer } from "@/components/zen-audio-player";
import { VoiceWaveformOverlay } from "@/components/voice-waveform-overlay";
import {
  sealVoiceVolatileSession,
  unsealVoiceVolatileSession,
} from "@/lib/client/voice-privacy-session";
import { shieldStringFields } from "@/lib/client/pii-shield";

type AudioRenderState = "idle" | "generating" | "ready" | "error";

function base64ToUint8Array(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function VisualLabZenPipeline() {
  const formId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [alert, setAlert] = useState<string | null>(null);

  const [logicLoading, setLogicLoading] = useState(false);
  const [logic, setLogic] = useState<LogicGraphJson | null>(null);
  const [logicDemo, setLogicDemo] = useState(false);

  const [orchLoading, setOrchLoading] = useState(false);
  const [pack, setPack] = useState<ZenQuizPack | null>(null);
  const [orchDemo, setOrchDemo] = useState(false);
  const [orchError, setOrchError] = useState<string | null>(null);
  const [debateInfo, setDebateInfo] = useState<string | null>(null);

  const [activeIdx, setActiveIdx] = useState(0);
  const activeQuiz = pack?.quizzes[activeIdx] ?? null;

  /** fill_blank */
  const [blankAns, setBlankAns] = useState("");
  /** flow_sequence — 클릭한 원본 인덱스 순서 */
  const [flowPicks, setFlowPicks] = useState<number[]>([]);
  /** analogy_match */
  const [analogyChoice, setAnalogyChoice] = useState<string | null>(null);

  const [shakeKey, setShakeKey] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);

  const [ttsNote, setTtsNote] = useState("");
  const [voiceProgress, setVoiceProgress] = useState(0);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceScript, setVoiceScript] = useState<string | null>(null);
  const [audioRender, setAudioRender] = useState<AudioRenderState>("idle");
  const [audioObjectUrl, setAudioObjectUrl] = useState<string | null>(null);
  const [audioTtsMessage, setAudioTtsMessage] = useState<string | null>(null);
  const [personaAccent, setPersonaAccent] = useState("#059669");

  useEffect(() => {
    const read = () => {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--pw-persona-accent")
        .trim();
      if (raw) setPersonaAccent(raw);
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style", "class"],
    });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
    };
  }, [audioObjectUrl]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const flowShuffled = useMemo(() => {
    if (!activeQuiz || activeQuiz.type !== "flow_sequence") return [];
    return shuffle(activeQuiz.steps.map((label, originalIndex) => ({ label, originalIndex })));
  }, [activeQuiz]);

  const analogyOptions = useMemo(() => {
    if (!activeQuiz || activeQuiz.type !== "analogy_match") return [];
    return shuffle([
      activeQuiz.correct_analogy,
      ...activeQuiz.distractors,
    ]);
  }, [activeQuiz]);

  useEffect(() => {
    setBlankAns("");
    setFlowPicks([]);
    setAnalogyChoice(null);
    setLastCorrect(null);
  }, [activeIdx, activeQuiz?.id]);

  const applyFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setAlert(null);
      return;
    }
    try {
      assertAllowedImageFile(f);
      setFile(f);
      setAlert(null);
      window.dispatchEvent(new CustomEvent("golden-diagram-uploaded"));
      setLogic(null);
      setPack(null);
      setOrchError(null);
    } catch (e) {
      setFile(null);
      setAlert(e instanceof AnalyzePayloadError ? e.message : "파일을 확인해 주세요.");
    }
  }, []);

  const runLogicGraph = useCallback(async () => {
    if (!file) {
      setAlert("이미지를 먼저 올려 주세요.");
      return;
    }
    setLogicLoading(true);
    setAlert(null);
    setOrchError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res2 = await fetch("/api/visual/logic-graph", { method: "POST", body: fd });
      const data = (await res2.json()) as {
        error?: string;
        logic?: LogicGraphJson;
        demo?: boolean;
      };
      if (!res2.ok) throw new Error(data.error || "Logic graph 실패");
      if (!data.logic) throw new Error("logic 없음");
      setLogic(data.logic);
      setLogicDemo(Boolean(data.demo));
    } catch (e) {
      setAlert(e instanceof Error ? e.message : "오류");
    } finally {
      setLogicLoading(false);
    }
  }, [file]);

  const runOrchestrate = useCallback(async () => {
    if (!logic) return;
    setOrchLoading(true);
    setOrchError(null);
    setPack(null);
    setDebateInfo(null);
    try {
      const logicPayload = await shieldStringFields({ ...logic }, ["core_logic"]);
      const res = await fetch("/api/visual/zen-quiz-orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logic: logicPayload }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        reason?: string;
        pack?: ZenQuizPack;
        debate?: { critic: { approve: boolean; notes: string[] }; educator: { approve: boolean; notes: string[] } };
        demo?: boolean;
        lastDebate?: typeof data.debate;
      };
      if (!res.ok) {
        if (res.status === 422 && data.reason) {
          setOrchError(data.reason);
          const d = data.lastDebate;
          if (d) {
            setDebateInfo(
              `Critic: ${d.critic.approve ? "승인" : "반려"} — ${d.critic.notes.join(" / ")} · Educator: ${d.educator.approve ? "승인" : "반려"} — ${d.educator.notes.join(" / ")}`,
            );
          }
          return;
        }
        throw new Error(data.error || "오케스트레이션 실패");
      }
      if (!data.pack) throw new Error("pack 없음");
      setPack(data.pack);
      setOrchDemo(Boolean(data.demo));
      setActiveIdx(0);
      if (data.debate) {
        setDebateInfo(
          `Critic(${data.debate.critic.approve ? "OK" : "NG"}) · Educator(${data.debate.educator.approve ? "OK" : "NG"})`,
        );
      }
    } catch (e) {
      setOrchError(e instanceof Error ? e.message : "오류");
    } finally {
      setOrchLoading(false);
    }
  }, [logic]);

  const gradeActive = useCallback(() => {
    if (!activeQuiz) return;
    let ok = false;
    if (activeQuiz.type === "fill_blank") {
      const t = blankAns.trim().toLowerCase();
      ok = activeQuiz.acceptable_answers.some((a) => a.trim().toLowerCase() === t);
    } else if (activeQuiz.type === "flow_sequence") {
      ok =
        flowPicks.length === activeQuiz.correct_order.length &&
        flowPicks.every((v, i) => v === activeQuiz.correct_order[i]);
    } else {
      ok = analogyChoice === activeQuiz.correct_analogy;
    }
    setLastCorrect(ok);
    if (!ok) setShakeKey((k) => k + 1);
  }, [activeQuiz, blankAns, flowPicks, analogyChoice]);

  const runMetaVoice = useCallback(async () => {
    if (!logic || !activeQuiz || lastCorrect === null) return;
    setVoiceBusy(true);
    setVoiceProgress(0);
    setVoiceScript(null);
    setAudioTtsMessage(null);
    setAudioRender("generating");
    setAudioObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    await sealVoiceVolatileSession({
      tts_instructions_en: ttsNote.trim() || undefined,
    });
    const unlocked = await unsealVoiceVolatileSession();
    const instructionsForMeta = unlocked?.tts_instructions_en?.trim() ?? null;
    const tick = window.setInterval(() => {
      setVoiceProgress((p) => Math.min(96, p + 6));
    }, 160);
    let scriptOk = false;
    try {
      const explanation =
        activeQuiz.type === "fill_blank"
          ? activeQuiz.detective_deep_dive
          : activeQuiz.type === "flow_sequence"
            ? activeQuiz.detective_deep_dive
            : activeQuiz.detective_deep_dive;
      const metaPayload = await shieldStringFields(
        {
          quizSummary: activeQuiz.prompt,
          correctExplanation: explanation,
          coreLogic: logic.core_logic,
          userVoiceTtsInstructions: instructionsForMeta ?? "",
        },
        ["quizSummary", "correctExplanation", "coreLogic", "userVoiceTtsInstructions"],
      );
      const res = await fetch("/api/visual/meta-voice-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userWasCorrect: lastCorrect,
          quizSummary: metaPayload.quizSummary,
          correctExplanation: metaPayload.correctExplanation,
          coreLogic: metaPayload.coreLogic,
          userVoiceTtsInstructions: metaPayload.userVoiceTtsInstructions?.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string; script?: string };
      if (!res.ok) throw new Error(data.error || "음성 스크립트 실패");
      setVoiceProgress(100);
      const script = data.script ?? "";
      setVoiceScript(script);
      scriptOk = true;

      const voiceDna = instructionsForMeta
        ? { tts_instructions_en: instructionsForMeta }
        : undefined;

      const ttsRes = await fetch("/api/media/tts-hifi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: script,
          voiceDna: voiceDna && Object.keys(voiceDna).length ? voiceDna : undefined,
        }),
      });
      const ttsJson = (await ttsRes.json()) as {
        error?: string;
        ok?: boolean;
        demo?: boolean;
        audioBase64?: string | null;
        mimeType?: string;
        message?: string;
      };
      if (!ttsRes.ok) throw new Error(ttsJson.error || "고음질 TTS 실패");
      if (!ttsJson.audioBase64) {
        setAudioTtsMessage(
          ttsJson.message ??
            "오디오를 생성하지 못했습니다. API 키(ELEVENLABS 또는 OPENAI)를 확인하세요.",
        );
        setAudioRender("error");
        return;
      }
      const audioBytes = base64ToUint8Array(ttsJson.audioBase64);
      const blob = new Blob([audioBytes as unknown as BlobPart], {
        type: ttsJson.mimeType || "audio/mpeg",
      });
      const url = URL.createObjectURL(blob);
      setAudioObjectUrl(url);
      setAudioRender("ready");
    } catch (e) {
      setAlert(e instanceof Error ? e.message : "음성 단계 오류");
      setAudioRender(scriptOk ? "error" : "idle");
      if (scriptOk) {
        setAudioTtsMessage(e instanceof Error ? e.message : "TTS 오류");
      }
    } finally {
      window.clearInterval(tick);
      setVoiceBusy(false);
    }
  }, [logic, activeQuiz, lastCorrect, ttsNote]);

  const handleZenVolatileCleanup = useCallback(() => {
    setAudioObjectUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAudioRender("idle");
  }, []);

  return (
    <Card className="rounded-3xl border-2 border-emerald-100 bg-gradient-to-b from-white to-emerald-50/40 shadow-[0_4px_0_0_rgb(209_250_229)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-sans text-base text-[#4B4B4B]">
          <Sparkles className="size-4 text-emerald-600" aria-hidden />
          Zen · Vision → JSON → 퀴즈 · 토론 · 음성 메타
        </CardTitle>
        <CardDescription className="font-sans text-sm text-[#4B4B4B]/70">
          Gemini 1.5 Pro로 Logic JSON을 뽑고, Flash로 퀴즈를 만든 뒤 Claude Sonnet + Gemini Flash가
          승인할 때까지 재시도합니다. 음성 단계는 Media Studio의「내 목소리」지침과 연동할 수 있습니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          className={cn(
            "relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-emerald-200/80 bg-white/80 px-3 py-4 text-center",
          )}
          data-golden-target="zen-pipeline-upload"
          onClick={() => document.getElementById(`${formId}-zen-file`)?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              document.getElementById(`${formId}-zen-file`)?.click();
            }
          }}
        >
          <input
            id={`${formId}-zen-file`}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="sr-only"
            onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
          />
          <UploadCloud className="size-7 text-emerald-500" />
          <p className="font-sans text-sm font-semibold text-[#4B4B4B]">다이어그램 / 코드 스냅샷</p>
        </div>
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Zen 파이프라인 입력"
            className="max-h-48 w-full rounded-xl border object-contain"
          />
        ) : null}
        {alert ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {alert}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="chunky"
            disabled={logicLoading || !file}
            onClick={() => void runLogicGraph()}
            className="rounded-2xl"
          >
            {logicLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            1) Logic JSON 추출
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={orchLoading || !logic}
            onClick={() => void runOrchestrate()}
            className="rounded-2xl border-2"
          >
            {orchLoading ? <Loader2 className="size-4 animate-spin" /> : null}
            2) 퀴즈 + 에이전트 토론
          </Button>
        </div>

        {logic ? (
          <div className="space-y-1">
            <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-[#4B4B4B]/45">
              Logic JSON {logicDemo ? "· 데모" : ""}
            </p>
            <pre className="max-h-48 overflow-auto rounded-xl border-2 border-gray-100 bg-[#0f172a] p-3 font-mono text-[11px] text-emerald-100/95">
              {JSON.stringify(logic, null, 2)}
            </pre>
          </div>
        ) : null}

        {orchError ? (
          <div className="rounded-xl border-2 border-rose-200 bg-rose-50/90 px-3 py-2 text-sm text-rose-900">
            {orchError}
            {debateInfo ? <p className="mt-2 text-xs opacity-90">{debateInfo}</p> : null}
          </div>
        ) : null}

        {pack ? (
          <div className="space-y-4">
            <p className="font-sans text-xs text-[#4B4B4B]/60">
              토론 통과 {orchDemo ? "· 일부 데모 경로" : ""} {debateInfo ? `· ${debateInfo}` : ""}
            </p>
            <div className="flex flex-wrap gap-1">
              {pack.quizzes.map((q, i) => (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setActiveIdx(i)}
                  className={cn(
                    buttonVariants({ variant: i === activeIdx ? "default" : "outline", size: "sm" }),
                    "rounded-full text-xs",
                  )}
                >
                  {i + 1}. {q.type.replace("_", " ")}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeQuiz ? (
                <QuizCardMotion
                  key={`${shakeKey}-${activeQuiz.id}`}
                  quiz={activeQuiz}
                  shakeToken={shakeKey}
                  lastCorrect={lastCorrect}
                  blankAns={blankAns}
                  setBlankAns={setBlankAns}
                  flowShuffled={flowShuffled}
                  flowPicks={flowPicks}
                  setFlowPicks={setFlowPicks}
                  analogyOptions={analogyOptions}
                  analogyChoice={analogyChoice}
                  setAnalogyChoice={setAnalogyChoice}
                  onGrade={gradeActive}
                />
              ) : null}
            </AnimatePresence>

            {lastCorrect !== null ? (
              <div className="space-y-3 rounded-2xl border-2 border-gray-100 bg-white p-4">
                <Label className="text-xs">내 목소리 TTS 지침 (선택, 영문 권장)</Label>
                <Textarea
                  value={ttsNote}
                  onChange={(e) => setTtsNote(e.target.value)}
                  placeholder="예: warm baritone, slightly slower pacing…"
                  className="min-h-[72px] rounded-xl border-2 text-sm"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="btn-train-voice relative gap-2 overflow-hidden rounded-2xl"
                  disabled={voiceBusy}
                  onClick={() => void runMetaVoice()}
                >
                  <VoiceWaveformOverlay active={voiceBusy || audioRender === "generating"} />
                  {voiceBusy ? (
                    <Loader2 className="relative z-[1] size-4 animate-spin" />
                  ) : (
                    <Volume2 className="relative z-[1] size-4" />
                  )}
                  <span className="relative z-[1]">3) 메타 스크립트 + 고음질 오디오</span>
                </Button>
                {voiceBusy || voiceScript || audioRender !== "idle" ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-[#4B4B4B]/70">
                      오디오 렌더링:{" "}
                      {audioRender === "generating" || voiceBusy
                        ? "스크립트·음성 합성 중…"
                        : audioRender === "ready"
                          ? "재생 준비 완료"
                          : audioRender === "error"
                            ? "합성 실패(스크립트는 유지)"
                            : "대기"}
                    </p>
                    <Progress value={voiceBusy ? voiceProgress : audioRender === "ready" ? 100 : 0} className="h-2" />
                  </div>
                ) : null}
                {voiceScript ? (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 text-sm leading-relaxed text-[#4B4B4B]">
                    {voiceScript}
                  </div>
                ) : null}
                {audioTtsMessage ? (
                  <p className="rounded-lg border border-amber-200 bg-amber-50/90 px-3 py-2 text-xs text-amber-950">
                    {audioTtsMessage}
                  </p>
                ) : null}
                {audioRender === "ready" && audioObjectUrl ? (
                  <div data-golden-target="zen-audio-player">
                    <ZenAudioPlayer
                      src={audioObjectUrl}
                      glowColor={personaAccent}
                      volatileCleanupSec={60}
                      onVolatileCleanup={handleZenVolatileCleanup}
                      onPlayBegin={() => {
                        window.dispatchEvent(new CustomEvent("golden-audio-played"));
                      }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function QuizCardMotion({
  quiz,
  shakeToken,
  lastCorrect,
  blankAns,
  setBlankAns,
  flowShuffled,
  flowPicks,
  setFlowPicks,
  analogyOptions,
  analogyChoice,
  setAnalogyChoice,
  onGrade,
}: {
  quiz: ZenInteractiveQuiz;
  shakeToken: number;
  lastCorrect: boolean | null;
  blankAns: string;
  setBlankAns: (s: string) => void;
  flowShuffled: { label: string; originalIndex: number }[];
  flowPicks: number[];
  setFlowPicks: Dispatch<SetStateAction<number[]>>;
  analogyOptions: string[];
  analogyChoice: string | null;
  setAnalogyChoice: (s: string | null) => void;
  onGrade: () => void;
}) {
  const wrong = lastCorrect === false;
  const right = lastCorrect === true;

  return (
    <motion.div
      key={quiz.id + String(shakeToken)}
      initial={{ opacity: 0, y: 8 }}
      animate={
        wrong
          ? { x: [0, -7, 7, -5, 5, 0], opacity: 1, y: 0 }
          : right
            ? {
                boxShadow: [
                  "0 0 0 0 rgba(16,185,129,0)",
                  "0 0 0 8px rgba(16,185,129,0.25)",
                  "0 0 0 0 rgba(16,185,129,0)",
                ],
                opacity: 1,
                y: 0,
              }
            : { opacity: 1, y: 0 }
      }
      transition={
        wrong
          ? { duration: 0.45 }
          : right
            ? { duration: 0.9, ease: "easeInOut" }
            : { type: "spring", stiffness: 320, damping: 26 }
      }
      className={cn(
        "rounded-2xl border-2 bg-white p-4 shadow-sm",
        right ? "border-emerald-400" : "border-gray-100",
      )}
    >
      <p className="font-sans text-sm font-bold text-[#4B4B4B]">{quiz.prompt}</p>
      <p className="mt-2 text-xs font-medium text-emerald-700/90">Buddy 힌트: {quiz.buddy_hint}</p>

      {quiz.type === "fill_blank" ? (
        <div className="mt-3 space-y-2">
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 font-mono text-xs text-emerald-100">
            {quiz.code_template}
          </pre>
          <Label className="text-xs">빈칸에 들어갈 답</Label>
          <input
            value={blankAns}
            onChange={(e) => setBlankAns(e.target.value)}
            className="w-full rounded-xl border-2 border-gray-100 px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      {quiz.type === "flow_sequence" ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-[#4B4B4B]/65">아래를 <strong>올바른 순서대로</strong> 탭하세요.</p>
          <div className="flex flex-wrap gap-2">
            {flowShuffled.map(({ label, originalIndex }) => (
              <button
                key={label + originalIndex}
                type="button"
                disabled={flowPicks.includes(originalIndex)}
                onClick={() => setFlowPicks((p) => [...p, originalIndex])}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-xl border-2 text-xs disabled:opacity-40",
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setFlowPicks([])}>
              순서 초기화
            </Button>
            <span className="text-xs text-[#4B4B4B]/55">
              선택됨: {flowPicks.map((i) => quiz.steps[i]).join(" → ") || "(없음)"}
            </span>
          </div>
        </div>
      ) : null}

      {quiz.type === "analogy_match" ? (
        <div className="mt-3 space-y-2">
          <p className="text-xs font-semibold text-slate-600">용어: {quiz.technical_term}</p>
          <div className="flex flex-col gap-2">
            {analogyOptions.map((opt) => (
              <label
                key={opt}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-xl border-2 px-3 py-2 text-sm",
                  analogyChoice === opt ? "border-emerald-400 bg-emerald-50/50" : "border-gray-100",
                )}
              >
                <input
                  type="radio"
                  name="analogy"
                  checked={analogyChoice === opt}
                  onChange={() => setAnalogyChoice(opt)}
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" className="rounded-xl" onClick={onGrade}>
          채점
        </Button>
      </div>

      {lastCorrect !== null ? (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800">
          <span className="font-bold text-slate-900">Detective 딥다이브: </span>
          {quiz.detective_deep_dive}
        </div>
      ) : null}
    </motion.div>
  );
}
