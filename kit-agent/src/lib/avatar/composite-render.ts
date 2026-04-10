import { execFileSync } from "child_process";

/**
 * 배경 PNG(루프) 위에 아바타 비디오 합성. 오디오는 아바타 클립에서 복사.
 */
export function compositeLectureVideo(input: {
  backgroundAbs: string;
  avatarVideoAbs: string;
  outAbs: string;
}): void {
  execFileSync(
    "ffmpeg",
    [
      "-y",
      "-stream_loop",
      "-1",
      "-i",
      input.backgroundAbs,
      "-i",
      input.avatarVideoAbs,
      "-filter_complex",
      [
        "[0:v]scale=1280:720[bg]",
        "[1:v]scale=-2:620[fg]",
        "[bg][fg]overlay=(W-w)/2:(H-h)/2+48:shortest=1",
      ].join(";"),
      "-map",
      "1:a?",
      "-c:v",
      "libx264",
      "-pix_fmt",
      "yuv420p",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      "-shortest",
      input.outAbs,
    ],
    { stdio: "ignore" },
  );
}
