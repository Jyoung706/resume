import { Suspense, lazy } from "react";
import { Box, IconButton, Typography } from "@/components/base";
import { Icon } from "@/components";
import "./MonacoSqlEditor.scss";

const Editor = lazy(() => import("@monaco-editor/react"));

export interface MonacoSqlEditorProps {
  value: string;
  readOnly?: boolean;
  isDark?: boolean;
  onCopy?: () => void;
  copied?: boolean;
  onChange?: (value: string | undefined) => void;
  height?: string;
}

export function MonacoSqlEditor({
  value,
  readOnly = true,
  isDark = false,
  onCopy,
  copied,
  onChange,
  height,
}: MonacoSqlEditorProps) {
  return (
    <Box className="MonacoSqlEditor" style={height ? { height } : undefined}>
      {onCopy && (
        <>
          {copied && (
            <Typography className="MonacoSqlEditor__copied-label">
              복사됨
            </Typography>
          )}
          <IconButton
            className="MonacoSqlEditor__copy-button"
            onClick={onCopy}
            size="small"
            title="복사"
          >
            <Icon mui size="small">ContentCopyIcon</Icon>
          </IconButton>
        </>
      )}

      <Box className="MonacoSqlEditor__wrapper">
        <Suspense
          fallback={
            <Box className="MonacoSqlEditor__loading">에디터 로딩 중...</Box>
          }
        >
          <Editor
            height="100%"
          language="sql"
          value={value}
          theme={isDark ? "vs-dark" : "vs"}
          options={{
            // IME 호환성 — EditorPanelConnector.tsx 헤더 주석 참조. 제거 금지.
            editContext: false,
            readOnly,
            wordWrap: "on",
            minimap: { enabled: false },
            fontSize: 15,
            lineHeight: 24,
            fontFamily:
              '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
            fontLigatures: true,
            lineNumbers: "on",
            renderLineHighlight: "all",
            scrollBeyondLastLine: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            padding: { top: 16, bottom: 16 },
            automaticLayout: true,
            folding: true,
            smoothScrolling: true,
            cursorBlinking: "smooth",
            mouseWheelZoom: true,
            contextmenu: true,
          }}
          onChange={readOnly ? undefined : onChange}
        />
        </Suspense>
      </Box>
    </Box>
  );
}
