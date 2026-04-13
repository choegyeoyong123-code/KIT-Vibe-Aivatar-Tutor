/** 코리아 IT 아카데미 — 취업 역량(Employability) 5각 레이더 스코어 */

export type RadarAxisKey =
  | "logic"
  | "optimization"
  | "security"
  | "cleanCode"
  | "debugging";

export const RADAR_AXIS_ORDER: RadarAxisKey[] = [
  "logic",
  "optimization",
  "security",
  "cleanCode",
  "debugging",
];

export const RADAR_LABELS_KO: Record<RadarAxisKey, string> = {
  logic: "Logic",
  optimization: "Optimization",
  security: "Security",
  cleanCode: "Clean Code",
  debugging: "Debugging",
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

export type RadarScores = Record<RadarAxisKey, number>;

export function defaultRadarScores(): RadarScores {
  return {
    logic: 0,
    optimization: 0,
    security: 0,
    cleanCode: 0,
    debugging: 0,
  };
}

/** Trust·품질·루프·요약 길이로 기본 프로필 산출 */
export function deriveRadarScores(args: {
  trustScore: number | null;
  qualityScore: number | null;
  loopCount: number;
  summaryLength: number;
}): RadarScores {
  const hasT = args.trustScore != null && Number.isFinite(args.trustScore);
  const hasQ = args.qualityScore != null && Number.isFinite(args.qualityScore);
  if (!hasT && !hasQ) {
    return { logic: 0, optimization: 0, security: 0, cleanCode: 0, debugging: 0 };
  }
  const t = hasT ? (args.trustScore as number) : 0;
  const q = hasQ ? (args.qualityScore as number) : 0;
  const loops = Math.min(8, Math.max(0, args.loopCount));
  const len = Math.min(1, args.summaryLength / 8000);

  const base = 38 + t * 0.22 + q * 4.2 + loops * 2.1 + len * 18;

  return {
    logic: clamp(Math.round(base + 6 + (q % 3)), 0, 96),
    optimization: clamp(Math.round(base + 2 + loops * 1.5), 0, 96),
    security: clamp(Math.round(base - 4 + t * 0.05), 0, 96),
    cleanCode: clamp(Math.round(base + len * 12), 0, 96),
    debugging: clamp(Math.round(base - 2 + loops * 0.8), 0, 96),
  };
}

/** 파이프라인 완료 시 한 축 가중 상승 + 표시용 라벨 */
export function bumpRadarOnCompletion(
  prev: RadarScores,
  summaryText: string,
): { next: RadarScores; axis: RadarAxisKey; delta: number } {
  const lower = summaryText.toLowerCase();
  const pickAxis = (): RadarAxisKey => {
    if (/보안|security|zero-trust|취약|암호|인증/.test(lower)) return "security";
    if (/최적|비용|토큰|캐시|성능|복잡도|O\(/.test(lower)) return "optimization";
    if (/버그|디버그|에러|stack|로그/.test(lower)) return "debugging";
    if (/가독|리팩|클린|네이밍|모듈|테스트/.test(lower)) return "cleanCode";
    return "logic";
  };

  const axis = pickAxis();
  const delta = 3 + Math.floor(Math.random() * 4);
  const next = { ...prev, [axis]: clamp(prev[axis] + delta, 25, 100) };
  return { next, axis, delta };
}
