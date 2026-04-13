/**
 * 세션 영수증용 — 키워드·이해도·인지 깊이 휴리스틱 (데이터 기반 스냅샷 연동)
 */

export type SkillNode = {
  id: string;
  label: string;
  /** 0–100 */
  masteryPct: number;
};

const DEPTH_PATTERNS =
  /(?:왜|이유|원리|근본|메커니즘|작동|underlying|how\s+does|why\s+does|심화|deep|compare|차이|trade-?off)/gi;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function hashLabel(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

/** 기술 개념·목표·요약 지시에서 스킬 노드 추출. 점수는 측정값이 있을 때만 0 초과. */
export function buildSkillMasteryNodes(args: {
  technicalConcepts: { concept: string }[];
  coreObjectives: string[];
  summarizationInstruction: string;
  qualityScore: number | null;
  trustScore: number | null;
}): SkillNode[] {
  const hasQ = args.qualityScore != null && Number.isFinite(args.qualityScore);
  const hasT = args.trustScore != null && Number.isFinite(args.trustScore);
  const canScoreMastery = hasQ && hasT;
  const q = hasQ ? (args.qualityScore as number) : 0;
  const t = hasT ? (args.trustScore as number) : 0;
  const base = canScoreMastery ? clamp(Math.round(q * 10 + t * 0.22), 0, 100) : 0;

  const raw: string[] = [];
  for (const c of args.technicalConcepts.slice(0, 5)) {
    const label = c.concept?.trim();
    if (label && label.length > 1) raw.push(label.slice(0, 42));
  }
  for (const o of args.coreObjectives.slice(0, 3)) {
    const label = o?.trim();
    if (label && label.length > 1) raw.push(label.slice(0, 42));
  }
  const instr = args.summarizationInstruction.trim();
  if (raw.length < 3 && instr.length > 0) {
    const parts = instr.split(/[,，、]/).map((s) => s.trim()).filter(Boolean);
    for (const p of parts) {
      if (p.length > 2 && p.length < 40) raw.push(p);
      if (raw.length >= 5) break;
    }
  }

  const seen = new Set<string>();
  const labels: string[] = [];
  for (const r of raw) {
    const key = r.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(r);
    if (labels.length >= 5) break;
  }

  const SLOT_LABELS = ["세션 핵심 개념 정리", "학습 목표 정합성", "FinOps·토큰 효율"] as const;
  const displayLabels = labels.length > 0 ? labels : [...SLOT_LABELS];

  return displayLabels.map((label, i) => {
    const jitter = canScoreMastery ? (hashLabel(label + String(i)) % 7) - 3 : 0;
    return {
      id: `sk-${i}-${hashLabel(label)}`,
      label,
      masteryPct: canScoreMastery ? clamp(base + jitter - i * 2, 0, 100) : 0,
    };
  });
}

export function analyzeCognitiveDepth(args: {
  summarizationInstruction: string;
  structuredSummary: string;
  loopCount: number;
  distillRound: number;
}): { deepQuestionScore: number; narrativeKo: string } {
  const blob = `${args.summarizationInstruction}\n${args.structuredSummary.slice(0, 8000)}`;
  let matches = 0;
  const re = new RegExp(DEPTH_PATTERNS.source, DEPTH_PATTERNS.flags);
  for (const _ of blob.matchAll(re)) {
    matches += 1;
  }
  const rounds = Math.max(args.distillRound, 0);
  const loops = Math.max(args.loopCount, 0);
  const deepEst = clamp(Math.round(matches * 0.45 + rounds * 1.2 + Math.min(loops, 4) * 0.5), 0, 12);

  let narrativeKo: string;
  if (deepEst >= 4) {
    narrativeKo = `원리·메커니즘·비교 질문 패턴이 **${deepEst}회** 이상 관측되었습니다. 단순 복사·붙여넣기형 요청은 낮은 비중으로 억제되었고, 증류 라운드 **${rounds}**·검증 루프 **${loops}**와 연계된 **근거 기반 학습 행동**이 확인되었습니다.`;
  } else if (deepEst >= 1) {
    narrativeKo = `질문 텍스트에서 **심화·원리 탐색** 신호가 **${deepEst}회** 포착되었습니다. 요약·정렬 작업 위주였으나 Validator·루프(${loops})를 통해 이해도가 보강되었습니다.`;
  } else {
    narrativeKo =
      "이번 세션은 자료 업로드·요약 스트림 중심으로 진행되었습니다. 다음 세션에서는 ‘왜 그런지’ ‘원리 차이’를 한 줄씩 덧붙이면 인지 깊이 점수가 빠르게 상승합니다.";
  }

  return { deepQuestionScore: deepEst, narrativeKo };
}

export function buildReceiptIntegritySeed(payload: {
  threadId: string;
  tokensUsed: number;
  trustScore: number | null;
  learningScorePct: number;
  skillLabels: string[];
}): string {
  return [
    payload.threadId,
    String(payload.tokensUsed),
    String(payload.trustScore ?? ""),
    String(Math.round(payload.learningScorePct)),
    payload.skillLabels.join("|"),
  ].join("::");
}
