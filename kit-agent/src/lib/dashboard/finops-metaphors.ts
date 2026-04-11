/**
 * 토큰·비용 절감을 일상 비유로 변환 (교육용 리포트 카피)
 * 수치는 대략적 인상용이며 실제 탄소·물가와 1:1 대응하지 않습니다.
 */

const TOKENS_PER_TREE_EQUIVALENT = 12_000;
const USD_PER_COFFEE = 4.5;

export type FinOpsMetaphorPack = {
  /** “나무 N그루” 심은 효과에 해당 (반올림, 최소 0) */
  treeEquivalence: number;
  /** 아메리카노 N잔 분량 비용 절감에 가깝다는 비유 */
  coffeeCups: number;
  treeCopy: string;
  coffeeCopy: string;
};

export function buildFinOpsMetaphors(input: {
  tokensSaved: number;
  totalSavingsUsd: number;
}): FinOpsMetaphorPack {
  const treeEquivalence = Math.max(
    0,
    Math.round(input.tokensSaved / TOKENS_PER_TREE_EQUIVALENT),
  );
  const coffeeCups =
    input.totalSavingsUsd > 0
      ? Math.round((input.totalSavingsUsd / USD_PER_COFFEE) * 10) / 10
      : 0;

  const treeCopy =
    treeEquivalence < 1
      ? "오늘 절감한 토큰이 모이면, 곧 숲 한 그루를 심은 것과 비슷한 효과에 가까워져요."
      : `오늘 절감한 토큰만으로도 나무 ${treeEquivalence}그루를 심은 것과 비슷한 환경 기여에 가깝다고 볼 수 있어요.`;

  const coffeeCopy =
    coffeeCups < 0.1
      ? "절감한 비용은 아직 커피 한 잔에 못 미치지만, 꾸준히 쌓이면 체감이 커져요."
      : `절감한 비용은 카페 아메리카노 약 ${coffeeCups}잔 분량에 가깝다고 생각하면 이해하기 쉬워요.`;

  return {
    treeEquivalence,
    coffeeCups,
    treeCopy,
    coffeeCopy,
  };
}
