# Vercel + 커스텀 도메인 (.com / .ai) 체크리스트

`kit-agent`를 **프로덕션**에 올리고 공모전 제출 URL을 **비즈니스 수준**으로 보이게 할 때 따라가는 단계입니다.

## 1. `.env.local` → Vercel 환경 변수 매핑

로컬에서는 `.env.local`을 쓰고, Vercel에서는 **변수 이름이 동일**해야 합니다. (값만 Production/Preview/Development로 나눠 넣으면 됩니다.)

| 단계 | 작업 |
|------|------|
| 1 | 로컬 `.env.local`을 열어 키 목록을 확인합니다. |
| 2 | Vercel 프로젝트 → **Settings → Environment Variables** 로 이동합니다. |
| 3 | 각 키를 **Add** 하고, **Production**에 프로덕션 값을 붙여넣습니다. |
| 4 | `NEXT_PUBLIC_*` 는 브라우저에 노출되므로 **URL·공개 설정만** 넣고, API 키는 절대 넣지 않습니다. |
| 5 | 배포 후 **Redeploy** 하여 빌드 타임에 읽히는 변수를 반영합니다. |

**반드시 프로덕션에서 다시 맞출 변수**

- `NEXT_PUBLIC_APP_URL` → 최종 공개 URL과 동일하게 `https://your-domain.com` 또는 `https://app.project.ai` (끝 슬래시 없음)
- Replicate·아바타 기능을 쓰는 경우 공개 콜백 URL이 이 값과 일치해야 합니다.

전체 키 목록은 저장소 루트의 **`.env.example`** 을 기준으로 복사하는 것이 안전합니다.

## 2. `.com` 또는 `.ai` 도메인 연결

| 단계 | 작업 |
|------|------|
| 1 | 도메인 등록기관에서 **DNS 관리** 화면을 엽니다. |
| 2 | Vercel → 프로젝트 → **Settings → Domains** → 도메인 입력 (예: `kitvibe.ai`, `www.kit-demo.com`). |
| 3 | Vercel이 표시하는 레코드를 DNS에 추가합니다. |

### 서브도메인 (예: `app.kitvibe.ai`, `studio.project.com`)

- **유형**: `CNAME`
- **이름/호스트**: `app` (또는 Vercel이 안내하는 호스트)
- **값**: `cname.vercel-dns.com` (또는 화면에 표시된 Vercel 타겟)

### 루트 도메인 (예: `kitvibe.ai`, `project.com`)

- **유형**: `A` (또는 일부 DNS의 **ALIAS / ANAME**)
- **이름**: `@`
- **값**: Vercel이 안내하는 IP 주소(여러 개면 모두 추가)

`.ai` 와 `.com` 모두 DNS 레코드 형식은 동일합니다. 등록기관만 다를 뿐입니다.

## 3. SSL / HTTPS

| 단계 | 작업 |
|------|------|
| 1 | DNS가 전파되면 Vercel이 **Let’s Encrypt** 로 인증서를 자동 발급합니다. |
| 2 | 도메인 상태가 **Valid** 가 될 때까지 수 분~수 시간 대기합니다. |
| 3 | 앱은 `middleware`에서 비로컬 호스트에 **HSTS**를 붙여 HTTPS 선호를 강화합니다. |
| 4 | Cloudflare를 앞에 둔 경우 **SSL/TLS → Full (strict)** 과 **Always Use HTTPS** 를 권장합니다. |

## 4. 배포 후 검증

- [ ] `https://도메인` 으로 접속 시 자물쇠(유효한 인증서) 확인
- [ ] `NEXT_PUBLIC_APP_URL` 이 브라우저 주소와 동일한 스킴·호스트인지 확인
- [ ] 소셜 미리보기(슬랙/카카오 등)에서 **제목·설명·OG 이미지**가 `KIT Vibe-Coding` 으로 보이는지 확인
- [ ] `/sitemap.xml`, `/robots.txt` 응답 확인
- [ ] 대용량 업로드 한도: `MAX_UPLOAD_BODY_BYTES` (기본 100MB)가 요구사항과 맞는지 확인

## 5. 관련 파일

- `next.config.ts` — 보안 헤더, API `Cache-Control`, 번들 최적화
- `src/middleware.ts` — 업로드 조기 거부(Edge), HSTS
- `DEPLOYMENT.md` — 전체 배포 가이드
