import type { AvatarLectureJob } from "@/lib/avatar/types";
import type { DistilledData } from "@/lib/agent/types";

function section(title: string, body: string): string {
  const b = body.trim();
  if (!b) return "";
  return `## ${title}\n\n${b}\n\n`;
}

/** DistilledData → 심사·학습용 정적 마크다운 (비디오 폴백) */
export function studyGuideMarkdownFromDistilledData(data: DistilledData): string {
  const parts: string[] = [
    "# 고품질 정적 학습 가이드 (비디오 대체)\n",
    "_Replicate/합성 경로가 지연·실패한 경우 자동 생성되었습니다._\n\n",
  ];
  if (data.core_learning_objectives.length) {
    parts.push(
      section(
        "핵심 학습 목표",
        data.core_learning_objectives.map((o, i) => `${i + 1}. ${o}`).join("\n"),
      ),
    );
  }
  if (data.technical_concepts.length) {
    const lines = data.technical_concepts.map(
      (c) =>
        `### ${c.concept || "개념"}\n- **Why:** ${c.why}\n- **How:** ${c.how}`,
    );
    parts.push(section("기술 개념 (Why / How)", lines.join("\n\n")));
  }
  if (data.key_takeaways.length) {
    parts.push(
      section(
        "핵심 테이크어웨이",
        data.key_takeaways.map((k, i) => `${i + 1}. ${k}`).join("\n"),
      ),
    );
  }
  if (data.cot_reasoning.trim()) {
    parts.push(section("증류 요약 (CoT)", data.cot_reasoning));
  }
  return parts.join("").trim();
}

export function studyGuideMarkdownTopicOnly(topic: string): string {
  const t = topic.trim() || "KIT 학습 주제";
  return [
    "# 고품질 정적 학습 가이드 (비디오 대체)",
    "",
    `_주제: **${t}**_`,
    "",
    "비디오 합성이 완료되지 않았습니다. 아래는 동일 세션 맥락에서 제공할 수 있는 최소 학습 골격입니다.",
    "",
    "## 복습 체크리스트",
    "",
    `- [ ] ${t}의 핵심 용어 3개를 말로 설명할 수 있다.`,
    "- [ ] 원자료(강의/자료)와 대조해 환각 없이 요약할 수 있다.",
    "- [ ] 다음 학습 단계에서 무엇을 더 찾아볼지 1문장으로 적는다.",
    "",
  ].join("\n");
}

/** 작업에 저장된 자료로 정적 가이드 생성 */
export function buildStaticStudyGuideMarkdown(job: AvatarLectureJob): string {
  if (job.studyGuideMarkdown?.trim()) return job.studyGuideMarkdown.trim();
  if (job.distilledData) return studyGuideMarkdownFromDistilledData(job.distilledData);
  return studyGuideMarkdownTopicOnly(job.topicContext);
}
