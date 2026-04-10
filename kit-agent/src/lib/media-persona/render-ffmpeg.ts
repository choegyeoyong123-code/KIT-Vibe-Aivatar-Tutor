import { execFileSync } from "child_process";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

function ffmpegAvailable(): boolean {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * 씬 MP3들을 하나로 이은 뒤, 검은 화면+오디오로 MP4 생성 (교육용 플레이스홀더).
 * ffmpeg가 PATH에 없으면 mp4는 생성하지 않습니다.
 */
export async function muxPlaceholderMp4(input: {
  jobId: string;
  mp3AbsPaths: string[];
}): Promise<{
  combinedMp3Url: string | null;
  mp4Url: string | null;
  ffmpeg: boolean;
}> {
  const ffmpeg = ffmpegAvailable();
  const base = path.join(process.cwd(), "public", "media-output", input.jobId);
  await mkdir(base, { recursive: true });

  const existing = input.mp3AbsPaths.filter(Boolean);
  if (existing.length === 0) {
    return { combinedMp3Url: null, mp4Url: null, ffmpeg };
  }

  const listPath = path.join(base, "concat.txt");
  const listBody = existing
    .map((p) => {
      const norm = path.resolve(p).replace(/\\/g, "/");
      const esc = norm.replace(/'/g, "'\\''");
      return `file '${esc}'`;
    })
    .join("\n");
  await writeFile(listPath, listBody, "utf-8");

  const combined = path.join(base, "lesson_combined.mp3");
  const mp4out = path.join(base, "lesson_placeholder.mp4");

  if (!ffmpeg) {
    return { combinedMp3Url: null, mp4Url: null, ffmpeg: false };
  }

  try {
    execFileSync(
      "ffmpeg",
      ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", combined],
      { stdio: "ignore" },
    );
  } catch {
    return { combinedMp3Url: null, mp4Url: null, ffmpeg: true };
  }

  try {
    execFileSync(
      "ffmpeg",
      [
        "-y",
        "-i",
        combined,
        "-f",
        "lavfi",
        "-i",
        "color=c=black:s=1280x720:r=24",
        "-c:v",
        "libx264",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-shortest",
        mp4out,
      ],
      { stdio: "ignore" },
    );
  } catch {
    return {
      combinedMp3Url: `/media-output/${input.jobId}/lesson_combined.mp3`,
      mp4Url: null,
      ffmpeg: true,
    };
  }

  return {
    combinedMp3Url: `/media-output/${input.jobId}/lesson_combined.mp3`,
    mp4Url: `/media-output/${input.jobId}/lesson_placeholder.mp4`,
    ffmpeg: true,
  };
}
