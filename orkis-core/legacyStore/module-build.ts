// import fs from 'fs';
import * as fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import readline from "readline";
import { TsConfig } from "./TsConfig";

type BuildMode = "all" | "decorator-only" | "util";
console.info("__dirname---------------------- ", __dirname);
const basePath = path.resolve(__dirname, "tsconfig.json");
console.info("basePath---------------------- ", basePath);
const baseConfig: TsConfig = JSON.parse(fs.readFileSync(basePath, "utf-8"));
console.info("baseConfig---------------------- ", baseConfig);

function applyOverrides(config: TsConfig, mode: BuildMode): TsConfig {
  const overrides: Partial<TsConfig> = {};
  switch (mode) {
    case "all":
      overrides.include = ["./src/**/*", "./src/@types/*"];
      overrides.exclude = [
        "dist",
        "build.ts",
        "build.ts",
        "webpack.config.js",
        "logs",
        ".idea"
      ];
      break;
    case "decorator-only":
      overrides.include = [
        "./src/main/express/components/decorators/**/*",
        "./src/@types/*",
        "./src/main/config/*",
        "./src/main/utils/*",
        "./src/resources/*"
      ];
      overrides.exclude = [
        "dist",
        "build.ts",
        "build.ts",
        "webpack.config.js",
        "logs",
        ".idea"
      ];
      break;
    case "util":
      overrides.include = ["./src/main/utils/**/*", "./src/@types/*"];
      overrides.exclude = [
        "dist",
        "build.ts",
        "build.ts",
        "webpack.config.js",
        "logs",
        ".idea"
      ];
      break;
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
  return {
    ...config,
    include: overrides.include,
    exclude: overrides.exclude
  };
}

function askUserToSelectMode(): Promise<BuildMode> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    console.info("Select build mode:");
    console.info("1) all");
    console.info("2) decorator-only");
    console.info("3) util");

    rl.question("Enter number (1-3): ", (answer) => {
      rl.close();
      switch (answer.trim()) {
        case "1":
          resolve("all");
          break;
        case "2":
          resolve("decorator-only");
          break;
        case "3":
          resolve("util");
          break;
        default:
          console.info("Invalid selection. Defaulting to dev.");
          resolve("all");
      }
    });
  });
}

(async () => {
  const mode = await askUserToSelectMode();
  const finalConfig = applyOverrides(baseConfig, mode);
  const outputFile = path.resolve(__dirname, "tsconfig.temp.json");
  fs.writeFileSync(outputFile, JSON.stringify(finalConfig, null, 2));
  console.info(`✅ tsconfig.temp.json generated [mode: ${mode}]`);

  try {
    // execSync(`tsc -p tsconfig.temp.json`, { stdio: 'inherit' });
    execSync(`ts-node build.ts`, { stdio: "inherit" });

    console.info(`TypeScript build success`);
  } catch {
    console.error(`❌ Build failed`);
    process.exit(1);
  }
})();
