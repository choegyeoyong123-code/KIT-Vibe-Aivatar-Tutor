import type { Metadata } from "next";
import { LandingHero } from "@/components/landing-hero";
import { LearningDashboard } from "@/components/learning-dashboard";
import { PersonaGallery } from "@/components/persona-gallery";
import { PersonaGalleryProvider } from "@/components/persona-gallery-context";
import { SecurityPulseProvider } from "@/components/security-pulse-context";
import { TokenSavingsProvider } from "@/components/token-savings-context";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/site-config";

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
      <TokenSavingsProvider>
        <SecurityPulseProvider>
          <div className="flex min-h-full flex-col bg-background">
            <PersonaGallery />
            <LandingHero />
            <LearningDashboard />
          </div>
        </SecurityPulseProvider>
      </TokenSavingsProvider>
    </PersonaGalleryProvider>
  );
}
