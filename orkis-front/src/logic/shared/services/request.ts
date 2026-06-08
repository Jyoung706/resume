/**
 * HTTP 클라이언트 (fetch 기반, Phase 2 — 쿠키 기반 인증)
 * Authorization 헤더 제거 — connect.sid 쿠키가 유일한 인증 수단
 * refreshToken 삭제 — 서버 세션 TTL로 관리
 */
import type { StandardResponse } from "@/logic/common/health/types/api";
import { getLogger } from "@/logic/shared/utils/logger";
import { API_BASE } from "@/logic/shared/config/env";

export { API_BASE };

const logger = getLogger("Request");

// --- 에러 알림 옵션 ---

export interface ErrorNotificationOptions {
  showNotification?: boolean;
  customTitle?: string;
  customMessage?: string;
  silent?: boolean;
}

// --- 내부 상태 ---

const pendingRequests = new Map<string, Promise<unknown>>();
const recentErrors = new Map<string, number>();
const ERROR_THROTTLE_TIME = 3000;

// --- 헬퍼 ---

const getErrorMessage = (
  errorCode?: string,
  defaultMessage?: string
): { title: string; message: string } => {
  const map: Record<string, { title: string; message: string }> = {
    AUTH_REQUIRED: {
      title: "인증 필요",
      message: "로그인이 필요한 서비스입니다."
    },
    TOKEN_EXPIRED: {
      title: "세션 만료",
      message: "로그인 세션이 만료되었습니다."
    },
    INVALID_REQUEST: { title: "요청 오류", message: "잘못된 요청입니다." },
    SERVER_ERROR: {
      title: "서버 오류",
      message: "서버에서 오류가 발생했습니다."
    },
    NETWORK_ERROR: {
      title: "연결 실패",
      message: "서버에 연결할 수 없습니다."
    },
    UNKNOWN_ERROR: {
      title: "오류 발생",
      message: "알 수 없는 오류가 발생했습니다."
    }
  };
  return (
    map[errorCode || ""] || {
      title: "오류 발생",
      message: defaultMessage || "알 수 없는 오류가 발생했습니다."
    }
  );
};

// --- 에러 처리 ---

const handleApiError = (
  error: Record<string, unknown>,
  options: ErrorNotificationOptions = {}
): void => {
  const {
    showNotification = true,
    customTitle,
    customMessage,
    silent = false
  } = options;
  if (!showNotification || silent) return;

  const errorObj = error?.error as Record<string, unknown> | undefined;
  const errorInfo = getErrorMessage(
    errorObj?.code as string | undefined,
    (error?.message as string) || (errorObj?.message as string)
  );
  const title = customTitle || errorInfo.title;
  const message = customMessage || errorInfo.message;

  const errorKey = `${(errorObj?.code as string) || "unknown"}:${title}:${message}`;
  const now = Date.now();
  const last = recentErrors.get(errorKey);
  if (last && now - last < ERROR_THROTTLE_TIME) return;
  recentErrors.set(errorKey, now);

  logger.error("[API Error]", { errorKey, title, message });

  // 오래된 기록 정리
  for (const [key, time] of recentErrors) {
    if (now - time > 10000) recentErrors.delete(key);
  }

  if (typeof window !== "undefined") {
    const code = errorObj?.code as string | undefined;
    const isModal =
      code === "NETWORK_ERROR" ||
      code === "SERVER_ERROR" ||
      code === "AUTH_REQUIRED" ||
      code === "TOKEN_EXPIRED" ||
      code === "VALIDATION_ERROR";

    window.dispatchEvent(
      new CustomEvent(isModal ? "modal:error" : "toast:general", {
        detail: isModal ? { title, message } : { title, message, type: "error" }
      })
    );
  }

  try {
    Object.defineProperty(error, "__handled", {
      value: true,
      enumerable: false,
      configurable: true
    });
  } catch {
    // 동결된 객체 등 마커 부착 불가 시 무시
  }
};

