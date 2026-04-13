"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { MaterialSymbol } from "@/components/material-symbol";
import { cn } from "@/lib/utils";
import { useVibe } from "@/components/vibe-context";
import { AsyncProcessingLaymanTooltip } from "@/components/async-processing-layman-tooltip";
import { WorkshopInteractiveQuizMock } from "@/components/workshop-interactive-quiz-mock";

const HERO_IMAGE =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAziT15Uc6kJABOFnRHtQsmCBtb3SbBAtgLKXoTDoc7kmHGHHixxROJoqJvGb4TyzuefRcwYMypRIH--z3Ne_8ebpYDB3lFFPyeMvdKvdHGTZKVaPGa-o4UpLVE5Cq2vOcibCK2RrSU11kqo93jIwdQ8oV8rJxhyxjd_cKoEKBqU98NSci44KPMog0QefgHhy7LKAXA36XKhW0jrVyHIBIH0n8XWihGKWNcbP1rNLxbkjxlV62-iKlD9ahhUrnzuviKULRl5rKIcK4";

/** viewBox 단위 — rem 스케일 래퍼 안에서 비율 유지 */
const VOICE_VB = 100;
const VOICE_RING_R = 38;
const VOICE_RING_STROKE = 5;
const VOICE_RING_LEN = 2 * Math.PI * VOICE_RING_R;

