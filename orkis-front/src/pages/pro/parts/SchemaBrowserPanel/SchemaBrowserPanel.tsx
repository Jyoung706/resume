// ============================================
// SchemaBrowserPanel — DB 테이블/컬럼 트리 (Phase B)
// Design 컴포넌트: props-only
// 테이블 클릭 → 활성 탭 에디터에 테이블명 삽입
// 컬럼 클릭 → 활성 탭 에디터에 `tableName.columnName` 삽입
// ============================================

import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  List,
  ListItemButton,
  Typography,
} from "@/components";
import { EmptyState, Icon, PanelHeader, FlexBox } from "@/components";
import type {
  DbSchemaTable,
  DbSchemaColumn,
} from "@/logic/common/db/types/dbSchema";
import "./SchemaBrowserPanel.scss";

export interface SchemaBrowserPanelProps {
  /** DB 미선택 시 true — 안내 + DB 선택 CTA */
  isDbUnselected: boolean;
  /** 현재 연결된 DB 이름 (선택 후 표시) */
  dbName?: string | null;
  /** 테이블 목록 */
  tables: DbSchemaTable[];
  isLoading: boolean;
  error: string | null;

  // ── Phase B: 컬럼 확장 ──
  /** 펼쳐진 테이블 이름 집합 */
  expandedTables: Set<string>;
  /** tableName → 컬럼 목록 (캐시 히트) */
  columnsByTable: Record<string, DbSchemaColumn[]>;
  /** 현재 컬럼 로드 중인 tableName 들 */
  loadingColumnTables: string[];
  /** tableName → 컬럼 로드 에러 메시지 */
  columnsErrorByTable: Record<string, string>;

  /** 테이블 expand 토글 */
  onToggleExpand?: (tableName: string) => void;
  /** 테이블 클릭 → 활성 탭 에디터에 테이블명 삽입 */
  onTableClick?: (tableName: string) => void;
  /** 컬럼 클릭 → 활성 탭 에디터에 `table.column` 삽입 */
  onColumnClick?: (tableName: string, columnName: string) => void;
  /** 새로고침 (캐시 무효화) */
  onRefresh?: () => void;
}

function ColumnBadge({ column }: { column: DbSchemaColumn }) {
  if (column.isPrimaryKey) {
    return (
      <Typography
        className="SchemaBrowserPanel__badge SchemaBrowserPanel__badge--pk"
        variant="caption"
        component="span"
      >
        PK
      </Typography>
    );
  }
  if (column.isForeignKey) {
    return (
      <Typography
        className="SchemaBrowserPanel__badge SchemaBrowserPanel__badge--fk"
        variant="caption"
        component="span"
      >
        FK
      </Typography>
    );
  }
  return null;
}

