import type { Metadata } from "next";
import { VisualLabPanel } from "@/components/visual-lab-panel";
import { SITE_NAME } from "@/lib/site-config";

const desc =
  "이미지·짧은 영상 시각 그라운딩과 크리에이티브 퀴즈·랩·쇼츠 대본을 실험합니다.";

export const metadata: Metadata = {
  title: "Visual Lab",
  description: desc,
  alternates: { canonical: "/visual-lab" },
  openGraph: {
    title: `Visual Lab · ${SITE_NAME}`,
    description: desc,
    url: "/visual-lab",
  },
};

export default function VisualLabPage() {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <VisualLabPanel />
    </div>
  );
}
