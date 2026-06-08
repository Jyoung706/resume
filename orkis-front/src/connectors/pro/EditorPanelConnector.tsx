// ============================================
// EditorPanelConnector — queryPanelStore + dbSelectionStore → EditorPanel 연결
// Monaco 에디터 주입, DB/Schema/RowLimit 드롭다운, Ctrl+Enter 단축키
//
// Monaco는 uncontrolled (defaultValue) 로 사용 — controlled (value) 패턴은
// 빠른 타이핑 시 keystroke 손실 race를 유발할 수 있음:
//   T1 onChange("abc p") → store update queued
//   T2 사용자 'q' 추가 → Monaco 내부 = "abc pq"
//   T3 React 리렌더, value="abc p" (T1 batch) → @monaco-editor/react setValue("abc p")
//   T4 'q' 손실
// → Monaco 자체를 source of truth 로 두고, 외부 변경(history/snippet/identifier
//    삽입)은 useEffect 에서 명시적으로 editor.setValue() 호출.
//
// IME 호환성: editContext=false 필수.
// Monaco 의 EditContext 입력 경로가 Microsoft 한국어 IME 영문 모드에서 'p'
// (= ㅔ 매핑 위치) 키를 삼키는 결함이 있어 hidden textarea 경로로 우회한다.
// VS Code #251809 워크어라운드와 동일. 옵션 제거 금지.
// ============================================
import { Suspense, lazy, useState, useCallback, useEffect, useRef } from "react";
import type { IDockviewPanelProps } from "dockview-react";
import { AlertModal, Box } from "@/components";
import { DbSelectionMenu } from "@/pages/chat/main/parts";
import { RowLimitMenu } from "@/pages/pro/parts/RowLimitMenu";
import { useThemeModeContext } from "@/design-system";
import { EditorPanel } from "@/pages/pro/parts/EditorPanel";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import { useQueryExecution } from "@/logic/common/pro/hooks/useQueryExecution";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import type { RowLimitOption } from "@/logic/common/pro/types/proMode.types";
import { formatSql } from "@/logic/common/chat/utils/sqlFormatter";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const ROW_LIMIT_OPTIONS: readonly RowLimitOption[] = [100, 500, 1000, 5000, "MAX"];

// SQL formatter provider는 monaco.languages 전역에 등록되므로 인스턴스당 1회가 아닌
// 프로세스 전체에서 1회만 등록한다. 중복 등록 시 동일 결과를 내는 provider가 누적되어
// formatDocument 실행 시 의미 없는 race가 발생할 수 있음.
let sqlFormatterRegistered = false;

