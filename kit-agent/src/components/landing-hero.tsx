"use client";

import { motion } from "framer-motion";
import { Cpu, Shield, Sparkles, TrendingUp } from "lucide-react";

const VALUE_PROPS = [
  {
    icon: Sparkles,
    title: "Hyper-Personalized AI Avatar",
    body: "학습자의 속도와 정체성을 반영한 아바타·튜터 경험으로 몰입과 이해도를 동시에 끌어올립니다.",
  },
  {
    icon: Shield,
    title: "Zero-Trust Privacy Protocol",
    body: "업로드·처리·삭제까지 감사 가능한 프라이버시 경로로 교육 현장의 신뢰 요구를 충족합니다.",
  },
  {
    icon: TrendingUp,
    title: "CFO-Driven Resource Efficiency",
    body: "토큰·비용·품질을 실시간 거버넌스하여 운영 비용을 예측 가능하게 만들고 지속 가능한 BM을 입증합니다.",
  },
] as const;

export function LandingHero() {
  return (
    <section
      className="relative overflow-hidden border-b border-[oklch(0.55_0.12_195/0.18)] bg-gradient-to-br from-[oklch(0.99_0.02_264)] via-background to-[oklch(0.97_0.03_195)] dark:from-[oklch(0.18_0.04_264)] dark:via-background dark:to-[oklch(0.16_0.05_264)]"
      aria-labelledby="kit-hero-heading"
    >
      <div className="pointer-events-none absolute -left-24 top-0 size-[420px] rounded-full bg-[oklch(0.72_0.14_195/0.14)] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 size-[380px] rounded-full bg-[oklch(0.62_0.2_300/0.12)] blur-3xl" />

      <div className="relative mx-auto max-w-[1920px] px-4 py-10 md:px-8 md:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-primary text-xs font-medium"
          >
            <Cpu className="size-3.5" aria-hidden />
            AI-Native Learning Innovation — 시장 출시 가능한 EdTech BM
          </motion.p>
          <motion.h1
            id="kit-hero-heading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="bg-gradient-to-r from-[var(--kit-brand)] via-foreground to-[var(--kit-glow)] bg-clip-text font-bold text-3xl leading-tight tracking-tight text-transparent sm:text-4xl md:text-5xl"
          >
            AI-Native Learning Innovation
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.1 }}
            className="mt-3 text-balance text-xl font-medium text-foreground md:text-2xl"
          >
            세계적 수준의 멘토링을, 당신의 리듬으로.
          </motion.p>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="mt-4 text-balance text-lg text-muted-foreground md:text-xl"
          >
            <span className="font-semibold text-foreground">
              Your Identity, Your Pace, Your Tutor.
            </span>{" "}
            KIT 강의 자료를 한 번에 증류하고, 아바타·CFO·가디언이 한 팀처럼 움직이는 차세대 학습
            콘솔입니다.
          </motion.p>
        </div>

        <ul className="mx-auto mt-10 grid max-w-5xl gap-4 md:grid-cols-3">
          {VALUE_PROPS.map((v, i) => (
            <motion.li
              key={v.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.06 }}
              className="rounded-2xl border border-border/80 bg-card/80 p-5 text-left shadow-sm backdrop-blur-sm"
            >
              <div className="mb-3 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <v.icon className="size-5" aria-hidden />
              </div>
              <h2 className="font-semibold text-foreground">{v.title}</h2>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{v.body}</p>
            </motion.li>
          ))}
        </ul>
      </div>
    </section>
  );
}
