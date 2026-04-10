/**
 * KIT 멀티모달 학습 자료 타입 (영상·PDF 메타 + 추출 텍스트 슬롯).
 */

import type { LearningPersonaId } from "@/lib/agent/learning-persona";
import type { TutorToneMode } from "@/lib/agent/tutor-tone";

export type MaterialKind = "video" | "pdf";

export interface VideoMaterial {
  kind: "video";
  id: string;
  filename?: string;
  /** 스토리지 URL, data URL, 또는 업로드 식별자 */
  uri?: string;
  /** STT 또는 제공된 대본 */
  transcript?: string;
  /** GPT-4o / Gemini 등 멀티모달로 수집한 슬라이드·화면 요약 */
  visualCues?: string;
}

export interface PdfPageText {
  pageNumber: number;
  text: string;
}

export interface PdfMaterial {
  kind: "pdf";
  id: string;
  filename?: string;
  uri?: string;
  /** 본문 OCR/텍스트 */
  rawText?: string;
  /** 표를 Markdown 등으로 구조화한 블록 */
  tablesMarkdown?: string;
  /** 도표·이미지 캡션/설명 */
  imageCaptions?: string;
  /** 페이지별 텍스트 (크로스모달 정렬·인용) */
  pages?: PdfPageText[];
}

/** 영상 개념 ↔ PDF 단락 정렬 (코사인 유사도) */
export interface SourceMapping {
  id: string;
  videoTimestampLabel: string;
  videoConceptExcerpt: string;
  pdfPage: number;
  pdfParagraphExcerpt: string;
  cosineSimilarity: number;
}

export type MultimodalMaterial = VideoMaterial | PdfMaterial;

/** Strategy 10: 동일 KIT 주제에 대한 페르소나별 요약 변형 */
export interface PedagogyVariant {
  persona_id: LearningPersonaId;
  label: string;
  study_note_markdown: string;
  tone_notes: string;
}

/** 프론트 즉시 렌더용(탭·뱃지·선택 근거) */
export interface PedagogyPack {
  user_learning_persona: LearningPersonaId;
  selected_persona_id: LearningPersonaId;
  selection_rationale: string;
  variants: PedagogyVariant[];
  /** 아바타 페르소나(교육 캐릭터)와의 톤 정합 한 줄 */
  avatar_tone_alignment: string;
}

/** 비동기 에이전트 작업 (Strategy 11) */
export type AgentAsyncJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "interrupted";

export interface QuizQuestion {
  id: string;
  prompt: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
}

export interface FinalQuiz {
  title: string;
  questions: QuizQuestion[];
}

export type FeedbackPhase =
  | "input"
  | "distill"
  | "validate"
  | "tutor"
  | "cfo"
  | "admin"
  | "hitl"
  | "exit"
  | "align"
  | "policy"
  | "consensus"
  | "vision"
  | "creative"
  | "problem"
  /** Message-in-State 핸드오프 — Agent Trace Terminal 동기화용 */
  | "protocol";

export type UserPermissionStatus =
  | "idle"
  | "pending_approval"
  | "approved"
  | "finalized_early";

export interface AdminNotification {
  at: string;
  level: "warning" | "critical";
  message: string;
  accumulatedCostUsd: number;
}

export type HitlResumeAction = "approve_continue" | "finalize_as_is";

/** 워크플로 종료 분류 */
export type TerminationType = "NONE" | "COMPLETE" | "USER_ABORT" | "GRACEFUL_EXIT";

/** Exit_Processor_Node 멀티플렉서 */
export type ExitProcessingStrategy =
  | "partial_wrap"
  | "model_downgrade"
  | "direct_answer"
  | "user_abort";

/** HITL 재개 직후 human 노드에서 분기 */
export type HitlNextRoute = "workflow" | "exit_processor";

export type ActiveModelTier = "standard" | "economy";

export type ExitProcessorNext = "distill" | "end";

