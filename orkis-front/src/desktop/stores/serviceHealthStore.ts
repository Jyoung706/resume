/**
 * Desktop Service Health Store
 *
 * desktop main 의 `service:status` IPC 이벤트를 보관.
 * RAG 아이콘 등 헤더 상태가 derived 로 참조.
 * 웹 환경에선 IPC 가 emit 되지 않아 값이 영원히 undefined.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ServiceHealthState {
  backend?: ServiceStatus;
  ai?: ServiceStatus;
  setStatus: (name: ServiceName, status: ServiceStatus) => void;
}

export const useServiceHealthStore = create<ServiceHealthState>()(
  persist(
    (set) => ({
      backend: undefined,
      ai: undefined,
      setStatus: (name, status) => set({ [name]: status }),
    }),
    {
      // localStorage(prod: orkis://app origin, dev: localhost)에 backend/ai 만 영속.
      // 새로고침 시 rehydrate → RAG 아이콘 회색 방지. die/unhealthy 는 events 가 정정.
      name: "orkis-service-health",
      partialize: (state) => ({ backend: state.backend, ai: state.ai }),
    },
  ),
);
