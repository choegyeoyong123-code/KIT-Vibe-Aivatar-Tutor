import type { DynamicPersonaId } from "@/lib/agent/persona/types";
import { DEFAULT_DYNAMIC_PERSONA_ID } from "@/lib/agent/persona/persona-presets";

export type PersonaSecurityOutcome =
  | { ok: true; personaId: DynamicPersonaId }
  | {
      ok: false;
      /** revert만 */
      action: "revert";
      reasonKo: string;
    }
  | {
      ok: false;
      /** 심각 — HITL 권장 */
      action: "hitl";
      reasonKo: string;
    };

const HARM_PATTERNS: { re: RegExp; hitl: boolean; msg: string }[] = [
  {
    re: /폭력\s*(을|를)?\s*(가르|교육|장려)|테러|폭탄\s*만들|살인/i,
    hitl: true,
    msg: "폭력·불법 행위를 교육 목적으로 요청할 수 없습니다.",
  },
  {
    re: /(아동|미성년).{0,12}(성적|노출)|csam|child\s*porn/i,
    hitl: true,
    msg: "아동 안전 정책에 위배되는 요청입니다.",
  },
  {
    re: /증오|인종\s*혐오|장애\s*비하\s*(으로|로)\s*가르/i,
    hitl: true,
    msg: "증오·차별을 교육 톤으로 사용할 수 없습니다.",
  },
  {
    re: /시험\s*부정행위|대리\s*시험|답안\s*유출\s*도와/i,
    hitl: false,
    msg: "학업 부정행위를 돕는 페르소나·톤은 허용되지 않습니다.",
  },
];

/**
 * Security_Guardian: 교육적으로 타당한 페르소나인지 검증.
 */
export function verifyEducationalPersonaRequest(
  userText: string,
  requested: DynamicPersonaId,
): PersonaSecurityOutcome {
  const t = userText.trim();

  for (const { re, hitl, msg } of HARM_PATTERNS) {
    if (re.test(t)) {
      return hitl
        ? { ok: false, action: "hitl", reasonKo: msg }
        : { ok: false, action: "revert", reasonKo: msg };
    }
  }

  // 랩/힙합 페르소나는 창의적이나, 명시적 비속어 요청은 차단
  if (requested === "energetic_rapper") {
    if (/욕\s*써|비속어|섹시하게|19금|음란/i.test(t)) {
      return {
        ok: false,
        action: "revert",
        reasonKo:
          "교실 안전 기준에 맞춰 운율·에너지는 유지하되, 비속·선정 톤은 사용할 수 없습니다. Warm Instructor로 되돌립니다.",
      };
    }
  }

  return { ok: true, personaId: requested };
}

export function revertPersona(): DynamicPersonaId {
  return DEFAULT_DYNAMIC_PERSONA_ID;
}
