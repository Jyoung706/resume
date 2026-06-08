import { net, protocol, session } from "electron";
import { pathToFileURL, URL } from "url";
import { getRendererPath } from "../utils/paths";

/**
 * 런타임에 결정되는 Backend 포트.
 * 컨테이너 시작 후 setBackendPort()로 주입.
 */
let runtimeBackendPort: number | null = null;

export function setBackendPort(port: number): void {
  runtimeBackendPort = port;
  console.log(`[Protocol] Backend port set to ${port}`);
}

export function registerProtocolSchemas(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: "orkis",
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
      },
    },
  ]);
}

export function registerProtocol(): void {
  protocol.handle("orkis", handleRequest);
}

function handleRequest(req: Request): Promise<Response> {
  const { pathname } = new URL(req.url);

  const apiMatch = pathname.match(/^\/api\/(.*)/);
  if (apiMatch) {
    return handleApiProxy(req, `/api/${apiMatch[1]}`);
  }

  return handleStaticFile(pathname);
}

/**
 * 로그아웃 시 현재 Backend origin의 쿠키를 전부 비운다.
 * Chromium session이 관리하는 쿠키 jar를 직접 정리.
 */
export async function clearBackendCookies(): Promise<void> {
  if (!runtimeBackendPort) return;
  const origin = `http://127.0.0.1:${runtimeBackendPort}`;
  await session.defaultSession.clearStorageData({
    origin,
    storages: ["cookies"],
  });
}

/**
 * API 요청을 Backend로 프록시한다.
 * net.fetch는 Chromium net stack을 사용하므로 Set-Cookie 파싱,
 * Max-Age/Expires 만료 처리, Cookie 헤더 주입이 전부 자동.
 */
async function handleApiProxy(
  request: Request,
  pathname: string,
): Promise<Response> {
  if (!runtimeBackendPort) {
    return new Response(JSON.stringify({ error: "Backend not ready" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  const url = new URL(request.url);
  const backendPath = pathname.replace("/api", "");
  const targetUrl = `http://127.0.0.1:${runtimeBackendPort}${backendPath}${url.search}`;

  const response = await net.fetch(targetUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
    signal: request.signal,
    duplex: "half",
  } as RequestInit);

  // Chromium이 이미 127.0.0.1 origin에 쿠키를 저장했으므로
  // orkis:// origin으로의 Set-Cookie 이중 전달 방지
  const safeHeaders = new Headers(response.headers);
  safeHeaders.delete("set-cookie");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: safeHeaders,
  });
}

function handleStaticFile(pathname: string): Promise<Response> {
  const filePath = resolveFilePath(pathname);
  const fullPath = getRendererPath(filePath);
  return net.fetch(pathToFileURL(fullPath).toString());
}

function resolveFilePath(pathname: string): string {
  if (pathname === "/" || pathname === "") {
    return "/index.html";
  }

  // 확장자가 없는 경로는 SPA 라우트 -> index.html로 처리
  const hasExtension = /\.\w+$/.test(pathname);
  if (!hasExtension) {
    return "/index.html";
  }

  return pathname;
}
