import { createCipheriv, createECDH, createHash, randomBytes } from "node:crypto";
import { Buffer } from "node:buffer";
import type { VoiceProfileCryptoEnvelope } from "@/lib/media-persona/voice-crypto-types";

/** P-256 비압축 공개키(raw 65바이트) + JSON UTF-8 → ECDH + AES-256-GCM 암호문 */
export function encryptVoiceProfilePayloadForClient(
  clientPublicKeyUncompressed: Buffer,
  jsonUtf8: string,
): VoiceProfileCryptoEnvelope {
  if (clientPublicKeyUncompressed.length !== 65 || clientPublicKeyUncompressed[0] !== 0x04) {
    throw new Error("클라이언트 ECDH 공개키(raw 65바이트, 0x04…) 형식이 아닙니다.");
  }
  const serverEcdh = createECDH("prime256v1");
  serverEcdh.generateKeys();
  const sharedSecret = serverEcdh.computeSecret(clientPublicKeyUncompressed);
  const aesKey = createHash("sha256").update(sharedSecret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", aesKey, iv);
  const enc = Buffer.concat([cipher.update(jsonUtf8, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const serverPub = serverEcdh.getPublicKey();
  return {
    serverEphemeralPublicKeyB64: serverPub.toString("base64"),
    ivB64: iv.toString("base64"),
    ciphertextB64: enc.toString("base64"),
    authTagB64: tag.toString("base64"),
  };
}
