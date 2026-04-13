"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, X, ChevronRight, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const GOLDEN_QUERY = "golden";

type Step = {
  id: string;
  title: string;
  body: string;
  target?: string;
  href?: string;
};

const STEPS: Step[] = [
  {
    id: "diagram",
    title: "1) 시스템 다이어그램",
    body: "대시보드 상단 Visual Lab을 눌러 스튜디오를 연 뒤, 구조도 이미지를 드롭합니다. (또는 /visual-lab Zen 카드에서 직접 업로드)",
    target: "zen-visual-lab",
  },
  {
    id: "persona",
    title: "2) 팬케이크 마법사",
    body: "왼쪽 튜터 목록에서 비유의 마술사(팬케이크) metaphor_mage 를 선택합니다.",
    target: "pancake-wizard",
  },
  {
    id: "voice",
    title: "3) 약 10초 목소리",
    body: "대시보드에서는 Media Studio 버튼으로 스튜디오를 연 뒤 녹음하거나, Media Studio 페이지로 이동해 내 목소리 학습을 완료합니다.",
    href: "/media-studio",
    target: "zen-media-studio",
  },
  {
    id: "audio",
    title: "4) 오디오 퀴즈",
    body: "Visual Lab 페이지 하단 Zen 파이프라인에서 퀴즈를 풀고 고음질 오디오를 재생합니다.",
    href: "/visual-lab",
    target: "zen-audio-player",
  },
];

function useGoldenEvents(mark: (id: string) => void) {
  useEffect(() => {
    const m: [string, string][] = [
      ["golden-studio-visual-tab", "diagram"],
      ["golden-diagram-uploaded", "diagram"],
      ["golden-persona-pancake", "persona"],
      ["golden-voice-sample-ready", "voice"],
      ["golden-audio-played", "audio"],
    ];
    const fns = m.map(([ev, id]) => {
      const fn = () => mark(id);
      window.addEventListener(ev, fn);
      return [ev, fn] as const;
    });
    return () => {
      for (const [ev, fn] of fns) window.removeEventListener(ev, fn);
    };
  }, [mark]);
}

function GoldenPathCoachInner() {
  const sp = useSearchParams();
  const pathname = usePathname();
  const active = sp.get(GOLDEN_QUERY) === "1";
  const [open, setOpen] = useState(true);
  const [idx, setIdx] = useState(0);
  const [autoDone, setAutoDone] = useState<Record<string, boolean>>({});

  const markDone = useCallback((id: string) => {
    setAutoDone((d) => ({ ...d, [id]: true }));
  }, []);

  useGoldenEvents(markDone);

  const step = STEPS[Math.min(idx, STEPS.length - 1)];

  useEffect(() => {
    if (!active || !open) return;
    document.querySelectorAll("[data-golden-ring]").forEach((n) => n.removeAttribute("data-golden-ring"));
    let targetKey = step.target;
    if (step.target === "zen-visual-lab" && pathname?.startsWith("/visual-lab")) {
      targetKey = "zen-pipeline-upload";
    }
    if (step.id === "voice") {
      targetKey = pathname?.startsWith("/media-studio")
        ? "btn-train-voice"
        : "zen-media-studio";
    }
    if (step.id === "audio" && !pathname?.startsWith("/visual-lab")) {
      targetKey = undefined;
    }
    const el = targetKey ? document.querySelector(`[data-golden-target="${targetKey}"]`) : null;
    if (el instanceof HTMLElement) el.setAttribute("data-golden-ring", "1");
    return () => {
      el?.removeAttribute("data-golden-ring");
    };
  }, [active, open, idx, pathname, step.target]);

  if (!active) return null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 16, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 28 }}
          className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-[200] w-[min(100vw-1.5rem,420px)] -translate-x-1/2"
        >
          <div
            className={cn(
              "rounded-3xl border-2 border-amber-200/90 bg-gradient-to-br from-amber-50/98 via-white to-emerald-50/90",
              "p-4 shadow-[0_12px_40px_rgba(15,23,42,0.12),0_4px_0_0_rgb(254_243_199)]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 text-amber-900">
                <Sparkles className="size-5 shrink-0" aria-hidden />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-amber-800/90">
                    Golden Path · 심사 시연
                  </p>
                  <p className="font-headline text-sm font-bold text-slate-900">{step.title}</p>
                </div>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 rounded-full"
                onClick={() => setOpen(false)}
                aria-label="코치 닫기"
              >
                <X className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-700">{step.body}</p>
            {step.href ? (
              <Link
                href={`${step.href}?${GOLDEN_QUERY}=1`}
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "mt-3 flex w-full items-center justify-center gap-1 rounded-2xl border-2 border-emerald-200 bg-white/90 font-semibold text-emerald-900",
                )}
              >
                이동: {step.href}
                <ChevronRight className="size-4 shrink-0" aria-hidden />
              </Link>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="flex gap-1">
                {STEPS.map((s, i) => {
                  const done = Boolean(autoDone[s.id]) || i < idx;
                  const on = i === idx;
                  return (
                    <span
                      key={s.id}
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border-2 text-[10px] font-bold",
                        done
                          ? "border-emerald-400 bg-emerald-500 text-white"
                          : on
                            ? "border-amber-400 bg-amber-100 text-amber-950"
                            : "border-gray-200 bg-white text-gray-400",
                      )}
                    >
                      {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
                    </span>
                  );
                })}
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="rounded-xl text-xs"
                  disabled={idx === 0}
                  onClick={() => setIdx((i) => Math.max(0, i - 1))}
                >
                  이전
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700"
                  disabled={idx >= STEPS.length - 1}
                  onClick={() => setIdx((i) => Math.min(STEPS.length - 1, i + 1))}
                >
                  다음
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.button
          key="fab"
          type="button"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="pointer-events-auto fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[200] flex size-12 items-center justify-center rounded-full border-2 border-amber-300 bg-amber-100 text-amber-900 shadow-lg"
          onClick={() => setOpen(true)}
          aria-label="골든 패스 코치 열기"
        >
          <Sparkles className="size-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}

export function GoldenPathCoach() {
  return (
    <Suspense fallback={null}>
      <GoldenPathCoachInner />
    </Suspense>
  );
}
