"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Shield } from "lucide-react";

export type PrivacyTerminalPhase = "idle" | "processing" | "complete";

type LogLevel = "INFO" | "WARN" | "SUCCESS" | "VERIFIED";

export interface PrivacyLogLine {
  at: string;
  level: LogLevel;
  message: string;
}

const GUARDIAN_PREFIX = "[Security Guardian]";

function formatTime(d: Date) {
  return d.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

const BOOT_SEQUENCE: Omit<PrivacyLogLine, "at">[] = [
  { level: "INFO", message: `${GUARDIAN_PREFIX} 세션 키 파생(ECDHE) 협상 완료.` },
  { level: "INFO", message: `${GUARDIAN_PREFIX} 업로드 스트림 무결성 검사 중…` },
  {
    level: "WARN",
    message: `${GUARDIAN_PREFIX} 외부 스토리지 미연결 — 처리 경로 로컬 샌드박스로 고정.`,
  },
];

export function PrivacySecurityTerminal({
  phase,
  title = "Privacy & Security Terminal",
  /** 아바타 렌더 등: 완료 시 심사용 3줄만 강조 */
  finaleOnly = false,
}: {
  phase: PrivacyTerminalPhase;
  title?: string;
  finaleOnly?: boolean;
}) {
  const [lines, setLines] = useState<PrivacyLogLine[]>([]);
  const viewport = useRef<HTMLDivElement>(null);

  const levelClass = useMemo(
    () =>
      ({
        INFO: "text-sky-300/95",
        WARN: "text-amber-300/95",
        SUCCESS: "text-emerald-300/95",
        VERIFIED: "text-violet-300/95",
      }) satisfies Record<LogLevel, string>,
    [],
  );

  useEffect(() => {
    if (phase === "idle") {
      setLines([]);
      return;
    }

    if (phase === "processing") {
      if (finaleOnly) {
        setLines([
          {
            at: formatTime(new Date()),
            level: "INFO",
            message: `${GUARDIAN_PREFIX} 아바타 합성 파이프라인 — 얼굴 특징 벡터는 일시 버퍼만 사용.`,
          },
        ]);
        return;
      }
      setLines([]);
      let i = 0;
      const id = window.setInterval(() => {
        if (i >= BOOT_SEQUENCE.length) {
          window.clearInterval(id);
          return;
        }
        const row = BOOT_SEQUENCE[i]!;
        i += 1;
        setLines((prev) => [
          ...prev,
          { ...row, at: formatTime(new Date()) },
        ]);
      }, 520);
      return () => window.clearInterval(id);
    }

    if (phase === "complete") {
      setLines((prev) => {
        const tail: PrivacyLogLine[] = [
          {
            at: formatTime(new Date()),
            level: "INFO",
            message: `${GUARDIAN_PREFIX} User facial data encrypted…`,
          },
          {
            at: formatTime(new Date()),
            level: "SUCCESS",
            message: `${GUARDIAN_PREFIX} 업로드 사용자 사진·프레임 버퍼 즉시 삭제 (Strict Deletion Protocol).`,
          },
          {
            at: formatTime(new Date()),
            level: "SUCCESS",
            message: `${GUARDIAN_PREFIX} Local buffer purged…`,
          },
          {
            at: formatTime(new Date()),
            level: "VERIFIED",
            message: `${GUARDIAN_PREFIX} Session data cleared.`,
          },
        ];
        const base = finaleOnly ? [] : prev;
        const merged = [...base];
        for (const t of tail) {
          if (!merged.some((m) => m.message === t.message)) merged.push(t);
        }
        return merged;
      });
    }
  }, [phase, finaleOnly]);

  useEffect(() => {
    const el = viewport.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  if (phase === "idle") return null;

  return (
    <section
      className="rounded-xl border border-emerald-500/25 bg-zinc-950 font-mono text-xs text-zinc-200 shadow-[inset_0_1px_0_0_rgba(52,211,153,0.08)]"
      aria-label="Privacy and security activity"
    >
      <header className="flex items-center gap-2 border-b border-zinc-800 px-3 py-2 text-[11px] tracking-wide text-emerald-400/90">
        <Shield className="size-3.5 shrink-0" />
        <span className="uppercase">{title}</span>
        <span className="ml-auto text-zinc-500">simulated / demo-grade audit trail</span>
      </header>
      <div
        ref={viewport}
        className="max-h-[min(200px,28vh)] overflow-y-auto px-3 py-2"
      >
        <ul className="space-y-1.5 pr-2">
          {lines.map((line, idx) => (
            <li key={`${line.at}-${idx}`} className="break-words leading-relaxed">
              <span className="text-zinc-500">{line.at}</span>{" "}
              <span className={levelClass[line.level]}>[{line.level}]</span>{" "}
              <span className="text-zinc-100/90">{line.message}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
