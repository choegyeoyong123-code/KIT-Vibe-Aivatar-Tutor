"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { ImageIcon, Loader2, Mic2, Pause, Play, Sparkles, Wand2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { VisualProblemSessionSnapshot } from "@/lib/visual-lab/session-snapshot";
import {
  EDUCATIONAL_PERSONAS,
  type EducationalPersonaId,
} from "@/constants/personas";
import { useEducationalPersona } from "@/components/educational-persona-context";

export type MultimodalStudioTab = "visual" | "media";

export interface MultimodalLearningModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab: MultimodalStudioTab;
}

function StudioGradientBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="relative mt-3 h-3 overflow-hidden rounded-full border-2 border-emerald-100 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
      role="status"
      aria-label="미디어 생성 중"
    >
      <motion.div
        className="absolute inset-y-0 w-[45%] rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-teal-400 shadow-[0_0_20px_rgba(16,185,129,0.45)]"
        initial={{ x: "-20%" }}
        animate={{ x: ["-20%", "120%", "120%"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

async function pollStudioJob(jobId: string): Promise<{
  transcript: string;
  groundingSummary: string;
  audioUrl: string;
}> {
  const max = 90;
  for (let i = 0; i < max; i++) {
    const res = await fetch(
      `/api/media/studio-multimodal?jobId=${encodeURIComponent(jobId)}`,
    );
    const data = (await res.json()) as {
      status?: string;
      error?: string;
      transcript?: string;
      groundingSummary?: string;
      audioUrl?: string;
    };
    if (!res.ok) throw new Error(data.error || "상태 조회 실패");
    if (data.status === "done" && data.transcript != null) {
      return {
        transcript: data.transcript,
        groundingSummary: data.groundingSummary ?? "",
        audioUrl: data.audioUrl ?? "/api/media/demo-chime",
      };
    }
    if (data.status === "error") {
      throw new Error(data.error || "미디어 작업 오류");
    }
    await new Promise((r) => setTimeout(r, 550));
  }
  throw new Error("생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.");
}

export function MultimodalLearningModal({
  open,
  onOpenChange,
  defaultTab,
}: MultimodalLearningModalProps) {
  const formId = useId();
  const { selectedPersona } = useEducationalPersona();
  const [tab, setTab] = useState<MultimodalStudioTab>(defaultTab);

  useEffect(() => {
    if (open && tab === "visual") {
      window.dispatchEvent(new CustomEvent("golden-studio-visual-tab"));
    }
  }, [open, tab]);

  const [visualFile, setVisualFile] = useState<File | null>(null);
  const [visualDrag, setVisualDrag] = useState(false);
  const [visualLoading, setVisualLoading] = useState(false);
  const [visualError, setVisualError] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [vState, setVState] = useState<VisualProblemSessionSnapshot | null>(null);
  const [answer, setAnswer] = useState("");
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const lastCorrectRef = useRef<boolean | null>(null);

  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaDrag, setMediaDrag] = useState(false);
  const [mediaPersona, setMediaPersona] = useState<EducationalPersonaId>(
    selectedPersona?.id ?? "metaphor_mage",
  );
  const [mediaPrompt, setMediaPrompt] = useState(
    "이 아키텍처 그림을 랩으로 설명하는 오디오 스크립트를 만들어 줘. 비트감 있게!",
  );
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [mediaTranscript, setMediaTranscript] = useState("");
  const [mediaGrounding, setMediaGrounding] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioProgress, setAudioProgress] = useState(0);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      lastCorrectRef.current = null;
    }
  }, [open, defaultTab]);

  useEffect(() => {
    if (selectedPersona && open) {
      setMediaPersona(selectedPersona.id);
    }
  }, [selectedPersona, open]);

  useEffect(() => {
    if (!vState) return;
    const cur = vState.lastEvaluationCorrect;
    if (cur === true && lastCorrectRef.current !== true) {
      void import("canvas-confetti").then(({ default: confetti }) => {
        confetti({
          particleCount: 110,
          spread: 78,
          startVelocity: 32,
          origin: { y: 0.72 },
          scalar: 0.95,
          ticks: 220,
          colors: ["#34d399", "#2dd4bf", "#22d3ee", "#a7f3d0", "#fef08a"],
        });
      });
    }
    lastCorrectRef.current = cur;
  }, [vState?.lastEvaluationCorrect, vState]);

  const resetVisual = useCallback(() => {
    setVisualFile(null);
    setVisualError(null);
    setVisualLoading(false);
    setThreadId(null);
    setVState(null);
    setAnswer("");
    setAwaitingAnswer(false);
    setResumeLoading(false);
    lastCorrectRef.current = null;
  }, []);

  const resetMedia = useCallback(() => {
    setMediaFile(null);
    setMediaError(null);
    setMediaLoading(false);
    setMediaTranscript("");
    setMediaGrounding("");
    setAudioUrl(null);
    setAudioProgress(0);
    setPlaying(false);
  }, []);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        resetVisual();
        resetMedia();
      }
      onOpenChange(next);
    },
    [onOpenChange, resetMedia, resetVisual],
  );

  const startVisualQuiz = useCallback(async (file: File) => {
    setVisualError(null);
    setVisualLoading(true);
    setVState(null);
    setThreadId(null);
    setAnswer("");
    setAwaitingAnswer(false);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("creativeIntent", "quiz");
      fd.set("userGoal", "이 다이어그램·이미지를 바탕으로 학생에게 교육적으로 의미 있는 문제 하나를 낸 뒤, 채점까지 이어져야 한다.");
      const res = await fetch("/api/visual/session/start", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        error?: string;
        interrupted?: boolean;
        threadId?: string;
        state?: VisualProblemSessionSnapshot;
      };
      if (!res.ok) throw new Error(data.error || "시작 실패");
      if (!data.state || !data.threadId) throw new Error("상태 없음");
      setVState(data.state);
      setThreadId(data.threadId);
      setAwaitingAnswer(Boolean(data.interrupted) && !data.state.sessionComplete);
    } catch (e) {
      setVisualError(e instanceof Error ? e.message : "오류");
    } finally {
      setVisualLoading(false);
    }
  }, []);

  const onPickVisualFile = useCallback(
    (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
        setVisualError("이미지 또는 짧은 영상 파일을 올려 주세요.");
        return;
      }
      setVisualFile(file);
      setVisualError(null);
      window.dispatchEvent(new CustomEvent("golden-diagram-uploaded"));
      void startVisualQuiz(file);
    },
    [startVisualQuiz],
  );

  const sendAnswer = useCallback(async () => {
    if (!threadId) return;
    setVisualError(null);
    setResumeLoading(true);
    try {
      const res = await fetch("/api/visual/session/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, studentAnswer: answer }),
      });
      const data = (await res.json()) as {
        error?: string;
        interrupted?: boolean;
        state?: VisualProblemSessionSnapshot;
      };
      if (!res.ok) throw new Error(data.error || "재개 실패");
      if (!data.state) throw new Error("상태 없음");
      setVState(data.state);
      setAwaitingAnswer(Boolean(data.interrupted) && !data.state.sessionComplete);
      setAnswer("");
    } catch (e) {
      setVisualError(e instanceof Error ? e.message : "오류");
    } finally {
      setResumeLoading(false);
    }
  }, [threadId, answer]);

  const runMediaConvert = useCallback(async () => {
    if (!mediaFile) return;
    setMediaError(null);
    setMediaLoading(true);
    setMediaTranscript("");
    setMediaGrounding("");
    setAudioUrl(null);
    try {
      const fd = new FormData();
      fd.set("file", mediaFile);
      fd.set("personaId", mediaPersona);
      fd.set("userInstruction", mediaPrompt);
      const res = await fetch("/api/media/studio-multimodal", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string; jobId?: string };
      if (!res.ok) throw new Error(data.error || "작업 시작 실패");
      if (!data.jobId) throw new Error("jobId 없음");
      const done = await pollStudioJob(data.jobId);
      setMediaTranscript(done.transcript);
      setMediaGrounding(done.groundingSummary);
      setAudioUrl(done.audioUrl);
    } catch (e) {
      setMediaError(e instanceof Error ? e.message : "오류");
    } finally {
      setMediaLoading(false);
    }
  }, [mediaFile, mediaPersona, mediaPrompt]);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el
        .play()
        .then(() => {
          setPlaying(true);
          window.dispatchEvent(new CustomEvent("golden-audio-played"));
        })
        .catch(() => setPlaying(false));
    }
  }, [audioUrl, playing]);

  const dropZoneClass = (on: boolean) =>
    cn(
      "flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed px-4 py-8 text-center transition-colors",
      on
        ? "border-emerald-300 bg-emerald-50/50"
        : "border-gray-100 bg-[#FAFAFA] hover:border-gray-200 hover:bg-white",
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          "max-h-[min(92vh,880px)] w-[min(96vw,720px)] max-w-[min(96vw,720px)] gap-0 overflow-hidden rounded-3xl border-2 border-gray-100 bg-[#FFFFFF] p-0 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:max-w-[min(96vw,720px)]",
          "max-lg:top-auto max-lg:bottom-0 max-lg:left-0 max-lg:max-h-[min(88dvh,760px)] max-lg:w-full max-lg:max-w-none max-lg:translate-x-0 max-lg:translate-y-0 max-lg:rounded-b-none max-lg:rounded-t-[1.75rem] max-lg:shadow-[0_-8px_40px_rgba(15,23,42,0.12)] workshop-dialog-mobile-spring",
        )}
      >
        <div className="max-h-[min(92vh,880px)] overflow-y-auto px-5 pb-6 pt-5">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-sans text-lg font-semibold text-[#4B4B4B]">
              멀티모달 학습 스튜디오
            </DialogTitle>
            <DialogDescription className="font-sans text-sm text-[#4B4B4B]/65">
              이미지를 올리면 퀴즈가 되고, 같은 자료로 랩 스크립트·오디오 미리보기까지 이어질 수 있어요.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: tab === "visual" ? "cyanTactile" : "outline", size: "sm" }),
                "h-10 flex-1 rounded-2xl border-2 font-sans text-xs sm:text-sm",
                tab !== "visual" && "border-gray-100 bg-white text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)]",
              )}
              onClick={() => setTab("visual")}
            >
              <ImageIcon className="size-4 shrink-0" aria-hidden />
              Visual Lab
            </button>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: tab === "media" ? "chunky" : "outline", size: "sm" }),
                "h-10 flex-1 rounded-2xl border-2 font-sans text-xs sm:text-sm",
                tab !== "media" && "border-gray-100 bg-white text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)]",
              )}
              onClick={() => setTab("media")}
            >
              <Mic2 className="size-4 shrink-0" aria-hidden />
              Media Studio
            </button>
          </div>

          {tab === "visual" ? (
            <div className="mt-5 space-y-4">
              <StudioGradientBar active={visualLoading} />
              <div
                role="button"
                tabIndex={0}
                data-golden-target="modal-visual-drop"
                className={dropZoneClass(visualDrag)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setVisualDrag(true);
                }}
                onDragLeave={() => setVisualDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setVisualDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) onPickVisualFile(f);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById(`${formId}-visual-file`)?.click();
                  }
                }}
                onClick={() => document.getElementById(`${formId}-visual-file`)?.click()}
              >
                <Sparkles className="size-8 text-emerald-500" aria-hidden />
                <p className="font-sans text-sm font-semibold text-[#4B4B4B]">
                  코드·다이어그램 이미지를 끌어다 놓기
                </p>
                <p className="font-sans text-xs text-[#4B4B4B]/60">
                  업로드되면 곧바로 AI가 분석해 퀴즈를 한 문제 냅니다.
                </p>
                <input
                  id={`${formId}-visual-file`}
                  type="file"
                  accept="image/*,video/*"
                  className="sr-only"
                  onChange={(e) => onPickVisualFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {visualFile ? (
                <p className="font-sans text-xs text-[#4B4B4B]/55">
                  선택됨: <span className="font-medium text-[#4B4B4B]">{visualFile.name}</span>
                </p>
              ) : null}
              {visualLoading ? (
                <div className="flex items-center gap-2 rounded-2xl border-2 border-gray-100 bg-white px-3 py-2 font-sans text-sm text-[#4B4B4B]/80 shadow-[0_2px_0_0_rgb(229_231_235)]">
                  <Loader2 className="size-4 animate-spin text-emerald-500" aria-hidden />
                  Gemini 시각 분석 후 문제를 만들고 있어요…
                </div>
              ) : null}
              {visualError ? (
                <p
                  className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-3 py-2 font-sans text-sm text-amber-950"
                  role="alert"
                >
                  {visualError}
                </p>
              ) : null}

              {vState ? (
                <div className="space-y-4 rounded-3xl border-2 border-gray-100 bg-white p-4 shadow-[0_4px_0_0_rgb(229_231_235)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[#4B4B4B]/45">
                      퀴즈 카드
                    </p>
                    {vState.sessionComplete ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-[10px] font-bold text-emerald-800">
                        세션 완료
                      </span>
                    ) : null}
                  </div>
                  <Progress
                    value={Math.min(
                      100,
                      (vState.problemsSolved / Math.max(vState.maxProblems, 1)) * 100,
                    )}
                    className="h-2 bg-gray-100 [&>div]:bg-emerald-500"
                  />
                  {vState.visualGrounding ? (
                    <p className="font-sans text-xs leading-relaxed text-[#4B4B4B]/70">
                      {vState.visualGrounding.contextualSummary}
                    </p>
                  ) : null}
                  <div className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-3">
                    <p className="font-sans text-sm font-semibold text-[#4B4B4B]">문제</p>
                    <p className="mt-2 font-sans text-sm leading-relaxed text-[#4B4B4B]">
                      {vState.currentQuestion || "문제를 불러오는 중이에요."}
                    </p>
                  </div>
                  {vState.evaluationFeedback ? (
                    <div
                      className={cn(
                        "rounded-2xl border-2 px-3 py-2 font-sans text-sm",
                        vState.lastEvaluationCorrect
                          ? "border-emerald-200 bg-emerald-50/80 text-emerald-950"
                          : "border-amber-200 bg-amber-50/90 text-amber-950",
                      )}
                    >
                      {vState.evaluationFeedback}
                    </div>
                  ) : null}
                  {awaitingAnswer && threadId && !vState.sessionComplete ? (
                    <div className="space-y-2">
                      <Label htmlFor={`${formId}-v-ans`} className="font-sans text-xs text-[#4B4B4B]/70">
                        답 입력
                      </Label>
                      <Textarea
                        id={`${formId}-v-ans`}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        className="min-h-[88px] rounded-2xl border-2 border-gray-100"
                        placeholder="여기에 답을 적어 주세요."
                      />
                      <Button
                        type="button"
                        variant="chunky"
                        className="w-full rounded-2xl"
                        disabled={resumeLoading || !answer.trim()}
                        onClick={() => void sendAnswer()}
                      >
                        {resumeLoading ? (
                          <Loader2 className="size-4 animate-spin" aria-hidden />
                        ) : null}
                        정답 제출
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-2xl border-2 border-gray-100"
                      onClick={() => {
                        resetVisual();
                      }}
                    >
                      새 이미지
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <StudioGradientBar active={mediaLoading} />
              <div
                className={dropZoneClass(mediaDrag)}
                onDragOver={(e) => {
                  e.preventDefault();
                  setMediaDrag(true);
                }}
                onDragLeave={() => setMediaDrag(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setMediaDrag(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f?.type.startsWith("image/")) {
                    setMediaFile(f);
                    setMediaError(null);
                  } else {
                    setMediaError("이미지 파일만 지원합니다.");
                  }
                }}
                onClick={() => document.getElementById(`${formId}-media-file`)?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById(`${formId}-media-file`)?.click();
                  }
                }}
              >
                <Wand2 className="size-8 text-cyan-500" aria-hidden />
                <p className="font-sans text-sm font-semibold text-[#4B4B4B]">
                  아키텍처·에러 화면 캡처 업로드
                </p>
                <p className="font-sans text-xs text-[#4B4B4B]/60">
                  선택한 튜터 페르소나 톤으로 스크립트가 쓰입니다.
                </p>
                <input
                  id={`${formId}-media-file`}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f?.type.startsWith("image/")) {
                      setMediaFile(f);
                      setMediaError(null);
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label className="font-sans text-xs text-[#4B4B4B]/70">페르소나</Label>
                <select
                  className="h-11 w-full rounded-2xl border-2 border-gray-100 bg-white px-3 font-sans text-sm text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)]"
                  value={mediaPersona}
                  onChange={(e) => setMediaPersona(e.target.value as EducationalPersonaId)}
                >
                  {EDUCATIONAL_PERSONAS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.emoji} {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor={`${formId}-mp`} className="font-sans text-xs text-[#4B4B4B]/70">
                  프롬프트
                </Label>
                <Textarea
                  id={`${formId}-mp`}
                  value={mediaPrompt}
                  onChange={(e) => setMediaPrompt(e.target.value)}
                  className="min-h-[88px] rounded-2xl border-2 border-gray-100"
                />
              </div>

              <Button
                type="button"
                variant="cyanTactile"
                className="w-full rounded-2xl"
                disabled={mediaLoading || !mediaFile}
                onClick={() => void runMediaConvert()}
              >
                {mediaLoading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                미디어로 변환하기
              </Button>

              {mediaError ? (
                <p
                  className="rounded-2xl border-2 border-amber-200 bg-amber-50/80 px-3 py-2 font-sans text-sm text-amber-950"
                  role="alert"
                >
                  {mediaError}
                </p>
              ) : null}

              {mediaGrounding ? (
                <p className="rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] p-3 font-sans text-xs leading-relaxed text-[#4B4B4B]/75">
                  <span className="font-semibold text-[#4B4B4B]">시각 요약 · </span>
                  {mediaGrounding}
                </p>
              ) : null}

              {mediaTranscript ? (
                <div className="rounded-3xl border-2 border-gray-100 bg-white p-4 shadow-[0_4px_0_0_rgb(229_231_235)]">
                  <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[#4B4B4B]/45">
                    생성 스크립트
                  </p>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-[#4B4B4B]">
                    {mediaTranscript}
                  </pre>

                  {audioUrl ? (
                    <div className="mt-4 space-y-2">
                      <p className="font-sans text-xs font-semibold text-[#4B4B4B]/55">
                        오디오 미리보기 (데모 톤 — 실제 TTS는 파이프라인 연동 시 교체됩니다)
                      </p>
                      <audio
                        ref={audioRef}
                        src={audioUrl}
                        className="hidden"
                        onTimeUpdate={() => {
                          const a = audioRef.current;
                          if (!a?.duration) return;
                          setAudioProgress((a.currentTime / a.duration) * 100);
                        }}
                        onEnded={() => setPlaying(false)}
                        onPause={() => setPlaying(false)}
                        onPlay={() => setPlaying(true)}
                      />
                      <div
                        className="flex items-center gap-3 rounded-2xl border-2 border-gray-100 bg-[#FAFAFA] px-3 py-2"
                        data-golden-target="modal-audio-play"
                      >
                        <Button
                          type="button"
                          variant="chunky"
                          size="icon"
                          className="size-10 shrink-0 rounded-full"
                          onClick={() => void togglePlay()}
                          aria-label={playing ? "일시정지" : "재생"}
                        >
                          {playing ? (
                            <Pause className="size-4 fill-current" aria-hidden />
                          ) : (
                            <Play className="size-4 fill-current pl-0.5" aria-hidden />
                          )}
                        </Button>
                        <div className="min-w-0 flex-1">
                          <Progress value={audioProgress} className="h-2 bg-gray-200 [&>div]:bg-cyan-500" />
                          <p className="mt-1 font-sans text-[10px] text-[#4B4B4B]/50">
                            재생/일시정지로 스튜디오 감각을 확인해 보세요.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
