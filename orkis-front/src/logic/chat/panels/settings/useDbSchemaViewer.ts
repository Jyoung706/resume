/**
 * DB 스키마 뷰어 훅
 * 스키마 조회, 테이블/컬럼 CRUD, 데이터 삽입 상태 및 핸들러
 */
import { useState } from "react";
import { dbSchemaService } from "@/logic/common/db/dbSchemaService";
import { showToast } from "@/logic/shared/utils/toast";
import { getLogger } from "@/logic/shared/utils/logger";
import type { DbConnection } from "@/logic/common/db/types/dbConnection";
import type {
  DbSchemaTable,
  DbSchemaColumn,
  CreateTableColumn,
} from "@/logic/common/db/types/dbSchema";

const logger = getLogger("useDbSchemaViewer");

// ============================================
// 훅
// ============================================

export function useDbSchemaViewer() {
  // ── 다이얼로그 기본 상태 ──
  const [open, setOpen] = useState(false);
  const [connectionId, setConnectionId] = useState<number>(0);
  const [connectionName, setConnectionName] = useState("");
  const [databaseName, setDatabaseName] = useState("");
  const [dbTypeName, setDbTypeName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── 스키마 데이터 ──
  const [tables, setTables] = useState<DbSchemaTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DbSchemaTable | null>(null);
  const [columns, setColumns] = useState<DbSchemaColumn[]>([]);
  const [sampleData, setSampleData] = useState<Array<Record<string, unknown>>>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── 검색 ──
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [columnSearchTerm, setColumnSearchTerm] = useState("");

  // ── 테이블 추가 ──
  const [addTableOpen, setAddTableOpen] = useState(false);
  const [newTableName, setNewTableName] = useState("");
  const [newTableComment, setNewTableComment] = useState("");
  const [newTableColumns, setNewTableColumns] = useState<CreateTableColumn[]>([
    { columnName: "", dataType: "TEXT", isNullable: true, isPrimaryKey: false },
  ]);
  const [addTableSaving, setAddTableSaving] = useState(false);

  // ── 테이블 수정 ──
  const [editTableOpen, setEditTableOpen] = useState(false);
  const [editTableOriginalName, setEditTableOriginalName] = useState("");
  const [editTableName, setEditTableName] = useState("");
  const [editTableSaving, setEditTableSaving] = useState(false);

  // ── 테이블 삭제 ──
  const [deleteTableOpen, setDeleteTableOpen] = useState(false);
  const [deleteTableName, setDeleteTableName] = useState("");
  const [deleteTableLoading, setDeleteTableLoading] = useState(false);

  // ── 컬럼 추가 ──
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");
  const [newColumnDataType, setNewColumnDataType] = useState("TEXT");
  const [newColumnIsNullable, setNewColumnIsNullable] = useState(true);
  const [newColumnIsPrimaryKey, setNewColumnIsPrimaryKey] = useState(false);
  const [newColumnDefaultValue, setNewColumnDefaultValue] = useState("");
  const [newColumnComment, setNewColumnComment] = useState("");
  const [addColumnSaving, setAddColumnSaving] = useState(false);

  // ── 컬럼 수정 ──
  const [editColumnOpen, setEditColumnOpen] = useState(false);
  const [editColumnOriginalName, setEditColumnOriginalName] = useState("");
  const [editColumnName, setEditColumnName] = useState("");
  const [editColumnSaving, setEditColumnSaving] = useState(false);

  // ── 컬럼 삭제 ──
  const [deleteColumnOpen, setDeleteColumnOpen] = useState(false);
  const [deleteColumnName, setDeleteColumnName] = useState("");
  const [deleteColumnLoading, setDeleteColumnLoading] = useState(false);

  // ── 데이터 삽입 ──
  const [insertDataOpen, setInsertDataOpen] = useState(false);
  const [insertDataValues, setInsertDataValues] = useState<Record<string, string>>({});
  const [insertDataSaving, setInsertDataSaving] = useState(false);

  // ============================================
  // 스키마 로드
  // ============================================

  const loadSchema = async (connId: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await dbSchemaService.getDbSchema(connId);
      if (res.success) {
        setTables(res.tables);
      } else {
        setError(res.message || "스키마 조회 실패");
      }
    } catch (err) {
      logger.error("loadSchema:", err);
      setError(err instanceof Error ? err.message : "스키마 조회 실패");
    } finally {
      setLoading(false);
    }
  };

  const loadTableDetail = async (connId: number, tableName: string) => {
    setDetailLoading(true);
    try {
      const res = await dbSchemaService.getTableDetail(connId, tableName, true, 10);
      if (res.success) {
        setColumns(res.columns);
        setSampleData(res.sampleData || []);
        setTotalRows(res.totalRows || 0);
      } else {
        showToast(res.message || "테이블 상세 조회 실패", "error");
      }
    } catch (err) {
      logger.error("loadTableDetail:", err);
      showToast("테이블 상세 조회 실패", "error");
    } finally {
      setDetailLoading(false);
    }
  };

  // ============================================
  // 다이얼로그 열기/닫기
  // ============================================

  const openDialog = (connection: DbConnection) => {
    setConnectionId(connection.connectionId);
    setConnectionName(connection.connectionName);
    setDatabaseName(connection.databaseName || "");
    setDbTypeName(connection.typeName || "");
    setOpen(true);
    setSelectedTable(null);
    setColumns([]);
    setSampleData([]);
    setTotalRows(0);
    setTableSearchTerm("");
    setColumnSearchTerm("");
    setError(null);
    loadSchema(connection.connectionId);
  };

  const closeDialog = () => {
    setOpen(false);
    setTables([]);
    setSelectedTable(null);
    setColumns([]);
    setSampleData([]);
    setError(null);
  };

  // ============================================
  // 테이블 클릭
  // ============================================

  const handleTableClick = (table: DbSchemaTable) => {
    setSelectedTable(table);
    setColumnSearchTerm("");
    loadTableDetail(connectionId, table.tableName);
  };

  // ============================================
  // 테이블 CRUD
  // ============================================

  const openAddTable = () => {
    setNewTableName("");
    setNewTableComment("");
    setNewTableColumns([
      { columnName: "", dataType: "TEXT", isNullable: true, isPrimaryKey: false },
    ]);
    setAddTableOpen(true);
  };

  const closeAddTable = () => {
    setAddTableOpen(false);
  };

  const addNewTableColumn = () => {
    setNewTableColumns((prev) => [
      ...prev,
      { columnName: "", dataType: "TEXT", isNullable: true, isPrimaryKey: false },
    ]);
  };

  const removeNewTableColumn = (idx: number) => {
    setNewTableColumns((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateNewTableColumn = (idx: number, field: keyof CreateTableColumn, value: string | boolean) => {
    setNewTableColumns((prev) =>
      prev.map((col, i) => (i === idx ? { ...col, [field]: value } : col)),
    );
  };

  const handleAddTable = async () => {
    if (!newTableName.trim()) {
      showToast("테이블 이름을 입력해주세요.", "error");
      return;
    }
    const validColumns = newTableColumns.filter((c) => c.columnName.trim());
    if (validColumns.length === 0) {
      showToast("컬럼을 하나 이상 추가해주세요.", "error");
      return;
    }

    setAddTableSaving(true);
    try {
      const res = await dbSchemaService.createTable({
        connectionId,
        tableName: newTableName.trim(),
        tableComment: newTableComment.trim() || undefined,
        columns: validColumns,
      });
      if (res.success) {
        showToast("테이블이 생성되었습니다.");
        closeAddTable();
        await loadSchema(connectionId);
      } else {
        showToast(res.message || "테이블 생성 실패", "error");
      }
    } catch (err) {
      logger.error("handleAddTable:", err);
      showToast("테이블 생성 실패", "error");
    } finally {
      setAddTableSaving(false);
    }
  };

  const openEditTable = (table: DbSchemaTable) => {
    setEditTableOriginalName(table.tableName);
    setEditTableName(table.tableName);
    setEditTableOpen(true);
  };

  const closeEditTable = () => {
    setEditTableOpen(false);
  };

  const handleEditTable = async () => {
    if (!editTableName.trim()) {
      showToast("테이블 이름을 입력해주세요.", "error");
      return;
    }

    setEditTableSaving(true);
    try {
      const res = await dbSchemaService.updateTable({
        connectionId,
        tableName: editTableOriginalName,
        newTableName: editTableName.trim() !== editTableOriginalName
          ? editTableName.trim()
          : undefined,
      });
      if (res.success) {
        showToast("테이블이 수정되었습니다.");
        closeEditTable();
        await loadSchema(connectionId);
        // 선택된 테이블이면 상세도 갱신
        if (selectedTable?.tableName === editTableOriginalName) {
          const newName = editTableName.trim() || editTableOriginalName;
          setSelectedTable((prev) => prev ? { ...prev, tableName: newName } : null);
          await loadTableDetail(connectionId, newName);
        }
      } else {
        showToast(res.message || "테이블 수정 실패", "error");
      }
    } catch (err) {
      logger.error("handleEditTable:", err);
      showToast("테이블 수정 실패", "error");
    } finally {
      setEditTableSaving(false);
    }
  };

  const openDeleteTable = (table: DbSchemaTable) => {
    setDeleteTableName(table.tableName);
    setDeleteTableOpen(true);
  };

  const closeDeleteTable = () => {
    setDeleteTableOpen(false);
  };

  const handleDeleteTable = async () => {
    setDeleteTableLoading(true);
    try {
      const res = await dbSchemaService.deleteTable({
        connectionId,
        tableName: deleteTableName,
      });
      if (res.success) {
        showToast("테이블이 삭제되었습니다.");
        closeDeleteTable();
        // 삭제된 테이블이 선택 중이면 해제
        if (selectedTable?.tableName === deleteTableName) {
          setSelectedTable(null);
          setColumns([]);
          setSampleData([]);
          setTotalRows(0);
        }
        await loadSchema(connectionId);
      } else {
        showToast(res.message || "테이블 삭제 실패", "error");
      }
    } catch (err) {
      logger.error("handleDeleteTable:", err);
      showToast("테이블 삭제 실패", "error");
    } finally {
      setDeleteTableLoading(false);
    }
  };

  // ============================================
  // 컬럼 CRUD
  // ============================================

  const openAddColumn = () => {
    setNewColumnName("");
    setNewColumnDataType("TEXT");
    setNewColumnIsNullable(true);
    setNewColumnIsPrimaryKey(false);
    setNewColumnDefaultValue("");
    setNewColumnComment("");
    setAddColumnOpen(true);
  };

  const closeAddColumn = () => {
    setAddColumnOpen(false);
  };

  const handleAddColumn = async () => {
    if (!selectedTable) return;
    if (!newColumnName.trim()) {
      showToast("컬럼 이름을 입력해주세요.", "error");
      return;
    }

    setAddColumnSaving(true);
    try {
      const res = await dbSchemaService.addColumn({
        connectionId,
        tableName: selectedTable.tableName,
        columnName: newColumnName.trim(),
        dataType: newColumnDataType,
        isNullable: newColumnIsNullable,
        isPrimaryKey: newColumnIsPrimaryKey,
        defaultValue: newColumnDefaultValue.trim() || undefined,
        columnComment: newColumnComment.trim() || undefined,
      });
      if (res.success) {
        showToast("컬럼이 추가되었습니다.");
        closeAddColumn();
        await loadTableDetail(connectionId, selectedTable.tableName);
      } else {
        showToast(res.message || "컬럼 추가 실패", "error");
      }
    } catch (err) {
      logger.error("handleAddColumn:", err);
      showToast("컬럼 추가 실패", "error");
    } finally {
      setAddColumnSaving(false);
    }
  };

  const openEditColumn = (col: DbSchemaColumn) => {
    setEditColumnOriginalName(col.columnName);
    setEditColumnName(col.columnName);
    setEditColumnOpen(true);
  };

  const closeEditColumn = () => {
    setEditColumnOpen(false);
  };

  const handleEditColumn = async () => {
    if (!selectedTable) return;
    if (!editColumnName.trim()) {
      showToast("컬럼 이름을 입력해주세요.", "error");
      return;
    }

    setEditColumnSaving(true);
    try {
      const res = await dbSchemaService.updateColumn({
        connectionId,
        tableName: selectedTable.tableName,
        columnName: editColumnOriginalName,
        newColumnName: editColumnName.trim() !== editColumnOriginalName
          ? editColumnName.trim()
          : undefined,
      });
      if (res.success) {
        showToast("컬럼이 수정되었습니다.");
        closeEditColumn();
        await loadTableDetail(connectionId, selectedTable.tableName);
      } else {
        showToast(res.message || "컬럼 수정 실패", "error");
      }
    } catch (err) {
      logger.error("handleEditColumn:", err);
      showToast("컬럼 수정 실패", "error");
    } finally {
      setEditColumnSaving(false);
    }
  };

  const openDeleteColumn = (col: DbSchemaColumn) => {
    setDeleteColumnName(col.columnName);
    setDeleteColumnOpen(true);
  };

  const closeDeleteColumn = () => {
    setDeleteColumnOpen(false);
  };

  const handleDeleteColumn = async () => {
    if (!selectedTable) return;

    setDeleteColumnLoading(true);
    try {
      const res = await dbSchemaService.deleteColumn({
        connectionId,
        tableName: selectedTable.tableName,
        columnName: deleteColumnName,
      });
      if (res.success) {
        showToast("컬럼이 삭제되었습니다.");
        closeDeleteColumn();
        await loadTableDetail(connectionId, selectedTable.tableName);
      } else {
        showToast(res.message || "컬럼 삭제 실패", "error");
      }
    } catch (err) {
      logger.error("handleDeleteColumn:", err);
      showToast("컬럼 삭제 실패", "error");
    } finally {
      setDeleteColumnLoading(false);
    }
  };

  // ============================================
  // 데이터 삽입
  // ============================================

  const openInsertData = () => {
    const initial: Record<string, string> = {};
    columns.forEach((col) => { initial[col.columnName] = ""; });
    setInsertDataValues(initial);
    setInsertDataOpen(true);
  };

  const closeInsertData = () => {
    setInsertDataOpen(false);
  };

  const setInsertDataValue = (columnName: string, value: string) => {
    setInsertDataValues((prev) => ({ ...prev, [columnName]: value }));
  };

  const handleInsertData = async () => {
    if (!selectedTable) return;

    // 최소 하나의 값 필수
    const hasValue = Object.values(insertDataValues).some((v) => v.trim() !== "");
    if (!hasValue) {
      showToast("최소 하나의 값을 입력해주세요.", "error");
      return;
    }

    setInsertDataSaving(true);
    try {
      // 빈 문자열 → null, 숫자 타입 → 숫자 변환
      const data: Record<string, unknown> = {};
      for (const [colName, val] of Object.entries(insertDataValues)) {
        if (val.trim() === "") {
          data[colName] = null;
        } else {
          const col = columns.find((c) => c.columnName === colName);
          const dt = col?.dataType?.toUpperCase() || "";
          if (["INTEGER", "INT", "REAL", "FLOAT", "DOUBLE", "NUMERIC", "DECIMAL", "BIGINT", "SMALLINT"].includes(dt)) {
            const num = Number(val);
            data[colName] = Number.isNaN(num) ? val : num;
          } else {
            data[colName] = val;
          }
        }
      }

      const res = await dbSchemaService.insertTableData({
        connectionId,
        tableName: selectedTable.tableName,
        data,
      });
      if (res.success) {
        showToast("데이터가 삽입되었습니다.");
        closeInsertData();
        await loadTableDetail(connectionId, selectedTable.tableName);
      } else {
        showToast(res.message || "데이터 삽입 실패", "error");
      }
    } catch (err) {
      logger.error("handleInsertData:", err);
      showToast("데이터 삽입 실패", "error");
    } finally {
      setInsertDataSaving(false);
    }
  };

  // ============================================
  // 반환
  // ============================================

  return {
    dialog: {
      open,
      connectionId,
      connectionName,
      databaseName,
      dbTypeName,
      loading,
      error,
      tables,
      selectedTable,
      columns,
      sampleData,
      totalRows,
      detailLoading,
      tableSearchTerm,
      columnSearchTerm,
      openDialog,
      closeDialog,
      handleTableClick,
      setTableSearchTerm,
      setColumnSearchTerm,
    },
    tableCrud: {
      addOpen: addTableOpen,
      newTableName,
      newTableComment,
      newTableColumns,
      addSaving: addTableSaving,
      openAddTable,
      closeAddTable,
      setNewTableName,
      setNewTableComment,
      addNewTableColumn,
      removeNewTableColumn,
      updateNewTableColumn,
      handleAddTable,
      editOpen: editTableOpen,
      editTableName,
      editSaving: editTableSaving,
      openEditTable,
      closeEditTable,
      setEditTableName,
      handleEditTable,
      deleteOpen: deleteTableOpen,
      deleteTableName,
      deleting: deleteTableLoading,
      openDeleteTable,
      closeDeleteTable,
      handleDeleteTable,
    },
    columnCrud: {
      addOpen: addColumnOpen,
      newColumnName,
      newColumnDataType,
      newColumnIsNullable,
      newColumnIsPrimaryKey,
      newColumnDefaultValue,
      newColumnComment,
      addSaving: addColumnSaving,
      openAddColumn,
      closeAddColumn,
      setNewColumnName,
      setNewColumnDataType,
      setNewColumnIsNullable,
      setNewColumnIsPrimaryKey,
      setNewColumnDefaultValue,
      setNewColumnComment,
      handleAddColumn,
      editOpen: editColumnOpen,
      editColumnName,
      editSaving: editColumnSaving,
      openEditColumn,
      closeEditColumn,
      setEditColumnName,
      handleEditColumn,
      deleteOpen: deleteColumnOpen,
      deleteColumnName,
      deleting: deleteColumnLoading,
      openDeleteColumn,
      closeDeleteColumn,
      handleDeleteColumn,
    },
    dataInsert: {
      open: insertDataOpen,
      values: insertDataValues,
      saving: insertDataSaving,
      openInsertData,
      closeInsertData,
      setValue: setInsertDataValue,
      handleInsert: handleInsertData,
    },
  };
}
