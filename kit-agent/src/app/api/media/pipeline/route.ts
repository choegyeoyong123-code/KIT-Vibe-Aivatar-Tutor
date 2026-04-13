import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "crypto";
import { DEFAULT_SESSION_BUDGET_USD } from "@/lib/agent/constants";
import { buildCostBreakdown, shouldRequireRenderHitl } from "@/lib/media-persona/cfo-media";
import { saveMediaJob } from "@/lib/media-persona/job-store";
import { runMediaRenderPipeline } from "@/lib/media-persona/render-pipeline";
import { generatePersonaAnimationScript } from "@/lib/media-persona/script-engine";
import type { MediaVoiceOutputMode } from "@/lib/media-persona/job-store";
import type { PersonaId } from "@/lib/media-persona/types";
import { generateTextToVideoPromptPack } from "@/lib/media-persona/video-prompt-engine";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";
import { sanitizeUserPlaintextForLlm } from "@/lib/privacy/sanitize-for-llm";
import {
  EDUCATIONAL_PERSONAS,
  type EducationalPersonaId,
} from "@/constants/personas";

export const runtime = "nodejs";
export const maxDuration = 300;

interface Body {
  masterContext: string;
  personaId?: PersonaId;
  extraInstruction?: string;
  /** true면 렌더 추정 비용과 무관하게 승인 단계만 거침 */
  forceHitl?: boolean;
  /** true면 Phase 3를 같은 요청에서 실행하지 않음(항상 job만 저장) */
  deferRender?: boolean;
  /** 세션 예산(USD) 초과 시에도 HITL */
  sessionBudgetUsd?: number;
  voiceOutputMode?: MediaVoiceOutputMode;
  userVoiceTtsInstructions?: string | null;
}

/** 워크숍 5인 페르소나 → 미디어 스크립트 톤(2종) 매핑 */
const EDUCATIONAL_TO_MEDIA_PERSONA: Record<EducationalPersonaId, PersonaId> = {
  metaphor_mage: "shin-chan",
  quest_master: "shin-chan",
  pair_mate: "neutral-educator",
  compressed_cto: "neutral-educator",
  deepdive_professor: "neutral-educator",
};

function resolvePersona(raw: unknown): PersonaId {
  if (raw === "neutral-educator") return "neutral-educator";
  if (raw === "shin-chan") return "shin-chan";
  if (typeof raw === "string" && EDUCATIONAL_PERSONAS.some((p) => p.id === raw)) {
    return EDUCATIONAL_TO_MEDIA_PERSONA[raw as EducationalPersonaId];
  }
  return "shin-chan";
}

export async function POST(req: NextRequest) {
  const limited = await rateLimitExceededResponse(req, "llm");
  if (limited) return limited;
  try {
    const body = (await req.json()) as Body;
    const masterContext = await sanitizeUserPlaintextForLlm((body.masterContext ?? "").trim());
    if (!masterContext) {
      return NextResponse.json(
        { error: "masterContext(Knowledge Master Context)가 필요합니다." },
        { status: 400 },
      );
    }

    const personaId = resolvePersona(body.personaId);
    const voiceOutputMode: MediaVoiceOutputMode =
      body.voiceOutputMode === "user" ? "user" : "persona";
    const userVoiceTtsInstructionsRaw =
      typeof body.userVoiceTtsInstructions === "string"
        ? body.userVoiceTtsInstructions.trim() || null
        : null;
    const userVoiceTtsInstructions = userVoiceTtsInstructionsRaw
      ? await sanitizeUserPlaintextForLlm(userVoiceTtsInstructionsRaw)
      : null;
    if (voiceOutputMode === "user" && !userVoiceTtsInstructions) {
      return NextResponse.json(
        {
          error:
            "내 목소리 모드에서는 먼저 음성 샘플을 학습시켜 주세요. (voice-profile)",
        },
        { status: 400 },
      );
    }

    const jobId = randomUUID();

    const extraInstruction = body.extraInstruction
      ? await sanitizeUserPlaintextForLlm(body.extraInstruction.trim())
      : undefined;

    const { script, llmUsd: sUsd } = await generatePersonaAnimationScript({
      masterContext,
      personaId,
      extraInstruction,
    });

    const { pack, llmUsd: vUsd } = await generateTextToVideoPromptPack({
      script,
      personaId,
    });

    const phase12LlmUsd = sUsd + vUsd;
    const dialogueChars = script.scenes.reduce(
      (a, sc) => a + sc.dialogue.length,
      0,
    );
    const costs = buildCostBreakdown({
      phase12LlmUsd,
      sceneCount: script.scenes.length,
      dialogueCharCount: dialogueChars,
    });

    const budget =
      typeof body.sessionBudgetUsd === "number" &&
      Number.isFinite(body.sessionBudgetUsd) &&
      body.sessionBudgetUsd > 0
        ? body.sessionBudgetUsd
        : Number(process.env.HITL_SESSION_BUDGET_USD) > 0
          ? Number(process.env.HITL_SESSION_BUDGET_USD)
          : DEFAULT_SESSION_BUDGET_USD;

    const overSessionBudget = costs.grandTotalEstimateUsd > budget;

    const hitlRequired =
      body.deferRender === true ||
      body.forceHitl === true ||
      shouldRequireRenderHitl(costs.phase3TotalEstimateUsd) ||
      overSessionBudget;

    saveMediaJob(jobId, {
      script,
      videoPrompts: pack,
      costs,
      hitlRequired,
      createdAt: Date.now(),
      voiceOutputMode,
      userVoiceTtsInstructions,
    });

    let render: Awaited<ReturnType<typeof runMediaRenderPipeline>> | null = null;
    if (!hitlRequired) {
      render = await runMediaRenderPipeline({
        jobId,
        script,
        userVoiceTtsInstructions:
          voiceOutputMode === "user" ? userVoiceTtsInstructions : null,
      });
    }

    return NextResponse.json({
      jobId,
      personaId,
      script,
      videoPrompts: pack,
      costs,
      hitlRequired,
      cfoMessage: hitlRequired
        ? overSessionBudget
          ? `CFO: 추정 총비용 $${costs.grandTotalEstimateUsd.toFixed(3)}이 세션 예산 $${budget.toFixed(2)}을 초과합니다. /api/media/render 로 승인하세요.`
          : `렌더(TTS·비디오 추정 $${costs.phase3TotalEstimateUsd.toFixed(3)})이 MEDIA_RENDER_HITL_USD 이상이거나 defer/force 옵션입니다. /api/media/render 로 승인하세요.`
        : "렌더 파이프라인을 즉시 실행했습니다.",
      render,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
