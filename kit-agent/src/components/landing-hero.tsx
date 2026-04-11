"use client";

import { motion } from "framer-motion";
import { Cpu, Shield, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { glassPanelClass, kitSurfaceBorder } from "@/lib/glass-styles";

const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: "Hyper-Personalized AI Avatar",
    body: "학습자의 속도와 정체성을 반영한 아바타·튜터 경험으로 몰입과 이해도를 동시에 끌어올립니다.",
    iconTint: "text-fuchsia-600",
    blob: "from-fuchsia-200/60 to-transparent",
  },
  {
    icon: Shield,
    title: "Zero-Trust Privacy Protocol",
    body: "업로드·처리·삭제까지 감사 가능한 프라이버시 경로로 교육 현장의 신뢰 요구를 충족합니다.",
    iconTint: "text-cyan-600",
    blob: "from-cyan-200/70 to-transparent",
  },
  {
    icon: TrendingUp,
    title: "CFO-Driven Resource Efficiency",
    body: "토큰·비용·품질을 실시간 거버넌스하여 운영 비용을 예측 가능하게 만들고 지속 가능한 BM을 입증합니다.",
    iconTint: "text-emerald-600",
    blob: "from-emerald-200/70 to-transparent",
  },
] as const;

const ease = [0.22, 1, 0.36, 1] as const;

export function LandingHero() {
  return (
    <section
      className={cn("relative overflow-hidden border-b bg-white", kitSurfaceBorder)}
      aria-labelledby="kit-hero-heading"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-slate-50/80 to-white" />
      <div className="pointer-events-none absolute -left-24 top-1/4 size-[min(100vw,520px)] rounded-full bg-cyan-100/50 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-0 size-[min(90vw,440px)] rounded-full bg-sky-100/40 blur-3xl" />

      <div className="relative mx-auto max-w-[1920px] px-5 py-12 md:px-10 md:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease }}
            className={cn(
              "mb-4 inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-xs font-medium text-slate-700 shadow-sm",
              kitSurfaceBorder,
            )}
          >
            <Cpu className="size-3.5 text-cyan-600" aria-hidden />
            AI-Native Learning Innovation — 시장 출시 가능한 EdTech BM
          </motion.p>
          <motion.h1
            id="kit-hero-heading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05, ease }}
            className="font-semibold text-3xl leading-tight tracking-tight text-cyan-600 sm:text-4xl md:text-5xl"
          >
            AI-Native Learning Innovation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1, ease }}
            className="mt-4 text-balance text-xl font-medium text-slate-800 md:text-2xl"
          >
            세계적 수준의 멘토링을, 당신의 리듬으로.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12, ease }}
            className="mt-5 text-balance text-lg text-slate-600 md:text-xl"
          >
            <span className="font-medium text-slate-800">
              Your Identity, Your Pace, Your Tutor.
            </span>{" "}
            KIT 강의 자료를 한 번에 증류하고, 아바타·CFO·가디언이 한 팀처럼 움직이는 차세대 학습
            콘솔입니다.
          </motion.p>
        </div>

        <ul className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {VALUE_PROPS.map((v, i) => (
            <motion.li
              key={v.title}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: 0.14 + i * 0.06, ease }}
              className={cn(glassPanelClass({ hover: true }), "p-6 text-left text-slate-800")}
            >
              <div
                className={cn(
                  "pointer-events-none absolute -right-4 -top-4 size-24 rounded-full bg-gradient-to-br opacity-80 blur-2xl",
                  v.blob,
                )}
              />
              <div
                className={cn(
                  "relative mb-4 flex size-11 items-center justify-center rounded-xl border bg-slate-50 shadow-sm",
                  kitSurfaceBorder,
                )}
              >
                <v.icon className={cn("size-5", v.iconTint)} aria-hidden />
              </div>
              <h2 className="relative font-semibold text-slate-800">{v.title}</h2>
              <p className="relative mt-2 text-sm leading-relaxed text-slate-600">{v.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
