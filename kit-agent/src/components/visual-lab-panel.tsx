"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Loader2, ImageIcon, Sparkles, Brain, UploadCloud } from "lucide-react";
import type { VisualProblemSessionSnapshot } from "@/lib/visual-lab/session-snapshot";
import Link from "next/link";
import { TutorMarkdown } from "@/components/tutor-markdown";
import {
  AnalyzePayloadError,
  assertAllowedImageFile,
  buildAnalyzeJsonBody,
} from "@/lib/client/multimodal-analyze-payload";
import { VisualLabZenPipeline } from "@/components/visual-lab-zen-pipeline";
import { VisualLabSemanticChainPanel } from "@/components/visual-lab-semantic-chain-panel";
import { GoldenPathCoach } from "@/components/golden-path-coach";

export function VisualLabPanel() {
  const formId = useId();

  /** ——— 범용 멀티모달 분석 (/api/analyze) ——— */
  const [analyzeFile, setAnalyzeFile] = useState<File | null>(null);
  const [analyzePreviewUrl, setAnalyzePreviewUrl] = useState<string | null>(null);
  const [analyzePrompt, setAnalyzePrompt] = useState(
    "이 그림의 작동 원리를 비유를 들어서 설명해 줘.",
  );
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeIsError, setAnalyzeIsError] = useState(false);
  const [analyzeAlert, setAnalyzeAlert] = useState<string | null>(null);
  const [analyzeResult, setAnalyzeResult] = useState("");
  const [analyzeMeta, setAnalyzeMeta] = useState<{ provider: string; modelId: string } | null>(
    null,
  );

  useEffect(() => {
    if (!analyzeFile) {
      setAnalyzePreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(analyzeFile);
    setAnalyzePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [analyzeFile]);

  const applyAnalyzeFile = useCallback((file: File | null) => {
    if (!file) {
      setAnalyzeFile(null);
      setAnalyzeAlert(null);
      setAnalyzeIsError(false);
      return;
    }
    try {
      assertAllowedImageFile(file);
      setAnalyzeFile(file);
      setAnalyzeAlert(null);
      setAnalyzeIsError(false);
    } catch (e) {
      setAnalyzeFile(null);
      setAnalyzeIsError(true);
      setAnalyzeAlert(e instanceof AnalyzePayloadError ? e.message : "파일을 확인할 수 없어요.");
    }
  }, []);

  const runAnalyze = useCallback(async () => {
    if (!analyzeFile) {
      setAnalyzeIsError(true);
      setAnalyzeAlert("이미지를 먼저 올려 주세요.");
      return;
    }
    setAnalyzeLoading(true);
    setAnalyzeIsError(false);
    setAnalyzeAlert(null);
    setAnalyzeResult("");
    setAnalyzeMeta(null);
    try {
      const body = await buildAnalyzeJsonBody(analyzeFile, analyzePrompt);
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as {
        error?: string;
        markdown?: string;
        provider?: string;
        modelId?: string;
      };
      if (!res.ok) {
        const msg =
          data.error ||
          (res.status === 413
            ? "파일이 너무 커요!"
            : res.status === 429
              ? "요청이 많아요. 잠시 후 다시 시도해 주세요."
              : "분석에 실패했어요.");
        throw new Error(msg);
      }
      setAnalyzeResult(data.markdown ?? "");
      if (data.provider && data.modelId) {
        setAnalyzeMeta({ provider: data.provider, modelId: data.modelId });
      }
    } catch (e) {
      setAnalyzeIsError(true);
      if (e instanceof TypeError) {
        setAnalyzeAlert("연결이 끊겼어요. 네트워크를 확인해 주세요.");
      } else {
        setAnalyzeAlert(
          e instanceof AnalyzePayloadError
            ? e.message
            : e instanceof Error
              ? e.message
              : "알 수 없는 오류가 났어요.",
        );
      }
    } finally {
      setAnalyzeLoading(false);
    }
  }, [analyzeFile, analyzePrompt]);

  /** ——— 고급 · 퀴즈 세션 루프 ——— */
  const [quizFile, setQuizFile] = useState<File | null>(null);
  const [intent, setIntent] = useState<"quiz" | "rap" | "video_script">("quiz");
  const [userGoal, setUserGoal] = useState("");
  const [threadId, setThreadId] = useState<string | null>(null);
  const [state, setState] = useState<VisualProblemSessionSnapshot | null>(null);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingAnswer, setAwaitingAnswer] = useState(false);

  const startSession = useCallback(async () => {
    if (!quizFile) return;
    setError(null);
    setLoading(true);
    setState(null);
    setThreadId(null);
    setAnswer("");
    setAwaitingAnswer(false);
    try {
      const fd = new FormData();
      fd.set("file", quizFile);
      fd.set("creativeIntent", intent);
      if (userGoal.trim()) fd.set("userGoal", userGoal.trim());
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
      setState(data.state);
      setThreadId(data.threadId);
      setAwaitingAnswer(Boolean(data.interrupted) && !data.state.sessionComplete);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [quizFile, intent, userGoal]);

  const sendAnswer = useCallback(async () => {
    if (!threadId) return;
    setError(null);
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
      setState(data.state);
      setAwaitingAnswer(Boolean(data.interrupted) && !data.state.sessionComplete);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setResumeLoading(false);
    }
  }, [threadId, answer]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 bg-[#FFFFFF] p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-sans text-2xl font-semibold tracking-tight text-[#4B4B4B]">
            Visual Lab
          </h1>
          <p className="mt-1 font-sans text-sm leading-relaxed text-[#4B4B4B]/65">
            이미지와 질문을 함께 보내 ChatGPT·Gemini 수준의 멀티모달 분석을 받아 보세요. 아래에서
            퀴즈 세션(고급)도 이어갈 수 있어요.
          </p>
        </div>
        <Link
          href="/dashboard"
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-2xl border-2 border-gray-100 bg-white font-sans text-xs text-[#4B4B4B] shadow-[0_2px_0_0_rgb(229_231_235)]",
          )}
        >
          ← 학습 대시보드
        </Link>
      </div>

      {/* 1. 범용 멀티모달 입력 + 결과 */}
      <Card className="rounded-3xl border-2 border-gray-100 bg-white shadow-[0_4px_0_0_rgb(229_231_235)]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-sans text-base text-[#4B4B4B]">
            <ImageIcon className="size-4 text-emerald-600" aria-hidden />
            AI 튜터 · 이미지 + 질문
          </CardTitle>
          <CardDescription className="font-sans text-sm text-[#4B4B4B]/65">
            PNG, JPG, WEBP — 드래그 앤 드롭 또는 클릭으로 업로드한 뒤, 원하는 설명·에러 분석·비유
            등을 적고 실행하세요. API는 <code className="text-xs">/api/analyze</code> 입니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            className={cn(
              "relative flex min-h-[168px] cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-100 bg-[#FAFAFA] px-4 py-6 text-center transition-colors hover:border-emerald-200 hover:bg-white",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (f) applyAnalyzeFile(f);
            }}
            onClick={() => document.getElementById(`${formId}-analyze-input`)?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById(`${formId}-analyze-input`)?.click();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="이미지 업로드 영역"
          >
            <input
              id={`${formId}-analyze-input`}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,.png,.jpg,.jpeg,.webp"
              className="sr-only"
              onChange={(e) => applyAnalyzeFile(e.target.files?.[0] ?? null)}
            />
            <UploadCloud className="size-9 text-emerald-500/90" aria-hidden />
            <p className="font-sans text-sm font-semibold text-[#4B4B4B]">
              여기에 이미지를 놓거나 눌러서 선택
            </p>
            <p className="font-sans text-xs text-[#4B4B4B]/55">최대 8MB · 한 장씩</p>
          </div>

          {analyzePreviewUrl ? (
            <div className="overflow-hidden rounded-2xl border-2 border-gray-100 bg-white p-2 shadow-[0_2px_0_0_rgb(229_231_235)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={analyzePreviewUrl}
                alt="업로드한 학습 자료 미리보기"
                className="mx-auto max-h-56 w-auto max-w-full rounded-xl object-contain"
              />
              <p className="mt-2 truncate text-center font-sans text-xs text-[#4B4B4B]/55">
                {analyzeFile?.name}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label
              htmlFor={`${formId}-analyze-prompt`}
              className="font-sans text-xs font-medium text-[#4B4B4B]/70"
            >
              AI에게 할 말 (프롬프트)
            </Label>
            <Textarea
              id={`${formId}-analyze-prompt`}
              value={analyzePrompt}
              onChange={(e) => setAnalyzePrompt(e.target.value)}
              placeholder='예: "이 에러가 왜 발생했는지 설명해 줘" / "이 아키텍처에서 데이터 흐름만 짚어 줘"'
              className="min-h-[120px] rounded-2xl border-2 border-gray-100 bg-white font-sans text-sm text-[#4B4B4B] placeholder:text-[#4B4B4B]/40"
            />
          </div>

          {analyzeIsError && analyzeAlert ? (
            <div
              className="rounded-2xl border-2 border-amber-200 bg-amber-50/90 px-3 py-2.5 font-sans text-sm text-amber-950 shadow-[0_2px_0_0_rgb(253_230_138)]"
              role="alert"
            >
              {analyzeAlert}
            </div>
          ) : null}

          <Button
            type="button"
            variant="chunky"
            disabled={analyzeLoading || !analyzeFile}
            onClick={() => void runAnalyze()}
            className="h-12 w-full rounded-2xl font-sans text-base font-semibold shadow-[0_4px_0_0_#3ea001] disabled:!border-b-gray-300 disabled:!bg-gray-200 disabled:!text-gray-500 disabled:!shadow-none"
          >
            {analyzeLoading ? (
              <Loader2 className="size-5 animate-spin text-white" aria-hidden />
            ) : null}
            AI 튜터에게 물어보기
          </Button>

          {analyzeLoading ? (
            <p className="flex items-center justify-center gap-2 font-sans text-sm font-medium text-emerald-600">
              <Loader2 className="size-4 shrink-0 animate-spin text-emerald-500" aria-hidden />
              AI가 시각 자료를 분석 중입니다…
            </p>
          ) : null}

          {analyzeResult ? (
            <div className="space-y-2 rounded-3xl border-2 border-gray-100 bg-[#FAFAFA] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-sans text-xs font-semibold uppercase tracking-wider text-[#4B4B4B]/45">
                  AI 답변
                </p>
                {analyzeMeta ? (
                  <span className="rounded-full border border-gray-100 bg-white px-2 py-0.5 font-mono text-[10px] text-[#4B4B4B]/60">
                    {analyzeMeta.provider} · {analyzeMeta.modelId}
                  </span>
                ) : null}
              </div>
              <div className="rounded-2xl border-2 border-gray-100 bg-white px-3 py-3 font-sans text-[#4B4B4B]">
                <TutorMarkdown>{analyzeResult}</TutorMarkdown>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <VisualLabZenPipeline />

      <VisualLabSemanticChainPanel />

      {/* 2. 고급 퀴즈 루프 */}
      <details className="group rounded-3xl border-2 border-gray-100 bg-white shadow-[0_4px_0_0_rgb(229_231_235)] open:shadow-[0_2px_0_0_rgb(229_231_235)]">
        <summary className="cursor-pointer list-none px-5 py-4 font-sans text-sm font-semibold text-[#4B4B4B] marker:content-none [&::-webkit-details-marker]:hidden">
          <span className="inline-flex items-center gap-2">
            <Brain className="size-4 text-cyan-600" aria-hidden />
            고급 · LangGraph 퀴즈 세션 (선택)
          </span>
          <span className="mt-1 block font-sans text-xs font-normal text-[#4B4B4B]/55">
            그라운딩 + 크리에이티브 + HITL 출제 루프 — 별도 파이프라인입니다.
          </span>
        </summary>
        <div className="border-t-2 border-gray-100 px-5 pb-5 pt-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-file`}>파일</Label>
              <input
                id={`${formId}-file`}
                type="file"
                accept="image/*,video/*"
                className="text-sm file:mr-2"
                onChange={(e) => setQuizFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${formId}-intent`}>크리에이티브 형식</Label>
              <select
                id={`${formId}-intent`}
                className="border-input bg-background h-9 w-full rounded-md border px-2 text-sm"
                value={intent}
                onChange={(e) =>
                  setIntent(e.target.value as "quiz" | "rap" | "video_script")
                }
              >
                <option value="quiz">인터랙티브 퀴즈 (JSON)</option>
                <option value="rap">리듬감 있는 랩 대본</option>
                <option value="video_script">숏폼 영상용 묘사</option>
              </select>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            <Label htmlFor={`${formId}-goal`}>추가 의도 (선택)</Label>
            <Textarea
              id={`${formId}-goal`}
              placeholder="예: 고등학생 대상, 시험 빈출만"
              className="min-h-[64px]"
              value={userGoal}
              onChange={(e) => setUserGoal(e.target.value)}
            />
          </div>
          {error ? (
            <p className="text-destructive mt-3 text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="mt-3 gap-2"
            disabled={!quizFile || loading}
            onClick={startSession}
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            세션 시작 (그라운딩 + 크리에이티브 + 1차 출제)
          </Button>

          {state ? (
            <Card className="mt-4 border-2 border-gray-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Brain className="size-4" />
                  상태 & CFO
                </CardTitle>
                <CardDescription>
                  누적 ${state.accumulatedCost.toFixed(4)} · 추정 ${state.estimatedCost.toFixed(4)} ·
                  토큰 {state.totalTokenUsage.toLocaleString()} · 진행 {state.problemsSolved}/
                  {state.maxProblems} 정답
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Progress
                  value={Math.min(
                    100,
                    (state.problemsSolved / Math.max(state.maxProblems, 1)) * 100,
                  )}
                  className="h-2"
                />
                {state.visualGrounding ? (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="font-medium">시각 그라운딩</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      객체 {state.visualGrounding.detectedObjects.length}개 · OCR 길이{" "}
                      {state.visualGrounding.ocrText.length}
                    </p>
                    <p className="mt-2 leading-relaxed">
                      {state.visualGrounding.contextualSummary}
                    </p>
                  </div>
                ) : null}
                <details className="rounded-lg border p-3">
                  <summary className="cursor-pointer font-medium">크리에이티브 JSON</summary>
                  <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap text-xs">
                    {state.creativeOutputJson.slice(0, 8000)}
                  </pre>
                </details>
                {state.tutorHint ? (
                  <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-amber-950 dark:text-amber-100">
                    <p className="font-medium">튜터 힌트 (L{state.hintLevel})</p>
                    <p className="mt-1">{state.tutorHint}</p>
                  </div>
                ) : null}
                {state.currentQuestion ? (
                  <div className="rounded-lg border p-3">
                    <p className="font-medium">현재 질문</p>
                    <p className="mt-2 leading-relaxed">{state.currentQuestion}</p>
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary>루브릭</summary>
                      <p className="mt-1 whitespace-pre-wrap">{state.answerRubric}</p>
                    </details>
                  </div>
                ) : null}
                {state.sessionComplete ? (
                  <p className="font-medium text-emerald-600 dark:text-emerald-400">
                    세션 완료 — 모든 문항을 마쳤습니다.
                  </p>
                ) : null}
                {awaitingAnswer && threadId && !state.sessionComplete ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${formId}-ans`}>응답</Label>
                    <Textarea
                      id={`${formId}-ans`}
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="min-h-[88px]"
                      placeholder="질문에 대한 답을 입력하세요."
                    />
                    <Button
                      type="button"
                      disabled={resumeLoading}
                      onClick={sendAnswer}
                      className="gap-2"
                    >
                      {resumeLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      제출 · 채점 · (오답 시) 크리에이티브 튜터
                    </Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </details>
      <GoldenPathCoach />
    </div>
  );
}
