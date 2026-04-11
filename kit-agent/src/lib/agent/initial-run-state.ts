import { DEFAULT_SESSION_BUDGET_USD } from "@/lib/agent/constants";
import { DEFAULT_LEARNING_PERSONA } from "@/lib/agent/learning-persona";
import type { TutorToneMode } from "@/lib/agent/tutor-tone";
import type { AgentFinOps } from "@/lib/agent/types";

/** /api/agent/run·run-stream 공통 초기 그래프 필드(스레드별 materials 등은 호출부에서 병합). */
export const learningGraphInitialFields = {
  extractedText: "",
  structuredSummary: "",
  learningPersona: DEFAULT_LEARNING_PERSONA,
  studentDisplayName: "",
  tutorToneMode: null as TutorToneMode | null,
  currentPersonaId: "warm_instructor",
  distillerDynamicAugmentation: "",
  educationalPersonaSystemPrompt: "",
  personaMediaCostTier: "low" as const,
  personaSafetyPendingHitl: false,
  personaSafetyMessage: null as string | null,
  lastPromptInjectionMetrics: null as {
    estimatedSavedTokens: number;
    duplicateBlocksAvoided: number;
    personaInstructionChars: number;
  } | null,
  finOps: null as AgentFinOps | null,
  pedagogyPack: null,
  distilledData: null,
  feedbackLog: [],
  interAgentMessages: [],
  finalQuiz: null,
  qualityScore: null,
  distillRound: 0,
  totalTokenUsage: 0,
  accumulatedCost: 0,
  estimatedCost: 0,
  loopCount: 0,
  userPermissionStatus: "idle" as const,
  hitlPending: false,
  interruptRequired: false,
  hitlBlockReasons: [] as string[],
  summarizationInstruction: "",
  lastLlmUsage: null,
  adminNotification: null,
  exitInstruction: "",
  terminationType: "NONE" as const,
  hitlNextRoute: null,
  pendingExitStrategy: null,
  activeModelTier: "standard" as const,
  vendorModelId: "",
  exitProcessorNext: null,
  sessionBudgetUsd: (() => {
    const v = Number(process.env.HITL_SESSION_BUDGET_USD);
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_SESSION_BUDGET_USD;
  })(),
  sourceMappings: [],
  trustScore: null,
  consensusAuditNotes: "",
  auditorRefinementRequired: false,
  consensusRefinementCount: 0,
  consensusRefinementFeedback: "",
  policyRecommendation: null,
  policyMatchScore: null,
};
