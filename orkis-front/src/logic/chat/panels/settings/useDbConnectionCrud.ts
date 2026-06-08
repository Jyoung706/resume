/**
 * DB 연결 CRUD 전용 훅
 * 위자드(등록), 수정 다이얼로그, 삭제 확인 상태 및 핸들러를 캡슐화
 *
 * ── 플로우 ──
 * 네트워크 DB: 폼 입력 → 접속 테스트(testNewConnection) → 저장(createDbConnection) → 완료 → RAG 전처리
 * SQLite:      폼 입력 → DB 생성/업로드(연결 등록 포함) → 접속 테스트(testDbConnection) → 완료 → RAG 전처리
 */
import { useState, useRef } from "react";
import { useDbSelectionStore } from "@/logic/common/db/dbSelectionStore";
import { useRagPollingStore } from "@/logic/common/rag/ragPollingStore";
import { dbConnectionService } from "@/logic/common/db/dbConnectionService";
import { ragService } from "@/logic/common/rag/ragService";
import { showToast } from "@/logic/shared/utils/toast";
import { getLogger } from "@/logic/shared/utils/logger";
import { useLlmModelStore } from "@/logic/common/llm/llmModelStore";
import type {
  DbConnection,
  DbConnectionDetail,
  DbType,
  RagReadiness,
  TestDbConnectionResponse,
} from "@/logic/common/db/types/dbConnection";

const logger = getLogger("useDbConnectionCrud");

// ============================================
// 폼 데이터 타입
// ============================================

export interface DbConnectionFormData {
  connectionName: string;
  description: string;
  host: string;
  port: string;
  username: string;
  password: string;
  databaseName: string;
  filePath: string;
  /** SQLite 옵션: "sample" | "create" | "upload" */
  sqliteOption: string;
  /** SQLite 업로드 파일 */
  sqliteFile: File | null;
}

const INITIAL_FORM_DATA: DbConnectionFormData = {
  connectionName: "",
  description: "",
  host: "",
  port: "",
  username: "",
  password: "",
  databaseName: "",
  filePath: "",
  sqliteOption: "sample",
  sqliteFile: null,
};

// ============================================
// 헬퍼
// ============================================

function isNetworkDb(typeName?: string): boolean {
  if (!typeName) return true;
  return typeName.toLowerCase() !== "sqlite";
}

function isSqliteDb(typeName?: string): boolean {
  if (!typeName) return false;
  return typeName.toLowerCase() === "sqlite";
}

// ============================================
// 훅
// ============================================

