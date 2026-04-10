import type { DynamicPersonaId } from "@/lib/agent/persona/types";

/**
 * 사용자 자연어에서 페르소나 전환 의도를 탐지 (데모용 규칙 기반).
 * null이면 기존 currentPersona 유지.
 */
export function scanPersonaChangeIntent(text: string): DynamicPersonaId | null {
  const t = text.trim();
  if (!t) return null;

  const detectors: { id: DynamicPersonaId; re: RegExp }[] = [
    {
      id: "energetic_rapper",
      re: /hip[-\s]?hop|힙합|랩(?:퍼)?\s*처럼|rapper|비트에\s*맞춰|운율|리듬감\s*있게|라임/i,
    },
    {
      id: "strict_coach",
      re: /be\s+more\s+strict|stricter|더\s*엄격|엄격하게|깐깐하게|빡세게|까다롭게|코치\s*처럼/i,
    },
    {
      id: "zen_guide",
      re: /meditation|명상|젠|zen|천천히|차분하게|릴렉스|soothing\s+voice/i,
    },
    {
      id: "curious_explorer",
      re: /curious|호기심|탐험|질문을\s*많이|왜\?라고\s*묻는|탐구/i,
    },
    {
      id: "warm_instructor",
      re: /warm|따뜻|다정|gentle|부드럽게|포근|친절한\s*선생/i,
    },
  ];

  for (const { id, re } of detectors) {
    if (re.test(t)) return id;
  }
  return null;
}
