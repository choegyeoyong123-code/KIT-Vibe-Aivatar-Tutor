/**
 * PII Shield — 정규식 기반 1차 마스킹 (이메일·전화·일부 식별자).
 * 서버/클라이언트 공용. 로그에 원문을 남기지 마세요.
 */

const EMAIL_RE =
  /[A-Z0-9._%+-]{1,64}@[A-Z0-9.-]{1,253}\.[A-Z]{2,63}/gi;

/** 한국 휴대폰 / 지역번호 / 대표번호 등 */
const PHONE_KR_RE =
  /(?:\+?82[\s.-]?)?0(?:1[016789]|2|3[1-3]|4[1-4]|5[1-5]|6[1-4])[\s.-]?\d{3,4}[\s.-]?\d{4}\b/g;

/** 국제·일반 숫자 덩어리(너무 짧은 건 제외) */
const PHONE_INTL_RE =
  /\+?\d[\d\s().-]{8,}\d\b/g;

/** 주민번호 형태(앞 6 + 뒤 7) */
const RRN_LIKE_RE = /\b\d{6}[- ]?[1-4]\d{6}\b/g;

/** 카드 16자리(간단) */
const CARD_LIKE_RE = /\b(?:\d[ -]*?){15,16}\d\b/g;

export type RegexPiiResult = {
  text: string;
  replacements: number;
};

export function applyRegexPiiMask(input: string): RegexPiiResult {
  let text = input;
  let replacements = 0;
  const bump = (m: string) => {
    replacements += m ? 1 : 0;
    return "[PROTECTED_INFO]";
  };
  text = text.replace(EMAIL_RE, (m) => {
    replacements++;
    return "[PROTECTED_INFO]";
  });
  text = text.replace(RRN_LIKE_RE, bump);
  text = text.replace(CARD_LIKE_RE, bump);
  text = text.replace(PHONE_KR_RE, (m) => {
    replacements++;
    return "[PROTECTED_INFO]";
  });
  text = text.replace(PHONE_INTL_RE, (m) => {
    const digits = m.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 16) return m;
    replacements++;
    return "[PROTECTED_INFO]";
  });
  return { text, replacements };
}
