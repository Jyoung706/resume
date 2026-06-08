/**
 * rehydrateProStores — Pro 모드 stores 일괄 rehydrate
 *
 * 각 store 는 skipHydration: true 로 설정되어 있어 module-load 시점에
 * 자동 hydrate 가 일어나지 않는다. 이 함수는 인증된 사용자 컨텍스트에서
 * 호출되어 createUserStorage 가 올바른 userId 키로 데이터를 읽도록 한다.
 *
 * 사용자 변경(로그인/로그아웃) 시에는 reset() 으로 in-memory 상태를 비운
 * 뒤 호출해야 이전 사용자 데이터가 잔존하지 않는다.
 */
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { useSnippetStore } from "@/logic/common/pro/stores/snippetStore";
import { useProModeLayoutStore } from "@/logic/common/pro/stores/proModeLayoutStore";

export function resetProStores(): void {
  useQueryPanelStore.getState().reset();
  useSnippetStore.getState().reset();
  useProModeLayoutStore.getState().reset();
}

export async function rehydrateProStores(): Promise<void> {
  await Promise.all([
    useQueryPanelStore.persist.rehydrate(),
    useSnippetStore.persist.rehydrate(),
    useProModeLayoutStore.persist.rehydrate(),
  ]);
}