export function useDbConnectionCrud() {
  const createConnection = useDbSelectionStore((s) => s.createConnection);
  const updateConnection = useDbSelectionStore((s) => s.updateConnection);
  const deleteConnection = useDbSelectionStore((s) => s.deleteConnection);

  // ── DB 타입 ──
  const [dbTypes, setDbTypes] = useState<DbType[]>([]);
  const [loadingDbTypes, setLoadingDbTypes] = useState(false);
  const dbTypesLoaded = useRef(false);

  // 접속 테스트 in-flight 가드 (React setState 가 비동기라 disabled 적용 전에 재클릭 가능 — useRef 로 동기 차단)
  const wizardTestInFlightRef = useRef(false);
  const editTestInFlightRef = useRef(false);

  // ── 위자드 상태 (독립) ──
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedDbType, setSelectedDbType] = useState<DbType | null>(null);
  const [wizardFormData, setWizardFormData] = useState<DbConnectionFormData>({ ...INITIAL_FORM_DATA });
  const [createdConnection, setCreatedConnection] = useState<DbConnection | null>(null);
  const [wizardFieldErrors, setWizardFieldErrors] = useState<Record<string, string>>({});
  const [wizardTestResult, setWizardTestResult] = useState<TestDbConnectionResponse | null>(null);
  const [wizardTesting, setWizardTesting] = useState(false);
  const [wizardSaving, setWizardSaving] = useState(false);

  // ── 위자드: SQLite 생성 상태 ──
  const [wizardSqliteCreated, setWizardSqliteCreated] = useState(false);
  const [wizardSqliteCreating, setWizardSqliteCreating] = useState(false);
  const [wizardCreatedConnectionId, setWizardCreatedConnectionId] = useState<number | null>(null);

  // ── 위자드: RAG 전처리 상태 ──
  const [ragConfirmOpen, setRagConfirmOpen] = useState(false);
  const [existingRagInfo, setExistingRagInfo] = useState<{
    connectionName: string;
    databaseName: string;
    lastUpdated?: string;
  } | null>(null);
  const [sampleDbId, setSampleDbId] = useState<string | null>(null);
  const [ragReadiness, setRagReadiness] = useState<RagReadiness | undefined>(undefined);

  // ── 수정 다이얼로그 상태 (독립) ──
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<DbConnectionDetail | null>(null);
  const [editFormData, setEditFormData] = useState<DbConnectionFormData>({ ...INITIAL_FORM_DATA });
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string>>({});
  const [editTestResult, setEditTestResult] = useState<TestDbConnectionResponse | null>(null);
  const [editTesting, setEditTesting] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // ── 삭제 확인 상태 ──
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deletingConnection, setDeletingConnection] = useState<DbConnection | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ============================================
  // DB 타입 로드
  // ============================================

  const loadDbTypes = async () => {
    if (dbTypesLoaded.current) return;
    setLoadingDbTypes(true);
    try {
      const dbTypeList = await dbConnectionService.getDbTypes();
      setDbTypes(dbTypeList ?? []);
      dbTypesLoaded.current = true;
    } catch (error) {
      logger.error("loadDbTypes:", error);
    } finally {
      setLoadingDbTypes(false);
    }
  };

  // ============================================
  // 폼 유효성 검사
  // ============================================

  const validateWizardForm = (formData: DbConnectionFormData, dbTypeName?: string): boolean => {
    const errors: Record<string, string> = {};

    // connectionName 항상 필수
    if (!formData.connectionName.trim()) {
      errors.connectionName = "연결 이름을 입력해주세요";
    }

    if (isNetworkDb(dbTypeName)) {
      if (!formData.host.trim()) errors.host = "호스트를 입력해주세요";
      const portNum = Number(formData.port);
      if (!formData.port || portNum <= 0 || !Number.isInteger(portNum)) {
        errors.port = "유효한 포트를 입력해주세요";
      }
      if (!formData.username.trim()) errors.username = "사용자명을 입력해주세요";
      if (!formData.password) errors.password = "비밀번호를 입력해주세요";
      if (!formData.databaseName.trim()) errors.databaseName = "데이터베이스 이름을 입력해주세요";
    } else if (isSqliteDb(dbTypeName)) {
      if (formData.sqliteOption === "create" && !formData.databaseName.trim()) {
        errors.databaseName = "데이터베이스 이름을 입력해주세요";
      }
      if (formData.sqliteOption === "upload") {
        if (!formData.sqliteFile) errors.sqliteFile = "파일을 선택해주세요";
        if (!formData.databaseName.trim()) errors.databaseName = "데이터베이스 이름을 입력해주세요";
      }
    }

    setWizardFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateEditForm = (formData: DbConnectionFormData, dbTypeName?: string): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.connectionName.trim()) {
      errors.connectionName = "연결 이름을 입력해주세요";
    }

    if (isNetworkDb(dbTypeName)) {
      if (!formData.host.trim()) errors.host = "호스트를 입력해주세요";
      const portNum = Number(formData.port);
      if (!formData.port || portNum <= 0 || !Number.isInteger(portNum)) {
        errors.port = "유효한 포트를 입력해주세요";
      }
      if (!formData.username.trim()) errors.username = "사용자명을 입력해주세요";
      // 수정 시 비밀번호는 선택 (비워두면 기존값 유지)
    }

    setEditFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ============================================
  // 위자드 핸들러
  // ============================================

  const openWizard = () => {
    setWizardOpen(true);
    setWizardStep(1);
    setSelectedDbType(null);
    setWizardFormData({ ...INITIAL_FORM_DATA });
    setCreatedConnection(null);
    setWizardFieldErrors({});
    setWizardTestResult(null);
    setWizardSqliteCreated(false);
    setWizardSqliteCreating(false);
    setWizardCreatedConnectionId(null);
    loadDbTypes();
  };

  const closeWizard = () => {
    setWizardOpen(false);
    setWizardStep(1);
    setSelectedDbType(null);
    setWizardFormData({ ...INITIAL_FORM_DATA });
    setCreatedConnection(null);
    setWizardFieldErrors({});
    setWizardTestResult(null);
    setWizardSqliteCreated(false);
    setWizardSqliteCreating(false);
    setWizardCreatedConnectionId(null);
    setRagConfirmOpen(false);
    setExistingRagInfo(null);
    setSampleDbId(null);
  };

  const selectDbType = (dbType: DbType) => {
    setSelectedDbType(dbType);
    // 기본 포트 자동 채우기
    setWizardFormData((prev) => ({
      ...prev,
      port: dbType.defaultPort ? String(dbType.defaultPort) : "",
    }));
    // 타입 변경 시 모든 상태 초기화
    setWizardFieldErrors({});
    setWizardTestResult(null);
    setWizardSqliteCreated(false);
    setWizardSqliteCreating(false);
    setWizardCreatedConnectionId(null);
  };

  const setWizardFormField = (field: string, value: string | File | null) => {
    setWizardFormData((prev) => ({ ...prev, [field]: value }));
    // 해당 필드 에러 클리어
    setWizardFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    // SQLite 옵션 변경 시 생성 상태 초기화
    if (field === "sqliteOption") {
      setWizardSqliteCreated(false);
      setWizardSqliteCreating(false);
      setWizardCreatedConnectionId(null);
      setWizardTestResult(null);
    }
  };

  // ============================================
  // 위자드: SQLite DB 생성/업로드 (연결 등록 포함)
  // ============================================

  const handleWizardCreateSqlite = async () => {
    if (!selectedDbType) return;
    if (!validateWizardForm(wizardFormData, selectedDbType.typeName)) return;

    setWizardSqliteCreating(true);
    try {
      let connectionId: number;

      if (wizardFormData.sqliteOption === "sample") {
        const res = await dbConnectionService.createSampleSqlite({
          connectionName: wizardFormData.connectionName,
          description: wizardFormData.description || undefined,
        });
        connectionId = res.connectionId;
        // 샘플 DB의 dbId 저장 (RAG 등록 시 필요)
        if (res.dbId) setSampleDbId(res.dbId);
      } else if (wizardFormData.sqliteOption === "upload" && wizardFormData.sqliteFile) {
        const res = await dbConnectionService.uploadSqlite(wizardFormData.sqliteFile, {
          connectionName: wizardFormData.connectionName,
          databaseName: wizardFormData.databaseName,
          description: wizardFormData.description || undefined,
        });
        connectionId = res.connectionId;
      } else {
        // "create" — 빈 SQLite
        const res = await dbConnectionService.createSqlite({
          connectionName: wizardFormData.connectionName,
          databaseName: wizardFormData.databaseName,
          description: wizardFormData.description || undefined,
        });
        connectionId = res.connectionId;
      }

      setWizardCreatedConnectionId(connectionId);
      setWizardSqliteCreated(true);
      showToast("데이터베이스가 생성되었습니다.");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "데이터베이스 생성 실패";
      logger.error("handleWizardCreateSqlite:", error);
      showToast(message, "error");
    } finally {
      setWizardSqliteCreating(false);
    }
  };

  // ============================================
  // 위자드: 접속 테스트
  // ============================================

  const handleWizardTest = async () => {
    if (!selectedDbType) return;
    if (wizardTestInFlightRef.current) return;

    wizardTestInFlightRef.current = true;
    setWizardTesting(true);
    setWizardTestResult(null);
    try {
      let result: TestDbConnectionResponse;

      if (isSqliteDb(selectedDbType.typeName) && wizardCreatedConnectionId) {
        // SQLite: 상세 조회 후 파라미터 기반 테스트 (connectionId 직접 테스트 시 타이밍 이슈 방지)
        const detail = await dbConnectionService.getDbConnectionDetail(wizardCreatedConnectionId);
        if (detail) {
          result = await dbConnectionService.testNewConnection({
            dbTypeId: detail.dbTypeId,
            databaseName: detail.databaseName || "",
            filePath: detail.filePath || undefined,
          });
        } else {
          result = await dbConnectionService.testDbConnection(wizardCreatedConnectionId);
        }
      } else {
        // 네트워크 DB: 폼 데이터로 테스트
        if (!validateWizardForm(wizardFormData, selectedDbType.typeName)) {
          setWizardTesting(false);
          wizardTestInFlightRef.current = false;
          return;
        }
        result = await dbConnectionService.testNewConnection({
          dbTypeId: selectedDbType.dbTypeId,
          host: wizardFormData.host || undefined,
          port: wizardFormData.port ? Number(wizardFormData.port) : undefined,
          databaseName: wizardFormData.databaseName,
          username: wizardFormData.username || undefined,
          password: wizardFormData.password || undefined,
          filePath: wizardFormData.filePath || undefined,
        });
      }
      setWizardTestResult(result);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "연결 테스트 실패";
      setWizardTestResult({ success: false, status: "failed", message });
    } finally {
      setWizardTesting(false);
      wizardTestInFlightRef.current = false;
    }
  };

  // ============================================
  // 위자드: 저장 (네트워크 DB) / 완료 (SQLite)
  // ============================================

  const handleWizardSave = async () => {
    if (!selectedDbType) return;

    // 접속 테스트 필수
    if (!wizardTestResult?.success) {
      showToast("먼저 접속 테스트를 진행해주세요.", "error");
      return;
    }

    if (isSqliteDb(selectedDbType.typeName)) {
      // SQLite: 이미 연결 등록됨 → 목록 갱신 후 Step 3으로 이동
      if (!wizardCreatedConnectionId) return;

      setWizardSaving(true);
      try {
        await useDbSelectionStore.getState().refreshDbConnections();
        const newConn = useDbSelectionStore.getState().dbConnections.find(
          (c) => c.connectionId === wizardCreatedConnectionId,
        );
        if (newConn) {
          useDbSelectionStore.getState().setSelectedDbConnection(newConn);
          setCreatedConnection(newConn);
        }
        showToast("데이터베이스 연결이 추가되었습니다.");
        setWizardStep(3);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "데이터베이스 연결 완료 실패";
        logger.error("handleWizardSave (sqlite):", error);
        showToast(message, "error");
      } finally {
        setWizardSaving(false);
      }
    } else {
      // 네트워크 DB: 연결 생성 → Step 3
      if (!validateWizardForm(wizardFormData, selectedDbType.typeName)) return;

      setWizardSaving(true);
      try {
        const result = await createConnection({
          dbTypeId: selectedDbType.dbTypeId,
          connectionName: wizardFormData.connectionName,
          description: wizardFormData.description || undefined,
          host: wizardFormData.host,
          port: Number(wizardFormData.port),
          databaseName: wizardFormData.databaseName,
          username: wizardFormData.username,
          password: wizardFormData.password,
        });

        setRagReadiness(result.ragReadiness);

        const newConn = useDbSelectionStore.getState().dbConnections.find(
          (c) => c.connectionId === result.connectionId,
        );
        if (newConn) {
          setCreatedConnection(newConn);
        }

        showToast("데이터베이스 연결이 추가되었습니다.");
        setWizardStep(3);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "데이터베이스 연결 생성 실패";
        logger.error("handleWizardSave (network):", error);
        showToast(message, "error");
      } finally {
        setWizardSaving(false);
      }
    }
  };

  // ============================================
  // 위자드: Step 3 완료 → RAG 전처리 플로우
  // ============================================

  /** Step 3 "완료" 클릭 → 기존 RAG 확인 → ConfirmModal 표시 */
  const handleWizardComplete = async () => {
    const connId = createdConnection?.connectionId;
    if (!connId) {
      closeWizard();
      return;
    }

    // ragReadiness 기반 사전 차단 (네트워크 DB 경로)
    if (ragReadiness && !ragReadiness.canPreprocess) {
      showToast("RAG 인덱싱을 하려면 LLM 모델을 먼저 등록하세요.", "error");
      closeWizard();
      return;
    }

    try {
      const { exists } = await ragService.checkExistingPreprocessing(connId);
      if (exists) {
        // 기존 RAG 데이터가 있으면 대체 경고와 함께 표시
        const allHistory = await dbConnectionService.getAllRagPreprocessingHistory();
        const entries = Object.entries(allHistory.historyByConnection);
        // 기존 RAG가 완료된 DB 정보 찾기
        for (const [id, history] of entries) {
          if (Number(id) === connId) continue;
          const schemaOk = history.some((h) => h.ragType === 1 && h.status === "success");
          const dataOk = history.some((h) => h.ragType === 2 && h.status === "success");
          if (schemaOk || dataOk) {
            const conn = useDbSelectionStore.getState().dbConnections.find(
              (c) => c.connectionId === Number(id),
            );
            if (conn) {
              setExistingRagInfo({
                connectionName: conn.connectionName,
                databaseName: conn.databaseName || "",
                lastUpdated: history[0]?.updatedAt,
              });
              break;
            }
          }
        }
        if (!existingRagInfo) {
          // exists=true 이지만 완료 DB를 못 찾은 경우
          setExistingRagInfo(null);
        }
      } else {
        setExistingRagInfo(null);
      }
    } catch (error) {
      logger.error("handleWizardComplete — checkExisting:", error);
      setExistingRagInfo(null);
    }

    setRagConfirmOpen(true);
  };

  /** RAG "실행/대체" 확인 */
  const handleRagConfirm = async () => {
    setRagConfirmOpen(false);
    const connId = createdConnection?.connectionId;
    if (!connId) {
      closeWizard();
      return;
    }

    const isSample = isSqliteDb(selectedDbType?.typeName) && wizardFormData.sqliteOption === "sample";

    // 모델 가드: 샘플 DB가 아닌 경우 LLM 모델 등록 여부 확인
    if (!isSample) {
      const { models, defaultModel } = useLlmModelStore.getState();
      if (models.length === 0 || !defaultModel) {
        showToast("LLM 모델을 먼저 등록하세요.", "error");
        closeWizard();
        return;
      }
    }

    if (isSample && sampleDbId) {
      // 샘플 DB: registerSampleDbRag → 즉시 완료
      try {
        await dbConnectionService.registerSampleDbRag({ connectionId: connId, dbId: sampleDbId });
        showToast("샘플 DB가 RAG 서버로 설정되었습니다.");

        // 샘플 DB는 이미 완료 상태 → 모니터링 전환 + 히스토리 로드
        // changeMonitoringDb 내부의 fetchRagHistory는 fire-and-forget이므로
        // 위자드 닫기 전에 히스토리가 로드되지 않을 수 있음.
        // 직접 monitoringDbId 설정 후 fetchRagHistory를 await하여 해결.
        const ragStore = useRagPollingStore.getState();
        ragStore.stopPolling();
        useRagPollingStore.setState({
          monitoringDbId: connId,
          error: null,
          consecutiveFailCount: 0,
        });
        await ragStore.fetchRagHistory(connId);

        // RAG 완료 목록 갱신
        await useDbSelectionStore.getState().loadRagCompletedConnections();
      } catch (error) {
        logger.error("registerSampleDbRag:", error);
        showToast("샘플 DB RAG 등록 중 오류가 발생했습니다.", "error");
      }
    } else {
      // 일반 DB: 전처리 요청 → 폴링 시작
      const success = await useRagPollingStore.getState().requestPreprocessing(connId);
      if (success) {
        showToast("RAG 전처리가 시작되었습니다.");
      } else {
        showToast("RAG 전처리 요청에 실패했습니다.", "error");
      }
    }

    closeWizard();
  };

  /** RAG "건너뛰기" */
  const handleRagSkip = () => {
    setRagConfirmOpen(false);
    closeWizard();
  };

  // ============================================
  // 수정 다이얼로그 핸들러
  // ============================================

  const openEditDialog = async (connection: DbConnection) => {
    setEditDialogOpen(true);
    setLoadingDetail(true);
    setEditFieldErrors({});
    setEditTestResult(null);

    try {
      const detail = await dbConnectionService.getDbConnectionDetail(connection.connectionId);
      if (detail) {
        // detail API가 typeName을 반환하지 않을 수 있으므로 리스트 connection에서 fallback
        setEditingConnection({
          ...detail,
          typeName: detail.typeName || connection.typeName,
          dbTypeId: detail.dbTypeId ?? connection.dbTypeId,
        });
        setEditFormData({
          connectionName: detail.connectionName || "",
          description: detail.description || "",
          host: detail.host || "",
          port: detail.port ? String(detail.port) : "",
          username: detail.username || "",
          password: detail.password || "",
          databaseName: detail.databaseName || "",
          filePath: detail.filePath || "",
          sqliteOption: "",
          sqliteFile: null,
        });
      }
    } catch (error) {
      logger.error("openEditDialog:", error);
      showToast("연결 정보를 불러오지 못했습니다.", "error");
      setEditDialogOpen(false);
    } finally {
      setLoadingDetail(false);
    }
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEditingConnection(null);
    setEditFormData({ ...INITIAL_FORM_DATA });
    setEditFieldErrors({});
    setEditTestResult(null);
  };

  const setEditFormField = (field: string, value: string | File | null) => {
    setEditFormData((prev) => ({ ...prev, [field]: value }));
    setEditFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleEditTest = async () => {
    if (!editingConnection) return;
    if (!validateEditForm(editFormData, editingConnection.typeName)) return;
    if (editTestInFlightRef.current) return;

    editTestInFlightRef.current = true;
    setEditTesting(true);
    setEditTestResult(null);
    try {
      const result = await dbConnectionService.testNewConnection({
        dbTypeId: editingConnection.dbTypeId,
        host: editFormData.host || undefined,
        port: editFormData.port ? Number(editFormData.port) : undefined,
        databaseName: editFormData.databaseName,
        username: editFormData.username || undefined,
        password: editFormData.password || undefined,
        filePath: editFormData.filePath || undefined,
      });
      setEditTestResult(result);

      // 테스트 결과를 리스트에 즉시 반영 (낙관적 업데이트)
      const newStatus = result.success ? "success" : "failed";
      useDbSelectionStore.setState((state) => ({
        dbConnections: state.dbConnections.map((c) =>
          c.connectionId === editingConnection.connectionId
            ? { ...c, lastTestStatus: newStatus }
            : c,
        ),
      }));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "연결 테스트 실패";
      setEditTestResult({ success: false, status: "failed", message });
    } finally {
      setEditTesting(false);
      editTestInFlightRef.current = false;
    }
  };

  const handleEditUpdate = async () => {
    if (!editingConnection) return;
    if (!validateEditForm(editFormData, editingConnection.typeName)) return;

    setEditSaving(true);
    try {
      const updates: Record<string, unknown> = {};

      if (editFormData.connectionName !== editingConnection.connectionName) {
        updates.connectionName = editFormData.connectionName;
      }
      if (editFormData.description !== (editingConnection.description || "")) {
        updates.description = editFormData.description;
      }
      if (isNetworkDb(editingConnection.typeName)) {
        if (editFormData.host !== (editingConnection.host || "")) updates.host = editFormData.host;
        if (editFormData.port !== String(editingConnection.port || "")) updates.port = Number(editFormData.port);
        if (editFormData.username !== (editingConnection.username || "")) updates.username = editFormData.username;
        if (editFormData.password) updates.password = editFormData.password;
      }

      await updateConnection(editingConnection.connectionId, updates);

      // 수정 중 접속 테스트 성공 시, 저장된 연결로 재테스트 → 백엔드 lastTestStatus 갱신
      if (editTestResult?.success) {
        try {
          await dbConnectionService.testDbConnection(editingConnection.connectionId);
          await useDbSelectionStore.getState().refreshDbConnections();
        } catch {
          // 테스트 실패해도 저장 자체는 성공이므로 무시
        }
      }

      showToast("데이터베이스 연결이 수정되었습니다.");
      closeEditDialog();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "데이터베이스 연결 수정 실패";
      logger.error("handleEditUpdate:", error);
      showToast(message, "error");
    } finally {
      setEditSaving(false);
    }
  };

  // ============================================
  // 삭제 핸들러
  // ============================================

  const openDeleteConfirm = (connection: DbConnection) => {
    setDeletingConnection(connection);
    setDeleteConfirmOpen(true);
  };

  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setDeletingConnection(null);
  };

  const handleDelete = async () => {
    if (!deletingConnection) return;

    setDeleting(true);
    try {
      await deleteConnection(deletingConnection.connectionId);
      showToast("데이터베이스 연결이 삭제되었습니다.");
      closeDeleteConfirm();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "데이터베이스 연결 삭제 실패";
      logger.error("handleDelete:", error);
      showToast(message, "error");
    } finally {
      setDeleting(false);
    }
  };

  // ============================================
  // 반환값
  // ============================================

  return {
    wizard: {
      open: wizardOpen,
      step: wizardStep,
      dbTypes,
      loadingDbTypes,
      selectedDbType,
      formData: wizardFormData,
      fieldErrors: wizardFieldErrors,
      testResult: wizardTestResult,
      testing: wizardTesting,
      saving: wizardSaving,
      createdConnection,
      // SQLite 생성 상태
      sqliteCreated: wizardSqliteCreated,
      sqliteCreating: wizardSqliteCreating,
      // RAG 전처리 상태
      ragConfirmOpen,
      existingRagInfo,
      ragReadiness,
      // 핸들러
      openWizard,
      closeWizard,
      setStep: setWizardStep,
      selectDbType,
      setFormField: setWizardFormField,
      handleTest: handleWizardTest,
      handleCreateSqlite: handleWizardCreateSqlite,
      handleSave: handleWizardSave,
      handleComplete: handleWizardComplete,
      handleRagConfirm,
      handleRagSkip,
    },
    edit: {
      open: editDialogOpen,
      connection: editingConnection,
      formData: editFormData,
      fieldErrors: editFieldErrors,
      testResult: editTestResult,
      testing: editTesting,
      saving: editSaving,
      loadingDetail,
      openEditDialog,
      closeEditDialog,
      setFormField: setEditFormField,
      handleTest: handleEditTest,
      handleUpdate: handleEditUpdate,
    },
    delete: {
      open: deleteConfirmOpen,
      connection: deletingConnection,
      deleting,
      openDeleteConfirm,
      closeDeleteConfirm,
      handleDelete,
    },
  };
}
