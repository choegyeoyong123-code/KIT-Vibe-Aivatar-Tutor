"use client";

import { useId } from "react";
import { Activity, Shield } from "lucide-react";
import { glassPanelClass } from "@/lib/glass-styles";
import { cn } from "@/lib/utils";

const AUDIT_LINES = [
  "[12:04:01] Security_Guardian · session attestation OK",
  "[12:04:02] upload buffer · ephemeral key rotation",
  "[12:04:03] synthesis pipeline · isolated worker",
  "[12:04:04] CFO · policy gate passed (cost ceiling)",
  "[12:04:05] Validator_Agent · checksum verified",
];

const LEDGER_LINES = [
  "blk:0x7a3…9f2 · deletion_receipt committed",
  "HMAC-SHA256 audit signature · unique_audit_signature",
  "immutable append-only · api_response_id linked",
  "zero-trust verify · raw biometric purge acknowledged",
  "chain continuity · previous_hash matched",
];

function StreamBlock({
  title,
  lines,
  tint,
}: {
  title: string;
  lines: readonly string[];
  tint: "cyan" | "violet";
}) {
  const doubled = [...lines, ...lines];
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-100 bg-slate-50/80 shadow-sm",
        tint === "cyan" && "ring-1 ring-cyan-100",
        tint === "violet" && "ring-1 ring-violet-100",
      )}
    >
      <p
        className={cn(
          "border-b border-slate-100 px-3 py-2 font-sans text-[10px] font-medium uppercase tracking-[0.2em]",
          tint === "cyan" && "text-cyan-700",
          tint === "violet" && "text-violet-700",
        )}
      >
        {title}
      </p>
      <div className="dashboard-audit-stream--mask relative h-[112px] overflow-hidden">
        <div className="dashboard-audit-stream font-mono text-[10px] leading-relaxed">
          {doubled.map((line, i) => (
            <p
              key={`${title}-${i}`}
              className="whitespace-nowrap px-3 py-0.5 text-slate-600"
            >
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export type SecurityPulseDataPanelProps = {
  className?: string;
};

export function SecurityPulseDataPanel({ className }: SecurityPulseDataPanelProps) {
  const headingId = useId();

  return (
    <div className={cn(glassPanelClass({ hover: true }), "p-6", className)} aria-labelledby={headingId}>
      <div className="pointer-events-none absolute -bottom-10 -left-10 size-36 rounded-full bg-cyan-100/60 blur-3xl" />

      <div className="relative flex items-start gap-4">
        <div className="relative flex size-12 shrink-0 items-center justify-center">
          <span className="absolute inline-flex size-11 animate-ping rounded-full bg-emerald-300/30 opacity-40" />
          <span className="absolute inline-flex size-9 animate-pulse rounded-full bg-emerald-200/40" />
          <span className="relative flex size-10 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 shadow-sm">
            <Activity className="size-5 text-emerald-700" aria-hidden />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p
            id={headingId}
            className="font-sans text-[10px] font-medium uppercase tracking-[0.22em] text-cyan-600"
          >
            Security Pulse
          </p>
          <p className="mt-1 font-sans text-lg font-light tracking-tight text-slate-800">
            Active auditing
          </p>
          <p className="mt-1 font-sans text-xs font-light leading-relaxed text-slate-600">
            Live attestation stream — zero-trust boundary enforced.
          </p>
        </div>
        <Shield className="size-5 shrink-0 text-slate-300" aria-hidden />
      </div>

      <div className="relative mt-5 grid gap-3 sm:grid-cols-2">
        <StreamBlock title="Active Audit Trail" lines={AUDIT_LINES} tint="cyan" />
        <StreamBlock title="Immutable Ledger Logs" lines={LEDGER_LINES} tint="violet" />
      </div>
    </div>
  );
}
