/**
 * Pro Mode v2 타입 정의
 * 모든 Pro Mode 관련 타입을 이 파일에서 관리
 */

// ── 좌측 사이드바 ──

/** 좌측 사이드바 패널 식별자 */
export type SideBarPanel = "chat" | "history" | "snippets" | "schema";

// ── 쿼리 탭 ──

/** Editor/Results 패널 최대화/최소화 상태 */
export type PanelState = "normal" | "editor-maximized" | "results-maximized";

/**
 * Editor/Results 패널 분할 방향.
 * - "vertical": 상하 분할 (Editor 위 / Results 아래) — 기본값
 * - "horizontal": 좌우 분할 (사용자가 dockview drag 로 전환)
 *
 * 새로고침 후에도 분할 방향을 보존하기 위해 persist 대상.
 */
export type SplitOrientation = "vertical" | "horizontal";

/** Row Limit 옵션. "MAX" 는 MAX_ROW_HARD_CAP 으로 변환됨 (무제한 아님) */
export type RowLimitOption = 100 | 500 | 1000 | 5000 | "MAX";

/**
 * 단일 쿼리 결과 hard cap.
 * react-virtuoso 단독 완화책 없는 "쾌적" 등급 보장 범위.
 * 50k 초과 시 truncated 플래그가 true 가 되고 사용자에 안내한다.
 */
export const MAX_ROW_HARD_CAP = 50_000 as const;

/** 쿼리 탭 */
export interface QueryTab {
  id: string;
  title: string;
  sqlQuery: string;
  selectedDbId: string | null;
  selectedSchema: string | null;
  rowLimit: RowLimitOption;
  panelState: PanelState;
  /** 분할 방향. 기본 "vertical". persist 됨 → 새로고침 후 복원. */
  splitOrientation: SplitOrientation;
  createdAt: string;
  updatedAt: string;
}

// ── 쿼리 결과 ──

/** 쿼리 실행 결과 */
export interface QueryResult {
  columns: string[];
  data: Record<string, unknown>[];
  rowCount: number;
  executionTime: number; // ms
  truncated: boolean;    // rowLimit 또는 클라이언트 hard cap 에 의해 잘린 경우
  /**
   * truncated=true 일 때 적용된 실제 행 수 상한. UI 메시지·다운로드 안내에 사용.
   * - 클라이언트 hard cap 적용 시: MAX_ROW_HARD_CAP (50000)
   * - 서버가 사용자 선택 limit 적용한 것으로 추정 시: 그 limit (100/500/1000/5000/MAX)
   * - truncated=false 일 때: undefined
   *
   * 불변식: truncated=true ⇒ effectiveLimit !== undefined (UI 가 의존).
   */
  effectiveLimit?: number;
}

/** 쿼리 히스토리 항목 */
export interface QueryHistory {
  id: string;
  sqlQuery: string;
  executedAt: string;
  executionTime: number;
  rowCount: number | null;
  success: boolean;
  error?: string;
}

// ── 상태바 ──

/** ProStatusBar에 표시할 정보 */
export interface ProStatusBarInfo {
  dbName: string | null;
  schemaName: string | null;
  rowCount: number | null;
  executionTime: number | null;
}

// (UI 레이아웃 상수는 Design 컴포넌트 내부에 둔다.
//  TAB_HEADER_HEIGHT는 QueryWorkspace.tsx 내부로 이전됨.)
