import { Annotation } from "@langchain/langgraph";
import type {
  ActiveModelTier,
  AdminNotification,
  AgentFinOps,
  DistilledData,
  ExitProcessingStrategy,
  ExitProcessorNext,
  FeedbackLogEntry,
  InterAgentMessage,
  FinalQuiz,
  HitlNextRoute,
  MultimodalMaterial,
  PedagogyPack,
  SourceMapping,
  TerminationType,
  UserPermissionStatus,
} from "@/lib/agent/types";
import type { LearningPersonaId } from "@/lib/agent/learning-persona";
import { DEFAULT_LEARNING_PERSONA } from "@/lib/agent/learning-persona";
import type { TutorToneMode } from "@/lib/agent/tutor-tone";
import type { PersonaMediaCostTier } from "@/lib/agent/persona/types";
import type { LlmUsageRecord } from "@/lib/agent/usage-types";

/**
 * LangGraph AgentState + 리소스(CFO)·HITL 필드.
 */
export const AgentStateAnnotation = Annotation.Root({
  originalMaterials: Annotation<MultimodalMaterial[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  extractedText: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  structuredSummary: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  learningPersona: Annotation<LearningPersonaId>({
    reducer: (_left, right) => right,
    default: () => DEFAULT_LEARNING_PERSONA,
  }),
  /** Elite KIT Tutor: 학습자 표시 이름 (없으면 Fellow Innovator) */
  studentDisplayName: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  /** Phase 3: 자료 기반 추론된 튜터 톤 */
  tutorToneMode: Annotation<TutorToneMode | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  /** Persona_Manager — 동적 페르소나 (기본: warm_instructor) */
  currentPersonaId: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "warm_instructor",
  }),
  /** Distiller 시스템 프롬프트에 병합되는 런타임 블록 */
  distillerDynamicAugmentation: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  /** 온보딩 교육 철학 페르소나 — Distiller {{EDUCATIONAL_PHILOSOPHY}} 슬롯 */
  educationalPersonaSystemPrompt: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  personaMediaCostTier: Annotation<PersonaMediaCostTier>({
    reducer: (_left, right) => right,
    default: () => "low",
  }),
  /** Security_Guardian: 유해 페르소나 요청 시 HITL에 넘길 플래그 */
  personaSafetyPendingHitl: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  personaSafetyMessage: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  /** Variable injection: CFO 로깅용 추정 절감 토큰 (Distiller 직후 1회) */
  lastPromptInjectionMetrics: Annotation<{
    estimatedSavedTokens: number;
    duplicateBlocksAvoided: number;
    personaInstructionChars: number;
  } | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  /** CFO_Agent: 증류 hop 토큰 효율(전통 vs 주입+캐시) */
  finOps: Annotation<AgentFinOps | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  pedagogyPack: Annotation<PedagogyPack | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  distilledData: Annotation<DistilledData | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  feedbackLog: Annotation<FeedbackLogEntry[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  interAgentMessages: Annotation<InterAgentMessage[]>({
    reducer: (left, right) => [...left, ...right],
    default: () => [],
  }),
  finalQuiz: Annotation<FinalQuiz | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  qualityScore: Annotation<number | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  distillRound: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  totalTokenUsage: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  accumulatedCost: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  estimatedCost: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 0,
  }),
  loopCount: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  userPermissionStatus: Annotation<UserPermissionStatus>({
    reducer: (_left, right) => right,
    default: () => "idle",
  }),
  hitlPending: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  /** Strategy 8: loopCount≥임계 & 품질 미달 시 CFO가 세팅 → HITL_Prepare가 일시정지 */
  interruptRequired: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  hitlBlockReasons: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  summarizationInstruction: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  lastLlmUsage: Annotation<LlmUsageRecord | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  adminNotification: Annotation<AdminNotification | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  exitInstruction: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  terminationType: Annotation<TerminationType>({
    reducer: (_left, right) => right,
    default: () => "NONE",
  }),
  hitlNextRoute: Annotation<HitlNextRoute | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  pendingExitStrategy: Annotation<ExitProcessingStrategy | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  activeModelTier: Annotation<ActiveModelTier>({
    reducer: (_left, right) => right,
    default: () => "standard",
  }),
  /** 멀티 벤더 셀렉터 — 비어 있으면 tier·환경변수 기본 라우팅 */
  vendorModelId: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  exitProcessorNext: Annotation<ExitProcessorNext | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  sessionBudgetUsd: Annotation<number>({
    reducer: (_left, right) => right,
    default: () => 2,
  }),
  sourceMappings: Annotation<SourceMapping[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  trustScore: Annotation<number | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  consensusAuditNotes: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  auditorRefinementRequired: Annotation<boolean>({
    reducer: (_left, right) => right,
    default: () => false,
  }),
  consensusRefinementCount: Annotation<number>({
    reducer: (left, right) => left + right,
    default: () => 0,
  }),
  consensusRefinementFeedback: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "",
  }),
  policyRecommendation: Annotation<string | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
  policyMatchScore: Annotation<number | null>({
    reducer: (_left, right) => right,
    default: () => null,
  }),
});

export type AgentState = typeof AgentStateAnnotation.State;
