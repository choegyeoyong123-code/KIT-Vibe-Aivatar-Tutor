import { NextResponse, type NextRequest } from "next/server";
import {
  getAgentAsyncJob,
  tryClaimAgentJob,
} from "@/lib/agent/agent-job-store";
import { executeAgentAsyncJob } from "@/lib/agent/execute-agent-async-job";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
/** 별도 호출로 LangGraph 전체 실행 — Hobby 10s 본문 회피용 */
export const maxDuration = 300;

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const limited = await rateLimitExceededResponse(_req, "llm");
  if (limited) return limited;
  try {
    const { jobId } = await context.params;
    const job = getAgentAsyncJob(jobId);
    if (!job) {
      return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
    }

    if (job.status === "completed" || job.status === "failed" || job.status === "interrupted") {
      return NextResponse.json({
        ok: true,
        status: job.status,
        message: "이미 종료된 작업입니다.",
      });
    }

    if (job.status === "queued") {
      tryClaimAgentJob(jobId);
    }

    const cur = getAgentAsyncJob(jobId);
    if (cur?.status === "running") {
      await executeAgentAsyncJob(jobId);
    }

    const final = getAgentAsyncJob(jobId);
    return NextResponse.json({
      ok: true,
      status: final?.status ?? "unknown",
      error: final?.error,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 },
    );
  }
}
