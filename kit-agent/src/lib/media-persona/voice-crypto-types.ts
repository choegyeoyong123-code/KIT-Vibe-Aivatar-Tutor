/** 음성 분석 응답 ECDH+AES-GCM 봉투(서버→클라이언트 전용). */
export type VoiceProfileCryptoEnvelope = {
  serverEphemeralPublicKeyB64: string;
  ivB64: string;
  ciphertextB64: string;
  authTagB64: string;
};
