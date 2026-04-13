import type { Metadata } from "next";
import { MediaStudioPanel } from "@/components/media-studio-panel";
import { SITE_NAME } from "@/lib/site-config";

const desc =
  "페르소나 애니 스크립트, T2V 프롬프트, TTS·ffmpeg 파이프라인으로 미디어 자산을 생성합니다.";

export const metadata: Metadata = {
  title: "Media Studio",
  description: desc,
  alternates: { canonical: "/media-studio" },
  openGraph: {
    title: `Media Studio · ${SITE_NAME}`,
    description: desc,
    url: "/media-studio",
  },
};

export default function MediaStudioPage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-[#4B4B4B]">
      <MediaStudioPanel />
    </div>
  );
}
