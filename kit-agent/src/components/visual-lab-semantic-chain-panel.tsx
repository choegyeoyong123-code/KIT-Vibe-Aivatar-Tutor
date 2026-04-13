"use client";

import { useCallback, useEffect, useId, useState } from "react";
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
import { cn } from "@/lib/utils";
import { AnalyzePayloadError, assertAllowedImageFile } from "@/lib/client/multimodal-analyze-payload";
import { EDUCATIONAL_PERSONAS, getEducationalPersonaById } from "@/constants/personas";
import type { EducationalPersonaId } from "@/constants/personas";
import type { Chain4UiBundle } from "@/lib/visual-lab/semantic-chain-schema";
import type { BehavioralLogicGraph, EducationalGapSynthesis } from "@/lib/visual-lab/semantic-chain-schema";
import { TutorMarkdown } from "@/components/tutor-markdown";
import { Loader2, Link2, Sparkles, UploadCloud } from "lucide-react";

type FullChainResponse = {
  ok: true;
  chain1_markdown: string;
  chain2_graph: BehavioralLogicGraph;
  chain3_synthesis: EducationalGapSynthesis;
  chain4_bundle: Chain4UiBundle;
  demo: boolean;
  models: { chain1: string; chain2: string; chain3: string; chain4: string };
};