export function ChatContainer() {
  const [draft, setDraft] = useState("");
  const asyncQuizTipId = useId();
  const asyncMediaTipId = useId();
  const {
    selectedPersona,
    accentHex,
    emotionalFeedback,
    visualLabPhase,
    visualLabStatusText,
    visualLabView,
    startVisualLabSimulation,
    resetVisualLabToWorkspace,
    mediaStudioBusy,
    mediaStudioStatusText,
    startMediaStudioSimulation,
    vocalOutput,
    setVocalOutput,
    voiceTrainingActive,
    voiceTrainingProgress,
    voiceTrainingError,
    simulateVoiceTraining,
  } = useVibe();

  const greetingSub =
    selectedPersona?.greetingSub ??
    "학습할 코드를 입력하거나, 분석할 이미지를 아래에 놓아주세요.";

  const analogyDemo = useMemo(() => {
    if (selectedPersona?.id === "metaphor_mage") {
      return "이 에러는 레시피에 '설탕'이 적혀 있는데, 실제 주방엔 설탕 봉지 자체가 없는 상태와 같아요!";
    }
    return `${selectedPersona?.name ?? "튜터"} 관점에서 보면, undefined에 map을 호출한 건 아직 준비되지 않은 목록을 펼치려 한 것과 비슷해요.`;
  }, [selectedPersona?.id, selectedPersona?.name]);

  const ringOffset =
    VOICE_RING_LEN - (voiceTrainingProgress / 100) * VOICE_RING_LEN;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="custom-scroll flex min-h-0 flex-1 flex-col space-y-6 overflow-y-auto p-4 min-[400px]:p-6 sm:space-y-8 sm:p-8">
        {visualLabView === "quiz" ? (
          <div className="pt-4 sm:pt-6">
            <WorkshopInteractiveQuizMock
              accentHex={accentHex}
              onBack={resetVisualLabToWorkspace}
            />
          </div>
        ) : (
          <>
            <div className="mx-auto w-full max-w-[min(36rem,85vw)] space-y-3 px-1 pt-4 text-center sm:max-w-3xl sm:space-y-4 sm:px-0 sm:pt-10">
              <h2
                className="text-balance font-headline text-2xl font-extrabold tracking-tight text-pw-on-surface sm:text-3xl md:text-4xl"
                style={{ color: selectedPersona ? accentHex : undefined }}
              >
                안녕하세요
              </h2>
              <p className="text-pretty text-sm font-medium text-slate-500 sm:text-base">
                {greetingSub}
              </p>
            </div>

            <motion.div
              layout
              className="glass-morphism mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-3xl border border-white/50 bg-white/70 p-3 shadow-md backdrop-blur-xl min-[400px]:p-4 md:grid md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-3 md:p-5"
            >
              <div className="chat-bubble-surface mx-auto flex min-h-[6.5rem] w-full max-w-[85%] min-w-0 flex-col rounded-2xl border border-slate-200/80 bg-slate-900 px-3 py-2.5 text-left shadow-inner sm:max-w-none sm:px-4 sm:py-3 md:mx-0">
                <p className="font-headline text-[9px] font-bold tracking-widest text-rose-300 uppercase">
                  Cold Compiler Error
                </p>
                <pre className="mt-2 min-w-0 whitespace-pre-wrap break-words font-mono text-[10px] leading-relaxed text-rose-100 sm:text-[11px]">
                  TypeError: Cannot read properties of undefined (reading &apos;map&apos;)
                </pre>
              </div>
              <div className="hidden items-center justify-center md:flex">
                <MaterialSymbol name="arrow_forward" className="text-3xl text-slate-300" />
              </div>
              <div
                className="chat-bubble-surface mx-auto flex min-h-[6.5rem] w-full max-w-[85%] min-w-0 flex-col justify-center rounded-2xl border px-3 py-2.5 text-left shadow-sm sm:max-w-none sm:px-4 sm:py-3 md:mx-0"
                style={{
                  borderColor: `${accentHex}55`,
                  backgroundColor: `${accentHex}14`,
                }}
              >
                <p className="font-headline text-[9px] font-bold tracking-widest text-slate-500 uppercase">
                  {selectedPersona?.name ?? "튜터"} · 비유
                </p>
                <p className="mt-2 text-xs font-medium leading-relaxed text-pw-on-surface sm:text-sm">
                  {analogyDemo}
                </p>
              </div>
            </motion.div>

            <motion.div
              layout
              className="chat-bubble-surface mx-auto w-full max-w-[min(32rem,85vw)] rounded-2xl border-2 border-pw-surface-container bg-white px-4 py-3 shadow-sm sm:max-w-lg sm:px-5 sm:py-4"
              style={{ borderColor: `${accentHex}44` }}
            >
              <p className="font-headline text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Emotional Feedback
                {selectedPersona ? ` · ${selectedPersona.name}` : ""}
              </p>
              <p className="mt-2 text-sm font-medium leading-relaxed text-pw-on-surface">
                {emotionalFeedback}
              </p>
            </motion.div>

            <div className="mx-auto w-full max-w-4xl">
              <div className="flex flex-col gap-6 rounded-3xl border-b-4 border-pw-surface-container bg-pw-surface-container-low p-5 sm:p-6">
                <div className="flex flex-col gap-4 rounded-2xl border border-pw-surface-container bg-white/90 px-3 py-3 shadow-sm min-[400px]:px-4 min-[400px]:py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-row items-center gap-3 sm:gap-4">
                    <div
                      className="relative aspect-square w-[clamp(4.5rem,22vmin,7rem)] shrink-0 sm:w-[clamp(5rem,18vmin,7.5rem)]"
                      aria-hidden
                    >
                      <svg
                        className="progress-ring h-full w-full -rotate-90"
                        viewBox={`0 0 ${VOICE_VB} ${VOICE_VB}`}
                      >
                        <circle
                          className="text-pw-surface-container"
                          strokeWidth={VOICE_RING_STROKE}
                          stroke="currentColor"
                          fill="transparent"
                          r={VOICE_RING_R}
                          cx={VOICE_VB / 2}
                          cy={VOICE_VB / 2}
                        />
                        <circle
                          className="progress-ring__circle text-[color:var(--pw-persona-accent,#006c49)]"
                          strokeWidth={VOICE_RING_STROKE}
                          strokeDasharray={VOICE_RING_LEN}
                          strokeDashoffset={voiceTrainingActive ? ringOffset : VOICE_RING_LEN}
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="transparent"
                          r={VOICE_RING_R}
                          cx={VOICE_VB / 2}
                          cy={VOICE_VB / 2}
                        />
                      </svg>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                        <MaterialSymbol
                          name="mic"
                          className="text-[clamp(1.1rem,5vmin,1.5rem)] text-pw-on-surface-variant"
                        />
                        <span className="mt-0.5 font-mono text-[clamp(0.55rem,2.8vmin,0.625rem)] font-bold tabular-nums text-slate-500">
                          {voiceTrainingActive
                            ? voiceTrainingProgress < 50
                              ? "녹음"
                              : voiceTrainingProgress < 100
                                ? "처리"
                                : "완료"
                            : "대기"}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="font-headline text-sm font-bold text-pw-on-surface">
                        내 목소리 학습 (Train My Voice)
                      </p>
                      <p className="mt-1 text-[11px] leading-relaxed text-pw-on-surface-variant sm:text-xs">
                        샘플은 volatile 메모리에만 올라가며, 시뮬레이션 종료 시 버퍼가 비워집니다.
                      </p>
                      {voiceTrainingError ? (
                        <p className="mt-2 text-[11px] font-semibold text-red-600 sm:text-xs" role="alert">
                          {voiceTrainingError}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <motion.button
                    type="button"
                    whileTap={{ y: 2, scale: 0.98 }}
                    disabled={voiceTrainingActive}
                    onClick={() => {
                      void simulateVoiceTraining();
                    }}
                    id="btn-train-voice"
                    className="tactile-button w-full shrink-0 rounded-2xl border-b-4 border-[#00422b] bg-pw-primary px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60 sm:w-auto"
                    style={{
                      backgroundColor: accentHex,
                      borderBottomColor: `${accentHex}cc`,
                    }}
                  >
                    학습 시작
                  </motion.button>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-dashed border-pw-outline-variant/60 bg-white/60 px-3 py-2 text-xs font-semibold text-pw-on-surface-variant">
                  <span>보컬 출력:</span>
                  <button
                    type="button"
                    onClick={() => setVocalOutput("persona")}
                    className={cn(
                      "rounded-full px-3 py-1 transition-colors",
                      vocalOutput === "persona"
                        ? "bg-pw-primary-container/20 text-pw-on-surface"
                        : "text-slate-500 hover:bg-slate-100",
                    )}
                    style={
                      vocalOutput === "persona"
                        ? { color: accentHex, backgroundColor: `${accentHex}22` }
                        : undefined
                    }
                  >
                    페르소나 음색
                  </button>
                  <button
                    type="button"
                    onClick={() => setVocalOutput("user")}
                    className={cn(
                      "rounded-full px-3 py-1 transition-colors",
                      vocalOutput === "user"
                        ? "bg-pw-primary-container/20 text-pw-on-surface"
                        : "text-slate-500 hover:bg-slate-100",
                    )}
                    style={
                      vocalOutput === "user"
                        ? { color: accentHex, backgroundColor: `${accentHex}22` }
                        : undefined
                    }
                  >
                    내 목소리 (Listen with My Voice)
                  </button>
                </div>

                {mediaStudioBusy ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 rounded-2xl border-2 border-cyan-100 bg-cyan-50/90 px-4 py-3 text-sm font-semibold text-cyan-900"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="flex items-center gap-2">
                      <span className="mr-1 inline-block size-2 animate-pulse rounded-full bg-cyan-500 align-middle" />
                      <span>Listen with My Voice — 오디오 파이프라인</span>
                    </div>
                    <p className="text-xs font-medium text-cyan-800/90">{mediaStudioStatusText}</p>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-cyan-200/60">
                      <motion.div
                        className="absolute inset-y-0 left-0 rounded-full bg-cyan-500"
                        initial={{ width: "8%" }}
                        animate={{ width: ["12%", "55%", "88%", "100%"] }}
                        transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                    </div>
                  </motion.div>
                ) : null}

                <div className="group relative h-56 w-full overflow-hidden rounded-2xl shadow-md sm:h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={HERO_IMAGE}
                    alt="코드가 보이는 노트북 화면"
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 transition-all group-hover:bg-black/10">
                    <div className="rounded-xl border border-white/40 bg-white/80 p-3 shadow-lg backdrop-blur-md">
                      <MaterialSymbol
                        name="check_circle"
                        fill
                        className="text-[color:var(--pw-persona-accent,#006c49)]"
                      />
                      <span className="ml-2 text-sm font-bold">이미지 업로드 완료</span>
                    </div>
                  </div>
                </div>

                {visualLabPhase === "analyzing" ? (
                  <p
                    className="text-center text-sm font-semibold text-slate-600"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="mr-2 inline-block font-headline text-xs font-bold uppercase tracking-wide text-emerald-700">
                      Vision Agent
                    </span>
                    {visualLabStatusText}
                  </p>
                ) : null}

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <motion.button
                      id="btn-quiz"
                      type="button"
                      layout
                      whileTap={{ y: 2, scale: 0.995 }}
                      disabled={visualLabPhase === "analyzing"}
                      onClick={startVisualLabSimulation}
                      aria-busy={visualLabPhase === "analyzing"}
                      className={cn(
                        "tactile-button group relative flex w-full transform items-center justify-between overflow-hidden rounded-2xl border-b-4 border-pw-primary bg-pw-primary-container p-5 text-left text-white transition-all disabled:opacity-70",
                      )}
                    >
                      <div className="relative z-10 flex flex-col text-left">
                        <span className="mb-1 text-xs font-bold tracking-widest uppercase opacity-80">
                          Visual Lab
                        </span>
                        <span className="font-headline text-lg font-bold">
                          이미지 기반 퀴즈 생성
                        </span>
                        <span className="mt-2 text-[11px] font-medium opacity-90">
                          <Link
                            href="/visual-lab"
                            className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            전체 Visual Lab 페이지 →
                          </Link>
                        </span>
                      </div>
                      <MaterialSymbol
                        name="psychology"
                        className={cn(
                          "relative z-10 text-3xl opacity-80",
                          visualLabPhase === "analyzing" && "animate-spin",
                        )}
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-pw-primary to-pw-primary-container opacity-50" />
                    </motion.button>
                    <AsyncProcessingLaymanTooltip
                      visible={visualLabPhase === "analyzing"}
                      descriptionId={asyncQuizTipId}
                    />
                  </div>

                  <div className="relative">
                    <motion.button
                      id="btn-media"
                      type="button"
                      layout
                      whileTap={{ y: 2, scale: 0.995 }}
                      disabled={mediaStudioBusy}
                      onClick={startMediaStudioSimulation}
                      aria-busy={mediaStudioBusy}
                      className="tactile-button group relative flex w-full transform items-center justify-between overflow-hidden rounded-2xl border-b-4 border-[#004e5c] bg-pw-secondary p-5 text-left text-white transition-all disabled:opacity-70"
                    >
                      <div className="relative z-10 flex flex-col text-left">
                        <span className="mb-1 text-xs font-bold tracking-widest uppercase opacity-80">
                          Media Studio
                        </span>
                        <span className="font-headline text-lg font-bold">
                          랩/오디오 변환 영상 생성
                        </span>
                        <span className="mt-2 text-[11px] font-medium opacity-90">
                          <Link
                            href="/media-studio"
                            className="underline decoration-white/50 underline-offset-2 hover:decoration-white"
                            onClick={(e) => e.stopPropagation()}
                          >
                            전체 Media Studio →
                          </Link>
                        </span>
                      </div>
                      <MaterialSymbol
                        name="equalizer"
                        className={cn(
                          "relative z-10 text-3xl opacity-80",
                          mediaStudioBusy && "animate-spin",
                        )}
                      />
                      <div className="absolute inset-0 bg-gradient-to-tr from-[#004e5c] to-pw-secondary opacity-50" />
                    </motion.button>
                    <AsyncProcessingLaymanTooltip
                      visible={mediaStudioBusy}
                      descriptionId={asyncMediaTipId}
                    />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {visualLabView !== "quiz" ? (
          <div className="mx-auto w-full max-w-4xl space-y-6">
            <div className="flex items-center gap-2">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pw-primary-container/10"
                style={{ backgroundColor: `${accentHex}18` }}
              >
                <MaterialSymbol
                  name="auto_awesome"
                  className="text-[color:var(--pw-persona-accent,#006c49)]"
                />
              </div>
              <h3 className="font-headline text-xl font-bold text-pw-on-surface">
                생성된 학습 리소스
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="flex animate-pulse flex-col gap-4 rounded-2xl border-b-4 border-pw-surface-container bg-white p-6 shadow-sm">
                <div className="mb-2 h-12 w-12 rounded-xl bg-pw-surface-container-low" />
                <div className="h-4 w-3/4 rounded bg-pw-surface-container-low" />
                <div className="h-4 w-1/2 rounded bg-pw-surface-container-low" />
                <div className="mt-4 flex gap-2">
                  <div className="h-8 w-20 rounded-full bg-pw-surface-container-low" />
                  <div className="h-8 w-20 rounded-full bg-pw-surface-container-low" />
                </div>
              </div>

              <div className="group relative flex flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl bg-slate-900 p-8 shadow-xl md:col-span-2">
                <div className="absolute top-4 left-4 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold tracking-widest text-white/60 uppercase backdrop-blur-md">
                  Preview Mode
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-lg">
                  <MaterialSymbol name="play_arrow" fill className="text-4xl text-white" />
                </div>
                <div className="w-full space-y-3 px-4 sm:px-10">
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="absolute top-0 left-0 h-full w-1/3 rounded-full bg-pw-primary-container transition-all duration-700"
                      style={{ backgroundColor: accentHex }}
                    />
                  </div>
                  <div className="flex justify-between font-mono text-[10px] text-white/40">
                    <span>02:14</span>
                    <span>06:45</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t-0 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] sm:p-4 sm:pb-4 md:p-6 md:pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
        <div className="group relative mx-auto max-w-4xl min-w-0">
          <div className="flex min-w-0 items-end gap-2 rounded-2xl bg-pw-surface-container-low p-2 shadow-inner ring-pw-secondary/20 transition-all focus-within:ring-2 min-[400px]:gap-3 min-[400px]:p-3 sm:p-4">
            <motion.button
              type="button"
              whileTap={{ y: 2, scale: 0.98 }}
              className="tactile-button p-2 text-slate-400 transition-colors hover:text-[color:var(--pw-persona-accent,#006c49)]"
              aria-label="첨부"
            >
              <MaterialSymbol name="add_circle" />
            </motion.button>
            <textarea
              rows={1}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="코드를 물어보세요..."
              className="min-h-[44px] flex-1 resize-none border-none bg-transparent py-2 font-medium text-pw-on-surface outline-none placeholder:text-slate-400 focus:ring-0"
            />
            <motion.button
              type="button"
              whileTap={{ y: 2, scale: 0.98 }}
              className="tactile-button rounded-xl border-b-4 border-[#00422b] bg-pw-primary p-3 text-white shadow-lg"
              style={{ backgroundColor: accentHex, borderBottomColor: `${accentHex}cc` }}
              aria-label="보내기"
            >
              <MaterialSymbol name="send" fill />
            </motion.button>
          </div>
          <div className="pointer-events-none absolute -top-9 left-1/2 z-10 -translate-x-1/2 rounded-full border border-pw-surface-container bg-white px-4 py-1.5 text-[11px] font-bold text-slate-400 opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            Drag &amp; Drop to upload
          </div>
        </div>
      </div>
    </div>
  );
}
