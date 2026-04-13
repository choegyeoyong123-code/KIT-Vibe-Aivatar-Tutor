# KIT Vibe-Coding Contest — GitHub · Vercel · Secrets

## Step 1 — Git 저장소 및 GitHub (비공개)

**초기 커밋 메시지 (권장)**

```text
feat: finalize VIBE-SOLO-SYNC architecture and agentic workflow for contest submission
```

### A) 이 폴더(`kit-agent`)만 새 저장소로 올리는 경우

```bash
cd kit-agent
git init
git add -A
git status   # .env 가 없는지, node_modules/.next 가 제외됐는지 확인
git commit -m "feat: finalize VIBE-SOLO-SYNC architecture and agentic workflow for contest submission"
git branch -M main
```

GitHub에서 **New repository** → **Private** 생성 후 (HTTPS 예시):

```bash
git remote add origin https://github.com/<YOUR_ORG>/<YOUR_REPO>.git
git push -u origin main
```

SSH를 쓰는 경우:

```bash
git remote add origin git@github.com:<YOUR_ORG>/<YOUR_REPO>.git
git push -u origin main
```

### B) 상위 모노레포에 이미 `git`이 있는 경우

`kit-agent`만 서브트리/서브모듈로 분리하거나, GitHub에서 **Sparse checkout** / 별도 리포로 `git filter-repo` 등으로 추출하는 방식을 검토하세요. 충돌을 피하려면 **제출용은 A) 단일 리포**가 가장 단순합니다.

---

## Step 2 — Vercel 연결

1. [vercel.com](https://vercel.com) 로그인 → **Add New… → Project**.
2. **Import**에서 위에서 만든 GitHub 저장소 선택.
3. **Root Directory**가 `kit-agent`가 아니라면, 모노레포 설정에서 해당 디렉터리를 지정합니다.
4. **Environment Variables**는 아래 섹션을 참고해 한 번에 붙여 넣습니다.
5. **Deploy** 후 Production URL을 `NEXT_PUBLIC_APP_URL`에 반영하고 재배포합니다.

`vercel.json`에 **API `maxDuration` 300초**, **HSTS · Referrer-Policy · nosniff** 등 헤더가 포함되어 있습니다.  
경량 펄스는 `src/app/api/orchestrator/status/route.ts`의 **Edge Runtime**을 사용합니다. 장시간 LLM·미디어 파이프라인은 **Node** 런타임을 유지합니다.

> **참고:** Vercel **Hobby** 플랜은 함수당 `maxDuration` 상한이 더 낮을 수 있습니다. 504이 계속되면 **Pro**로 승급하거나, 라우트별 `export const maxDuration`·잡 분할을 검토하세요.

---

## Step 3 — Vercel 대시보드에 시크릿 넣기 (안전 절차)

1. **절대** `.env`를 Git에 커밋하지 마세요. (`.gitignore`에 포함됨)
2. Vercel 프로젝트 → **Settings → Environment Variables**.
3. 이름은 `.env.example`과 **동일한 키**로 맞춥니다.
4. 값 입력 시:
   - **Production / Preview / Development** 중 배포에 필요한 스코프만 선택합니다.
   - 붙여넣기 후 **Save** 전에 앞뒤 공백·따옴표가 없는지 확인합니다.
5. **GEMINI_API_KEY** 또는 **GOOGLE_API_KEY** 중 하나만 있어도, 런타임 부트스트랩(`instrumentation.ts` + `applyProviderEnvAliases`)이 표준 이름으로 맞춥니다.
6. **CLAUDE_API_KEY**만 있어도 `ANTHROPIC_API_KEY`로 매핑됩니다.
7. 저장 후 **Redeploy**하여 런타임에 반영합니다.

---

## Privacy Shield (PII) — 프로덕션 환경 변수

| 변수 | 역할 |
|------|------|
| `PII_LLM_GUARD=1` | 서버 라우트·`/api/privacy/pii-scan`에서 LLM 2차 마스킹 기본 활성 |
| `PII_GUARD_MODEL` | 2차 마스킹용 Gemini 모델 ID (기본 `gemini-1.5-flash`) |
| `GOOGLE_API_KEY` / `GEMINI_API_KEY` | 2차 마스킹에 사용 (별칭 자동 매핑) |
| `NEXT_PUBLIC_PII_CLIENT_SCAN=1` | 클라이언트 `pii-shield.ts`가 `/api/privacy/pii-scan` 호출 |

`/api/privacy/pii-scan`은 요청마다 `applyProviderEnvAliases()`를 호출해 **Vercel에 `GEMINI_API_KEY`만 있어도** `llmApplied` 판정과 실제 호출이 일치하도록 했습니다.
