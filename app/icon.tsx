import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 32, height: 32 };

export const contentType = "image/png";

/** 미니멀 테크 파비콘 — 탭·북마크에서 KIT 브랜드 인지 */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#020617",
          borderRadius: 6,
          border: "1px solid #312e81",
        }}
      >
        <span
          style={{
            color: "#a5b4fc",
            fontSize: 18,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.05em",
          }}
        >
          K
        </span>
      </div>
    ),
    { ...size },
  );
}
