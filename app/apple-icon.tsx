import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = { width: 180, height: 180 };

export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(145deg,#020617 0%,#1e1b4b 100%)",
          borderRadius: 36,
        }}
      >
        <span
          style={{
            color: "#e0e7ff",
            fontSize: 88,
            fontWeight: 800,
            fontFamily: "system-ui, sans-serif",
            letterSpacing: "-0.06em",
          }}
        >
          K
        </span>
        <span
          style={{
            color: "#6366f1",
            fontSize: 14,
            fontWeight: 600,
            marginTop: 4,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
          }}
        >
          Vibe
        </span>
      </div>
    ),
    { ...size },
  );
}
