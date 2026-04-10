/**
 * 비용 집계는 결정론적입니다. LLM 기반 CFO 서술/감사가 필요하면
 * `CFO_AGENT_SYSTEM` (`@/lib/agent/prompts/agents/cfo-agent`)를 사용하세요.
 */
import type { AgentState } from "@/lib/agent/state";
import type { AdminNotification } from "@/lib/agent/types";
import { usdCostForTokens } from "@/lib/agent/pricing";
import {
  ADMIN_NOTIFY_COST_USD,
  HARD_COST_CAP_USD,
  HITL_LOOP_THRESHOLD,
  MAX_DISTILL_ROUNDS,
  QUALITY_PASS_THRESHOLD,
} from "@/lib/agent/constants";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import { computeTokenEfficiencyEngine } from "@/lib/agent/finops/token-efficiency-engine";

function nextAccumulated(state: AgentState, deltaUsd: number) {
  return state.accumulatedCost + deltaUsd;
}

function projectEstimatedCost(state: AgentState, lastStepUsd: number): number {
  const acc = nextAccumulated(state, lastStepUsd);
  const remaining = Math.max(0, MAX_DISTILL_ROUNDS - (state.distillRound ?? 0));
  const cushion = lastStepUsd > 0 ? lastStepUsd : 0.002;
  return acc + cushion * Math.min(remaining, 3);
}

function buildAdminNotification(nextAcc: number): AdminNotification | null {
  if (nextAcc < ADMIN_NOTIFY_COST_USD) return null;
  const critical = nextAcc >= HARD_COST_CAP_USD;
  return {
    at: new Date().toISOString(),
    level: critical ? "critical" : "warning",
    message: critical
      ? `누적 비용이 안전 상한($${HARD_COST_CAP_USD})에 근접하거나 초과했습니다. 워크플로를 검토하세요.`
      : `누적 비용이 $${ADMIN_NOTIFY_COST_USD}를 넘었습니다. CFO가 프론트 알림을 발생시켰습니다.`,
    accumulatedCostUsd: nextAcc,
  };
}

function cfoFeedback(
  step: string,
  deltaUsd: number,
  tokens: number,
): AgentState["feedbackLog"] {
  return [
    {
      at: new Date().toISOString(),
      phase: "cfo" as const,
      message: `${step}: +$${deltaUsd.toFixed(4)} (누적 추정 반영), +${tokens} 토큰(입·출력 합산).`,
      metadata: { step, deltaUsd, tokens },
    },
  ];
}

