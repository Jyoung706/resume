#!/usr/bin/env node
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DESKTOP_DIR = path.resolve(__dirname, "..");
const BACKEND_DIR = path.resolve(DESKTOP_DIR, "..", "orkis-backend");
const OUTPUT_DIR = path.join(DESKTOP_DIR, "resources", "backend");

console.log("[build-backend] Building orkis-backend (desktop)...");

execSync("yarn build:interface && yarn build:desktop", { cwd: BACKEND_DIR, stdio: "inherit" });

fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// tsc 빌드 결과 복사 (node_modules 없음 — NODE_PATH로 해결)
fs.cpSync(path.join(BACKEND_DIR, "lib"), OUTPUT_DIR, { recursive: true });

// 정적 리소스 복사
fs.mkdirSync(path.join(OUTPUT_DIR, "resources"), { recursive: true });
fs.cpSync(
  path.join(BACKEND_DIR, "resources", "systemdbfile"),
  path.join(OUTPUT_DIR, "resources", "systemdbfile"),
  { recursive: true },
);
fs.copyFileSync(
  path.join(BACKEND_DIR, "resources", "dev.env"),
  path.join(OUTPUT_DIR, "resources", "dev.env"),
);

// JSON 초기 데이터 복사
fs.cpSync(
  path.join(BACKEND_DIR, "src", "db_file"),
  path.join(OUTPUT_DIR, "src", "db_file"),
  { recursive: true },
);

// 샘플 DB 복사 (SQLite + CSV + FAISS 인덱스)
fs.cpSync(
  path.join(BACKEND_DIR, "src", "sample_db"),
  path.join(OUTPUT_DIR, "src", "sample_db"),
  { recursive: true },
);

console.log(`[build-backend] Done -> ${OUTPUT_DIR} (no node_modules, using NODE_PATH)`);
