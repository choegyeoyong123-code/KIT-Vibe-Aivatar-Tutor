import type {
  ExitProcessingStrategy,
  HitlNextRoute,
  HitlResumeAction,
  TerminationType,
} from "@/lib/agent/types";

export interface ParsedHitlResume {
  hitlNextRoute: HitlNextRoute;
  terminationType: TerminationType;
  pendingExitStrategy: ExitProcessingStrategy | null;
  /** model_downgrade 시에만 economy */
  activeModelTier: "standard" | "economy";
}

/**
 * 사용자 자연어 + 버튼 액션을 기반으로 HITL 이후 라우팅을 결정합니다.
 * (키워드·휴리스틱 — 추가 LLM 호출 없음)
 */
export function parseHitlResumeIntent(input: {
  action: HitlResumeAction;
  exitInstruction: string;
}): ParsedHitlResume {
  const raw = input.exitInstruction.trim();
  const lower = raw.toLowerCase();

  if (input.action === "approve_continue") {
    if (!raw) {
      return {
        hitlNextRoute: "workflow",
        terminationType: "COMPLETE",
        pendingExitStrategy: null,
        activeModelTier: "standard",
      };
    }

    if (
      /(cheaper|cheap|mini|downgrade|4o-mini|haiku|저렴|비용\s*줄|다운그레이드|미니)/i.test(
        raw,
      )
    ) {
      return {
        hitlNextRoute: "exit_processor",
        terminationType: "GRACEFUL_EXIT",
        pendingExitStrategy: "model_downgrade",
        activeModelTier: "economy",
      };
    }

    if (
      /\?/.test(raw) ||
      /(질문|question|answer\s+this|알려줘|설명해|what\s+is|how\s+does)/i.test(
        lower,
      )
    ) {
      return {
        hitlNextRoute: "exit_processor",
        terminationType: "GRACEFUL_EXIT",
        pendingExitStrategy: "direct_answer",
        activeModelTier: "standard",
      };
    }

    if (
      /(wrap|partial|first\s*half|절반|중간\s*까지|정리만|compile|마무리|요약\s*만)/i.test(
        raw,
      )
    ) {
      return {
        hitlNextRoute: "exit_processor",
        terminationType: "GRACEFUL_EXIT",
        pendingExitStrategy: "partial_wrap",
        activeModelTier: "standard",
      };
    }

    // 승인이지만 구체 지시가 있음 → Exit Processor가 지시를 반영한 정리 시도
    return {
      hitlNextRoute: "exit_processor",
      terminationType: "GRACEFUL_EXIT",
      pendingExitStrategy: "partial_wrap",
      activeModelTier: "standard",
    };
  }

  // finalize_as_is
  if (
    /(abort|stop|cancel|중단|그만|취소|유저\s*중단)/i.test(lower) ||
    /(아무것도\s*하지|저장\s*말)/i.test(raw)
  ) {
    return {
      hitlNextRoute: "exit_processor",
      terminationType: "USER_ABORT",
      pendingExitStrategy: "user_abort",
      activeModelTier: "standard",
    };
  }

  return {
    hitlNextRoute: "exit_processor",
    terminationType: "GRACEFUL_EXIT",
    pendingExitStrategy: "partial_wrap",
    activeModelTier: "standard",
  };
}
