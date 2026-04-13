/**
 * kit-agent/src/app → 루트 app 동기화 (Vercel·루트 빌드와 로컬 최신 UI 일치).
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { platform } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const src = path.join(root, "kit-agent", "src", "app");
const dest = path.join(root, "app");

if (!fs.existsSync(src)) {
  console.error("[sync-app] missing:", src);
  process.exit(1);
}

if (platform() === "win32") {
  const r = spawnSync(
    "cmd",
    ["/c", "robocopy", "kit-agent\\src\\app", "app", "/MIR", "/E", "/NDL", "/NFL", "/NJH", "/NJS", "/nc", "/ns", "/np"],
    { cwd: root, stdio: "inherit" },
  );
  const code = r.status ?? 1;
  if (code >= 8) {
    console.error("[sync-app] robocopy failed:", code);
    process.exit(1);
  }
} else {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

console.log("[sync-app] kit-agent/src/app -> app/ OK");
