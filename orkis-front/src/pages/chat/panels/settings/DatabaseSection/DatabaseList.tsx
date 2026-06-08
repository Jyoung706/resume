// ============================================
// DatabaseList — DB 연결 카드 목록
// Design Layer: props 기반 (로직 없음)
// ============================================

import { Button, FlexBox, Icon, Typography } from "@/components";
import type { DbConnection } from "@/logic/common/db/types/dbConnection";
import { DatabaseCard } from "./DatabaseCard";

// ============================================
// Props
// ============================================

export interface DatabaseListProps {
  /** DB 연결 목록 */
  dbConnections: DbConnection[];
  /** 추가 버튼 클릭 */
  onAddClick?: () => void;
  /** 수정 클릭 */
  onEditClick?: (connection: DbConnection) => void;
  /** 삭제 클릭 */
  onDeleteClick?: (connection: DbConnection) => void;
  /** 스키마 확인 클릭 */
  onViewSchemaClick?: (connection: DbConnection) => void;
}

// ============================================
// DatabaseList
// ============================================

export function DatabaseList({
  dbConnections,
  onAddClick,
  onEditClick,
  onDeleteClick,
  onViewSchemaClick
}: DatabaseListProps) {
  // 빈 목록
  if (dbConnections.length === 0) {
    return (
      <FlexBox
        direction="column"
        align="center"
        className="DatabaseList DatabaseList--empty"
      >
        <Typography className="Panel__placeholder-text">
          등록된 데이터베이스가 없습니다
        </Typography>
        {onAddClick && (
          <Button
            variant="outlined"
            size="small"
            onClick={onAddClick}
            className="DatabaseList__add-btn"
          >
            <Icon mui size="small">AddIcon</Icon>
            데이터베이스 추가
          </Button>
        )}
      </FlexBox>
    );
  }

  return (
    <FlexBox direction="column" className="DatabaseList__base">
      {dbConnections.map((conn) => (
        <DatabaseCard
          key={conn.connectionId}
          connection={conn}
          onEdit={onEditClick}
          onDelete={onDeleteClick}
          onViewSchema={onViewSchemaClick}
        />
      ))}

      {/* 하단 추가 버튼 */}
      {onAddClick && (
        <FlexBox justify="center" className="DatabaseList__add-wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={onAddClick}
            className="DatabaseList__add-btn"
          >
            <Icon mui size="small">AddIcon</Icon>
            데이터베이스 추가
          </Button>
        </FlexBox>
      )}
    </FlexBox>
  );
}
