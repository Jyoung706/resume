// ============================================
// DatabaseCard — 개별 DB 연결 카드
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  ActionMenu,
  Box,
  FlexBox,
  Img,
  Paper,
  Typography,
  EditIcon,
  DeleteIcon,
  DeviceHubIcon
} from "@/components";
import type { DbConnection } from "@/logic/common/db/types/dbConnection";
import {
  getDbIcon,
  getConnectionStatusLabel,
  toConnectionState,
} from "./displayUtils";
import { getDbLogo, DEFAULT_DB_LOGO } from "@/logic/shared/utils/dbLogos";

// ============================================
// Props
// ============================================

export interface DatabaseCardProps {
  connection: DbConnection;
  onEdit?: (connection: DbConnection) => void;
  onDelete?: (connection: DbConnection) => void;
  onViewSchema?: (connection: DbConnection) => void;
}

// ============================================
// DatabaseCard
// ============================================

export function DatabaseCard({ connection, onEdit, onDelete, onViewSchema }: DatabaseCardProps) {
  const connState = toConnectionState(connection.lastTestStatus);
  const statusIcon = getDbIcon(connState);
  const statusLabel = getConnectionStatusLabel(connection.lastTestStatus);

  const menuItems = [
    ...(onViewSchema
      ? [{ label: "스키마 확인", icon: <DeviceHubIcon fontSize="small" />, onClick: () => onViewSchema(connection) }]
      : []),
    ...(onEdit
      ? [{ label: "수정", icon: <EditIcon fontSize="small" />, onClick: () => onEdit(connection) }]
      : []),
    ...(onDelete
      ? [{ label: "삭제", icon: <DeleteIcon fontSize="small" />, onClick: () => onDelete(connection), danger: true }]
      : []),
  ];

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = DEFAULT_DB_LOGO;
  };

  const isSqlite = connection.typeName?.toLowerCase() === "sqlite";

  return (
    <Paper variant="outlined" className="DatabaseCard">
      <FlexBox direction="column" className="DatabaseCard__content">
        {/* ── 헤더: DB 아이콘 + 연결이름 + 상태 + 메뉴 ── */}
        <FlexBox align="center" className="DatabaseCard__header">
          <Img
            src={statusIcon}
            alt={statusLabel}
            className="DatabaseCard__header-icon"
          />

          <FlexBox direction="column" className="DatabaseCard__header-info">
            <Typography className="DatabaseCard__name">
              {connection.connectionName}
            </Typography>
            <Typography
              className="DatabaseCard__status"
              data-status={connState}
            >
              {statusLabel}
            </Typography>
          </FlexBox>

          <FlexBox align="center" className="DatabaseCard__actions">
            <ActionMenu
              items={menuItems}
              zIndex="calc(var(--mui-zIndex-modal, 1300) + 2)"
              stopPropagation
              menuProps={{
                disableRestoreFocus: true,
                transformOrigin: { horizontal: "right", vertical: "top" },
                anchorOrigin: { horizontal: "right", vertical: "bottom" },
                slotProps: { paper: { className: "DatabaseCard__menu-paper" } },
              }}
            />
          </FlexBox>
        </FlexBox>

        {/* ── 상세 정보 테이블 ── */}
        <FlexBox direction="column" className="DatabaseCard__details">
          {/* 설명 */}
          {connection.description && (
            <FlexBox className="DatabaseCard__detail-row">
              <Typography className="DatabaseCard__detail-label">설명</Typography>
              <Typography className="DatabaseCard__detail-value">
                {connection.description}
              </Typography>
            </FlexBox>
          )}

          {/* 데이터베이스 타입 — 로고 이미지 */}
          <FlexBox className="DatabaseCard__detail-row">
            <Typography className="DatabaseCard__detail-label">데이터베이스 타입</Typography>
            <Box className="DatabaseCard__type-logo-wrap">
              <Img
                src={getDbLogo(connection.typeName)}
                alt={connection.typeName || "DB"}
                onError={handleImageError}
                fit="contain"
                className="DatabaseCard__type-logo"
              />
            </Box>
          </FlexBox>

          {/* 네트워크 DB: IP / Port */}
          {!isSqlite && connection.host && (
            <FlexBox className="DatabaseCard__detail-row">
              <Typography className="DatabaseCard__detail-label">IP</Typography>
              <Typography className="DatabaseCard__detail-value">
                {connection.host}
              </Typography>
            </FlexBox>
          )}

          {!isSqlite && connection.port && (
            <FlexBox className="DatabaseCard__detail-row">
              <Typography className="DatabaseCard__detail-label">Port</Typography>
              <Typography className="DatabaseCard__detail-value">
                {connection.port}
              </Typography>
            </FlexBox>
          )}

          {/* Schema name / DB name */}
          {connection.databaseName && (
            <FlexBox className="DatabaseCard__detail-row">
              <Typography className="DatabaseCard__detail-label">
                {isSqlite ? "파일명" : "Schema name"}
              </Typography>
              <Typography className="DatabaseCard__detail-value">
                {connection.databaseName}
              </Typography>
            </FlexBox>
          )}
        </FlexBox>
      </FlexBox>
    </Paper>
  );
}
