"use client";

import { useCallback, useId, useState } from "react";
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
import { Loader2, ImageIcon, Sparkles, Brain } from "lucide-react";
import type { VisualProblemSessionSnapshot } from "@/lib/visual-lab/session-snapshot";
import Link from "next/link";

export function VisualLabPanel() {
  const formId = useId();
  const [file, setFile] = useState<File | null>(null);
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
    if (!file) return;
    setError(null);
    setLoading(true);
    setState(null);
    setThreadId(null);
    setAnswer("");
    setAwaitingAnswer(false);
    try {
      const fd = new FormData();
      fd.set("file", file);
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
  }, [file, intent, userGoal]);

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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Visual Lab — 멀티모달 & 문제 루프
          </h1>
          <p className="text-muted-foreground text-sm">
            Gemini Flash 시각 그라운딩 → Claude 크리에이티브 → LangGraph HITL형 응답 루프 (CFO
            비용 로그 포함).
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 학습 대시보드
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ImageIcon className="size-4" />
            1. 이미지 또는 짧은 영상
          </CardTitle>
          <CardDescription>
            <code className="text-xs">/api/vision/analyze</code>와 동일한 파이프라인으로{" "}
            <code className="text-xs">detectedObjects · ocrText · contextualSummary</code>를
            추출합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${formId}-file`}>파일</Label>
              <input
                id={`${formId}-file`}
                type="file"
                accept="image/*,video/*"
                className="text-sm file:mr-2"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
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
          <div className="space-y-2">
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
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={!file || loading}
            onClick={startSession}
            className="gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            세션 시작 (그라운딩 + 크리에이티브 + 1차 출제)
          </Button>
        </CardContent>
      </Card>

      {state ? (
        <Card>
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
  );
}
