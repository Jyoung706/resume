/**
 * 채팅 시스템 설정
 * 하드코딩 값을 한 곳에서 관리
 */
export const chatConfig = {
  session: {
    /** 생성 가능한 최대 채팅방 수 */
    maxCount: 50,
    /** 세션 목록 로드 시 첫 번째 세션을 자동 선택할지 여부 */
    autoSelectFirst: true,
    /** 세션이 하나도 없을 때 자동으로 새 세션을 생성할지 여부 */
    autoCreateOnEmpty: true
  },
  message: {
    /** 메모리에 유지할 세션별 메시지 LRU 캐시 크기 */
    lruCacheSize: 20
  },
  instance: {
    /** Activity로 DOM을 유지할 최대 채팅방 수 */
    maxInstances: 10
  },
  rightSidebar: {
    /** 우측 사이드바 초기 표시 모드 (resize | overlay) */
    defaultMode: "overlay" as const
  },
  history: {
    /** 한 페이지당 로드 건수 */
    pageSize: 20,
    /** 스트리밍 완료 후 백엔드 반영 대기 시간 (ms) */
    refreshDelayMs: 500,
    /** 히스토리 API 기술명 → 화면 표시명 매핑 */
    stepDisplayNames: {
      Generate_Hint: "Hint",
      Schema_Linking: "스키마",
      Generate_Sql: "SQL",
      Evaluate: "검증",
    } as Record<string, string>
  }
} as const;
