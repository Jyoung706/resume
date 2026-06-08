import type { ReactNode } from "react";

export interface VirtualMessageListProps<T> {
  /** 렌더할 항목 배열 */
  items: T[];

  /** 안정적 key 생성기 */
  itemKey: (item: T) => string;

  /** 항목 렌더러 */
  renderItem: (item: T, index: number) => ReactNode;

  /**
   * 마지막 항목 추가 시 자동 하단 스크롤 (스트리밍 follow).
   * - false: 동작 안 함
   * - "auto": 사용자가 하단 근처일 때만 따라감 (기본)
   * - "smooth": 항상 부드럽게 따라감
   */
  followOutput?: false | "auto" | "smooth";

  /** 빈 상태 (items.length === 0) 렌더 노드 */
  emptyState?: ReactNode;

  /** 스크롤 위치 변경 콜백 — scrollTop 노출 */
  onScroll?: (scrollTop: number) => void;

  /** 리스트 최상단 도달 콜백 — 자동 트리거 용 (마스터 §2 Q4 정책상 PR-2 초판 미사용) */
  onStartReached?: () => void;

  /**
   * 마운트 시 시작 위치.
   * - "bottom": 마지막 항목 (기본)
   * - 정수: 해당 index
   */
  initialTopMostItemIndex?: "bottom" | number;

  /**
   * 가상화 영역의 스크롤 컨테이너를 외부 element 로 지정.
   * 미지정 시 Virtuoso 가 자체 컨테이너를 생성 (스크롤바가 한 단계 안쪽에 표시됨).
   * 기존 페이지의 스크롤 위치/패딩/배경을 유지해야 할 때 외부 element 를 지정한다.
   */
  customScrollParent?: HTMLElement | null;

  /** 외곽 컨테이너 className */
  className?: string;
}

export interface VirtualMessageListHandle {
  /** 마지막 항목으로 스크롤 (메시지 전송 시) */
  scrollToBottom: (behavior?: "auto" | "smooth") => void;
  /** 특정 index 로 스크롤 */
  scrollToIndex: (index: number, behavior?: "auto" | "smooth") => void;
}
