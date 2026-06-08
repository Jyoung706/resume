/**
 * createUserStorage — userId별 localStorage 키 분리
 *
 * Zustand persist의 storage로 사용하면 동일 브라우저에서
 * 다른 유저 로그인 시 이전 유저의 데이터가 노출되지 않는다.
 *
 * 키 형식: `{name}-{userId}` (미인증 시 `{name}-anonymous`)
 */
import { type StateStorage } from "zustand/middleware";
import { useAuthStore } from "@/logic/common/auth/authStore";

function getUserId(): string {
  const user = useAuthStore.getState().user;
  return user?.id ?? "anonymous";
}

export const createUserStorage = (): StateStorage => ({
  getItem: (name) => {
    return localStorage.getItem(`${name}-${getUserId()}`);
  },
  setItem: (name, value) => {
    localStorage.setItem(`${name}-${getUserId()}`, value);
  },
  removeItem: (name) => {
    localStorage.removeItem(`${name}-${getUserId()}`);
  },
});