/** 증류 LLM 호출 직후 비용·토큰·예상치 반영 */
export async function cfoAfterDistillNode(state: AgentState) {
  const u = state.lastLlmUsage;
  if (!u) {
    return {
      interruptRequired: false,
      estimatedCost: projectEstimatedCost(state, 0),
      feedbackLog: [] as AgentState["feedbackLog"],
      interAgentMessages: [
        handoff({
          from: "CFO_Agent",
          to: "Validator_Agent",
          taskDone: "Post-distill ledger: no usage row (no charge).",
          keyFindings: "Distill tokens already cleared from lastLlmUsage.",
          nextAction: "Validator: run JSON quality score vs MASTER CONTEXT.",
          terminalLine: "CFO_Agent: Post-distill cost pass — $0 delta.",
          structured: { step: "post_distill", deltaUsd: 0, tokens: 0 },
        }),
      ],
    };
  }
  const deltaUsd = usdCostForTokens(
    u.modelId,
    u.inputTokens,
    u.outputTokens,
  );
  const tokens = u.inputTokens + u.outputTokens;
  const nextAcc = nextAccumulated(state, deltaUsd);
  const inj = state.lastPromptInjectionMetrics;
  const finOps = computeTokenEfficiencyEngine({
    usage: u,
    injection: inj,
  });
  const injectionNote =
    inj != null
      ? ` {{PERSONA_INSTRUCTION}} 주입: 중복 블록 ${inj.duplicateBlocksAvoided}회 회피 추정 → 약 ${inj.estimatedSavedTokens} 토큰 절감(입력 프롬프트 기준 시뮬).`
      : "";
  const finOpsNote = finOps
    ? ` Token Efficiency Engine: projected ${finOps.estimated_savings.traditionalTokens}→${finOps.estimated_savings.optimizedTokens} tok (~${finOps.estimated_savings.savingsPercentage}%), measured ${finOps.measured_performance ? `${finOps.measured_performance.traditionalTokens}→${finOps.measured_performance.optimizedTokens} tok (~${finOps.measured_performance.savingsPercentage}%)` : "N/A"}`
    : "";
  return {
    interruptRequired: false,
    totalTokenUsage: tokens,
    accumulatedCost: deltaUsd,
    lastLlmUsage: null,
    estimatedCost: projectEstimatedCost(state, deltaUsd),
    adminNotification: buildAdminNotification(nextAcc),
    finOps: finOps ?? null,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "cfo" as const,
        message: `CFO (증류 후): +$${deltaUsd.toFixed(4)} (누적 추정 반영), +${tokens} 토큰(입·출력 합산).${injectionNote}${finOpsNote}`,
        metadata: {
          step: "post_distill",
          deltaUsd,
          tokens,
          promptVariableInjection: inj ?? undefined,
          finOps: finOps ?? undefined,
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "CFO_Agent",
        to: "Validator_Agent",
        taskDone: `Booked distill step ~$${deltaUsd.toFixed(4)}; run burn ~$${nextAcc.toFixed(4)}.`,
        keyFindings: `Tokens in+out=${tokens}; model=${u.modelId}.${inj ? ` Est. ~${inj.estimatedSavedTokens} input tok saved via persona slot injection.` : ""}${finOps ? ` FinOps projected=${finOps.estimated_savings.savingsPercentage}%, measured=${finOps.measured_performance?.savingsPercentage ?? "N/A"}%.` : ""}`,
        nextAction: "Validator: emit JSON verdict + rewrite hints if <9.",
        terminalLine: `CFO_Agent: Logged distill cost $${deltaUsd.toFixed(4)} (${tokens} tok).${inj ? ` Injection ~${inj.estimatedSavedTokens} tok saved (est.).` : ""}`,
        structured: {
          step: "post_distill",
          deltaUsd,
          tokens,
          estimatedSavedTokensFromInjection: inj?.estimatedSavedTokens ?? 0,
          finOps: finOps ?? null,
        },
      }),
    ],
  };
}

