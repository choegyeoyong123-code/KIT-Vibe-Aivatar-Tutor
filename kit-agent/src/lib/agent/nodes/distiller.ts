import { formatSourceMappingsForPrompt } from "@/lib/agent/alignment/cross-modal-align";
import { buildMasterContext } from "@/lib/agent/master-context";
import { buildDistillUserPayload } from "@/lib/agent/prompts/distill";
import { buildKnowledgeDistillerSystem } from "@/lib/agent/prompts/agents/knowledge-distiller";
import { estimatePersonaInjectionSavings } from "@/lib/agent/prompts/prompt-inject";
import { parseDistillerEnvelope } from "@/lib/agent/prompts/distill-output";
import { completeTextTracked } from "@/lib/agent/llm";
import { distillStreamContext } from "@/lib/agent/distill-stream-context";
import { handoff } from "@/lib/agent/protocol/inter-agent-message";
import type { AgentState } from "@/lib/agent/state";
import {
  buildTutorToneInstructionBlock,
  inferTutorToneFromMasterContext,
  tutorToneLabel,
} from "@/lib/agent/tutor-tone";
import {
  buildDistillerDynamicPersonaAugment,
  DEFAULT_DYNAMIC_PERSONA_ID,
} from "@/lib/agent/persona/persona-presets";

/**
 * 멀티모달 원자료 → Master Context → 구조화 Markdown 요약 + 통합 추출 텍스트.
 * 검증 실패 시 qualityScore<9 와 직전 rewriteInstructions(피드백 로그에서 복원)을 반영해 재작성.
 */
export async function distillerNode(state: AgentState) {
  const masterContext = buildMasterContext(state.originalMaterials);
  const round = (state.distillRound ?? 0) + 1;

  const lastValidate = [...state.feedbackLog]
    .reverse()
    .find((e) => e.phase === "validate" && e.metadata?.rewriteInstructions);

  const validatorFeedback =
    typeof lastValidate?.metadata?.rewriteInstructions === "string"
      ? lastValidate.metadata.rewriteInstructions
      : undefined;

  const alignmentTable = formatSourceMappingsForPrompt(state.sourceMappings ?? []);
  const consensusFb = state.consensusRefinementFeedback?.trim();

  const tutorToneMode = inferTutorToneFromMasterContext(masterContext);

  const user = buildDistillUserPayload({
    masterContext,
    priorSummary:
      round > 1 && state.structuredSummary ? state.structuredSummary : undefined,
    validatorFeedback,
    summarizationInstruction: state.summarizationInstruction || undefined,
    sourceAlignmentTable: alignmentTable,
    consensusRefinementFeedback: consensusFb || undefined,
    learningPersona: state.learningPersona,
    studentDisplayName: state.studentDisplayName?.trim() || undefined,
    tutorToneMode,
  });

  const hooks = distillStreamContext.getStore();
  const augment =
    state.distillerDynamicAugmentation?.trim() ||
    buildDistillerDynamicPersonaAugment(DEFAULT_DYNAMIC_PERSONA_ID);
  const tutorBlock = buildTutorToneInstructionBlock(tutorToneMode);
  const systemPrompt = buildKnowledgeDistillerSystem({
    PERSONA_INSTRUCTION: augment,
    TUTOR_TONE_BLOCK: tutorBlock,
  });
  const inj = estimatePersonaInjectionSavings(augment.length);

  const { text: rawModelText, usage } = await completeTextTracked(
    systemPrompt,
    user,
    {
      tier: state.activeModelTier,
      jsonMode: true,
    },
  );
  const { study_note_markdown: structuredSummary, distilledData, pedagogyPack } =
    parseDistillerEnvelope(rawModelText, state.learningPersona);
  if (hooks && structuredSummary) {
    const step = 72;
    for (let i = 0; i < structuredSummary.length; i += step) {
      hooks.onSummaryDelta(structuredSummary.slice(i, i + step));
    }
  }
  const extractedText = [
    "## Unified extract (for search / validation)",
    masterContext.slice(0, 120_000),
  ].join("\n\n");

  return {
    tutorToneMode,
    lastPromptInjectionMetrics: {
      estimatedSavedTokens: inj.estimatedSavedTokens,
      duplicateBlocksAvoided: inj.duplicateBlocksAvoided,
      personaInstructionChars: augment.length,
    },
    exitProcessorNext: null,
    auditorRefinementRequired: false,
    consensusRefinementFeedback: "",
    distillRound: round,
    extractedText,
    structuredSummary,
    pedagogyPack,
    distilledData,
    qualityScore: null,
    lastLlmUsage: usage,
    feedbackLog: [
      {
        at: new Date().toISOString(),
        phase: "distill" as const,
        message: `지식 증류 완료 (라운드 ${round}). Elite KIT Tutor 톤: ${tutorToneLabel(tutorToneMode)}. Persona: ${state.currentPersonaId ?? "warm_instructor"}.`,
        metadata: {
          round,
          tutorToneMode,
          currentPersonaId: state.currentPersonaId,
        },
      },
    ],
    interAgentMessages: [
      handoff({
        from: "Knowledge_Distiller",
        to: "CFO_Agent",
        taskDone: `Round ${round} distill complete; summary ${structuredSummary.length} chars.`,
        keyFindings: "Unified extract staged for search/validation.",
        nextAction: "CFO: book tokens → Validator scores JSON note.",
        terminalLine: `Knowledge_Distiller: Finished distill round ${round} (${structuredSummary.length} chars).`,
        structured: { distillRound: round, summaryChars: structuredSummary.length },
      }),
    ],
  };
}
