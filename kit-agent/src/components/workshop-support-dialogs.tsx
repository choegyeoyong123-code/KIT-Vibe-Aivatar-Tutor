"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWorkshopExperience } from "@/components/workshop-experience-context";
import { SpringDialogSurface } from "@/components/spring-dialog-surface";

export function WorkshopSupportDialogs() {
  const {
    settingsOpen,
    setSettingsOpen,
    helpOpen,
    setHelpOpen,
  } = useWorkshopExperience();

  return (
    <>
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-gray-100 p-4 shadow-[0_4px_0_0_rgb(229_231_235)] sm:max-w-md sm:p-6">
          <SpringDialogSurface className="min-h-0 flex-1 flex-col gap-4">
            <DialogHeader className="shrink-0">
              <DialogTitle className="font-headline text-lg font-bold text-pw-on-surface">
                설정
              </DialogTitle>
              <DialogDescription className="text-left text-sm text-slate-600">
                워크숍 세션 환경을 조정합니다. 변경 사항은 이 브라우저에만 적용됩니다.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 custom-scroll">
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>튜터 선택은 왼쪽 사이드바 또는 모바일 하단의 튜터 메뉴에서 동기화됩니다.</li>
                <li>ECO / HIGH 모드는 세션 비용 시뮬레이션 속도만 바꿉니다.</li>
                <li>보안·음성 정책은 상단의 안전 배지에서 언제든 다시 열 수 있습니다.</li>
              </ul>
            </div>
          </SpringDialogSurface>
        </DialogContent>
      </Dialog>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col overflow-hidden rounded-3xl border-2 border-gray-100 p-4 shadow-[0_4px_0_0_rgb(229_231_235)] sm:max-w-md sm:p-6">
          <SpringDialogSurface className="min-h-0 flex-1 flex-col gap-4">
            <DialogHeader className="shrink-0">
              <DialogTitle className="font-headline text-lg font-bold text-pw-on-surface">
                도움말
              </DialogTitle>
              <DialogDescription className="text-left text-sm text-slate-600">
                Pristine Workshop의 빠른 안내입니다.
              </DialogDescription>
            </DialogHeader>
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 custom-scroll">
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>
                  <strong className="text-slate-900">Visual Lab</strong>: 이미지를 기반으로 퀴즈
                  흐름을 시뮬레이션합니다. 전체 편집기는 Visual Lab 페이지로 이동하세요.
                </li>
                <li>
                  <strong className="text-slate-900">Media Studio</strong>: 랩·TTS·영상 파이프라인
                  오케스트레이션을 연습합니다.
                </li>
                <li>
                  <strong className="text-slate-900">학습 대시보드</strong>: LangGraph 에이전트
                  본편은 사이드바 링크에서 계속됩니다.
                </li>
              </ul>
            </div>
          </SpringDialogSurface>
        </DialogContent>
      </Dialog>
    </>
  );
}