/** 검증 LLM 호출 직후 */
export async function cfoAfterValidateNode(state: AgentState) {
  const loops = state.loopCount ?? 0;
  const score = state.qualityScore ?? 0;
  const governanceInterrupt =
    loops >= HITL_LOOP_THRESHOLD && score < QUALITY_PASS_THRESHOLD;

  const u = state.lastLlmUsage;
  if (!u) {
    const govLog: AgentState["feedbackLog"] = governanceInterrupt
      ? [
          {
            at: new Date().toISOString(),
            phase: "cfo" as const,
            message: `CFO 거버넌스: 검증 루프 ${loops}회·점수 ${score}/10 — 자동 재증류 중단, HITL로 전환합니다.`,
            metadata: {
              governanceInterrupt: true,
              loopCount: loops,
              qualityScore: score,
            },
          },
        ]
      : [];
    return {
      interruptRequired: governanceInterrupt,
      estimatedCost: projectEstimatedCost(state, 0),
      feedbackLog: govLog,
      interAgentMessages: [
        handoff({
          from: "CFO_Agent",
          to: "Admin_Agent",
          taskDone: governanceInterrupt
            ? `Governance: loops=${loops}, score=${score} — interruptRequired.`
            : "Post-validate CFO pass: $0 token delta.",
          keyFindings: governanceInterrupt
            ? "Budget cap: no further auto-distill without human approval."
            : "Awaiting admin mirror if notifications exist.",
          nextAction: "Admin → HITL_Prepare for loop/cost gates.",
          terminalLine: governanceInterrupt
            ? `CFO_Agent: Manual review — ${loops} validation loops, score ${score}/10.`
            : "CFO_Agent: Validator window billed $0 (edge).",
          structured: {
            step: "post_validate",
            deltaUsd: 0,
            tokens: 0,
            governanceInterrupt,
          },
        }),
      ],
    };
  }
  const deltaUsd = usdCostForTokens(
    u.modelId,
    u.inputTokens,
    u.outputTokens,
  );
  const tokens = u.inputTokens + u.outputTokens;
  const nextAcc = nextAccumulated(state, deltaUsd);
  const govExtra: AgentState["feedbackLog"] = governanceInterrupt
    ? [
        {
          at: new Date().toISOString(),
          phase: "cfo" as const,
          message: `CFO 거버넌스: 루프 ${loops}회·품질 ${score}/10 — 추가 자동 재시도 없이 HITL(수동 검토)로 고정합니다.`,
          metadata: {
            governanceInterrupt: true,
            loopCount: loops,
            qualityScore: score,
          },
        },
      ]
    : [];
  return {
    interruptRequired: governanceInterrupt,
    totalTokenUsage: tokens,
    accumulatedCost: deltaUsd,
    lastLlmUsage: null,
    estimatedCost: projectEstimatedCost(state, deltaUsd),
    adminNotification: buildAdminNotification(nextAcc),
    feedbackLog: [...cfoFeedback("CFO (검증 후)", deltaUsd, tokens), ...govExtra],
    interAgentMessages: [
      handoff({
        from: "CFO_Agent",
        to: "Admin_Agent",
        taskDone: governanceInterrupt
          ? `Governance lock: loops=${loops}, score=${score}/10, burn ~$${nextAcc.toFixed(4)}.`
          : `Booked validate/consensus edge ~$${deltaUsd.toFixed(4)}; cum ~$${nextAcc.toFixed(4)}.`,
        keyFindings: `Tok=${tokens}; score=${state.qualityScore ?? "—"}; governance=${governanceInterrupt}.`,
        nextAction: "Admin: show CFO alerts; HITL_Prepare next.",
        terminalLine: governanceInterrupt
          ? `CFO_Agent: Cost-controlled pause — review required (${loops} loops).`
          : `CFO_Agent: Validator/consensus charge $${deltaUsd.toFixed(4)}.`,
        structured: {
          step: "post_validate",
          deltaUsd,
          tokens,
          governanceInterrupt,
        },
      }),
    ],
  };
}

/** 튜터(퀴즈) LLM 호출 직후 */
export async function cfoAfterTutorNode(state: AgentState) {
  const u = state.lastLlmUsage;
  if (!u) {
    return {
      interruptRequired: false,
      feedbackLog: [] as AgentState["feedbackLog"],
      interAgentMessages: [
        handoff({
          from: "CFO_Agent",
          to: "Session_Terminal",
          taskDone: "Post-tutor: no tutor usage row.",
          keyFindings: "Session burn unchanged on this hop.",
          nextAction: "End graph — persist client state.",
          terminalLine: "CFO_Agent: Tutor leg $0 — session complete.",
          structured: { step: "post_tutor", deltaUsd: 0, tokens: 0 },
        }),
      ],
    };
  }
  const deltaUsd = usdCostForTokens(
    u.modelId,
    u.inputTokens,
    u.outputTokens,
  );
  const tokens = u.inputTokens + u.outputTokens;
  const nextAcc = nextAccumulated(state, deltaUsd);
  return {
    interruptRequired: false,
    totalTokenUsage: tokens,
    accumulatedCost: deltaUsd,
    lastLlmUsage: null,
    estimatedCost: nextAcc,
    adminNotification: buildAdminNotification(nextAcc),
    feedbackLog: cfoFeedback("CFO (튜터 후)", deltaUsd, tokens),
    interAgentMessages: [
      handoff({
        from: "CFO_Agent",
        to: "Session_Terminal",
        taskDone: `Booked tutor/quiz ~$${deltaUsd.toFixed(4)}; total burn ~$${nextAcc.toFixed(4)}.`,
        keyFindings: `Tok=${tokens}; model=${u.modelId}.`,
        nextAction: "Persist quiz + CFO totals; graph END.",
        terminalLine: `CFO_Agent: Closed tutor leg at $${deltaUsd.toFixed(4)}.`,
        structured: { step: "post_tutor", deltaUsd, tokens },
      }),
    ],
  };
}
