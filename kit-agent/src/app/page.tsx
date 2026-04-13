import type { Metadata } from "next";
import { EducationalPersonaProvider } from "@/components/educational-persona-context";
import { WorkshopExperienceProvider } from "@/components/workshop-experience-context";
import { VibeProvider } from "@/components/vibe-context";
import { WorkshopHomeShell } from "@/components/workshop-home-shell";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Pristine Workshop",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `Pristine Workshop · ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

/**
 * STITCH 정적 HTML → React 모듈 (Sidebar / Header / ChatWorkspace).
 * 기존 학습 대시보드는 `/dashboard` 로 이동했습니다.
 */
export default function Home() {
  return (
    <EducationalPersonaProvider>
      <WorkshopExperienceProvider>
        <VibeProvider>
          <WorkshopHomeShell />
        </VibeProvider>
      </WorkshopExperienceProvider>
    </EducationalPersonaProvider>
  );
}
