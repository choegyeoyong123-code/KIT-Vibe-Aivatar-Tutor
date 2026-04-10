import {
  KNOWLEDGE_DISTILLER_SYSTEM,
  buildKnowledgeDistillerSystem,
  KNOWLEDGE_DISTILLER_SYSTEM_TEMPLATE,
} from "@/lib/agent/prompts/agents/knowledge-distiller";
import type { LearningPersonaId } from "@/lib/agent/learning-persona";
import { DEFAULT_LEARNING_PERSONA } from "@/lib/agent/learning-persona";
import type { TutorToneMode } from "@/lib/agent/tutor-tone";

/** 레거시 단일 문자열(스텁 주입). 런타임은 \`buildKnowledgeDistillerSystem\` 사용. */
export const DISTILL_SYSTEM = KNOWLEDGE_DISTILLER_SYSTEM;

export { buildKnowledgeDistillerSystem, KNOWLEDGE_DISTILLER_SYSTEM_TEMPLATE };

export {
  parseDistillerModelOutput,
  parseDistillerEnvelope,
} from "@/lib/agent/prompts/distill-output";

export function buildDistillUserPayload(input: {
  masterContext: string;
  priorSummary?: string;
  validatorFeedback?: string;
  /** 예: "치트시트처럼 요약", "5살에게 설명하듯" */
  summarizationInstruction?: string;
  sourceAlignmentTable?: string;
  consensusRefinementFeedback?: string;
  /** Strategy 10: 증류 3버전 중 선택 기준 */
  learningPersona?: LearningPersonaId;
  /** Elite KIT Tutor: 인사에 사용 (없으면 Fellow Innovator) */
  studentDisplayName?: string;
  /** Phase 3: 자료 복잡도에 따른 톤 */
  tutorToneMode?: TutorToneMode;
}): string {
  const parts: string[] = [];
  const displayName = input.studentDisplayName?.trim() ?? "";
  parts.push(
    "## STUDENT_DISPLAY_NAME",
    displayName.length > 0
      ? `이름(표시): ${displayName}`
      : "(비어 있음 — 인사는 Fellow Innovator님으로 시작)",
  );
  parts.push(
    "## TUTOR_TONE_MODE",
    input.tutorToneMode ?? "supportive_guide",
    "Apply section (1b) Dynamic Tutor Tone rules for this mode.",
  );
  if (input.summarizationInstruction?.trim()) {
    parts.push(
      "## 사용자 요청 스타일 (최우선 반영)\n",
      input.summarizationInstruction.trim(),
    );
  }
  const persona = input.learningPersona ?? DEFAULT_LEARNING_PERSONA;
  parts.push(
    "## LEARNING_PERSONA (user profile — select best matching variant)",
    `persona_id: ${persona}`,
    "Use pedagogy_pack.user_learning_persona = this id.",
  );
  parts.push("## MASTER CONTEXT", input.masterContext.trim());
  if (input.sourceAlignmentTable?.trim()) {
    parts.push(
      "\n## SOURCE_ALIGNMENT_TABLE (영상↔PDF 정렬; 인용에 사용)\n",
      input.sourceAlignmentTable.trim(),
    );
  }
  if (input.priorSummary?.trim()) {
    parts.push("\n## 이전 초안 요약\n", input.priorSummary.trim());
  }
  if (input.validatorFeedback?.trim()) {
    parts.push(
      "\n## 검증자 피드백 (반드시 반영하여 수정)\n",
      input.validatorFeedback.trim(),
    );
  }
  if (input.consensusRefinementFeedback?.trim()) {
    parts.push(
      "\n## 합의 감사(2차 LLM) 정제 지시 (최우선)\n",
      input.consensusRefinementFeedback.trim(),
    );
  }
  parts.push(
    "\n위만을 근거로 시스템 프롬프트의 **JSON 전용** 스키마에 맞춰 최종 응답을 생성하세요. `study_note_markdown` 안에 한국어 학습 노트 Markdown을 넣습니다.",
  );
  return parts.join("\n");
}
