# VIBE-SOLO-SYNC

<div align="center">

**KIT Vibe-Coding Contest 2026 · 1st Place Ambition**

[![Security Pulse](https://img.shields.io/badge/Security%20Pulse-E2EE%20%2B%20PII%20masking-emerald?style=for-the-badge&logo=shield&logoColor=white)](./src/lib/client/voice-response-ecdh.ts)
[![Next.js](https://img.shields.io/badge/Next.js-App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Zen Learning](https://img.shields.io/badge/Zen%20Learning-calm%20focus-teal?style=for-the-badge)](./src/app/page.tsx)

</div>

---

## Zen Learning — 첫인상을 남기는 한 줄

> **“혼자서도, 호흡 맞춰.”**  
> VIBE-SOLO-SYNC는 *혼자 공부하는 속도*와 *멀티 에이전트가 동시에 숨 쉬는 리듬*을 맞춥니다.  
> 시각(Vision)으로 구조를 읽고, 페르소나(Persona)가 말을 거듭 다듬고, 미디어(Media)가 귀로 남기고, 보안(Security)이 그 순간만 지킵니다.

| 원칙 | 설명 |
|------|------|
| **Focus** | 한 화면 안에서 시각·대화·오디오 흐름이 끊기지 않게 설계 |
| **Calm tech** | 과장된 배지 대신 *Security Pulse*, *휘발성 미터*로 상태를 말함 |
| **Contest-ready** | 심사단이 `?golden=1` 만으로 **골든 패스** 시연 동선을 따라갈 수 있음 |

---

## Technical Architecture

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Next.js)                          │
│  PII Shield · Voice DNA ECDH envelope · Session-only secrets     │
└───────────────┬───────────────────────────────┬─────────────────┘
                │ HTTPS                          │
┌───────────────▼───────────────▼─────────────────▼───────────────┐
│                     API / Server (Node.js)                       │
│  Vision │ Persona orchestration │ Media pipeline │ Security     │
└─────────────────────────────────────────────────────────────────┘
```

| 레이어 | 역할 | 대표 경로 / 모듈 |
|--------|------|------------------|
| **Vision** | 다이어그램·이미지 → Logic JSON, 세션 퀴즈 | `/api/visual/logic-graph`, `visual-lab` |
| **Persona** | 교육 철학 페르소나 · 톤 · FinOps 모드 | `EducationalPersonaProvider`, `ZenLearningHeader` |
| **Media** | TTS · 스튜디오 멀티모달 · 고음질 오디오 | `/api/media/pipeline`, `/api/media/tts-hifi` |
| **Security** | PII 마스킹, 응답 E2EE 봉투, 레이트 리밋, 휘발성 UI | `sanitize-for-llm`, `voice-profile` 암호화 응답 |
| **Orchestrator (Edge)** | TTFB 최소 상태 펄스 | **`GET /api/orchestrator/status`** (Edge) |
| **Health (Node)** | 에이전트 구성 요소 준비도 | **`GET /api/health`** |

---

## Security Pulse (요약)

| 항목 | 상태 |
|------|------|
| **Voice DNA** | 클라이언트 ECDH 공개키로 서버 응답 **암호화 봉투**만 전달 (`voice-profile`) |
| **PII** | 정규식 1차 + (옵션) Gemini 2차 마스킹, 외부 LLM 입력 경로에 적용 |
| **휘발성** | 재생 종료 후 카운트다운 정리, TTS 버퍼 `fill(0)` 등 방어적 클리어 |

---

## 로컬 설치

| 단계 | 명령 |
|------|------|
| 1. Node | **20+** 권장 |
| 2. 의존성 | `npm ci` 또는 `npm install` |
| 3. 환경 변수 | `cp .env.example .env` 후 키 입력 |
| 4. 개발 서버 | `npm run dev` |
| 5. 골든 패스 데모 | 브라우저에서 **`/dashboard?golden=1`** 또는 **`/visual-lab?golden=1`** |

### 필수·선택 키 (요약)

> 전체 목록은 **[`.env.example`](./.env.example)** 참고.

| 변수 | 용도 |
|------|------|
| `GOOGLE_API_KEY` | Gemini (Vision, 음성 분석, PII LLM 가드) |
| `OPENAI_API_KEY` | 에이전트 / TTS 폴백 |
| `ANTHROPIC_API_KEY` | 크리에이티브 퀴즈·랩 (선택) |
| `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID` | 고음질 TTS (선택) |
| `PII_LLM_GUARD=1` | 서버 측 LLM 이차 PII 마스킹 |
| `NEXT_PUBLIC_PII_CLIENT_SCAN=1` | 클라이언트 `/api/privacy/pii-scan` 호출 |

---

## Vercel 배포

- **`vercel.json`**: `icn1` 리전, API 라우트 **최대 300s** (긴 오케스트레이션 대비).
- **Edge**: `GET /api/orchestrator/status` — 키 존재 여부만 빠르게 반환 (값 노출 없음).
- **Warmup**: `GET /health` → `/api/warmup` (그래프·LLM 모듈 프리로드).

```bash
vercel --prod
```

---

## 심사용 골든 패스

1. **`/dashboard?golden=1`** — 우측 하단 **골든 코치**가 단계별 안내.
2. **Visual Lab** 버튼 → 스튜디오에서 **다이어그램 업로드**.
3. **팬케이크 마법사** (`metaphor_mage` · 비유의 마술사) 페르소나 선택.
4. **`/media-studio?golden=1`** — **10초 내외** 목소리 녹음.
5. **`/visual-lab`** — Zen 파이프라인에서 퀴즈 후 **고음질 오디오** 재생.

---

## 스크립트

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run start` | 프로덕션 서버 |
| `npx tsc --noEmit` | 타입 검사 |

---

## 라이선스 & 크레딧

KIT Vibe-Coding 2026 제출용 프로젝트. 외부 API·모델 사용 시 각 제공사 약관을 준수하세요.

**VIBE-SOLO-SYNC** — *Pristine Workshop* 엔진 위의 솔로 학습 동기화 레이어.
