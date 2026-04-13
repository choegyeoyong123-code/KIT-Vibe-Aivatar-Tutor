/**
 * Privacy Shield — Voice DNA / TTS 지침을 **탭 단위 휘발성 세션**에만 둡니다.
 * - `sessionStorage`에는 **AES-GCM 암호문 + salt + iv**만 저장합니다(비밀번호·raw key 없음).
 * - PBKDF2 비밀 재료는 **메모리(Map)에만** 두어, 새로고침 시 복호화 불가(의도적 휘발).
 * - 서버는 HTTPS 요청 시점에만 평문을 받고 **로그·DB에 저장하지 않습니다**(API 구현 준수).
 */

const NS = "kit_vp_v1";
const KEY_MEM = new Map<string, CryptoKey | string>();

const ACTIVE_ID = `${NS}_active`;

function encKey(id: string): string {
  return `${NS}_raw_${id}`;
}

function cipherKey(id: string): string {
  return `${NS}_cipher_${id}`;
}

function materialKey(id: string): string {
  return `${NS}_pw_${id}`;
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem(ACTIVE_ID);
  if (!id) {
    id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem(ACTIVE_ID, id);
  }
  return id;
}

async function deriveKeyMaterial(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits", "deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 120_000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"],
  );
}

export type VoiceVolatilePayload = {
  tts_instructions_en?: string;
  voice_dna?: Record<string, unknown>;
  sealed_at?: string;
};

/**
 * Voice DNA + TTS 지침을 암호화해 sessionStorage에만 저장합니다.
 * 복호화 비밀은 메모리에만 있어 **새로고침 시 데이터는 사실상 폐기**됩니다.
 */
export async function sealVoiceVolatileSession(
  payload: VoiceVolatilePayload,
): Promise<{ sessionId: string }> {
  const sessionId = getSessionId();
  const password =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyMaterial(password, salt);
  KEY_MEM.set(encKey(sessionId), key);
  KEY_MEM.set(materialKey(sessionId), password);

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = new TextEncoder().encode(
    JSON.stringify({ ...payload, sealed_at: new Date().toISOString() }),
  );
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);

  const bundle = {
    v: 1,
    salt: btoa(String.fromCharCode(...salt)),
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(cipher))),
  };
  sessionStorage.setItem(cipherKey(sessionId), JSON.stringify(bundle));
  return { sessionId };
}

export async function unsealVoiceVolatileSession(
  sessionId?: string,
): Promise<VoiceVolatilePayload | null> {
  if (typeof window === "undefined") return null;
  const sid = sessionId ?? sessionStorage.getItem(ACTIVE_ID);
  if (!sid) return null;
  const raw = sessionStorage.getItem(cipherKey(sid));
  if (!raw) return null;
  const password = KEY_MEM.get(materialKey(sid));
  if (typeof password !== "string") return null;

  let bundle: { v: number; salt: string; iv: string; data: string };
  try {
    bundle = JSON.parse(raw) as typeof bundle;
  } catch {
    return null;
  }

  const salt = Uint8Array.from(atob(bundle.salt), (c) => c.charCodeAt(0));
  let key = KEY_MEM.get(encKey(sid));
  if (!(key instanceof CryptoKey)) {
    key = await deriveKeyMaterial(password, salt);
    KEY_MEM.set(encKey(sid), key);
  }
  const iv = Uint8Array.from(atob(bundle.iv), (c) => c.charCodeAt(0));
  const data = Uint8Array.from(atob(bundle.data), (c) => c.charCodeAt(0));
  try {
    const out = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key as CryptoKey, data);
    return JSON.parse(new TextDecoder().decode(out)) as VoiceVolatilePayload;
  } catch {
    return null;
  }
}

export function clearVoiceVolatileSession(): void {
  if (typeof window === "undefined") return;
  const sid = sessionStorage.getItem(ACTIVE_ID);
  if (sid) {
    sessionStorage.removeItem(cipherKey(sid));
    KEY_MEM.delete(encKey(sid));
    KEY_MEM.delete(materialKey(sid));
  }
  sessionStorage.removeItem(ACTIVE_ID);
}
