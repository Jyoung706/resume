import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// Docker 빌드용 Vite 설정
// - design 베이스 + Docker 환경 정책 (minify:false for Emotion CSS)
// - Dockerfile이 본 파일을 하드코딩 참조 (npx vite build --config vite.config.docker.ts)
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
  ],
  css: {
    modules: {
      localsConvention: "camelCase",
    },
    preprocessorOptions: {
      scss: {},
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      // main.tsx 가 "@app" 을 import 하므로 docker(운영) 빌드에도 필수.
      "@app": fileURLToPath(new URL("./src/App.tsx", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api/sse": {
        target: "http://orkis-backend-dev:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        timeout: 0,
        proxyTimeout: 0,
      },
      "/api": {
        target: "http://orkis-backend-dev:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    sourcemap: false,
    minify: false, // Emotion CSS 처리 정책 (운영 빌드에서 minify 비활성화)
    // html-react-parser는 dual entry(esm/cjs)이지만 일부 transitive deps(style-to-object,
    // inline-style-parser)가 CJS 경로로 묶이면서 wrapper init 순서 문제를 일으킨다.
    // mixed-ESM 변환을 켜서 CJS↔ESM 경계에서 named export 접근을 안전하게 만든다.
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        format: "esm",
        compact: false,
        manualChunks: (id) => {
          // vite.config.ts와 동일 정책 (vendor + design 구조 기반)
          // node_modules는 source 매처보다 먼저 분류 — 라이브러리 경로(node_modules/<pkg>/src/...) 가
          // /src/components/, /src/logic/ 매처에 잘못 부합하여 청크가 분열되는 것을 차단한다.
          if (id.includes("node_modules")) {
            // html-react-parser와 그 transitive deps는 CJS interop wrapper가 흩어지면
            // "Object.defineProperty called on non-object"가 나므로 단일 vendor 청크로 격리.
            if (
              id.includes("/node_modules/html-react-parser/") ||
              id.includes("/node_modules/style-to-object/") ||
              id.includes("/node_modules/style-to-js/") ||
              id.includes("/node_modules/inline-style-parser/")
            ) {
              return "html-parser-vendor";
            }
            if (
              id.includes("node_modules/react/") ||
              id.includes("node_modules/react-dom/") ||
              id.includes("node_modules/react-router")
            ) {
              return "react-vendor";
            }
            if (id.includes("@mui") || id.includes("@emotion")) {
              return "mui-vendor";
            }
            if (id.includes("dockview-react") || id.includes("@monaco-editor")) {
              return "editor-vendor";
            }
            return;
          }
          if (id.includes("/src/logic/")) {
            return "logic";
          }
          if (id.includes("/src/connectors/")) {
            return "connectors";
          }
          if (id.includes("/src/design-system/")) {
            return "design-system";
          }
          if (id.includes("/src/themes/")) {
            return "themes";
          }
          if (id.includes("/src/components/")) {
            return "components";
          }
        },
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash].[ext]",
      },
    },
  },
  optimizeDeps: {
    include: ["@emotion/react", "@emotion/styled", "html-react-parser"],
  },
});
