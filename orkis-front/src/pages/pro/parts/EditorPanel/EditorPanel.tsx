// ============================================
// EditorPanel — SQL 에디터 영역 (Toolbar + Monaco placeholder)
// Design 컴포넌트: props-only
// ============================================

import { FlexBox, Box } from "@/components";
import { EditorToolbar, type EditorToolbarProps } from "./EditorToolbar";
import "./EditorPanel.scss";

export interface EditorPanelProps extends EditorToolbarProps {
  sqlQuery: string;
  onSqlChange: (sql: string) => void;
  editorSlot?: React.ReactNode; // Monaco 에디터 자리 (Connector에서 주입)
}

export function EditorPanel({
  sqlQuery,
  onSqlChange,
  editorSlot,
  ...toolbarProps
}: EditorPanelProps) {
  return (
    <FlexBox className="EditorPanel" direction="column">
      <EditorToolbar {...toolbarProps} />
      <Box className="EditorPanel__editor">
        {editorSlot ?? (
          // Monaco 연동 전 placeholder
          <textarea
            className="EditorPanel__textarea"
            value={sqlQuery}
            onChange={(e) => onSqlChange(e.target.value)}
            placeholder="SELECT * FROM ..."
            spellCheck={false}
          />
        )}
      </Box>
    </FlexBox>
  );
}
