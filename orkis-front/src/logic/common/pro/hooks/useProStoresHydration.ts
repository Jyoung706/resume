/**
 * useProStoresHydration — Pro 모드 stores 의 사용자별 hydrate 라이프사이클
 *
 * 각 Pro store 는 skipHydration: true 로 설정되어 있다. 이 훅이 마운트되면
 * 현재 인증 사용자 컨텍스트로 stores 를 rehydrate 한다.
 *
 * 사용자 변경(로그인/로그아웃) 감지 시:
 *   1) in-memory 상태를 reset() 으로 비워 이전 사용자 데이터 노출 방지
 *   2) 새 userId 컨텍스트로 다시 rehydrate
 *
 * 반환: hydrated — 첫 rehydrate 완료 여부. 호출자는 이 값이 true 가 되기
 * 전까지 Pro UI 를 렌더하지 않아 INITIAL_STATE 가 사용자에게 노출되지 않게 한다.
 */
import { useEffect, useState } from "react";
import { useAuthStore } from "@/logic/common/auth/authStore";
import {
  rehydrateProStores,
  resetProStores,
} from "@/logic/common/pro/utils/rehydrateProStores";

// 모듈-수준 캐시: ProModeConnector 가 마운트/언마운트 사이에 사용자 전환이
// 일어났는지를 컴포넌트 인스턴스 scope 보다 위에서 추적해야 한다. useRef 만
// 쓰면 새 마운트마다 undefined 로 초기화되어 logout→relogin→Pro 재진입
// 시나리오에서 이전 사용자의 in-memory state 잔존을 감지 못한다.
let lastHydratedUserId: string | null | undefined = undefined;

export function useProStoresHydration(): boolean {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const isUserChange =
        lastHydratedUserId !== undefined && lastHydratedUserId !== userId;
      if (isUserChange) {
        // 이전 사용자 데이터가 in-memory 에 잔존하지 않도록 비운 뒤 다시 hydrate
        resetProStores();
        setHydrated(false);
      }
      lastHydratedUserId = userId;

      await rehydrateProStores();
      if (!cancelled) setHydrated(true);
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  return hydrated;
}
