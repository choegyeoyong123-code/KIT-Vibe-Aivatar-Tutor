/**
 * Token-efficient variable injection for system prompts ({{PLACEHOLDER}}).
 */

const PLACEHOLDER_RE = /\{\{([A-Z0-9_]+)\}\}/g;

export function injectPromptPlaceholders(
  template: string,
  vars: Record<string, string>,
): string {
  return template.replace(PLACEHOLDER_RE, (_full, key: string) => {
    const v = vars[key];
    return v !== undefined ? v : `{{${key}}}`;
  });
}

/**
 * 가정: 동일 페르소나 지시를 정적 본문에 **여러 경로에서 중복 삽입**하지 않고,
 * 단일 `{{PERSONA_INSTRUCTION}}` 슬롯으로 주입해 전송 바이트를 줄임.
 * (심사·CFO 로깅용 추정치; 실제 청구 토큰은 프로바이더 기준)
 */
export function estimatePersonaInjectionSavings(personaInstructionChars: number): {
  duplicateBlocksAvoided: number;
  estimatedSavedTokens: number;
} {
  const duplicateBlocksAvoided = 2;
  const savedChars = personaInstructionChars * duplicateBlocksAvoided;
  return {
    duplicateBlocksAvoided,
    estimatedSavedTokens: Math.max(0, Math.floor(savedChars / 4)),
  };
}
