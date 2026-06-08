#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(__dirname, "..");
const AI_DIR = path.resolve(DESKTOP_DIR, "..", "orkis-desktop-ai");
const OUTPUT_DIR = path.join(DESKTOP_DIR, "resources", "ai");

const isWin = process.platform === "win32";
const python = isWin ? "python" : "python3.12";
const venvDir = path.join(AI_DIR, ".venv-desktop");
const pip = isWin
  ? path.join(venvDir, "Scripts", "pip.exe")
  : path.join(venvDir, "bin", "pip");
const pyinstaller = isWin
  ? path.join(venvDir, "Scripts", "pyinstaller.exe")
  : path.join(venvDir, "bin", "pyinstaller");

console.log("[build-ai] Building orkis-ai with PyInstaller...");

// venv 생성 (없을 경우)
if (!fs.existsSync(venvDir)) {
  execSync(`${python} -m venv ${venvDir}`, { cwd: AI_DIR, stdio: "inherit" });
}

// 의존성 설치
execSync(`"${pip}" install -r requirements.txt`, {
  cwd: AI_DIR,
  stdio: "inherit",
  shell: true,
});
execSync(`"${pip}" install pyinstaller`, {
  cwd: AI_DIR,
  stdio: "inherit",
  shell: true,
});

// PyInstaller 빌드
execSync(`"${pyinstaller}" orkis-ai.spec --noconfirm --clean`, {
  cwd: AI_DIR,
  stdio: "inherit",
  shell: true,
});

// 결과 복사
fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.cpSync(path.join(AI_DIR, "dist", "orkis-ai"), OUTPUT_DIR, {
  recursive: true,
});

// Unix: 실행 권한 부여
if (!isWin) {
  const binary = path.join(OUTPUT_DIR, "orkis-ai");
  if (fs.existsSync(binary)) {
    fs.chmodSync(binary, 0o755);
  }
}

console.log(`[build-ai] Done -> ${OUTPUT_DIR}`);
