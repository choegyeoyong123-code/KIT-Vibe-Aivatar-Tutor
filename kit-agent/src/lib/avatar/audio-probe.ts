import { execFileSync } from "child_process";
import { existsSync } from "fs";

export function probeAudioDurationSec(absPath: string): number | null {
  if (!existsSync(absPath)) return null;
  try {
    const out = execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        absPath,
      ],
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] },
    );
    const n = Number(String(out).trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}
