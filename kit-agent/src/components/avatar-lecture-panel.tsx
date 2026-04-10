"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  UserRound,
  Mic,
  Video,
  Maximize2,
  Download,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PrivacySecurityTerminal,
  type PrivacyTerminalPhase,
} from "@/components/privacy-security-terminal";
import { pickVideoSynthesisEngagementLine } from "@/lib/avatar/video-synthesis-engagement";
import {
  SECURITY_AUDIT_RECEIPT_STORAGE_KEY,
  type DeletionReceipt,
} from "@/lib/security/deletion-receipt";

type StylePreset = "3d_animation" | "cel_anime" | "flat_vector";

type AvatarSynthesisStatusPayload = {
  masterAvatarReplicateReady: boolean;
  wav2lipReplicateReady: boolean;
  unavailableMessage: string;
};

export function AvatarLecturePanel() {
  const formId = useId();
  const videoRef = useRef<HTMLVideoElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [stylePreset, setStylePreset] = useState<StylePreset>("3d_animation");
  const [masterUrl, setMasterUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [topic, setTopic] = useState("무영총 · 무령왕릉 금제 관식");
  const [faceLoading, setFaceLoading] = useState(false);
  const [audioUpLoading, setAudioUpLoading] = useState(false);
  const [planLoading, setPlanLoading] = useState(false);
  const [renderLoading, setRenderLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [hitlOpen, setHitlOpen] = useState(false);
  const [planMeta, setPlanMeta] = useState<{
    durationSec: number;
    estimatedLipSyncUsd: number;
    hitlRequired: boolean;
    cfoMessage: string;
    privacyGateRequired?: boolean;
  } | null>(null);
  const [privacyAckSent, setPrivacyAckSent] = useState(false);
  const [sourcePhotoMeta, setSourcePhotoMeta] = useState<{
    filename: string;
    sizeBytes: number;
    mimeType: string;
    lastModifiedMs: number;
  } | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [masterSynthMsg, setMasterSynthMsg] = useState<string | null>(null);
  const [renderSynthMsg, setRenderSynthMsg] = useState<string | null>(null);
  const [replicateStatus, setReplicateStatus] =
    useState<AvatarSynthesisStatusPayload | null>(null);
  const [privacyEpoch, setPrivacyEpoch] = useState(0);
  const [synthesisTrace, setSynthesisTrace] = useState<string[]>([]);
  const [fallbackGuide, setFallbackGuide] = useState<string | null>(null);
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [studyGuideMarkdown, setStudyGuideMarkdown] = useState("");

  const privacyPhase: PrivacyTerminalPhase = (() => {
    if (finalVideoUrl) return "complete";
    if (renderLoading) return "processing";
    return "idle";
  })();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/avatar/synthesis-status");
        const data = (await res.json()) as Partial<AvatarSynthesisStatusPayload>;
        if (
          !cancelled &&
          typeof data.masterAvatarReplicateReady === "boolean" &&
          typeof data.wav2lipReplicateReady === "boolean" &&
          typeof data.unavailableMessage === "string"
        ) {
          setReplicateStatus(data as AvatarSynthesisStatusPayload);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const active = faceLoading || planLoading || renderLoading;
    if (!active) return;
    let tick = 0;
    setSynthesisTrace([pickVideoSynthesisEngagementLine(0)]);
    const id = window.setInterval(() => {
      tick += 1;
      setSynthesisTrace((prev) =>
        [...prev, pickVideoSynthesisEngagementLine(tick)].slice(-24),
      );
    }, 1600);
    return () => window.clearInterval(id);
  }, [faceLoading, planLoading, renderLoading]);

  const uploadFace = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      setError(null);
      setFaceLoading(true);
      setSynthesisTrace([]);
      setMasterUrl(null);
      setMasterSynthMsg(null);
      try {
        const fd = new FormData();
        fd.set("file", f);
        fd.set("stylePreset", stylePreset);
        const res = await fetch("/api/avatar/master", { method: "POST", body: fd });
        const data = (await res.json()) as {
          error?: string;
          url?: string;
          userMessage?: string;
          replicateSynthesisUsed?: boolean;
        };
        if (!res.ok) throw new Error(data.error || "업로드 실패");
        if (!data.url) throw new Error("URL 없음");
        setMasterUrl(data.url);
        setMasterSynthMsg(data.userMessage?.trim() || null);
        setSourcePhotoMeta({
          filename: f.name,
          sizeBytes: f.size,
          mimeType: f.type || "application/octet-stream",
          lastModifiedMs: f.lastModified || 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "오류");
      } finally {
        setFaceLoading(false);
      }
    },
    [stylePreset],
  );

  const runRender = useCallback(
    async (jid: string, approved: boolean) => {
    if (planMeta?.privacyGateRequired && !privacyAckSent) {
      setError(
        "Security Guardian: KIT Privacy Protocol — 기기에서 원본 얼굴 사진을 삭제했다는 확인을 먼저 제출하세요.",
      );
      return;
    }
    setRenderLoading(true);
    setPrivacyEpoch((e) => e + 1);
    setError(null);
    setRenderSynthMsg(null);
    setFallbackGuide(null);
    setFallbackReason(null);
    try {
      const res = await fetch("/api/avatar/lecture/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jid, approved }),
      });
      const data = (await res.json()) as {
        error?: string;
        finalVideoUrl?: string;
        status?: string;
        avatarSynthesisUserMessage?: string;
        studyGuideMarkdown?: string;
        fallbackReason?: string;
      };
      if (data.status === "study_guide_fallback") {
        setFallbackGuide((data.studyGuideMarkdown ?? "").trim() || "(가이드 비어 있음)");
        setFallbackReason(data.fallbackReason ?? null);
        setFinalVideoUrl(null);
        return;
      }
      if (!res.ok) throw new Error(data.error || "렌더 실패");
      if (data.status === "cancelled") {
        setFinalVideoUrl(null);
        return;
      }
      if (data.finalVideoUrl) {
        setFinalVideoUrl(data.finalVideoUrl);
        setFallbackGuide(null);
        setFallbackReason(null);
      }
      if (data.avatarSynthesisUserMessage?.trim()) {
        setRenderSynthMsg(data.avatarSynthesisUserMessage.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setRenderLoading(false);
      setHitlOpen(false);
    }
  },
    [planMeta?.privacyGateRequired, privacyAckSent],
  );

  const uploadNarration = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setError(null);
    setAudioUpLoading(true);
    try {
      const fd = new FormData();
      fd.set("file", f);
      const res = await fetch("/api/avatar/narration", { method: "POST", body: fd });
      const data = (await res.json()) as { error?: string; audioUrl?: string };
      if (!res.ok) throw new Error(data.error || "오디오 실패");
      if (!data.audioUrl) throw new Error("URL 없음");
      setAudioUrl(data.audioUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setAudioUpLoading(false);
    }
  }, []);

  const runPlan = useCallback(async () => {
    if (!masterUrl || !audioUrl.trim()) {
      setError("마스터 아바타와 오디오 URL이 필요합니다.");
      return;
    }
    setError(null);
    setPlanLoading(true);
    setSynthesisTrace([]);
    setJobId(null);
    setPlanMeta(null);
    setFinalVideoUrl(null);
    setPrivacyAckSent(false);
    setFallbackGuide(null);
    setFallbackReason(null);
    try {
      const res = await fetch("/api/avatar/lecture/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          masterAvatarUrl: masterUrl,
          audioUrl: audioUrl.trim(),
          topicContext: topic,
          ...(studyGuideMarkdown.trim()
            ? { studyGuideMarkdown: studyGuideMarkdown.trim() }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        jobId?: string;
        durationSec?: number;
        estimatedLipSyncUsd?: number;
        hitlRequired?: boolean;
        cfoMessage?: string;
        privacyGateRequired?: boolean;
      };
      if (!res.ok) throw new Error(data.error || "계획 실패");
      if (!data.jobId) throw new Error("jobId 없음");
      setJobId(data.jobId);
      setPlanMeta({
        durationSec: data.durationSec ?? 0,
        estimatedLipSyncUsd: data.estimatedLipSyncUsd ?? 0,
        hitlRequired: Boolean(data.hitlRequired),
        cfoMessage: data.cfoMessage ?? "",
        privacyGateRequired: Boolean(data.privacyGateRequired),
      });
      if (data.hitlRequired) setHitlOpen(true);
      else if (data.privacyGateRequired) {
        /* Security_Guardian: /api/avatar/lecture/privacy-ack 후 렌더 */
      } else await runRender(data.jobId, true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    } finally {
      setPlanLoading(false);
    }
  }, [masterUrl, audioUrl, topic, runRender, studyGuideMarkdown]);

  const submitPrivacyAck = useCallback(async () => {
    if (!jobId) return;
    setError(null);
    try {
      const res = await fetch("/api/avatar/lecture/privacy-ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          ...(sourcePhotoMeta
            ? {
                deletedFileMetadata: {
                  ...sourcePhotoMeta,
                  source: "avatar-lecture-upload",
                },
              }
            : {}),
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        ok?: boolean;
        deletion_receipt?: DeletionReceipt | null;
      };
      if (!res.ok) throw new Error(data.error || "확인 실패");
      setPrivacyAckSent(true);
      if (data.deletion_receipt) {
        window.localStorage.setItem(
          SECURITY_AUDIT_RECEIPT_STORAGE_KEY,
          JSON.stringify(data.deletion_receipt),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류");
    }
  }, [jobId, sourcePhotoMeta]);

  const toggleFullscreen = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen();
  }, []);

  const replay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    void v.play();
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-8">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI Avatar Lecture</h1>
          <p className="text-muted-foreground text-sm">
            얼굴 → 마스터 아바타 →(립싱크 추정 CFO·HITL)→ 주제별 배경 합성 MP4. Replicate
            (IP-Adapter·Wav2Lip)는 선택, 미설정 시 Sharp+ffmpeg 폴백.
          </p>
        </div>
        <Link
          href="/"
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          ← 대시보드
        </Link>
      </div>

      {replicateStatus &&
      (!replicateStatus.masterAvatarReplicateReady ||
        !replicateStatus.wav2lipReplicateReady) ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-50">
          <p className="font-medium">{replicateStatus.unavailableMessage}</p>
          <p className="text-muted-foreground mt-2 text-xs leading-relaxed">
            Replicate 마스터: {replicateStatus.masterAvatarReplicateReady ? "구성됨" : "미구성"} ·
            립싱크: {replicateStatus.wav2lipReplicateReady ? "구성됨" : "미구성"}. 로컬
            Sharp/ffmpeg로 미리보기는 가능하며, 강의 텍스트 요약 등 다른 기능은 그대로 사용할 수
            있습니다.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserRound className="size-4" />
            Phase 1 — 마스터 아바타
          </CardTitle>
          <CardDescription>
            스타일 프리셋 + 얼굴 사진. Replicate 버전 해시를 넣으면 IP-Adapter 계열로 치환을
            시도합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-style`}>스타일</Label>
            <select
              id={`${formId}-style`}
              className="border-input bg-background h-9 rounded-md border px-2 text-sm"
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value as StylePreset)}
            >
              <option value="3d_animation">3D 애니메이션</option>
              <option value="cel_anime">셀 애니 (90s 느낌)</option>
              <option value="flat_vector">플랫 벡터</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-face`}>얼굴 이미지</Label>
            <Input
              id={`${formId}-face`}
              type="file"
              accept="image/*"
              className="max-w-xs cursor-pointer text-sm"
              onChange={uploadFace}
            />
          </div>
          {faceLoading ? <Loader2 className="size-5 animate-spin" /> : null}
          {masterUrl ? (
            <div className="flex items-center gap-3">
              <img
                src={masterUrl}
                alt="Master avatar"
                className="size-20 rounded-lg border object-cover"
              />
              <span className="text-muted-foreground font-mono text-xs">{masterUrl}</span>
            </div>
          ) : null}
          {masterSynthMsg ? (
            <p
              className="w-full rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-950 text-xs dark:text-amber-100"
              role="status"
            >
              {masterSynthMsg}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Mic className="size-4" />
            나레이션 오디오
          </CardTitle>
          <CardDescription>
            Media Studio의 <code className="text-xs">lesson_combined.mp3</code> 경로를 붙여
            넣거나, 파일을 업로드하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`${formId}-audio-url`}>오디오 URL (public)</Label>
            <Input
              id={`${formId}-audio-url`}
              placeholder="/media-output/.../lesson_combined.mp3"
              value={audioUrl}
              onChange={(e) => setAudioUrl(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-aud-up`}>또는 파일 업로드</Label>
            <Input
              id={`${formId}-aud-up`}
              type="file"
              accept="audio/*"
              className="max-w-xs cursor-pointer text-sm"
              onChange={uploadNarration}
            />
            {audioUpLoading ? <Loader2 className="size-4 animate-spin" /> : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-topic`}>주제 (배경 자동 선택)</Label>
            <Textarea
              id={`${formId}-topic`}
              className="min-h-[72px] text-sm"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-study-md`}>
              정적 학습 가이드 (선택, 마크다운) — 비디오 API 실패 시 폴백
            </Label>
            <Textarea
              id={`${formId}-study-md`}
              className="min-h-[100px] font-mono text-xs"
              placeholder="대시보드에서 복사한 study_note 또는 증류 요약을 붙여넣으면 Replicate 실패·타임아웃 시 여기서 반환됩니다."
              value={studyGuideMarkdown}
              onChange={(e) => setStudyGuideMarkdown(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {synthesisTrace.length > 0 || faceLoading || planLoading || renderLoading ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Video_Synthesis_Orchestrator — Agent Trace</CardTitle>
            <CardDescription className="text-xs">
              합성 파이프라인 진행 중 실시간 톤 메시지(Engagement Layer).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="max-h-48 space-y-1.5 overflow-y-auto text-sm">
              {synthesisTrace.map((line, i) => (
                <li
                  key={`${i}-${line.slice(0, 32)}`}
                  className="rounded border border-border/60 bg-muted/30 px-2 py-1.5 font-medium leading-snug"
                >
                  {line}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Video className="size-4" />
            Phase 2–3 — CFO · 립싱크 · 합성
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            disabled={planLoading || renderLoading || !masterUrl || !audioUrl.trim()}
            onClick={runPlan}
            className="gap-2"
          >
            {planLoading || renderLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            계획 + (한도 이하 시) 즉시 렌더
          </Button>
          {planMeta ? (
            <div className="rounded-lg border bg-muted/20 p-3 text-sm">
              <p>{planMeta.cfoMessage}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                길이 약 {planMeta.durationSec.toFixed(1)}초 · 추정 GPU 비용 약 $
                {planMeta.estimatedLipSyncUsd.toFixed(2)}
              </p>
              {jobId ? (
                <p className="mt-1 font-mono text-xs text-muted-foreground">job: {jobId}</p>
              ) : null}
            </div>
          ) : null}

          {planMeta?.privacyGateRequired && jobId ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/35 bg-emerald-500/5 p-3 text-sm">
              <p className="font-medium text-emerald-900 dark:text-emerald-100">
                Security Guardian — KIT Privacy Protocol
              </p>
              <p className="text-muted-foreground text-xs leading-relaxed">
                Video_Generator 최종 MP4를 반환하기 전에, 업로드한 **원본 얼굴 사진을 사용자 기기에서
                삭제**했음을 확인해야 합니다. (`KIT_SECURITY_GATE_STRICT=1`)
              </p>
              {privacyAckSent ? (
                <p className="text-emerald-700 text-xs font-medium dark:text-emerald-300">
                  확인 제출됨 (security_check: PASSED). 아래에서 렌더를 진행하세요.
                </p>
              ) : (
                <Button type="button" size="sm" variant="secondary" onClick={submitPrivacyAck}>
                  삭제 확인 제출 (privacy-ack)
                </Button>
              )}
              {!planMeta.hitlRequired && privacyAckSent ? (
                <Button
                  type="button"
                  className="gap-2"
                  disabled={renderLoading}
                  onClick={() => jobId && runRender(jobId, true)}
                >
                  {renderLoading ? <Loader2 className="size-4 animate-spin" /> : null}
                  GPU 렌더 시작
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {finalVideoUrl || renderLoading ? (
        <PrivacySecurityTerminal
          key={privacyEpoch}
          phase={privacyPhase}
          finaleOnly
          title="Privacy & Security Terminal"
        />
      ) : null}

      {fallbackGuide ? (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">고품질 정적 학습 가이드 (비디오 대체)</CardTitle>
            <CardDescription className="text-xs">
              {fallbackReason ?? "비디오 합성 대신 제공되는 콘텐츠입니다."}
            </CardDescription>
          </CardHeader>
          <CardContent
            className="max-w-none space-y-3 text-sm leading-relaxed [&_h2]:pt-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:pt-2 [&_h3]:text-base [&_h3]:font-medium [&_li]:my-0.5 [&_p]:leading-relaxed [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
          >
            <ReactMarkdown>{fallbackGuide}</ReactMarkdown>
          </CardContent>
        </Card>
      ) : null}

      {finalVideoUrl ? (
        <div ref={wrapRef}>
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-base">AI Avatar Lecture 플레이어</CardTitle>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={toggleFullscreen}>
                  <Maximize2 className="size-3.5" />
                  전체 화면
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={replay}>
                  <RotateCcw className="size-3.5" />
                  처음부터
                </Button>
                <a
                  href={finalVideoUrl}
                  download
                  className={cn(buttonVariants({ variant: "default", size: "sm" }), "gap-1")}
                >
                  <Download className="size-3.5" />
                  MP4 저장
                </a>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {renderSynthMsg ? (
                <p
                  className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-amber-950 text-xs dark:text-amber-100"
                  role="status"
                >
                  {renderSynthMsg}
                </p>
              ) : null}
              <video
                ref={videoRef}
                className="aspect-video w-full rounded-lg border bg-black"
                controls
                playsInline
                src={finalVideoUrl}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Dialog open={hitlOpen} onOpenChange={setHitlOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>CFO — 고비용 립싱크 승인</DialogTitle>
            <DialogDescription>
              1분 분량 기준 약 $2를 넘는 추정이면 승인이 필요합니다. 계속하면 GPU 추정 비용이
              청구될 수 있습니다.
            </DialogDescription>
          </DialogHeader>
          {planMeta ? (
            <p className="text-sm">
              추정: <strong>${planMeta.estimatedLipSyncUsd.toFixed(2)}</strong>
            </p>
          ) : null}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={renderLoading || !jobId}
              onClick={() => jobId && runRender(jobId, false)}
            >
              취소
            </Button>
            <Button
              type="button"
              disabled={renderLoading || !jobId}
              onClick={() => jobId && runRender(jobId, true)}
            >
              {renderLoading ? <Loader2 className="size-4 animate-spin" /> : null}
              승인 후 렌더
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
