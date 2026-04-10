/** Engagement Orchestrator — 업로드 직후·장시간 작업 중 사이드바용 짧은 메시지 */
export const ENGAGEMENT_ORCHESTRATOR_LINES = [
  "심사위원님, 3초 안에 ‘뭔가 돌아간다’는 느낌 드리는 게 제 KPI예요. ☕",
  "PDF는 이미 제 책상 위에 펼쳐졌고요, MP4는 카페인 마신 듯 달려가고 있어요.",
  "증류기 돌기 전에도 뇌는 이미 학습 모드…라고 믿고 계시죠? 믿으셔도 됩니다.",
  "콜드스타트? 그건 워밍업 크론한테 맡기고 저는 멘탈만 따뜻하게.",
  "CFO가 숫자 세는 동안, 저는 분위기 메이커로 남겠습니다. 숫자는… 존중.",
  "멀티모달이면 다 된다? 아니죠. ‘보여주기’까지 가야 1등이죠.",
  "지금 이 순간에도 Replicate GPU는 어딘가에서 요가 자세 중일 수 있어요.",
];

export function pickOrchestratorLine(index: number): string {
  const i = ((index % ENGAGEMENT_ORCHESTRATOR_LINES.length) +
    ENGAGEMENT_ORCHESTRATOR_LINES.length) %
    ENGAGEMENT_ORCHESTRATOR_LINES.length;
  return ENGAGEMENT_ORCHESTRATOR_LINES[i]!;
}
