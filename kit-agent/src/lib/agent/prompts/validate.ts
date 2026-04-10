import type {
  DistilledData,
  ValidationResultPayload,
  ValidatorNextGraphNode,
} from "@/lib/agent/types";

/** mockComplete 등에서 검증 분기 식별용 */
export const VALIDATE_SYSTEM_MARKER = "KIT_ADVERSARIAL_VALIDATOR_V1";

function formatDistilledDataBlock(data: DistilledData | null | undefined): string {
  if (!data) return "";
  const lines: string[] = ["## DISTILLED_DATA (증류 구조화 필드)"];
  if (data.core_learning_objectives.length) {
    lines.push("### core_learning_objectives");
    data.core_learning_objectives.forEach((o, i) => lines.push(`${i + 1}. ${o}`));
  }
  if (data.technical_concepts.length) {
    lines.push("### technical_concepts (why/how)");
    for (const c of data.technical_concepts) {
      lines.push(`- **${c.concept}** — Why: ${c.why} — How: ${c.how}`);
    }
  }
  if (data.key_takeaways.length) {
    lines.push("### key_takeaways");
    data.key_takeaways.forEach((k, i) => lines.push(`${i + 1}. ${k}`));
  }
  if (data.cot_reasoning.trim()) {
    lines.push("### cot_reasoning (요약)");
    lines.push(data.cot_reasoning.trim());
  }
  if (data.reasoning_rationale.trim()) {
    lines.push("### reasoning_rationale (근거 기반 결정 요약)");
    lines.push(data.reasoning_rationale.trim());
  }
  return lines.join("\n");
}

export const VALIDATE_SYSTEM = `${VALIDATE_SYSTEM_MARKER}
당신은 **무자비한 교육 콘텐츠 감사관(Ruthless Educational Content Auditor)** 입니다. Knowledge_Distiller 산출물을 MASTER CONTEXT와 대조합니다.

평가 기준 (각 1~2문장으로 근거를 적되, **장문 금지** — 컨텍스트 팽창 방지):
1) **Technical accuracy**: KIT·해당 도메인 용어·사실이 원자료와 어긋나거나 환각이 없는가.
2) **Clarity**: 한 학기 수준 학생이 따라가기에 문장·구조가 충분히 명확한가.
3) **Goal alignment**: 공모전/혁신 학습(멀티모달·AI 보조 학습) 주제와 학습 목표에 정합한가; 빈번한 일반론만 있으면 감점.

**통과선: 9/10 이상**만 합격. 8 이하·8점대는 **전부 불합격**으로 간주하고 구체적 재작성 지시를 \`rewriteInstructions\`에 적습니다 (3~6개 불릿, 각 ≤140자).

반드시 아래 JSON 스키마로만 응답하세요. 다른 텍스트는 금지합니다.
{
  "score": <1-10 정수, 10이 만점>,
  "technicalAccuracy": "<한 문단, ≤400자>",
  "goalAlignment": "<한 문단, ≤400자>",
  "clarity": "<한 문단, ≤400자>",
  "coverage": "<선택: goalAlignment와 동일 요지를 한 문장으로 요약; 생략 시 빈 문자열>",
  "rewriteInstructions": "<score < 9 일 때만: Knowledge_Distiller에 줄 실행 가능한 수정 지시. score ≥ 9 이면 빈 문자열>",
  "nextNode": "score>=9 일 때 정확히 CFO_Agent, 미만이면 Knowledge_Distiller (따옴표 포함 리터럴)"
}`;

export function buildValidateUserPayload(input: {
  masterContext: string;
  structuredSummary: string;
  distilledData?: DistilledData | null;
}): string {
  const parts = [
    "## MASTER CONTEXT",
    input.masterContext.trim(),
    "\n## STRUCTURED SUMMARY (학습 노트 마크다운 초안)",
    input.structuredSummary.trim(),
  ];
  const dd = formatDistilledDataBlock(input.distilledData ?? null);
  if (dd) parts.push("\n", dd);
  return parts.join("");
}

function normalizeNextNode(
  score: number,
  parsed: string | undefined,
): ValidatorNextGraphNode {
  const pass = score >= 9;
  const want: ValidatorNextGraphNode = pass ? "CFO_Agent" : "Knowledge_Distiller";
  if (parsed === "CFO_Agent" || parsed === "Knowledge_Distiller") {
    if ((parsed === "CFO_Agent" && pass) || (parsed === "Knowledge_Distiller" && !pass)) {
      return parsed;
    }
  }
  return want;
}

export function parseValidationJson(raw: string): ValidationResultPayload {
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;
  if (typeof parsed.score !== "number") throw new Error("Invalid validation: score");
  const score = Math.min(10, Math.max(1, Math.round(parsed.score)));
  const goalAlignment = String(
    parsed.goalAlignment ?? parsed.coverage ?? "",
  );
  const coverageLegacy = String(parsed.coverage ?? goalAlignment);
  const nextNode = normalizeNextNode(
    score,
    typeof parsed.nextNode === "string" ? parsed.nextNode : undefined,
  );
  return {
    score,
    technicalAccuracy: String(parsed.technicalAccuracy ?? ""),
    coverage: coverageLegacy,
    clarity: String(parsed.clarity ?? ""),
    goalAlignment: goalAlignment || coverageLegacy,
    rewriteInstructions: String(parsed.rewriteInstructions ?? ""),
    nextNode,
  };
}
