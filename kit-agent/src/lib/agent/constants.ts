/** 검증 통과 최소 점수 (10 만점) — Strategy 7: 9 미만 시 Knowledge_Distiller 재작성 */
export const QUALITY_PASS_THRESHOLD = 9;

/** 무한 루프 방지: 증류 최대 횟수 */
export const MAX_DISTILL_ROUNDS = 5;

/**
 * HITL·CFO 거버넌스: Validator가 누적한 `loopCount`가 이 값 이상이고
 * 품질 점수가 `QUALITY_PASS_THRESHOLD` 미만이면 자동 재증류 중단 → `interruptRequired`·HITL.
 */
export const HITL_LOOP_THRESHOLD = 3;

/** HITL: 누적 또는 예상 비용(USD)이 이 값을 넘으면 승인 대기 */
export const HITL_COST_THRESHOLD_USD = 0.5;

/** Admin 알림(프론트 이벤트): 누적 비용이 이 USD 이상 */
export const ADMIN_NOTIFY_COST_USD = 0.25;

/** 절대 상한 — 초과 시 강제 중단(추가 LLM 호출 방지) */
export const HARD_COST_CAP_USD = 5;

/** 세션 UI 기본 예산 (USD) — env HITL_SESSION_BUDGET_USD 로 덮어쓰기 */
export const DEFAULT_SESSION_BUDGET_USD = 2;

/** 합의 감사 통과 최소 Trust Score */
export const CONSENSUS_TRUST_THRESHOLD = 82;

/** 소스 불일치 시 자동 정제 최대 횟수 */
export const MAX_CONSENSUS_REFINEMENT_LOOPS = 2;
