// ============================================
// SchemaBrowserPanelConnector — 활성 탭의 selectedDbId →
// proSchemaCacheStore + dbSelectionStore 연결
// 컬럼 expand 상태는 connection 변경 시 자동 reset.
//
// stale connectionId 처리:
//   탭에는 selectedDbId가 persist 되어 있지만 해당 DB 가 시스템에서 삭제·변경된
//   경우 (또는 dbConnections 가 아직 로드 안 된 경우), 무조건 loadSchema 를
//   호출하면 백엔드가 500 을 반환한다. → dbConnections 가 로드된 후에만 판정,
//   존재하지 않는 ID 는 "사실상 미선택" 으로 취급해 안내 AlertModal 만 띄우고
//   API 호출은 보류.
// ============================================

import { useCallback, useEffect, useState } from "react";
import { AlertModal } from "@/components";
import { SchemaBrowserPanel } from "@/pages/pro/parts/SchemaBrowserPanel";
import { useQueryPanelStore } from "@/logic/common/pro/stores/queryPanelStore";
import {
  useProSchemaCacheStore,
  useConnectionSchemaEntry,
} from "@/logic/common/pro/stores/proSchemaCacheStore";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useProModeLayoutStore } from "@/logic/common/pro/stores/proModeLayoutStore";
import { useTabIdentifierInserter } from "@/logic/common/pro/hooks/useTabIdentifierInserter";

export function SchemaBrowserPanelConnector() {
  const activeTabId = useQueryPanelStore((s) => s.activeTabId);
  const selectedDbId = useQueryPanelStore((s) => {
    if (!activeTabId) return null;
    return s.tabs.find((t) => t.id === activeTabId)?.selectedDbId ?? null;
  });

  // selectedDbId 는 string ("connectionId") — number 로 변환
  const connectionId = selectedDbId ? Number(selectedDbId) : null;
  const isExplicitlyUnselected =
    connectionId == null || Number.isNaN(connectionId);

  // dbConnections 보장 로드 (다른 패널이 먼저 띄우지 않았을 수 있으므로)
  const dbConnections = useDbSelectionStore((s) => s.dbConnections);
  const loadDbConnections = useDbSelectionStore((s) => s.loadDbConnections);
  useEffect(() => {
    loadDbConnections();
  }, [loadDbConnections]);

  // 선택된 connectionId 가 실제 dbConnections 에 존재하는지 확인.
  // dbConnections 가 아직 로드 안 됐을 때(== 0)는 판정 보류.
  const dbConnectionsLoaded = dbConnections.length > 0;
  const dbExists = !isExplicitlyUnselected
    ? dbConnections.some((c) => c.connectionId === connectionId)
    : false;

  // "사실상 미선택" — 명시적 미선택 OR (목록 로드됐는데도) 존재하지 않는 stale ID
  const isDbEffectivelyUnselected =
    isExplicitlyUnselected || (dbConnectionsLoaded && !dbExists);

  const dbName =
    !isExplicitlyUnselected && dbExists
      ? dbConnections.find((c) => c.connectionId === connectionId)
          ?.connectionName ?? null
      : null;

  // ── DB 미선택 안내 AlertModal ──
  // 좌측 사이드바의 schema 패널이 펼쳐져 있을 때만 의미 있는 안내.
  // 패널을 떠나면 dismiss 상태 리셋 → 다음 진입 시 다시 1회 표시.
  const isPanelActive = useProModeLayoutStore(
    (s) => s.leftSideBar.activePanel === "schema" && !s.leftSideBar.isCollapsed,
  );
  const [hasDismissedDbAlert, setHasDismissedDbAlert] = useState(false);
  useEffect(() => {
    if (!isPanelActive) setHasDismissedDbAlert(false);
  }, [isPanelActive]);
  const dbAlertOpen =
    isPanelActive && isDbEffectivelyUnselected && !hasDismissedDbAlert;

  const loadSchema = useProSchemaCacheStore((s) => s.loadSchema);
  const loadTableColumns = useProSchemaCacheStore((s) => s.loadTableColumns);
  const entry = useConnectionSchemaEntry(connectionId);

  const insertIdentifier = useTabIdentifierInserter();

  // expand 상태: connection 별로 분리. connectionId 변경 시 자동 reset.
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExpandedTables(new Set());
  }, [connectionId]);

  // selectedDbId 변경 시 캐시 미스면 로드.
  // 가드 3중 — 모두 통과해야 호출:
  //   (1) dbConnections 가 로드되어 판정 가능한 상태
  //   (2) 명시적 미선택 아님
  //   (3) connectionId 가 실제 dbConnections 에 존재 (stale ID 회피)
  // 이전 버그: (1) 누락으로 마운트 직후 dbConnections 비어있을 때 무조건 loadSchema 호출
  // → stale ID 인 경우 백엔드 500 → toast 노출. AlertModal 은 (1) 충족 후 뒤늦게 뜨는 race.
  useEffect(() => {
    if (!dbConnectionsLoaded) return;
    if (isExplicitlyUnselected) return;
    if (!dbExists) return;
    if (connectionId == null) return;
    loadSchema(connectionId);
  }, [dbConnectionsLoaded, isExplicitlyUnselected, dbExists, connectionId, loadSchema]);

  const handleRefresh = useCallback(() => {
    if (!dbConnectionsLoaded) return;
    if (isExplicitlyUnselected || !dbExists) return;
    if (connectionId == null) return;
    loadSchema(connectionId, { force: true });
  }, [dbConnectionsLoaded, isExplicitlyUnselected, dbExists, connectionId, loadSchema]);

  const handleToggleExpand = useCallback(
    (tableName: string) => {
      setExpandedTables((prev) => {
        const next = new Set(prev);
        if (next.has(tableName)) {
          next.delete(tableName);
        } else {
          next.add(tableName);
          // 펼치는 시점에 컬럼 lazy load (캐시 히트 시 no-op).
          // loadSchema 와 동일한 3중 가드.
          if (
            dbConnectionsLoaded &&
            !isExplicitlyUnselected &&
            dbExists &&
            connectionId != null
          ) {
            loadTableColumns(connectionId, tableName);
          }
        }
        return next;
      });
    },
    [
      connectionId,
      dbConnectionsLoaded,
      isExplicitlyUnselected,
      dbExists,
      loadTableColumns,
    ],
  );

  const handleColumnClick = useCallback(
    (tableName: string, columnName: string) => {
      // table.column 형태로 삽입 — JOIN/모호성 회피에 유용
      insertIdentifier(`${tableName}.${columnName}`);
    },
    [insertIdentifier],
  );

  return (
    <>
      <SchemaBrowserPanel
        isDbUnselected={isDbEffectivelyUnselected}
        dbName={dbName}
        tables={entry.tables}
        isLoading={entry.isLoading}
        error={entry.error}
        expandedTables={expandedTables}
        columnsByTable={entry.columnsByTable}
        loadingColumnTables={entry.loadingColumnTables}
        columnsErrorByTable={entry.columnsErrorByTable}
        onToggleExpand={handleToggleExpand}
        onTableClick={insertIdentifier}
        onColumnClick={handleColumnClick}
        onRefresh={handleRefresh}
      />
      <AlertModal
        open={dbAlertOpen}
        onClose={() => setHasDismissedDbAlert(true)}
        severity="warning"
        message={
          "스키마를 보려면 먼저 DB를 선택해야 합니다.\nSQL 탭의 'DB 선택'에서 데이터베이스를 선택하면 테이블 목록이 표시됩니다."
        }
      />
    </>
  );
}
