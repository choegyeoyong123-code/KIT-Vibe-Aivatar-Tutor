import type { AgentAsyncJobStatus } from "@/lib/agent/types";

/** Strategy 11: 클라이언트 폴링용 응답 형태 */
export type AgentJobPollResult = {
  status: AgentAsyncJobStatus;
  jobId: string;
  threadId: string;
  state?: unknown;
  error?: string;
  interrupts?: unknown;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function fetchAgentJobStatus(
  jobId: string,
  init?: RequestInit,
): Promise<AgentJobPollResult> {
  const res = await fetch(`/api/agent/jobs/${jobId}`, {
    ...init,
    method: "GET",
    cache: "no-store",
  });
  const raw = await res.text();
  let data: AgentJobPollResult & { error?: string };
  // FIX: HTML·비JSON 오류 본문에서 JSON.parse 예외를 흡수해 상위 try/catch로 안전하게 전달
  try {
    data = JSON.parse(raw) as AgentJobPollResult & { error?: string };
  } catch {
    throw new Error(
      raw ? `상태 응답 파싱 실패: ${raw.slice(0, 120)}` : `Job status ${res.status}`,
    );
  }
  if (!res.ok) {
    throw new Error(data.error || `Job status ${res.status}`);
  }
  return data;
}

/**
 * 낙관적 UI: 202 수신 후 주기적으로 상태를 조회해 완료·실패·인터럽트까지 대기합니다.
 */
export async function pollAgentJobUntilSettled(
  jobId: string,
  options?: {
    intervalMs?: number;
    signal?: AbortSignal;
    onTick?: (r: AgentJobPollResult) => void;
  },
): Promise<AgentJobPollResult> {
  const intervalMs = options?.intervalMs ?? 2000;
  const terminal: AgentAsyncJobStatus[] = ["completed", "failed", "interrupted"];

  for (;;) {
    if (options?.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    const r = await fetchAgentJobStatus(jobId, { signal: options?.signal });
    options?.onTick?.(r);
    if (terminal.includes(r.status)) return r;
    await sleep(intervalMs);
  }
}
