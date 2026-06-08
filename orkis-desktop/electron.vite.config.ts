import { defineConfig, loadEnv } from "electron-vite";
import { resolve, join } from "path";
import { homedir } from "os";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), ["VITE_", "MAIN_"]);

  const frontendPath = env.FRONTEND_PATH || "../orkis-front";
  const frontendAbsPath = resolve(__dirname, frontendPath);

  const mainEnvDefine = Object.entries(env)
    .filter(([key]) => key.startsWith("MAIN_"))
    .reduce<Record<string, string>>((acc, [key, value]) => {
      acc[`process.env.${key}`] = JSON.stringify(value);
      return acc;
    }, {});

  return {
    main: {
      build: {
        sourcemap: true,
      },
      define: {
        ...mainEnvDefine,
        "process.env.MAIN_MODE": JSON.stringify(mode),
        "process.env.ORKIS_DEBUG_BUILD": JSON.stringify(
          process.env.ORKIS_DEBUG_BUILD ?? "false",
        ),
      },
    },
    preload: {
      build: {
        sourcemap: true,
      },
    },
    renderer: {
      root: frontendAbsPath,
      build: {
        outDir: resolve(__dirname, "out/renderer"),
        rollupOptions: {
          input: resolve(frontendAbsPath, "index.html"),
        },
        sourcemap: true,
      },
      plugins: [react()],
      resolve: {
        alias: {
          // 동명 override (backend tsconfig paths fallback 과 동형):
          //   참조측(ChatConnector)은 cloud 경로 @/logic/.../useHealthStatusIcons 를 그대로 import.
          //   electron 빌드에서만 이 모듈을 desktop 구현(컨테이너 IPC + apiKeyMasked)으로 치환.
          //   cloud 빌드(vite.config.ts)엔 이 alias 가 없어 원본이 쓰인다.
          //   반드시 "@" 보다 먼저 둬야 "@/..." prefix 매칭에 선점된다.
          "@/logic/common/health/useHealthStatusIcons": resolve(
            frontendAbsPath,
            "src/desktop/health/useHealthStatusIcons.ts"
          ),
          "@": resolve(frontendAbsPath, "src"),
          "@app": resolve(frontendAbsPath, "src/desktop/App.tsx"),
          "@interface": resolve(frontendAbsPath, "orkis-interface/src"),
          "orkis-interface": resolve(frontendAbsPath, "orkis-interface/src"),
        },
      },
      server: {
        proxy: (() => {
          const backendPort = env.MAIN_BACKEND_PORT;
          const backendTarget = backendPort
            ? `http://127.0.0.1:${backendPort}`
            : {
                socketPath: join(
                  process.env.ORKIS_DATA_PATH ||
                    join(homedir(), ".orkis", "run"),
                  "orkis-backend.sock",
                ),
              };
          return {
            "/api/sse": {
              target: backendTarget as any,
              rewrite: (path: string) => path.replace(/^\/api/, ""),
              timeout: 0,
              proxyTimeout: 0,
            },
            "/api": {
              target: backendTarget as any,
              rewrite: (path: string) => path.replace(/^\/api/, ""),
            },
          };
        })(),
      },
    },
  };
});
