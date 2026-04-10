"use client";

import { useCallback, useId, useState } from "react";
import Link from "next/link";
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
import { Loader2, Clapperboard, DollarSign, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type PersonaId = "shin-chan" | "neutral-educator";

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

export function MediaStudioPanel() {
  const formId = useId();
  const [masterContext, setMasterContext] = useState("");
  const [personaId, setPersonaId] = useState<PersonaId>("shin-chan");
  const [extra, setExtra] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PipelineResponse | null>(null);
  const [hitlOpen, setHitlOpen] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);

  const runPipeline = useCallback(async () => {
    setError(null);
    setLoading(true);
    setResult(null);
    setHitlOpen(false);
    try {
      const res = await fetch("/api/media/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterContext,
          personaId,
          extraInstruction: extra.trim() || undefined,
        }),
      });
      const data = (await res.json()) as PipelineResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "파이프라인 실패");
      setResult(data);
      if (data.hitlRequired) setHitlOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [masterContext, personaId, extra]);

  const approveRender = useCallback(
    async (approved: boolean) => {
      if (!result?.jobId) return;
      setResumeLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/media/render", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: result.jobId, approved }),
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
    [result?.jobId],
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Media Studio</h1>
          <p className="text-muted-foreground text-sm">
            Knowledge Master Context → 페르소나 대본(JSON) → Veo/Sora급 T2V 프롬프트 → TTS +
            (ffmpeg 시) 플레이스홀더 MP4. CFO 추정 비용 초과 시 HITL.
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 대시보드
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clapperboard className="size-4" />
            입력
          </CardTitle>
          <CardDescription>
            `buildMasterContext`로 만든 문자열을 붙여 넣거나, 강의 노트·증류 텍스트를 그대로
            사용하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor={`${formId}-ctx`}>Knowledge Master Context</Label>
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
                value={personaId}
                onChange={(e) => setPersonaId(e.target.value as PersonaId)}
              >
                <option value="shin-chan">짱구풍 (헤에~ / 미스터~ 티)</option>
                <option value="neutral-educator">중립 교육자</option>
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
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={loading || !masterContext.trim()}
            onClick={runPipeline}
            className="gap-2"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : null}
            Phase 1–2 실행 (+ CFO 판단)
          </Button>
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
                <video
                  className="w-full max-w-xl rounded-lg border"
                  controls
                  src={result.render.mp4Url}
                />
              </div>
            ) : null}
            {result.render?.combinedAudioUrl && !result.render.mp4Url ? (
              <div className="space-y-2">
                <p className="font-medium">합성 오디오 (ffmpeg 없음 또는 MP4 실패)</p>
                <audio controls className="w-full" src={result.render.combinedAudioUrl} />
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>CFO — 렌더 승인 (HITL)</DialogTitle>
            <DialogDescription>
              추정 렌더 비용이 한도를 넘었거나 세션 예산을 초과할 수 있습니다. TTS·비디오 API를
              실행하려면 승인하세요.
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
              disabled={resumeLoading}
              onClick={() => approveRender(true)}
            >
              {resumeLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              승인 후 TTS·렌더
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
