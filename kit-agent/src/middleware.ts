import { type NextRequest, NextResponse } from "next/server";

function maxUploadBodyBytes(): number {
  const v = Number(process.env.MAX_UPLOAD_BODY_BYTES);
  if (Number.isFinite(v) && v > 0) return Math.min(v, 500 * 1024 * 1024);
  return 100 * 1024 * 1024;
}

/**
 * Edge에서 대용량 POST를 조기 거부해 불필요한 Node 함수 콜드 스타트·과금을 줄입니다.
 * (본문 스트리밍만 있고 Content-Length가 없으면 이 검사는 건너뜁니다.)
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (request.method === "POST" && pathname.startsWith("/api/")) {
    const cl = request.headers.get("content-length");
    if (cl) {
      const n = Number.parseInt(cl, 10);
      if (!Number.isNaN(n) && n > maxUploadBodyBytes()) {
        return NextResponse.json(
          { error: "업로드 크기가 허용 한도를 초과했습니다." },
          { status: 413 },
        );
      }
    }
  }

  const res = NextResponse.next();
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const isLocal =
    host.startsWith("localhost") ||
    host.startsWith("127.0.0.1") ||
    host.endsWith(".local");
  if (!isLocal) {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload",
    );
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