export interface FeedbackLogEntry {
  at: string;
  phase: FeedbackPhase;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Message-in-State: 노드 간 자연어 핸드오프 + 구조화 페이로드(JSON 친화 Record).
 * ACL 대신 상태에 append 되는 메시지로 협업 의도를 명시합니다.
 */
export type AgentGraphNodeId =
  | "Input_Node"
  | "Persona_Manager"
  | "CrossModal_Align"
  | "Knowledge_Distiller"
  | "CFO_Agent"
  | "Validator_Agent"
  | "Consensus_Auditor"
  | "Admin_Agent"
  | "HITL_Prepare"
  | "Policy_Learner"
  | "Human_Approval_Gateway"
  | "Exit_Processor"
  | "Tutor_Agent"
  | "Session_Terminal";

export interface InterAgentMessage {
  at: string;
  from: AgentGraphNodeId;
  to: AgentGraphNodeId;
  /**
   * 심사용 Agent Trace 한 줄(자연어). 예:
   * "Knowledge_Distiller: Distilled 5-slide cues into JSON study note."
   */
  terminalLine: string;
  /**
   * 불릿 요약만 — Done / Findings / Next. 전체 약 100토큰 이하로 클램프됨(컨텍스트 비대 방지).
   */
  bulletSummary: string;
  /** 대략적 토큰 수(bulletSummary+terminalLine 기준) */
  tokenEstimate: number;
  /** (2) 오류·경고 없으면 null */
  errors: string | null;
  /** 구조 데이터만(짧은 primitive). DB 원문 금지 */
  structured?: Record<string, unknown>;
}

/** Knowledge_Distiller JSON의 `distilled_data`와 동일 의미(고정독 필드). */
export interface DistilledTechnicalConcept {
  concept: string;
  why: string;
  how: string;
}

export interface DistilledData {
  core_learning_objectives: string[];
  technical_concepts: DistilledTechnicalConcept[];
  key_takeaways: string[];
  /** 짧은 CoT 요약(내부 단계 정리; 장문 전체 덤프 금지) */
  cot_reasoning: string;
}

export type ValidatorNextGraphNode = "Knowledge_Distiller" | "CFO_Agent";

/**
 * CFO_Agent — Token Efficiency Engine (증류 LLM 호출당 입력 토큰·USD 시뮬).
 * Hypothetical full-prompt vs Variable Injection + prompt caching.
 */
export interface AgentFinOps {
  traditionalTokens: number;
  optimizedTokens: number;
  savingsPercentage: number;
  dollarsSaved: number;
  efficiencySummary: string;
}

export interface ValidationResultPayload {
  score: number;
  technicalAccuracy: string;
  /** 레거시·호환: 없으면 goalAlignment로 채움 */
  coverage: string;
  clarity: string;
  /** 공모전 혁신 주제·학습 목표 정합성 */
  goalAlignment: string;
  rewriteInstructions: string;
  /** 스키마상 선택; 런타임은 score≥9와 일치하도록 정규화 */
  nextNode?: ValidatorNextGraphNode;
}

/** API·클라이언트용 그래프 상태 스냅샷 (LangGraph 의존성 없음) */
export interface AgentStateSnapshot {
  originalMaterials: MultimodalMaterial[];
  extractedText: string;
  structuredSummary: string;
  /** Strategy 10: 사용자 프로필 페르소나 */
  learningPersona?: LearningPersonaId;
  /** Elite KIT Tutor: 표시 이름 */
  studentDisplayName?: string;
  /** Phase 3: 추론된 튜터 톤 */
  tutorToneMode?: TutorToneMode | null;
  /** Persona_Manager */
  currentPersonaId?: string;
  personaMediaCostTier?: "low" | "high";
  personaSafetyPendingHitl?: boolean;
  personaSafetyMessage?: string | null;
  lastPromptInjectionMetrics?: {
    estimatedSavedTokens: number;
    duplicateBlocksAvoided: number;
    personaInstructionChars: number;
  } | null;
  /** CFO_Agent: 토큰 효율 엔진(증류 hop) */
  finOps?: AgentFinOps | null;
  /** Strategy 10: 3버전 요약 + 선택 메타(프론트 탭 렌더) */
  pedagogyPack?: PedagogyPack | null;
  /** Strategy 6: 증류 JSON `distilled_data` 정규화본(없으면 null) */
  distilledData: DistilledData | null;
  feedbackLog: FeedbackLogEntry[];
  finalQuiz: FinalQuiz | null;
  qualityScore: number | null;
  distillRound: number;
  totalTokenUsage: number;
  accumulatedCost: number;
  estimatedCost: number;
  loopCount: number;
  userPermissionStatus: UserPermissionStatus;
  hitlPending: boolean;
  /** CFO 거버넌스: 수동 검토(모달) 트리거 플래그 */
  interruptRequired?: boolean;
  hitlBlockReasons: string[];
  summarizationInstruction: string;
  adminNotification: AdminNotification | null;
  exitInstruction: string;
  terminationType: TerminationType;
  hitlNextRoute: HitlNextRoute | null;
  pendingExitStrategy: ExitProcessingStrategy | null;
  activeModelTier: ActiveModelTier;
  exitProcessorNext: ExitProcessorNext | null;
  sessionBudgetUsd: number;
  sourceMappings: SourceMapping[];
  trustScore: number | null;
  consensusAuditNotes: string;
  auditorRefinementRequired: boolean;
  consensusRefinementCount: number;
  consensusRefinementFeedback: string;
  policyRecommendation: string | null;
  policyMatchScore: number | null;
  /** Message-in-State 핸드오프(구 스레드에는 없을 수 있음) */
  interAgentMessages?: InterAgentMessage[];
}
