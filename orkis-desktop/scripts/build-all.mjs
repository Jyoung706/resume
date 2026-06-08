#!/usr/bin/env node
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("=== Building Orkis Desktop (Full) ===");
execSync(`node ${path.join(__dirname, "build-backend.mjs")}`, {
  stdio: "inherit",
});
execSync(`node ${path.join(__dirname, "build-ai.mjs")}`, {
  stdio: "inherit",
});
console.log("=== All builds complete ===");