export function SchemaBrowserPanel({
  isDbUnselected,
  dbName,
  tables,
  isLoading,
  error,
  expandedTables,
  columnsByTable,
  loadingColumnTables,
  columnsErrorByTable,
  onToggleExpand,
  onTableClick,
  onColumnClick,
  onRefresh,
}: SchemaBrowserPanelProps) {
  if (isDbUnselected) {
    return (
      <Box className="SchemaBrowserPanel SchemaBrowserPanel--empty">
        <EmptyState
          title="DB 미선택"
          description="에디터 상단 'DB 선택' 으로 연결을 선택하면 테이블 목록이 표시됩니다"
        />
      </Box>
    );
  }

  if (isLoading && tables.length === 0) {
    return (
      <FlexBox
        className="SchemaBrowserPanel SchemaBrowserPanel--loading"
        direction="column"
        align="center"
        justify="center"
        gap={0.5}
      >
        <CircularProgress size="small" />
        <Typography
          className="SchemaBrowserPanel__message"
          variant="caption"
          component="span"
        >
          스키마 로딩 중...
        </Typography>
      </FlexBox>
    );
  }

  if (error) {
    return (
      <Box className="SchemaBrowserPanel SchemaBrowserPanel--error">
        <EmptyState
          title="스키마 조회 실패"
          description={error}
          action={
            onRefresh && (
              <Button
                className="SchemaBrowserPanel__refresh-btn"
                variant="outlined"
                size="small"
                onClick={onRefresh}
              >
                다시 시도
              </Button>
            )
          }
        />
      </Box>
    );
  }

  if (tables.length === 0) {
    return (
      <Box className="SchemaBrowserPanel SchemaBrowserPanel--empty">
        <EmptyState
          title="테이블 없음"
          description={
            dbName
              ? `'${dbName}' 에 조회 가능한 테이블이 없습니다`
              : "조회 가능한 테이블이 없습니다"
          }
          action={
            onRefresh && (
              <Button
                className="SchemaBrowserPanel__refresh-btn"
                variant="outlined"
                size="small"
                onClick={onRefresh}
              >
                새로고침
              </Button>
            )
          }
        />
      </Box>
    );
  }

  return (
    <FlexBox className="SchemaBrowserPanel" direction="column">
      <PanelHeader
        className="SchemaBrowserPanel__header"
        title={dbName ? `${dbName} · ${tables.length}` : `테이블 ${tables.length}`}
        actions={
          onRefresh && (
            <IconButton
              className="SchemaBrowserPanel__refresh-btn"
              size="small"
              onClick={onRefresh}
              title="새로고침"
              aria-label="스키마 새로고침"
            >
              <Icon>refresh</Icon>
            </IconButton>
          )
        }
      />
      <List className="SchemaBrowserPanel__list" disablePadding>
        {tables.map((t) => {
          const expanded = expandedTables.has(t.tableName);
          const columns = columnsByTable[t.tableName];
          const isLoadingColumns = loadingColumnTables.includes(t.tableName);
          const colError = columnsErrorByTable[t.tableName];
          return (
            <Box key={t.tableName} className="SchemaBrowserPanel__node">
              <FlexBox className="SchemaBrowserPanel__item" align="center">
                <IconButton
                  className="SchemaBrowserPanel__expand"
                  size="small"
                  onClick={() => onToggleExpand?.(t.tableName)}
                  title={expanded ? "접기" : "펼치기"}
                  aria-label={
                    expanded ? "테이블 컬럼 접기" : "테이블 컬럼 펼치기"
                  }
                  aria-expanded={expanded}
                >
                  <Icon>
                    {expanded ? "expand_more" : "chevron_right"}
                  </Icon>
                </IconButton>
                <ListItemButton
                  className="SchemaBrowserPanel__table-name"
                  onClick={() => onTableClick?.(t.tableName)}
                  title={t.tableComment || `${t.tableName} 을 에디터에 삽입`}
                >
                  <Typography variant="body2" component="span">
                    {t.tableName}
                  </Typography>
                </ListItemButton>
                {t.rowCount != null && (
                  <Typography
                    className="SchemaBrowserPanel__row-count"
                    variant="caption"
                    component="span"
                  >
                    {t.rowCount}
                  </Typography>
                )}
              </FlexBox>

              {expanded && (
                <Box className="SchemaBrowserPanel__columns">
                  {isLoadingColumns && !columns ? (
                    <FlexBox
                      className="SchemaBrowserPanel__columns-loading"
                      align="center"
                      gap={0.5}
                    >
                      <CircularProgress size="small" />
                      <Typography
                        className="SchemaBrowserPanel__message"
                        variant="caption"
                        component="span"
                      >
                        컬럼 로딩 중...
                      </Typography>
                    </FlexBox>
                  ) : colError ? (
                    <Typography
                      className="SchemaBrowserPanel__columns-error"
                      variant="caption"
                      component="div"
                    >
                      {colError}
                    </Typography>
                  ) : columns && columns.length === 0 ? (
                    <Typography
                      className="SchemaBrowserPanel__columns-empty"
                      variant="caption"
                      component="div"
                    >
                      컬럼 없음
                    </Typography>
                  ) : columns ? (
                    <List
                      className="SchemaBrowserPanel__column-list"
                      disablePadding
                    >
                      {columns.map((c) => (
                        <ListItemButton
                          key={c.columnName}
                          className="SchemaBrowserPanel__column-btn"
                          onClick={() =>
                            onColumnClick?.(t.tableName, c.columnName)
                          }
                          title={
                            c.columnComment ||
                            `${t.tableName}.${c.columnName} 을 에디터에 삽입`
                          }
                        >
                          <ColumnBadge column={c} />
                          <Typography
                            className="SchemaBrowserPanel__column-name"
                            variant="caption"
                            component="span"
                          >
                            {c.columnName}
                          </Typography>
                          <Typography
                            className="SchemaBrowserPanel__column-type"
                            variant="caption"
                            component="span"
                          >
                            {c.dataType}
                            {c.isNullable ? "" : " NOT NULL"}
                          </Typography>
                        </ListItemButton>
                      ))}
                    </List>
                  ) : null}
                </Box>
              )}
            </Box>
          );
        })}
      </List>
    </FlexBox>
  );
}
