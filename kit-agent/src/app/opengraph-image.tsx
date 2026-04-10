import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt =
  "KIT Vibe-Coding — AI-Native Learning Platform | Multimodal · LangGraph · Production-ready demo";

export const size = { width: 1200, height: 630 };

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          background: "linear-gradient(135deg,#020617 0%,#1e1b4b 42%,#312e81 100%)",
          padding: 64,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#818cf8",
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          Submission · Business-ready preview
        </div>
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: "#f8fafc",
            letterSpacing: "-0.03em",
            lineHeight: 1.05,
          }}
        >
          KIT Vibe-Coding
        </div>
        <div
          style={{
            fontSize: 28,
            color: "#a5b4fc",
            marginTop: 16,
            fontWeight: 600,
          }}
        >
          AI-Native Learning Platform
        </div>
        <div
          style={{
            fontSize: 21,
            color: "#94a3b8",
            marginTop: 36,
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          LangGraph agents · Multimodal uploads · CFO / HITL · Avatar & media pipelines — engineered
          for scalability and judge-facing polish.
        </div>
      </div>
    ),
    { ...size },
  );
}
