import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// orkis-front (design migration v4)
// - design 베이스 + 운영 SSE 프록시(/api/sse) + design 구조 기반 manualChunks
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
      "@app": fileURLToPath(new URL("./src/App.tsx", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      // SSE 전용 프록시 — 타임아웃 비활성화, keep-alive 유지 (운영 SSE 필수)
      "/api/sse": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        timeout: 0,
        proxyTimeout: 0,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("Connection", "keep-alive");
          });
          proxy.on("proxyRes", (proxyRes, _req, res) => {
            if (proxyRes.headers["content-type"]?.includes("text/event-stream")) {
              res.setTimeout(0);
              proxyRes.socket?.setTimeout(0);
              proxyRes.socket?.setKeepAlive(true);
            }
          });
        },
      },
      // 일반 /api 프록시
      "/api": {
        target: process.env.VITE_API_URL || "http://localhost:8080",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
  build: {
    outDir: "dist",
    target: "es2020",
    // html-react-parser는 dual entry(esm/cjs)이지만 일부 transitive deps(style-to-object,
    // inline-style-parser)가 CJS 경로로 묶이면서 wrapper init 순서 문제를 일으킨다.
    // mixed-ESM 변환을 켜서 CJS↔ESM 경계에서 named export 접근을 안전하게 만든다.
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
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
          // design 구조 기반 source chunk (src/ 만 대상 — node_modules는 위에서 종결됨)
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
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
  define: {
    "process.env": "import.meta.env",
  },
  optimizeDeps: {
    include: ["html-react-parser"],
  },
  publicDir: "public",
  base: "/",
});
