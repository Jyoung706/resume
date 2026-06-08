// ============================================
// QueryWorkspace — Inner DockviewReact (EditorPanel + ResultsPanel)
// Design 컴포넌트: props-only
// innerComponents와 innerDefaultTabComponent는 Connector에서 주입
// ============================================

import { useCallback, useRef, useEffect } from "react";
import {
  DockviewReact,
  type DockviewReadyEvent,
  type DockviewApi,
} from "dockview-react";
import "dockview-react/dist/styles/dockview.css";
import { Box } from "@/components";
import type {
  PanelState,
  SplitOrientation,
} from "@/logic/common/pro/types/proMode.types";
import "./QueryWorkspace.scss";

/**
 * dockview 탭 헤더 높이(px). 패널 collapse 시 헤더 영역 높이로 사용.
 * 실제 헤더 높이를 결정하는 CSS 변수 `--dv-tabs-and-actions-container-height`
 * (ProModePage.scss)의 inner 스코프 값과 일치해야 한다.
 */
const TAB_HEADER_HEIGHT = 35;

/**
 * 좌우 분할에서 패널을 collapse 했을 때 남길 가로 폭(px).
 * 헤더 높이와 동일하게 두어 "세로 띠" 형태(정사각형 단면)로 노출.
 */
const TAB_HEADER_WIDTH = TAB_HEADER_HEIGHT;

export interface QueryWorkspaceProps {
  tabId: string;
  panelState: PanelState;
  onSetPanelState: (state: PanelState) => void;
  /** 분할 방향 — onReady 시 초기 패널 배치(상하/좌우) 결정에 사용. */
  splitOrientation: SplitOrientation;
  /** 사용자 드래그로 분할 방향이 바뀌면 persist 하기 위해 호출. */
  onSetSplitOrientation: (orientation: SplitOrientation) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  innerComponents: Record<string, React.FC<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  innerDefaultTabComponent?: React.FC<any>;
  isDark?: boolean;
}

