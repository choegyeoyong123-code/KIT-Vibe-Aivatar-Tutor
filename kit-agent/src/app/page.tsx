import type { Metadata } from "next";
import { LearningDashboard } from "@/components/learning-dashboard";
import { EducationalPersonaProvider } from "@/components/educational-persona-context";
import { PersonaSelector } from "@/components/PersonaSelector";
import { PersonaGalleryProvider } from "@/components/persona-gallery-context";
import { SecurityPulseProvider } from "@/components/security-pulse-context";
import { TokenSavingsProvider } from "@/components/token-savings-context";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";
import { pageShellClass } from "@/lib/glass-styles";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "학습 대시보드",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — 학습 대시보드`,
    description: SITE_DESCRIPTION,
    url: "/",
  },
};

export default function Home() {
  return (
    <PersonaGalleryProvider>
      <EducationalPersonaProvider>
        <TokenSavingsProvider>
          <SecurityPulseProvider>
            <div
              className={cn(
                pageShellClass,
                "flex h-dvh min-h-0 flex-col overflow-hidden",
              )}
            >
              <PersonaSelector />
              <div className="relative z-0 mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col bg-[#FFFFFF]">
                <LearningDashboard />
              </div>
            </div>
          </SecurityPulseProvider>
        </TokenSavingsProvider>
      </EducationalPersonaProvider>
    </PersonaGalleryProvider>
  );
}
