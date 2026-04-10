/** Video_Synthesis_Orchestrator — Agent Trace용 짧은 위트 메시지 (Strategy 9) */
export const VIDEO_SYNTHESIS_ENGAGEMENT_LINES = [
  "Video_Synthesis_Orchestrator: AI가 당신의 얼굴 특징을 암기하는 중… (잠깐의 디지털 거울)",
  "Video_Synthesis_Orchestrator: 아바타 의상·스타일 프리셋을 픽셀 단위로 설득 중입니다.",
  "Video_Synthesis_Orchestrator: 립싱크 곡선을 그리기 전에, 오디오 파형과 악수하는 중.",
  "Video_Synthesis_Orchestrator: GPU가 커피 마시는 동안 저는 진행 바를 우아하게 채웁니다.",
  "Video_Synthesis_Orchestrator: 배경 보드에 KIT 톤을 입히는 중 — 공모전 심사용 ‘보이는 품질’ 모드.",
  "Video_Synthesis_Orchestrator: Replicate와 ffmpeg 사이에서 중재자 역할(폴백 준비 완료).",
];

export function pickVideoSynthesisEngagementLine(index: number): string {
  const n = VIDEO_SYNTHESIS_ENGAGEMENT_LINES.length;
  const i = ((index % n) + n) % n;
  return VIDEO_SYNTHESIS_ENGAGEMENT_LINES[i]!;
}
