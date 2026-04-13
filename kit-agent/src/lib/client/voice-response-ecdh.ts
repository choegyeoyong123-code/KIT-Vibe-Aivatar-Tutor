/**
 * Voice DNA / 분석 결과 수신용 클라이언트 측 ECDH(P-256) + AES-GCM 복호화.
 * 서버는 암호문만 네트워크로 반환합니다(평문 JSON은 응답 본문에 포함하지 않음).
 */

import type { VoiceProfileCryptoEnvelope } from "@/lib/media-persona/voice-crypto-types";

export type VoiceProfileDecryptedBundle = {
  ttsInstructionsEn: string;
  analysis: {
    pitchHzEstimate: number | null;
    pitchQualitative: string;
    toneDescriptors: string[];
    speakingRate: string;
    ttsInstructionsEn: string;
  };
};

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function createVoiceProfileEcdhClientSession(): Promise<{
  clientPublicKeyB64: string;
  decryptEnvelope: (env: VoiceProfileCryptoEnvelope) => Promise<VoiceProfileDecryptedBundle>;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const raw = new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey));
  const clientPublicKeyB64 = btoa(String.fromCharCode(...raw));

  const decryptEnvelope = async (
    env: VoiceProfileCryptoEnvelope,
  ): Promise<VoiceProfileDecryptedBundle> => {
    const serverPubRaw = b64ToU8(env.serverEphemeralPublicKeyB64);
    const serverPub = await crypto.subtle.importKey(
      "raw",
      serverPubRaw as BufferSource,
      { name: "ECDH", namedCurve: "P-256" },
      false,
      [],
    );
    const bits = await crypto.subtle.deriveBits(
      { name: "ECDH", public: serverPub },
      keyPair.privateKey,
      256,
    );
    const aesRaw = await crypto.subtle.digest("SHA-256", bits);
    const aesKey = await crypto.subtle.importKey(
      "raw",
      aesRaw,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
    const iv = b64ToU8(env.ivB64);
    const cipher = b64ToU8(env.ciphertextB64);
    const tag = b64ToU8(env.authTagB64);
    const combined = new Uint8Array(cipher.length + tag.length);
    combined.set(cipher, 0);
    combined.set(tag, cipher.length);
    const plainBuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as BufferSource, tagLength: 128 },
      aesKey,
      combined as BufferSource,
    );
    const text = new TextDecoder().decode(plainBuf);
    const parsed = JSON.parse(text) as VoiceProfileDecryptedBundle;
    if (!parsed?.ttsInstructionsEn || !parsed?.analysis) {
      throw new Error("복호화 페이로드 형식이 올바르지 않습니다.");
    }
    return parsed;
  };

  return { clientPublicKeyB64, decryptEnvelope };
}
