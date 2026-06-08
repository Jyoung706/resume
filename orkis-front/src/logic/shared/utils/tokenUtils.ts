/**
 * 스토리지 유틸리티 (Phase 2 — 쿠키 기반 인증)
 * 인증 토큰 관련 함수 삭제 — 서버가 HttpOnly 쿠키로 관리
 * 남은 역할: 사용자 데이터 정리, 필드 매핑
 */

// --- Unicode decode + field mapping ---

const decodeUnicodeEscapes = (str: string): string => {
  try {
    return str.replace(/\\u([0-9a-fA-F]{4})/g, (_match, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    );
  } catch {
    return str;
  }
};

export const sanitizeUserData = (
  user: Record<string, unknown>
): Record<string, unknown> => {
  if (!user || typeof user !== "object") return user;
  const sanitized = { ...user };

  for (const field of ["NAME", "EMAIL", "PHONE"]) {
    if (typeof sanitized[field] === "string") {
      sanitized[field] = decodeUnicodeEscapes(sanitized[field] as string);
    }
  }

  // 백엔드 대문자 → 프론트엔드 소문자 매핑
  if (sanitized.NAME && !sanitized.name) sanitized.name = sanitized.NAME;
  if (sanitized.EMAIL && !sanitized.email) sanitized.email = sanitized.EMAIL;
  if (sanitized.ID && !sanitized.id) sanitized.id = sanitized.ID;

  return sanitized;
};

// --- 로그아웃 시 사용자 데이터 전체 정리 ---

export const clearAllUserData = (): void => {
  if (typeof window === "undefined") return;
  try {
    // 사용자별 localStorage 정리
    localStorage.removeItem("chatSessionStore");
    localStorage.removeItem("chat_sidebar_collapsed");
    localStorage.removeItem("orkis-grade");
    localStorage.removeItem("orkis-settings");
    localStorage.removeItem("chatRoomStateStore");
    localStorage.removeItem("orkis-input-menu-selections");
    // 레거시 정리 — selectedDbConnectionId 는 과거 localStorage 에 저장되었으나
    // 현재는 sessionStorage 로 이전됨. 잔존 키만 1회성 제거한다.
    localStorage.removeItem("selectedDbConnectionId");

    // orkis-front 레거시 localStorage 토큰 정리 (동일 도메인 배포)
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("tokenStoredTime");
    localStorage.removeItem("socialToken");

    // cache_* 접두사 키 정리
    const cacheKeys = Object.keys(localStorage).filter((k) =>
      k.startsWith("cache_")
    );
    cacheKeys.forEach((k) => localStorage.removeItem(k));

    sessionStorage.clear();
  } catch {
    // 무시
  }
};
