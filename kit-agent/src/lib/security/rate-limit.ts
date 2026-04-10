import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { type NextRequest, NextResponse } from "next/server";

export type RateTier = "replicate" | "llm" | "media_render" | "standard";

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function maxForTier(tier: RateTier): number {
  switch (tier) {
    case "replicate":
      return envInt("RATE_LIMIT_REPLICATE_PER_MINUTE", 12);
    case "llm":
      return envInt("RATE_LIMIT_LLM_PER_MINUTE", 24);
    case "media_render":
      return envInt("RATE_LIMIT_MEDIA_RENDER_PER_MINUTE", 8);
    case "standard":
      return envInt("RATE_LIMIT_STANDARD_PER_MINUTE", 90);
    default:
      return 30;
  }
}

export function getClientIp(req: NextRequest): string {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/* ---------- Upstash (production, multi-instance) ---------- */

const upstashLimiters: Partial<Record<RateTier, Ratelimit>> = {};

function getUpstashLimiter(tier: RateTier): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }
  const existing = upstashLimiters[tier];
  if (existing) return existing;
  const redis = Redis.fromEnv();
  const max = maxForTier(tier);
  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(max, "60 s"),
    prefix: `@kit-agent/rl/${tier}`,
    analytics: false,
  });
  upstashLimiters[tier] = limiter;
  return limiter;
}

/* ---------- Memory fallback (dev / single instance) ---------- */

type MemBucket = { count: number; resetAt: number };
const memBuckets = new Map<string, MemBucket>();

function memoryAllow(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  let b = memBuckets.get(key);
  if (!b || now >= b.resetAt) {
    b = { count: 0, resetAt: now + windowMs };
    memBuckets.set(key, b);
  }
  b.count += 1;
  if (b.count > max) return false;
  if (memBuckets.size > 50_000) {
    for (const [k, v] of memBuckets) {
      if (now >= v.resetAt) memBuckets.delete(k);
    }
  }
  return true;
}

/**
 * Returns a 429 JSON response if the client exceeded the tier limit; otherwise null.
 * Prefer setting UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in production so limits apply across all serverless instances.
 */
export async function rateLimitExceededResponse(
  req: NextRequest,
  tier: RateTier,
): Promise<NextResponse | null> {
  const ip = getClientIp(req);
  const id = `${tier}:${ip}`;
  const max = maxForTier(tier);

  const upstash = getUpstashLimiter(tier);
  if (upstash) {
    const { success, reset } = await upstash.limit(id);
    if (success) return null;
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      {
        error:
          "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요. (Rate limit exceeded)",
      },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  if (!memoryAllow(id, max, 60_000)) {
    return NextResponse.json(
      {
        error:
          "요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요. (Rate limit exceeded)",
      },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  return null;
}
