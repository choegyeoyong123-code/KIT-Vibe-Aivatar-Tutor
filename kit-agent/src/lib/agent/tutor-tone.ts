/**
 * Phase 3: KIT 자료 복잡도에 따른 튜터 톤 전환 (Supportive Guide ↔ Technical Architect).
 */

export type TutorToneMode = "supportive_guide" | "technical_architect";

const TECH_SIGNALS: RegExp[] = [
  /\b(?:API|REST|gRPC|JSON|YAML|protobuf|Kubernetes|k8s|Docker|CUDA|OpenCL|FPGA|SoC|SLA|latency|throughput|tensor|embedding|transformer|attention|backprop|SGD|Adam|hyperparameter|epoch|checkpoint|microservice|orchestration)\b/i,
  /(?:마이크로서비스|컨테이너|오케스트레이션|가속기|추론\s*지연|벡터\s*DB|임베딩\s*공간|손실\s*함수|그래디언트|빅\s*오|시간\s*복잡도)/,
  /(?:implementation|architecture|scalability|baseline|ablation|fine-?tuning)/i,
  /(?:프로젝트\s*명세|시스템\s*설계|실험\s*프로토콜|벤치마크|메트릭)/,
];

/** 길이·기술 시그널 밀도로 자료 난이도를 휴리스틱 추정 */
export function inferTutorToneFromMasterContext(text: string): TutorToneMode {
  const t = text.trim();
  if (t.length < 1) return "supportive_guide";

  let score = 0;
  if (t.length > 10_000) score += 2;
  else if (t.length > 5_000) score += 1;

  for (const re of TECH_SIGNALS) {
    const m = t.match(re);
    if (m) score += 1;
  }

  return score >= 3 ? "technical_architect" : "supportive_guide";
}

export function parseStudentDisplayName(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const t = raw.trim().replace(/[\u0000-\u001F]/g, "");
  if (t.length > 48) return `${t.slice(0, 47)}…`;
  return t;
}

export function tutorToneLabel(mode: TutorToneMode): string {
  return mode === "technical_architect"
    ? "Technical Architect (고난도·정밀 용어)"
    : "Supportive Guide (기초·비유·격려)";
}

/** `{{TUTOR_TONE_BLOCK}}` 주입용 — 토큰 절약을 위해 장문 가이드 대신 압축 블록 */
export function buildTutorToneInstructionBlock(mode: TutorToneMode): string {
  if (mode === "technical_architect") {
    return [
      "## (1b) TUTOR_TONE_MODE → **technical_architect**",
      "- 산업·학술 용어를 원자료 범위에서 정확히 사용; 섹션마다 약어 정의.",
      "- Application은 솔루션 스케치, Mastery는 트레이드오프·제약·측정 가능 기준 위주.",
    ].join("\n");
  }
  return [
    "## (1b) TUTOR_TONE_MODE → **supportive_guide**",
    "- 비유·짧은 문장·'왜 중요한지'를 Foundation에 배치.",
    "- Mastery는 격려 톤 유지, 불확실 구간은 명시.",
  ].join("\n");
}
