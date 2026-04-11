import type { Metadata } from "next";
import { AvatarLecturePanel } from "@/components/avatar-lecture-panel";
import { SITE_NAME } from "@/lib/site-config";

const desc =
  "얼굴 사진·나레이션·주제로 AI 아바타 강의 영상을 구성합니다. Replicate 또는 로컬 폴백.";

export const metadata: Metadata = {
  title: "AI Avatar Lecture",
  description: desc,
  alternates: { canonical: "/avatar-lecture" },
  openGraph: {
    title: `AI Avatar Lecture · ${SITE_NAME}`,
    description: desc,
    url: "/avatar-lecture",
  },
};

export default function AvatarLecturePage() {
  return (
    <div className="flex min-h-full flex-col bg-white text-[#4B4B4B]">
      <AvatarLecturePanel />
    </div>
  );
}