export function EditorPanelConnector(props: IDockviewPanelProps) {
  const tabId = props.params.tabId as string;

  const { resolvedMode } = useThemeModeContext();
  const isDark = resolvedMode === "dark";

  const tab = useQueryPanelStore((s) => s.tabs.find((t) => t.id === tabId));
  const isExecuting = useQueryPanelStore((s) => s.isExecuting[tabId] ?? false);
  const updateTab = useQueryPanelStore((s) => s.updateTab);
  const { execute, cancel } = useQueryExecution(tabId);

  // DB 목록 (전체 DB — RAG 완료 여부 무관)
  const dbConnections = useDbSelectionStore((s) => s.dbConnections);
  const loadDbConnections = useDbSelectionStore((s) => s.loadDbConnections);

  // DB 목록 로드 보장 (챗 패널 미마운트 시에도)
  useEffect(() => {
    loadDbConnections();
  }, [loadDbConnections]);

  // ── 메뉴 앵커 상태 ──
  const [dbAnchor, setDbAnchor] = useState<HTMLElement | null>(null);
  const [rowLimitAnchor, setRowLimitAnchor] = useState<HTMLElement | null>(null);

  // ── DB 미선택 안내 AlertModal 상태 ──
  // 사용자가 DB 미선택(또는 stale ID) 상태에서 실행/EXPLAIN을 누른 시점에 표시.
  const [dbAlertOpen, setDbAlertOpen] = useState(false);

  // ── DB 이름 조회 ──
  const selectedDbName = tab?.selectedDbId
    ? dbConnections.find((c) => String(c.connectionId) === tab.selectedDbId)?.connectionName
    : undefined;

  // ── "사실상 DB 미선택" 판정 (Schema 패널과 동일 패턴) ──
  // selectedDbId 가 없거나, dbConnections 가 로드됐는데도 ID가 미존재(stale) 면
  // 실행 가드.
  const dbConnectionsLoaded = dbConnections.length > 0;
  const dbExists = tab?.selectedDbId
    ? dbConnections.some(
        (c) => String(c.connectionId) === tab.selectedDbId,
      )
    : false;
  const isDbEffectivelyUnselected =
    !tab?.selectedDbId || (dbConnectionsLoaded && !dbExists);

  // ── DB 선택 ──
  const handleDbSelect = useCallback(
    (connectionId: number) => {
      updateTab(tabId, { selectedDbId: String(connectionId), selectedSchema: null });
      setDbAnchor(null);
    },
    [tabId, updateTab],
  );

  // ── Row Limit 선택 ──
  const handleRowLimitSelect = useCallback(
    (limit: RowLimitOption) => {
      updateTab(tabId, { rowLimit: limit });
      setRowLimitAnchor(null);
    },
    [tabId, updateTab],
  );

  // ── 실행 가드 — DB 미선택/stale 시 AlertModal 안내, 정상 시 execute() ──
  const handleExecute = useCallback(() => {
    if (isDbEffectivelyUnselected) {
      setDbAlertOpen(true);
      return;
    }
    execute();
  }, [isDbEffectivelyUnselected, execute]);

  // ── 쿼리 중지 — useQueryExecution.cancel 위임. 가드 불필요(cancel 은 안전한 no-op).
  const handleStop = useCallback(() => {
    cancel();
  }, [cancel]);

  // handleExecute / handleStop 의 최신 참조를 ref 로 보관.
  // Monaco editor.addAction 의 콜백은 mount 시 한 번만 등록되므로 closure가 stale
  // 가능 — ref 를 통해 최신 함수를 호출하도록 우회. handle* 의 참조 변경이
  // handleEditorMount 의 deps 에 들어가면 Monaco 가 매번 re-mount 되는 문제 회피.
  const handleExecuteRef = useRef(handleExecute);
  const handleStopRef = useRef(handleStop);
  useEffect(() => {
    handleExecuteRef.current = handleExecute;
  }, [handleExecute]);
  useEffect(() => {
    handleStopRef.current = handleStop;
  }, [handleStop]);

  // ── Monaco 에디터 인스턴스 ref + 마지막 onChange 값 추적 ──
  // editorRef: setValue/getValue/getSelection 직접 호출용
  // lastEmittedValueRef: Monaco가 onChange로 emit한 마지막 값. store 업데이트가
  //   이 값과 같으면 echo로 간주 → setValue 재호출 스킵 (race 회피)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null);
  const lastEmittedValueRef = useRef<string>(tab?.sqlQuery ?? "");

  // ── 쿼리 실행 중 context key — Monaco precondition 평가에 사용.
  // mount 시 1회 createContextKey() 로 인스턴스 생성, isExecuting 변경 시 .set() 만 호출.
  // createContextKey 를 매 변경마다 재호출하면 새 IContextKey 인스턴스가 생성되어
  // precondition 바인딩이 깨지므로 절대 mount 외에서 호출 금지.
  const isExecutingCtxRef = useRef<{ set: (value: boolean) => void } | null>(null);

  // ── Monaco onMount: ref 저장 + 단축키 등록 ──
  // deps 빈 배열 — execute/handleExecute 변경에도 re-mount 되지 않음.
  // 콜백 내에서는 handle*Ref 로 최신 함수 호출.
  const handleEditorMount = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (editor: any, monacoInstance: any) => {
      editorRef.current = editor;
      lastEmittedValueRef.current = editor.getValue();

      // SQL DocumentFormattingEditProvider 등록 (1회).
      // Monaco는 SQL 빌트인 포매터가 없어 provider 없이 editor.action.formatDocument
      // 를 호출해도 silent no-op. sql-formatter 기반 formatSql() 을 wrap 해서 등록하면
      // 컨텍스트 메뉴 / Command Palette / Shift+Alt+F 단축키가 모두 정상 동작한다.
      if (!sqlFormatterRegistered) {
        monacoInstance.languages.registerDocumentFormattingEditProvider("sql", {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          provideDocumentFormattingEdits: (model: any) => [
            {
              range: model.getFullModelRange(),
              text: formatSql(model.getValue()),
            },
          ],
        });
        sqlFormatterRegistered = true;
      }

      // Ctrl+Enter → 쿼리 실행 (DB 가드 포함)
      // lazy import이므로 숫자값 직접 사용: CtrlCmd=2048, Enter=3
      editor.addAction({
        id: "orkis-execute-query",
        label: "쿼리 실행",
        keybindings: [2048 | 3],
        run: () => { handleExecuteRef.current(); },
      });
      // Shift+Alt+F → SQL 포맷
      // Shift=1024, Alt=512, KeyF=36
      editor.addAction({
        id: "orkis-format-sql",
        label: "SQL 포맷",
        keybindings: [1024 | 512 | 36],
        run: () => {
          editor.getAction?.("editor.action.formatDocument")?.run();
        },
      });

      // ── 쿼리 중지 단축키 — Escape / Ctrl+. ──
      // Monaco KeyCode enum 값은 버전에 따라 변동 이력이 있어 숫자 리터럴 대신
      // monacoInstance.KeyCode/KeyMod named constant 사용 (설계 문서 §4.5).
      // precondition 으로 실행 중일 때만 활성화 — 비실행 시 Esc 는 Monaco 기본 동작
      // (multi-cursor 해제 등) 유지.
      isExecutingCtxRef.current = editor.createContextKey(
        "orkis.isQueryExecuting",
        false,
      );
      editor.addAction({
        id: "orkis-cancel-query",
        label: "쿼리 중지",
        keybindings: [
          monacoInstance.KeyCode.Escape,
          monacoInstance.KeyMod.CtrlCmd | monacoInstance.KeyCode.Period,
        ],
        precondition: "orkis.isQueryExecuting",
        run: () => { handleStopRef.current(); },
      });
    },
    [],
  );

  // ── isExecuting 변경 시 context key 갱신만 (재생성 아님) ──
  useEffect(() => {
    isExecutingCtxRef.current?.set(isExecuting);
  }, [isExecuting]);

  // ── 외부 store sqlQuery 변경 감지 → editor.setValue() ──
  // 사용자 typing(Monaco→onChange→store) 은 lastEmittedValueRef 와 일치 → 스킵.
  // 외부(History/Snippet 클릭, Schema identifier 삽입) 만 setValue 호출하여
  // 커서 위치 보존하며 동기화.
  const externalSqlQuery = tab?.sqlQuery ?? "";
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // echo: store 업데이트가 직전 onChange 값과 같음 → no-op
    if (externalSqlQuery === lastEmittedValueRef.current) return;

    // editor 내부값과도 같으면 lastEmittedValueRef 만 갱신 후 스킵
    const currentValue = editor.getValue();
    if (currentValue === externalSqlQuery) {
      lastEmittedValueRef.current = externalSqlQuery;
      return;
    }

    // 진짜 외부 변경 — 커서/선택 영역 보존하며 setValue
    const selection = editor.getSelection();
    editor.setValue(externalSqlQuery);
    if (selection) {
      try {
        editor.setSelection(selection);
      } catch {
        // 새 텍스트 길이가 짧아 선택 범위 벗어나면 무시
      }
    }
    lastEmittedValueRef.current = externalSqlQuery;
  }, [externalSqlQuery]);

  // ── Monaco onChange — store 업데이트 + lastEmittedValueRef 갱신 ──
  const handleEditorChange = useCallback(
    (value: string | undefined) => {
      const v = value ?? "";
      lastEmittedValueRef.current = v;
      updateTab(tabId, { sqlQuery: v });
    },
    [tabId, updateTab],
  );

  if (!tab) return null;

  return (
    <>
      <EditorPanel
        sqlQuery={tab.sqlQuery}
        onSqlChange={(sql) => updateTab(tabId, { sqlQuery: sql })}
        selectedDbName={selectedDbName}
        rowLimit={tab.rowLimit}
        isExecuting={isExecuting}
        onExecute={handleExecute}
        onStop={handleStop}
        onDbSelect={(e) => setDbAnchor(e.currentTarget)}
        onRowLimitSelect={(e) => setRowLimitAnchor(e.currentTarget)}
        editorSlot={
          <Suspense fallback={<Box>에디터 로딩 중...</Box>}>
            <MonacoEditor
              height="100%"
              language="sql"
              defaultValue={tab.sqlQuery}
              theme={isDark ? "vs-dark" : "vs"}
              options={{
                // IME 호환성 — 파일 헤더 주석 참조. 제거 금지.
                editContext: false,
                minimap: { enabled: false },
                fontSize: 14,
                lineHeight: 22,
                fontFamily:
                  '"Fira Code", "Cascadia Code", Consolas, "Courier New", monospace',
                fontLigatures: true,
                lineNumbers: "on",
                renderLineHighlight: "all",
                scrollBeyondLastLine: false,
                scrollbar: {
                  vertical: "auto",
                  horizontal: "auto",
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                padding: { top: 8, bottom: 8 },
                automaticLayout: true,
                wordWrap: "on",
                folding: true,
                smoothScrolling: true,
                cursorBlinking: "smooth",
                contextmenu: true,
              }}
              onChange={handleEditorChange}
              onMount={handleEditorMount}
            />
          </Suspense>
        }
      />

      {/* ── DB 선택 드롭다운 (EditorPanel은 RAG 미완료 DB까지 모두 표시 → emptyDescription 비표시) ── */}
      <DbSelectionMenu
        anchorEl={dbAnchor}
        open={!!dbAnchor}
        onClose={() => setDbAnchor(null)}
        connections={dbConnections}
        selectedConnection={
          dbConnections.find(
            (c) => String(c.connectionId) === tab.selectedDbId,
          ) ?? null
        }
        onSelect={(conn) => handleDbSelect(conn.connectionId)}
        emptyTitle="등록된 DB가 없습니다"
        emptyDescription={null}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      />

      {/* ── Row Limit 드롭다운 ── */}
      <RowLimitMenu
        anchorEl={rowLimitAnchor}
        open={!!rowLimitAnchor}
        onClose={() => setRowLimitAnchor(null)}
        options={ROW_LIMIT_OPTIONS}
        currentLimit={tab.rowLimit}
        onSelect={handleRowLimitSelect}
      />

      {/* ── DB 미선택 안내 (스키마 패널과 동일 패턴) ── */}
      <AlertModal
        open={dbAlertOpen}
        onClose={() => setDbAlertOpen(false)}
        severity="warning"
        message={
          "쿼리를 실행하려면 먼저 DB를 선택해야 합니다.\n에디터 상단의 'DB 선택'에서 데이터베이스를 선택하세요."
        }
      />
    </>
  );
}
