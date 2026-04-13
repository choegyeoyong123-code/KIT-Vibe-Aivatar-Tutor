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
import { HelpQuickGuidePanel } from "@/components/help-quick-guide-panel";

export function WorkshopSupportDialogs() {
  const {
    settingsOpen,
    setSettingsOpen,
    helpOpen,
    setHelpOpen,
    learningSpeechRate,
    setLearningSpeechRate,
    learningCognitiveDepth,
    setLearningCognitiveDepth,
    darkModeEnabled,
    setDarkModeEnabled,
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
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-0.5 pb-1 custom-scroll">
              <ul className="list-disc space-y-2 pl-5 text-sm text-slate-700">
                <li>튜터 선택은 왼쪽 사이드바 또는 모바일 하단의 튜터 메뉴에서 동기화됩니다.</li>
                <li>ECO / HIGH 모드는 세션 비용 시뮬레이션 속도만 바꿉니다.</li>
                <li>보안·음성 정책은 상단의 안전 배지에서 언제든 다시 열 수 있습니다.</li>
              </ul>
              <section className="mt-5 rounded-2xl border-2 border-gray-100 bg-white px-4 py-4">
                <p className="font-headline text-sm font-bold text-pw-on-surface">
                  Learning Preferences
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  변경 즉시 전역 상태에 반영되며, AI 프롬프트 Prefix에 동기화됩니다.
                </p>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">AI Speech Rate</p>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={
                      learningSpeechRate === 0.8
                        ? 0
                        : learningSpeechRate === 1
                          ? 1
                          : learningSpeechRate === 1.2
                            ? 2
                            : 3
                    }
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      const next = i === 0 ? 0.8 : i === 1 ? 1 : i === 2 ? 1.2 : 1.5;
                      setLearningSpeechRate(next);
                    }}
                    className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-emerald-500"
                    aria-label="AI 음성 속도 조절"
                  />
                  <div className="mt-2 grid grid-cols-4 text-center text-[11px] font-semibold text-slate-600">
                    <span className={learningSpeechRate === 0.8 ? "text-emerald-600" : ""}>0.8x</span>
                    <span className={learningSpeechRate === 1 ? "text-emerald-600" : ""}>1.0x</span>
                    <span className={learningSpeechRate === 1.2 ? "text-emerald-600" : ""}>1.2x</span>
                    <span className={learningSpeechRate === 1.5 ? "text-emerald-600" : ""}>1.5x</span>
                  </div>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-700">Cognitive Depth</p>
                  <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() => setLearningCognitiveDepth("beginner")}
                      className={`rounded-xl border-2 px-2.5 py-2 text-left text-xs leading-tight font-semibold transition-colors ${
                        learningCognitiveDepth === "beginner"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-gray-100 bg-white text-slate-600 hover:bg-gray-50"
                      }`}
                    >
                      비유 중심(Beginner)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLearningCognitiveDepth("intermediate")}
                      className={`rounded-xl border-2 px-2.5 py-2 text-left text-xs leading-tight font-semibold transition-colors ${
                        learningCognitiveDepth === "intermediate"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-gray-100 bg-white text-slate-600 hover:bg-gray-50"
                      }`}
                    >
                      핵심 요약(Intermediate)
                    </button>
                    <button
                      type="button"
                      onClick={() => setLearningCognitiveDepth("advanced")}
                      className={`rounded-xl border-2 px-2.5 py-2 text-left text-xs leading-tight font-semibold transition-colors ${
                        learningCognitiveDepth === "advanced"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                          : "border-gray-100 bg-white text-slate-600 hover:bg-gray-50"
                      }`}
                    >
                      심층 분석(Advanced)
                    </button>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-700">Dark Mode</p>
                      <p className="mt-0.5 text-[11px] text-slate-600">
                        새로고침 후에도 현재 브라우저 설정을 유지합니다.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={darkModeEnabled}
                      onClick={() => setDarkModeEnabled(!darkModeEnabled)}
                      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 transition-colors ${
                        darkModeEnabled
                          ? "border-emerald-300 bg-emerald-500/90"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <span
                        className={`inline-block size-5 transform rounded-full bg-white shadow transition-transform ${
                          darkModeEnabled ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </section>
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
              <HelpQuickGuidePanel />
            </div>
          </SpringDialogSurface>
        </DialogContent>
      </Dialog>
    </>
  );
}
