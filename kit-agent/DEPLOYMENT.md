# KIT Vibe-Coding — 프로덕션 배포 가이드

Next.js 16 앱을 **커스텀 도메인**과 **HTTPS**로 공개하고, GitHub `main` 푸시 시 자동 배포되도록 구성하는 절차입니다.

**`.env.local` → Vercel 매핑, `.com` / `.ai` DNS·SSL 단계별 체크**는 [`docs/VERCEL_DOMAIN_CHECKLIST.md`](./docs/VERCEL_DOMAIN_CHECKLIST.md) 를 함께 사용하세요.

## 1. 사전 준비

- GitHub 저장소에 코드 푸시
- [Vercel](https://vercel.com) 또는 [Cloudflare](https://www.cloudflare.com) 계정
- **비밀 키는 클라이언트에 두지 않음** — `OPENAI_*`, `GOOGLE_*`, `ANTHROPIC_*`, `REPLICATE_*` 등은 Vercel/Cloudflare **Environment Variables**에만 설정

### 프로덕션 필수·권장 환경 변수

| Vercel에 넣는 이름 | 앱에서 실제로 쓰는 변수 | 용도 |
|-------------------|----------------------|------|
| `GEMINI_API_KEY` (선택 별칭) | `GOOGLE_API_KEY`가 비어 있을 때 동일 값으로 주입 | Gemini 멀티모달·증류·합의 |
| `CLAUDE_API_KEY` (선택 별칭) | `ANTHROPIC_API_KEY`가 비어 있을 때 동일 값으로 주입 | Visual Lab 크리에이티브 |
| `REPLICATE_API_KEY` (선택 별칭) | `REPLICATE_API_TOKEN`이 비어 있을 때 동일 값으로 주입 | 아바타 립싱크 등 |
| (표준) `GOOGLE_API_KEY` | 그대로 | 위 별칭보다 **표준 이름을 권장** (문서·예제와 일치) |
| (표준) `ANTHROPIC_API_KEY` | 그대로 | Claude API |
| (표준) `REPLICATE_API_TOKEN` | 그대로 | Replicate HTTP API |

별칭은 `instrumentation.ts` 및 LLM/Replicate 모듈 로드 시 한 번 적용됩니다.

| 변수 | 용도 |
|------|------|
| `NEXT_PUBLIC_APP_URL` | 공개 사이트 **https://** 도메인 (끝 `/` 없음). OG·sitemap·Replicate 콜백 URL에 사용 |
| `UPSTASH_REDIS_REST_URL` | 분산 **레이트 리밋** (권장) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash REST 토큰 |
| LLM / Replicate 관련 키 | `.env.example` 참고 — **서버 전용** |

Upstash를 켜 두면 레이트 리밋이 모든 서버리스 인스턴스에서 공유됩니다. 미설정 시에는 **인스턴스별 메모리 폴백**으로 동작하며, 트래픽이 분산되면 한도가 느슨해질 수 있습니다.

선택 조정:

- `RATE_LIMIT_REPLICATE_PER_MINUTE` (기본 12)
- `RATE_LIMIT_LLM_PER_MINUTE` (기본 24)
- `RATE_LIMIT_MEDIA_RENDER_PER_MINUTE` (기본 8)
- `RATE_LIMIT_STANDARD_PER_MINUTE` (기본 90)

## 2. Vercel 배포 (권장)

1. Vercel 대시보드 → **Add New Project** → GitHub 저장소 연결
2. **Framework Preset**: Next.js (자동 인식)
3. **Environment Variables**에 `.env.example` 기준으로 프로덕션 값 입력  
   - `NEXT_PUBLIC_APP_URL`은 나중에 커스텀 도메인 확정 후 `https://your-domain.edu` 로 수정·재배포
4. **Deploy** — 이후 `main` 브랜치에 푸시할 때마다 프로덕션 배포가 갱신됩니다 (기본 설정).

### 커스텀 도메인·DNS

1. Vercel 프로젝트 → **Settings → Domains** → 도메인 추가
2. 안내에 따라 DNS 설정:

**서브도메인 예: `app.kit.example`**

- **CNAME**: 이름 `app` → 값 `cname.vercel-dns.com` (Vercel이 표시하는 대상 사용)

**루트 도메인 예: `kit.example`**

- **A 레코드**: `@` → Vercel이 안내하는 IP (또는 ALIAS/ANAME이 가능한 DNS면 CNAME 평탄화)

3. DNS 전파 후 Vercel이 **SSL 인증서(Let’s Encrypt)** 를 자동 발급합니다.  
4. `NEXT_PUBLIC_APP_URL`을 최종 `https://…` 로 맞추고 재배포하면 Open Graph·sitemap·Replicate 공개 URL이 일치합니다.

### HTTPS 강제

- Vercel은 기본적으로 HTTPS로 제공합니다.
- 앱 `middleware`에서 로컬이 아닌 호스트에 **HSTS** 헤더(`Strict-Transport-Security`)를 추가해 브라우저가 이후 요청도 HTTPS로 붙도록 합니다.
- **Always Use HTTPS** 류 옵션은 Cloudflare를 쓸 때 대시보드 **SSL/TLS → Overview** 에서 **Full (strict)** 과 리다이렉트 규칙으로 보강할 수 있습니다.

### `vercel.json`

저장소 루트의 `vercel.json`은 기본적으로 **서울 리전(`icn1`)** 을 사용하도록 설정되어 있습니다. 다른 리전이 필요하면 `regions`를 변경하세요.

- **`/api/warmup`**: 서버리스에서 LangGraph·LLM 번들을 미리 로드해 콜드 스타트를 줄입니다. 수동으로 `GET /api/warmup` 또는 `GET /health`(동일 동작)을 호출해도 됩니다.
- **Cron**: 약 8분마다 `/api/warmup`을 호출하도록 설정되어 있습니다. 플랜에 따라 Cron이 비활성화일 수 있으면 대시보드에서 Cron을 끄거나 `vercel.json`의 `crons` 항목을 제거해도 앱 동작에는 영향이 없습니다.

### Progressive Learning 스트림 (`/api/agent/run-stream`)

대시보드는 기본적으로 **NDJSON**(`application/x-ndjson`)으로 `summary` 델타와 `orchestrator` 메시지를 푸시합니다. Vercel AI SDK의 `useChat`과 직접 붙이려면 동일 이벤트 형식으로 어댑터를 두거나, 클라이언트에서 `fetch` + `ReadableStream`으로 파싱하면 됩니다.

## 3. Cloudflare Pages (대안)

Next.js 전체 기능(App Router, 긴 실행 API Route)은 **Cloudflare Pages 단독**보다 Vercel이 단순한 경우가 많습니다. Cloudflare에서 Next를 쓰려면 [OpenNext](https://opennext.js.org/) / `@cloudflare/next-on-pages` 등 어댑터와 빌드 파이프라인이 추가로 필요할 수 있습니다.

Cloudflare를 **프록시 + DNS**로만 쓰고 앱은 Vercel에 두는 구성이 흔합니다:

1. 도메인 DNS를 Cloudflare로 이전
2. `CNAME`으로 Vercel 타겟 연결
3. SSL/TLS: **Full (strict)**
4. **Rules**에서 `http://` → `https://` 리다이렉트

## 4. SEO·브랜딩 (이미 코드에 반영됨)

- `src/app/layout.tsx`: **KIT Vibe-Coding** 메타데이터, Open Graph, Twitter 카드
- `src/app/opengraph-image.tsx`: 공유 시 표시되는 1200×630 이미지
- `src/app/sitemap.ts` → `/sitemap.xml`
- `src/app/robots.ts` → `/robots.txt` (`/api/` 는 크롤 제외)

## 5. 보안 체크리스트 (심사용 URL 공개 시)

- [ ] `NEXT_PUBLIC_*` 에 API 시크릿을 넣지 않았는지 확인 (현재 설계는 토큰 비공개)
- [ ] 프로덕션에 **Upstash** 레이트 리밋 연결
- [ ] `NEXT_PUBLIC_APP_URL` 이 실제 공개 URL과 동일한지 확인
- [ ] Vercel **Deployment Protection** 등 필요 시 비밀번호/팀 제한 검토

## 6. GitHub → 자동 배포

- Vercel: 저장소 연결 시 **Production Branch = `main`** 이면 `main` 푸시가 곧 프로덕션 배포로 이어집니다.
- 별도 GitHub Actions는 필수는 아닙니다. CI에서 `npm run build`만 돌리고 싶다면 워크플로를 추가하면 됩니다.

---

문의: 팀 내부 인프라 담당 또는 Vercel/Cloudflare 문서를 우선 참고하세요.
