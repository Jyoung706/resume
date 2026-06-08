// ============================================
// EditorToolbar — [DB▼][Row▼][▶실행][⏹중지]
// Design 컴포넌트: props-only
// ============================================

import clsx from "clsx";
import { FlexBox, Box, Button, IconButton, Icon } from "@/components";
import type { RowLimitOption } from "@/logic/common/pro/types/proMode.types";
import "./EditorPanel.scss";

export interface EditorToolbarProps {
  selectedDbName?: string;
  rowLimit: RowLimitOption;
  isExecuting: boolean;
  onDbSelect?: (e: React.MouseEvent<HTMLElement>) => void;
  onRowLimitSelect?: (e: React.MouseEvent<HTMLElement>) => void;
  onExecute: () => void;
  onStop?: () => void;
}

export function EditorToolbar({
  selectedDbName,
  rowLimit,
  isExecuting,
  onDbSelect,
  onRowLimitSelect,
  onExecute,
  onStop,
}: EditorToolbarProps) {
  return (
    <FlexBox className="EditorToolbar" align="center" gap={0.25}>
      {/* DB 선택 — 미선택 시 클릭 유도 텍스트 + 강조 스타일 */}
      <Button
        className={clsx(
          "EditorToolbar__select",
          !selectedDbName && "EditorToolbar__select--unselected",
        )}
        variant="outlined"
        size="small"
        onClick={onDbSelect}
        title={selectedDbName ? "DB 변경" : "DB 를 선택하세요"}
        aria-label={selectedDbName ? `DB: ${selectedDbName} (변경)` : "DB 선택"}
        aria-haspopup="menu"
        endIcon={<Icon size="small">arrow_drop_down</Icon>}
      >
        {selectedDbName ?? "DB 선택"}
      </Button>

      {/* Row Limit */}
      <Button
        className="EditorToolbar__select"
        variant="outlined"
        size="small"
        onClick={onRowLimitSelect}
        title="Row Limit"
        aria-label={`Row Limit: ${rowLimit === "MAX" ? "MAX" : rowLimit}`}
        aria-haspopup="menu"
        endIcon={<Icon size="small">arrow_drop_down</Icon>}
      >
        {rowLimit === "MAX" ? "MAX" : `${rowLimit}`}
      </Button>

      <Box className="EditorToolbar__spacer" />

      {/* 실행/중지 — onStop 미전달 시 stop 버튼 미렌더 (백엔드 cancel API 미지원) */}
      {isExecuting && onStop ? (
        <IconButton
          className="EditorToolbar__btn"
          onClick={onStop}
          title="중지"
          size="small"
          color="error"
        >
          <Icon>stop</Icon>
        </IconButton>
      ) : (
        <IconButton
          className="EditorToolbar__btn EditorToolbar__btn--execute"
          onClick={onExecute}
          title="실행 (Ctrl+Enter)"
          size="small"
          color="primary"
        >
          <Icon>play_arrow</Icon>
        </IconButton>
      )}
    </FlexBox>
  );
}
