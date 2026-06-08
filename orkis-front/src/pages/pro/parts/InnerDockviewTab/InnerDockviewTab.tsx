// ============================================
// InnerDockviewTab — Inner dockview 탭 바 커스텀 렌더러
// panelState에 따라 normal/collapsed 상태 렌더링
// ============================================

import clsx from "clsx";
import type { IDockviewPanelHeaderProps } from "dockview-react";
import { IconButton, Typography, Icon, FlexBox } from "@/components";
import type { PanelState } from "@/logic/common/pro/types/proMode.types";
import "./InnerDockviewTab.scss";

export interface InnerDockviewTabExtraProps {
  panelType: "editor" | "results";
  panelState: PanelState;
  /** 좌우(가로) 분할 여부 — collapsed 헤더 라벨/표시 분기에 사용. */
  isHorizontalSplit?: boolean;
  selectedDbName?: string;
  onExecute?: () => void;
  rowCount?: number;
  executionTime?: number;
  onMinimize: () => void;
  onMaximize: () => void;
}

export function InnerDockviewTab(props: IDockviewPanelHeaderProps) {
  const { api } = props;
  const title = api.title ?? "Panel";

  // params에서 extra props 추출 (Connector에서 주입)
  const extra = (props.params ?? {}) as Partial<InnerDockviewTabExtraProps>;
  const panelType = extra.panelType ?? "editor";
  const panelState = extra.panelState ?? "normal";
  const isHorizontalSplit = extra.isHorizontalSplit ?? false;
  const onMinimize = extra.onMinimize;
  const onMaximize = extra.onMaximize;

  const isCollapsed =
    (panelType === "editor" && panelState === "results-maximized") ||
    (panelType === "results" && panelState === "editor-maximized");

  const isMaximized =
    (panelType === "editor" && panelState === "editor-maximized") ||
    (panelType === "results" && panelState === "results-maximized");

  return (
    <FlexBox
      className={clsx(
        "InnerDockviewTab",
        isCollapsed && "InnerDockviewTab--collapsed",
        isMaximized && "InnerDockviewTab--maximized",
      )}
      align="center"
    >
      <Icon className="InnerDockviewTab__drag">drag_indicator</Icon>

      {/* 제목 영역 */}
      {isCollapsed && isHorizontalSplit ? (
        // 좌우 분할 collapsed: 좁은 세로 띠 안에서 한 글자 라벨만 노출.
        // 화살표/메타 정보(실행 btn, rowCount 등)는 폭 부족으로 생략.
        <Typography
          className="InnerDockviewTab__title"
          variant="caption"
          component="span"
        >
          {panelType === "editor" ? "E" : "R"}
        </Typography>
      ) : isCollapsed && panelType === "editor" ? (
        <Typography
          className="InnerDockviewTab__title"
          variant="caption"
          component="span"
        >
          ▼ Editor {extra.selectedDbName && `[${extra.selectedDbName}]`}
          {extra.onExecute && (
            <IconButton
              className="InnerDockviewTab__inline-btn"
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                extra.onExecute?.();
              }}
              title="실행"
              aria-label="쿼리 실행"
            >
              <Icon>play_arrow</Icon>
            </IconButton>
          )}
        </Typography>
      ) : isCollapsed && panelType === "results" ? (
        <Typography
          className="InnerDockviewTab__title"
          variant="caption"
          component="span"
        >
          ▲ Results
          {extra.rowCount != null && ` (${extra.rowCount} rows`}
          {extra.executionTime != null &&
            `, ${(extra.executionTime / 1000).toFixed(2)}s`}
          {extra.rowCount != null && ")"}
        </Typography>
      ) : (
        <Typography
          className="InnerDockviewTab__title"
          variant="caption"
          component="span"
        >
          {title}
        </Typography>
      )}

      {/* 최소화/최대화 버튼 */}
      <FlexBox className="InnerDockviewTab__actions" align="center">
        {/* collapsed 시 이미 최소화 상태라 minimize 클릭은 no-op → 숨김. */}
        {!isCollapsed && (
          <IconButton
            className="InnerDockviewTab__btn"
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              onMinimize?.();
            }}
            title="최소화"
            aria-label="패널 최소화"
          >
            <Icon>remove</Icon>
          </IconButton>
        )}
        {/* maximize 버튼은 normal 외 모든 상태에서 "복원(normal)" 의미. */}
        <IconButton
          className={clsx(
            "InnerDockviewTab__btn",
            isMaximized && "InnerDockviewTab__btn--active",
          )}
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            onMaximize?.();
          }}
          title={isMaximized || isCollapsed ? "복원" : "최대화"}
          aria-label={isMaximized || isCollapsed ? "패널 복원" : "패널 최대화"}
        >
          <Icon>{isMaximized || isCollapsed ? "fullscreen_exit" : "fullscreen"}</Icon>
        </IconButton>
      </FlexBox>
    </FlexBox>
  );
}
