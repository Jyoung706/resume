/**
 * 사용자 활동 기반 세션 갱신 훅.
 * 마우스/키보드 활동이 있을 때만 55분 주기로 /auth/refresh를 호출한다.
 * 활동 없이 1시간 경과 시 세션 만료 → 다음 API 호출 또는 탭 복귀 시 로그아웃.
 */
import { useEffect, useRef } from "react";
import { useAuthStore } from "./authStore";

const SESSION_TTL = 60 * 60 * 1000; // 1시간
const REFRESH_BEFORE = 5 * 60 * 1000; // 만료 5분 전
const REFRESH_INTERVAL = SESSION_TTL - REFRESH_BEFORE; // 55분
const CHECK_INTERVAL = 60 * 1000; // 1분마다 활동 여부 확인
const ACTIVITY_THROTTLE = 5000; // 5초 스로틀링

export function useSessionRefresh() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const lastActivity = useRef(Date.now());
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    if (!isAuthenticated) return;

    // 로그인/재로그인 시 ref 초기화 — 새 세션 기준으로 갱신 주기 시작
    lastActivity.current = Date.now();
    lastRefresh.current = Date.now();

    // --- 사용자 활동 감지 (5초 스로틀링) ---
    let lastActivityUpdate = 0;
    const onActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdate > ACTIVITY_THROTTLE) {
        lastActivityUpdate = now;
        lastActivity.current = now;
      }
    };
    window.addEventListener("mousemove", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("click", onActivity);
    window.addEventListener("scroll", onActivity);

    // --- 주기적 확인 (1분마다) ---
    const timer = setInterval(() => {
      const now = Date.now();
      const sinceLastRefresh = now - lastRefresh.current;
      const sinceLastActivity = now - lastActivity.current;

      // 갱신 주기(55분) 도달 + 활동이 있었으면 갱신
      if (
        sinceLastRefresh >= REFRESH_INTERVAL &&
        sinceLastActivity < SESSION_TTL
      ) {
        lastRefresh.current = now;
        useAuthStore.getState().refreshSession();
      }
    }, CHECK_INTERVAL);

    // --- 탭 복귀 시 서버 확인 ---
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      const sinceLastRefresh = now - lastRefresh.current;

      if (sinceLastRefresh >= REFRESH_INTERVAL) {
        lastActivity.current = now;
        lastRefresh.current = now;
        useAuthStore.getState().refreshSession();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("click", onActivity);
      window.removeEventListener("scroll", onActivity);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isAuthenticated]);
}
