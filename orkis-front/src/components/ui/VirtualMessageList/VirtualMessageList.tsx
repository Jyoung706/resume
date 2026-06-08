import {
  forwardRef,
  useImperativeHandle,
  useRef,
  type ForwardedRef,
  type ReactElement,
  type Ref,
} from "react";
import clsx from "clsx";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import "./VirtualMessageList.scss";
import type {
  VirtualMessageListHandle,
  VirtualMessageListProps,
} from "./VirtualMessageList.types";

/**
 * 가변 높이 메시지 리스트를 가상화하여 뷰포트 + overscan 분량만 마운트한다.
 * react-virtuoso 의 followOutput·initialTopMostItemIndex·ResizeObserver 자동 측정을
 * Design Layer props 표면으로 캡슐화한다.
 *
 * 외부에서 react-virtuoso 를 직접 import 하지 말 것 — 본 컴포넌트 1곳에 의존을 가둔다.
 */
function VirtualMessageListInner<T>(
  props: VirtualMessageListProps<T>,
  ref: ForwardedRef<VirtualMessageListHandle>,
) {
  const {
    items,
    itemKey,
    renderItem,
    followOutput = "auto",
    emptyState,
    onScroll,
    onStartReached,
    initialTopMostItemIndex = "bottom",
    customScrollParent,
    className,
  } = props;

  const virtuosoRef = useRef<VirtuosoHandle>(null);

  useImperativeHandle(
    ref,
    () => ({
      scrollToBottom: (behavior = "auto") => {
        virtuosoRef.current?.scrollToIndex({ index: "LAST", behavior });
      },
      scrollToIndex: (index, behavior = "auto") => {
        virtuosoRef.current?.scrollToIndex({ index, behavior });
      },
    }),
    [],
  );

  // initialTopMostItemIndex: "bottom" → 마지막 index
  // 빈 배열일 때는 0 으로 처리 (Virtuoso 가 자체 무시)
  const initialIndex =
    initialTopMostItemIndex === "bottom"
      ? Math.max(items.length - 1, 0)
      : initialTopMostItemIndex;

  // emptyState 슬롯 — Virtuoso components 는 ref-stable 권장이나 EmptyPlaceholder 는
  // items.length === 0 일 때만 표시되어 빈도가 매우 낮아 영향 미미.
  // (Header 슬롯은 매 렌더 새 함수로 인한 unmount/remount 문제로 제거. 호출처에서
  // 형제 노드로 배치한다.)
  const components = {
    EmptyPlaceholder: emptyState
      ? () => <div className="VirtualMessageList__empty">{emptyState}</div>
      : undefined,
  };

  return (
    <Virtuoso
      ref={virtuosoRef}
      className={clsx("VirtualMessageList__root", className)}
      data={items}
      computeItemKey={(_, item) => itemKey(item)}
      itemContent={(index, item) => renderItem(item, index)}
      followOutput={followOutput}
      initialTopMostItemIndex={initialIndex}
      startReached={onStartReached}
      onScroll={(e) => {
        const target = e.currentTarget as HTMLElement;
        onScroll?.(target.scrollTop);
      }}
      components={components}
      customScrollParent={customScrollParent ?? undefined}
      // 가변 높이 측정 부드러움을 위한 기본 추정 (SQL 결과/마크다운 평균치).
      // 실제 측정은 ResizeObserver 가 수행하므로 정확도 영향 없음.
      defaultItemHeight={200}
      // 채팅 UX 보존: 사용자가 위로 스크롤해도 진행 중인 답변(보통 하단)이
      // unmount 되지 않도록 viewport 하단으로 충분히 여유 영역을 둔다.
      // top 도 일정 확장하여 "지난 대화 더 보기" 직후 점프를 완화.
      increaseViewportBy={{ top: 600, bottom: 2400 }}
      // customScrollParent 모드에서 isAtBottom 계산이 외부 element 의 scrollTop
      // 의존이라 부정확해지므로 임계값을 크게 잡아 follow 판정을 관대화.
      atBottomThreshold={600}
    />
  );
}

// forwardRef + generic 보존 — 호출처에서 <ChatMessageData> 등 구체 타입을 유지
export const VirtualMessageList = forwardRef(VirtualMessageListInner) as <T>(
  props: VirtualMessageListProps<T> & { ref?: Ref<VirtualMessageListHandle> },
) => ReactElement;
