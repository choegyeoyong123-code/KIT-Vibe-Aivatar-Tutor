"use client";

import { useViewport } from "@/hooks/use-viewport";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ChatWorkspace } from "@/components/ChatWorkspace";
import { WorkshopMobileDock } from "@/components/workshop-mobile-dock";
import { WorkshopToastStack } from "@/components/workshop-toast-stack";
import { WorkshopSupportDialogs } from "@/components/workshop-support-dialogs";
import { cn } from "@/lib/utils";

/**
 * Pristine Workshop 홈 — 뷰포트별 레이아웃(≥lg 사이드바, 그 미만 도크+드로어).
 * 페르소나는 EducationalPersonaContext 단일 소스로 동기화됩니다.
 */
export function WorkshopHomeShell() {
  const { breakpoint, isDesktop } = useViewport();

  return (
    <div
      data-viewport={breakpoint}
      className={cn(
        "mx-auto flex h-dvh min-h-0 max-w-7xl overflow-hidden bg-pw-surface-container-lowest font-body text-pw-on-surface",
      )}
    >
      <div className={cn("hidden h-full min-h-0 w-72 shrink-0 lg:flex")}>
        <Sidebar />
      </div>

      <main
        className={cn(
          "relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white",
          !isDesktop && "pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))]",
        )}
      >
        <Header />
        <ChatWorkspace />
      </main>

      <div className="lg:hidden">
        <WorkshopMobileDock />
      </div>

      <WorkshopToastStack />
      <WorkshopSupportDialogs />
    </div>
  );
}