export function VisualLabSemanticChainPanel() {
  const formId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [personaId, setPersonaId] = useState<EducationalPersonaId>("metaphor_mage");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FullChainResponse | null>(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    setPreview(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);

  const applyFile = useCallback((f: File | null) => {
    if (!f) {
      setFile(null);
      setError(null);
      return;
    }
    try {
      assertAllowedImageFile(f);
      setFile(f);
      setError(null);
      setResult(null);
    } catch (e) {
      setFile(null);
      setError(e instanceof AnalyzePayloadError ? e.message : "파일 오류");
    }
  }, []);

  const runChain = useCallback(async () => {
    if (!file) {
      setError("이미지를 선택해 주세요.");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", "all");
      fd.set("current_persona", personaId);
      const res = await fetch("/api/visual/semantic-chain", { method: "POST", body: fd });
      const data = (await res.json()) as FullChainResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || "체인 실행 실패");
      if (!data.ok || !data.chain4_bundle) throw new Error("응답 형식 오류");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류");
    } finally {
      setLoading(false);
    }
  }, [file, personaId]);

  const persona = getEducationalPersonaById(personaId);

  return (
    <Card className="rounded-3xl border-2 border-violet-100 bg-gradient-to-b from-white to-violet-50/40 shadow-[0_4px_0_0_rgb(237_233_254)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-sans text-base text-[#4B4B4B]">
          <Link2 className="size-4 text-violet-600" aria-hidden />
          시맨틱 체인 · Vision → Logic Graph → Zen Gaps → UI
        </CardTitle>
        <CardDescription className="font-sans text-sm text-[#4B4B4B]/70">
          Chain 1은 **추출 전용** 마크다운, Chain 2는 흐름·상태 JSON, Chain 3은 소크라테스식 공백 3개,
          Chain 4는 페르소나 톤의 **React+Framer 코드 문자열**과 **Listen with My Voice** 스크립트
          플레이스홀더를 생성합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="text-xs">현재 페르소나 (Chain 4 스타일)</Label>
            <select
              className="h-10 w-full rounded-xl border-2 border-gray-100 bg-white px-2 text-sm"
              value={personaId}
              onChange={(e) => setPersonaId(e.target.value as EducationalPersonaId)}
            >
              {EDUCATIONAL_PERSONAS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.emoji} {p.name}
                </option>
              ))}
            </select>
          </div>
          <div
            className={cn(
              "flex min-h-[88px] cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-violet-200 bg-white/80 px-2 py-3 text-center",
            )}
            role="button"
            tabIndex={0}
            onClick={() => document.getElementById(`${formId}-sc-file`)?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                document.getElementById(`${formId}-sc-file`)?.click();
              }
            }}
          >
            <input
              id={`${formId}-sc-file`}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="sr-only"
              onChange={(e) => applyFile(e.target.files?.[0] ?? null)}
            />
            <UploadCloud className="size-6 text-violet-500" />
            <span className="text-xs font-semibold text-[#4B4B4B]">기술 이미지</span>
          </div>
        </div>

        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="시맨틱 체인 입력"
            className="max-h-48 w-full rounded-xl border object-contain"
          />
        ) : null}

        {error ? (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="chunky"
          disabled={loading || !file}
          onClick={() => void runChain()}
          className="h-11 w-full rounded-2xl gap-2"
        >
          {loading ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-4" />}
          4-Chain 실행 (all)
        </Button>

        {result ? (
          <div className="space-y-4">
            <p className="text-xs text-[#4B4B4B]/60">
              모델: {result.models.chain1} / {result.models.chain2} / {result.models.chain3} /{" "}
              {result.models.chain4}
              {result.demo ? " · 일부 데모 경로" : ""}
            </p>

            <section className="rounded-2xl border-2 border-gray-100 bg-white p-4">
              <h3 className="font-sans text-sm font-bold text-violet-800">Chain 1 — 시각 추출</h3>
              <div className="mt-2 max-h-80 overflow-auto rounded-xl border bg-[#FAFAFA] p-3 text-sm">
                <TutorMarkdown>{result.chain1_markdown}</TutorMarkdown>
              </div>
            </section>

            <section className="rounded-2xl border-2 border-gray-100 bg-white p-4">
              <h3 className="font-sans text-sm font-bold text-violet-800">Chain 2 — Behavioral Logic Graph</h3>
              <pre className="mt-2 max-h-56 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-emerald-100/95">
                {JSON.stringify(result.chain2_graph, null, 2)}
              </pre>
            </section>

            <section className="rounded-2xl border-2 border-gray-100 bg-white p-4">
              <h3 className="font-sans text-sm font-bold text-violet-800">Chain 3 — 교육 공백 (3)</h3>
              <ul className="mt-2 space-y-3">
                {result.chain3_synthesis.gaps.map((g, i) => (
                  <li
                    key={i}
                    className="rounded-xl border border-violet-100 bg-violet-50/40 p-3 text-sm leading-relaxed text-[#4B4B4B]"
                  >
                    <p className="font-bold text-violet-900">목표 {i + 1}</p>
                    <p>{g.learning_objective}</p>
                    <p className="mt-2 font-semibold text-slate-700">오개념</p>
                    <p>{g.common_misconception}</p>
                    <p className="mt-2 font-semibold text-slate-700">소크라테스 질문</p>
                    <p>{g.socratic_question}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-2xl border-2 border-gray-100 bg-white p-4">
              <h3 className="font-sans text-sm font-bold text-violet-800">
                Chain 4 — Listen with My Voice 스크립트 플레이스홀더
              </h3>
              <pre className="mt-2 whitespace-pre-wrap rounded-xl border bg-amber-50/80 p-3 text-sm text-amber-950">
                {result.chain4_bundle.listen_with_my_voice_script_placeholder}
              </pre>
            </section>

            <section className="rounded-2xl border-2 border-gray-100 bg-white p-4">
              <h3 className="font-sans text-sm font-bold text-violet-800">
                Chain 4 — 생성된 React (복사 전용, eval 금지)
              </h3>
              <pre className="mt-2 max-h-72 overflow-auto rounded-xl bg-slate-900 p-3 font-mono text-[11px] text-slate-100">
                {result.chain4_bundle.component_tsx}
              </pre>
              <button
                type="button"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-2 rounded-xl",
                )}
                onClick={() => void navigator.clipboard.writeText(result.chain4_bundle.component_tsx)}
              >
                TSX 복사
              </button>
            </section>

            <SemanticChainPreviewDeck
              bundle={result.chain4_bundle}
              personaLabel={`${persona?.emoji ?? ""} ${persona?.name ?? ""}`.trim()}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SemanticChainPreviewDeck({
  bundle,
  personaLabel,
}: {
  bundle: Chain4UiBundle;
  personaLabel: string;
}) {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [shake, setShake] = useState(0);
  const [graded, setGraded] = useState(false);
  const item = bundle.preview_items[idx];

  useEffect(() => {
    setChoice(null);
    setGraded(false);
  }, [idx, item?.id]);

  if (!item) return null;

  const correct = graded && choice === item.correct_index;
  const wrong = graded && choice !== null && choice !== item.correct_index;

  const grade = () => {
    if (choice === null) return;
    setGraded(true);
    if (choice !== item.correct_index) setShake((s) => s + 1);
  };

  return (
    <section className="rounded-2xl border-2 border-emerald-100 bg-white p-4">
      <h3 className="font-sans text-sm font-bold text-emerald-800">
        인터랙티브 미리보기 · {personaLabel}
      </h3>
      <AnimatePresence mode="wait">
        <motion.div
          key={`${item.id}-${shake}`}
          initial={{ opacity: 0, y: 6 }}
          animate={
            wrong
              ? { x: [0, -8, 8, -5, 5, 0], opacity: 1, y: 0 }
              : correct
                ? {
                    boxShadow: [
                      "0 0 0 0 rgba(16,185,129,0)",
                      "0 0 0 10px rgba(16,185,129,0.2)",
                      "0 0 0 0 rgba(16,185,129,0)",
                    ],
                    opacity: 1,
                    y: 0,
                  }
                : { opacity: 1, y: 0 }
          }
          transition={{ duration: wrong ? 0.42 : 0.55 }}
          className={cn(
            "mt-3 rounded-2xl border-2 p-4",
            correct ? "border-emerald-400 bg-emerald-50/50" : "border-gray-100",
          )}
        >
          <p className="text-sm font-semibold text-[#4B4B4B]">{item.stem}</p>
          <div className="mt-3 flex flex-col gap-2">
            {item.choices.map((c, i) => (
              <motion.button
                key={c}
                type="button"
                whileTap={{ y: 2, scale: 0.99 }}
                disabled={graded}
                onClick={() => setChoice(i)}
                className={cn(
                  "rounded-xl border-2 px-3 py-2 text-left text-sm font-medium transition-colors",
                  choice === i ? "border-emerald-500 bg-white" : "border-gray-100 bg-[#FAFAFA]",
                )}
              >
                {c}
              </motion.button>
            ))}
          </div>
          <Button type="button" className="mt-3 rounded-xl" disabled={graded || choice === null} onClick={grade}>
            채점
          </Button>
          {graded ? (
            <p className="mt-3 text-sm leading-relaxed text-[#4B4B4B]">
              {correct ? item.persona_feedback_correct : item.persona_feedback_wrong}
            </p>
          ) : null}
        </motion.div>
      </AnimatePresence>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={idx <= 0}
          onClick={() => setIdx((i) => i - 1)}
        >
          이전
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-xl"
          disabled={idx >= bundle.preview_items.length - 1}
          onClick={() => setIdx((i) => i + 1)}
        >
          다음
        </Button>
      </div>
    </section>
  );
}
