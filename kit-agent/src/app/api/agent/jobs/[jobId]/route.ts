import { NextResponse, type NextRequest } from "next/server";
import { getAgentAsyncJob } from "@/lib/agent/agent-job-store";
import { rateLimitExceededResponse } from "@/lib/security/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 10;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ jobId: string }> },
) {
  const limited = await rateLimitExceededResponse(_req, "llm");
  if (limited) return limited;
  const { jobId } = await context.params;
  const job = getAgentAsyncJob(jobId);
  if (!job) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  const includeState =
    job.status === "completed" || job.status === "interrupted" || job.status === "failed";

  return NextResponse.json({
    status: job.status,
    jobId: job.id,
    threadId: job.threadId,
    ...(includeState && job.state != null ? { state: job.state } : {}),
    ...(job.error ? { error: job.error } : {}),
    ...(job.interrupts != null ? { interrupts: job.interrupts } : {}),
  });
}