export function QueryWorkspace({
  tabId,
  panelState,
  onSetPanelState,
  splitOrientation,
  onSetSplitOrientation,
  innerComponents,
  innerDefaultTabComponent,
  isDark = false,
}: QueryWorkspaceProps) {
  const innerApiRef = useRef<DockviewApi | null>(null);

  // panelState를 ref로 유지 (onReady 콜백 내 클로저에서 최신값 참조)
  const panelStateRef = useRef(panelState);
  panelStateRef.current = panelState;

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      innerApiRef.current = event.api;

      const editorPanel = event.api.addPanel({
        id: `editor-${tabId}`,
        component: "EditorPanel",
        title: "Editor",
        params: {
          tabId,
          panelType: "editor",
          panelState,
          onMinimize: () => onSetPanelState("results-maximized"),
          // normal → editor-maximized (자기 최대화).
          // normal 외(자기가 maximized 또는 collapsed) → normal 로 복원.
          onMaximize: () =>
            onSetPanelState(panelStateRef.current === "normal" ? "editor-maximized" : "normal"),
        },
      });

      event.api.addPanel({
        id: `results-${tabId}`,
        component: "ResultsPanel",
        title: "Results",
        params: {
          tabId,
          panelType: "results",
          panelState,
          onMinimize: () => onSetPanelState("editor-maximized"),
          onMaximize: () =>
            onSetPanelState(panelStateRef.current === "normal" ? "results-maximized" : "normal"),
        },
        // persist 된 분할 방향에 따라 초기 배치 결정.
        // - vertical(상하): Editor 아래에 Results
        // - horizontal(좌우): Editor 오른쪽에 Results
        position: {
          referencePanel: editorPanel,
          direction: splitOrientation === "horizontal" ? "right" : "below",
        },
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabId]
  );

  // 마지막으로 인식한 분할 방향 — 사용자가 좌우↔상하 드래그로 바꾸면 갱신.
  // null = 아직 측정 전.
  const orientationRef = useRef<boolean | null>(null);

  // panelState 적용 로직 — useEffect 와 onDidLayoutChange 양쪽에서 호출.
  const applyPanelStateRef = useRef<() => void>(() => {});

  // onSetSplitOrientation 을 ref 로 유지 — onDidLayoutChange effect 의 deps 변동 회피.
  const onSetSplitOrientationRef = useRef(onSetSplitOrientation);
  onSetSplitOrientationRef.current = onSetSplitOrientation;

  // panelState 변경 시 Inner dockview 그룹 크기 조정
  useEffect(() => {
    const apply = () => {
      const innerApi = innerApiRef.current;
      if (!innerApi) return;

      const editorPanel = innerApi.getPanel(`editor-${tabId}`);
      const resultsPanel = innerApi.getPanel(`results-${tabId}`);
      if (!editorPanel || !resultsPanel) return;

      const editorGroup = editorPanel.group;
      const resultsGroup = resultsPanel.group;

      // 두 그룹 element의 중심 좌표 차이로 분할 방향 판별.
      // 좌우 분할이면 가로 변위(dx)가 세로 변위(dy)보다 크다.
      const er = editorGroup.element.getBoundingClientRect();
      const rr = resultsGroup.element.getBoundingClientRect();
      const dx = Math.abs(er.left + er.right - rr.left - rr.right) / 2;
      const dy = Math.abs(er.top + er.bottom - rr.top - rr.bottom) / 2;
      const isHorizontalSplit = dx > dy;
      orientationRef.current = isHorizontalSplit;

      // InnerDockviewTab 에 최신 panelState + 분할 방향 전달.
      editorPanel.api.updateParameters({ panelState, isHorizontalSplit });
      resultsPanel.api.updateParameters({ panelState, isHorizontalSplit });

      const collapsedSize = isHorizontalSplit ? TAB_HEADER_WIDTH : TAB_HEADER_HEIGHT;
      const totalSize = isHorizontalSplit ? innerApi.width : innerApi.height;
      const expandedSize = Math.max(0, totalSize - collapsedSize);

      // collapsed 측 group element 에 클래스 토글 → CSS 가 dv-content-container 숨김.
      // 상하 분할은 height 자체가 짧아 자동으로 안 보이지만 명시 처리해도 무해.
      const isEditorCollapsed = panelState === "results-maximized";
      const isResultsCollapsed = panelState === "editor-maximized";
      editorGroup.element.classList.toggle("pro-inner-group--collapsed", isEditorCollapsed);
      resultsGroup.element.classList.toggle("pro-inner-group--collapsed", isResultsCollapsed);
      // 좌우 분할 여부 — collapsed 그룹의 헤더를 세로 배치로 만들기 위한 마커.
      editorGroup.element.classList.toggle("pro-inner-group--horizontal", isHorizontalSplit);
      resultsGroup.element.classList.toggle("pro-inner-group--horizontal", isHorizontalSplit);

      type Group = typeof editorGroup;
      const releaseConstraints = (g: Group) =>
        g.api.setConstraints({
          minimumWidth: 0,
          maximumWidth: Number.MAX_SAFE_INTEGER,
          minimumHeight: 0,
          maximumHeight: Number.MAX_SAFE_INTEGER,
        });
      const lockToCollapsed = (g: Group) =>
        g.api.setConstraints(
          isHorizontalSplit
            ? { minimumWidth: collapsedSize, maximumWidth: collapsedSize }
            : { minimumHeight: collapsedSize, maximumHeight: collapsedSize },
        );
      const sizeTo = (g: Group, size: number) =>
        g.api.setSize(isHorizontalSplit ? { width: size } : { height: size });

      switch (panelState) {
        case "editor-maximized":
          releaseConstraints(editorGroup);
          lockToCollapsed(resultsGroup);
          // 확장 쪽에도 명시적 크기 부여 — splitview 가 다른 그룹의 자연
          // minimum 때문에 collapse 쪽을 collapsedSize 까지 못 밀어붙이는
          // 현상 차단.
          sizeTo(editorGroup, expandedSize);
          sizeTo(resultsGroup, collapsedSize);
          break;
        case "results-maximized":
          releaseConstraints(resultsGroup);
          lockToCollapsed(editorGroup);
          sizeTo(resultsGroup, expandedSize);
          sizeTo(editorGroup, collapsedSize);
          break;
        case "normal":
          releaseConstraints(editorGroup);
          releaseConstraints(resultsGroup);
          requestAnimationFrame(() => {
            sizeTo(editorGroup, totalSize / 2);
          });
          break;
      }
    };

    applyPanelStateRef.current = apply;
    apply();
  }, [panelState, tabId]);

  // 사용자가 드래그로 분할 방향을 좌우↔상하 전환하면 panelState 로직 재실행.
  // 매 layout change 마다 호출되지만 방향이 바뀐 경우에만 apply 하여 무한 루프 회피.
  useEffect(() => {
    const innerApi = innerApiRef.current;
    if (!innerApi) return;

    const disposable = innerApi.onDidLayoutChange(() => {
      const editorPanel = innerApi.getPanel(`editor-${tabId}`);
      const resultsPanel = innerApi.getPanel(`results-${tabId}`);
      if (!editorPanel || !resultsPanel) return;

      const er = editorPanel.group.element.getBoundingClientRect();
      const rr = resultsPanel.group.element.getBoundingClientRect();
      const dx = Math.abs(er.left + er.right - rr.left - rr.right) / 2;
      const dy = Math.abs(er.top + er.bottom - rr.top - rr.bottom) / 2;
      const isHorizontalSplit = dx > dy;

      if (orientationRef.current !== null && orientationRef.current !== isHorizontalSplit) {
        // 방향 전환 감지 → 5:5 재분배 + (maximized 상태였다면) 새 방향에 맞춰 다시 적용.
        applyPanelStateRef.current();
        // store 에 새 방향 persist → 새로고침 후에도 좌우/상하 유지.
        onSetSplitOrientationRef.current(isHorizontalSplit ? "horizontal" : "vertical");
      }
    });
    return () => disposable.dispose();
  }, [tabId]);

  return (
    <Box className="QueryWorkspace">
      <DockviewReact
        components={innerComponents}
        defaultTabComponent={innerDefaultTabComponent}
        onReady={onReady}
        className={`${isDark ? "dockview-theme-dark" : "dockview-theme-light"} pro-mode-dockview`}
      />
    </Box>
  );
}