// --- 강제 로그아웃 ---

const FORCE_LOGOUT_MARKER = "__forceLogout__";

const forceLogout = async (message: string): Promise<never> => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("auth:logout", {
        detail: { reason: "session_expired", message }
      })
    );
  }
  const authError: any = new Error(message);
  authError[FORCE_LOGOUT_MARKER] = true;
  authError.error = { code: "SESSION_EXPIRED", message };
  throw authError;
};

// --- 응답 처리 ---

const isStandardResponse = (data: unknown): data is StandardResponse => {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  return (
    "success" in obj &&
    "timestamp" in obj &&
    typeof obj.success === "boolean"
  );
};

const handleResponse = async <T = unknown>(
  response: Response,
  _preserveWrapper = false,
  errorOptions: ErrorNotificationOptions = {}
): Promise<T> => {
  if (!response.ok) {
    let errorData: Record<string, unknown>;
    try {
      const text = await response.text();
      try {
        errorData = JSON.parse(text);
      } catch {
        errorData = { message: text || "API 요청 실패" };
      }
    } catch {
      errorData = { message: "API 요청 실패" };
    }

    if (response.status === 400 && !errorData.error) {
      errorData = {
        error: {
          code: "VALIDATION_ERROR",
          message:
            (errorData.message as string) || "입력값 검증에 실패했습니다."
        }
      };
    } else if (response.status === 401) {
      // 쿠키 기반: 401 시 세션 만료 → 즉시 로그아웃
      const isAuthEndpoint =
        response.url.includes("/auth/login") ||
        response.url.includes("/auth/me");
      if (isAuthEndpoint) {
        if (!errorData.error) {
          errorData = {
            error: {
              code: "AUTH_FAILED",
              message:
                (errorData.message as string) || "인증에 실패했습니다."
            }
          };
        }
      } else {
        await forceLogout("인증이 만료되었습니다. 다시 로그인해주세요.");
        // forceLogout은 항상 throw — 아래는 TypeScript 제어 흐름용
        return undefined as never;
      }
    } else if (response.status === 403) {
      errorData = {
        error: { code: "ACCESS_DENIED", message: "접근이 거부되었습니다." }
      };
    } else if (response.status === 404) {
      errorData = {
        error: {
          code: "NOT_FOUND",
          message: "요청한 리소스를 찾을 수 없습니다."
        }
      };
    } else if (
      response.status >= 500 &&
      !errorData.error &&
      !errorData.message
    ) {
      errorData = {
        error: {
          code: "SERVER_ERROR",
          message: "서버 오류가 발생했습니다."
        }
      };
    }

    handleApiError(errorData, errorOptions);
    throw errorData;
  }

  if (response.status === 204) return {} as T;

  const jsonData = await response.json();

  // success: false 에러 처리
  if (
    jsonData &&
    typeof jsonData === "object" &&
    "success" in jsonData &&
    jsonData.success === false
  ) {
    throw jsonData;
  }

  // StandardResponse 언래핑
  if (isStandardResponse(jsonData)) {
    if (!jsonData.success) throw jsonData;
    let unwrapped = jsonData.data || jsonData.result;
    let depth = 0;
    while (
      unwrapped &&
      typeof unwrapped === "object" &&
      "success" in unwrapped &&
      "timestamp" in unwrapped &&
      depth < 5
    ) {
      depth++;
      if (!(unwrapped as StandardResponse).success) throw unwrapped;
      const next =
        (unwrapped as StandardResponse).data ||
        (unwrapped as StandardResponse).result;
      if (next === unwrapped) break;
      unwrapped = next;
    }
    return unwrapped as T;
  }

  return jsonData as T;
};

// --- 요청 키 ---

const createRequestKey = (
  method: string,
  url: string,
  data?: unknown
): string => `${method}:${url}:${JSON.stringify(data || {})}`;

// --- 네트워크 에러 핸들러 ---

const handleNetworkError = (
  error: Error,
  errorOptions: ErrorNotificationOptions
): never => {
  if (error.name === "AbortError") throw new Error("요청이 취소되었습니다.");

  const isNetworkFail =
    error.name === "TypeError" || error.message === "Failed to fetch";
  const wrapped = {
    error: {
      code: isNetworkFail ? "NETWORK_ERROR" : "UNKNOWN_ERROR",
      message: isNetworkFail
        ? "서버에 연결할 수 없습니다."
        : error.message || "알 수 없는 오류가 발생했습니다."
    },
    success: false
  };
  handleApiError(wrapped, errorOptions);
  throw wrapped;
};

// --- Public API ---

export const apiGet = async <T = unknown>(
  url: string,
  extraHeaders: Record<string, string> = {},
  errorOptions: ErrorNotificationOptions = {}
): Promise<T> => {
  const requestKey = createRequestKey("GET", url);
  if (pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>;
  }

  const promise = fetch(`${API_BASE}${url}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", ...extraHeaders },
    credentials: "include"
  })
    .then((r) => handleResponse<T>(r, false, errorOptions))
    .catch((e: Error) => {
      if ((e as any)[FORCE_LOGOUT_MARKER]) throw e;
      if ((e as unknown as Record<string, unknown>)?.error) throw e;
      return handleNetworkError(e, errorOptions);
    });

  pendingRequests.set(requestKey, promise);

  try {
    return await promise;
  } finally {
    pendingRequests.delete(requestKey);
  }
};

interface ApiPostOptions extends ErrorNotificationOptions {
  signal?: AbortSignal;
  skipAuth?: boolean;
  [key: string]: unknown;
}

export const apiPost = async <T = unknown>(
  url: string,
  data?: unknown,
  options: ApiPostOptions = {}
): Promise<T> => {
  const {
    signal,
    showNotification,
    customTitle,
    customMessage,
    silent,
    skipAuth: _skipAuth,
    ...extraHeaders
  } = options;
  const errorOptions: ErrorNotificationOptions = {
    showNotification,
    customTitle,
    customMessage,
    silent
  };
  const requestKey = createRequestKey("POST", url, data);

  if (!signal && pendingRequests.has(requestKey)) {
    return pendingRequests.get(requestKey) as Promise<T>;
  }

  const promise = fetch(`${API_BASE}${url}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(extraHeaders as Record<string, string>)
    },
    body: JSON.stringify(data),
    credentials: "include",
    signal
  })
    .then((r) => handleResponse<T>(r, false, errorOptions))
    .catch((e: Error) => {
      if ((e as any)[FORCE_LOGOUT_MARKER]) throw e;
      const asRecord = e as unknown as Record<string, unknown>;
      if (asRecord?.error) {
        if (typeof asRecord.error === "object")
          handleApiError(asRecord, errorOptions);
        throw e;
      }
      return handleNetworkError(e, errorOptions);
    });

  if (!signal) pendingRequests.set(requestKey, promise);

  try {
    return await promise;
  } finally {
    if (!signal) pendingRequests.delete(requestKey);
  }
};

export const apiPut = async <T = unknown>(
  url: string,
  data?: unknown,
  extraHeaders: Record<string, string> = {},
  errorOptions: ErrorNotificationOptions = {}
): Promise<T> => {
  return apiPost<T>(url, data, {
    ...extraHeaders,
    "X-HTTP-Method-Override": "PUT",
    ...errorOptions
  });
};

export const apiDelete = async <T = unknown>(
  url: string,
  extraHeaders: Record<string, string> = {},
  errorOptions: ErrorNotificationOptions = {}
): Promise<T> => {
  return apiPost<T>(url, {}, {
    ...extraHeaders,
    "X-HTTP-Method-Override": "DELETE",
    ...errorOptions
  });
};
