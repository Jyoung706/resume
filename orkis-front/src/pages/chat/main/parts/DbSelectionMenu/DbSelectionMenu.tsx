// ============================================
// DbSelectionMenu — DB 연결 선택 드롭다운
// Design Layer: props 기반 (로직 없음)
// ============================================

import {
  ListItemText,
  Menu,
  MenuItem,
  Icon
} from "@/components";
import type { PopoverOrigin } from "@mui/material/Popover";
import type { DbConnection } from "@/logic/common/db/types/dbConnection";
import "./DbSelectionMenu.scss";

// ============================================
// Props
// ============================================

export interface DbSelectionMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  connections: DbConnection[];
  selectedConnection: DbConnection | null;
  onSelect: (connection: DbConnection) => void;
  /** 연결 목록이 비었을 때 표시할 제목 (기본 "사용 가능한 DB가 없습니다") */
  emptyTitle?: string;
  /** 연결 목록이 비었을 때 표시할 부가 설명 (기본은 RAG 미완료 안내). null로 명시하면 부가설명 미표시 */
  emptyDescription?: string | null;
  /** 메뉴 위치 — 기본값은 채팅 입력창 위쪽으로 펼쳐지는 형태 */
  anchorOrigin?: PopoverOrigin;
  transformOrigin?: PopoverOrigin;
}

const DEFAULT_EMPTY_TITLE = "사용 가능한 DB가 없습니다";
const DEFAULT_EMPTY_DESCRIPTION = "RAG 전처리가 완료된 DB가 없습니다";
const DEFAULT_ANCHOR_ORIGIN: PopoverOrigin = { vertical: "top", horizontal: "right" };
const DEFAULT_TRANSFORM_ORIGIN: PopoverOrigin = { vertical: "bottom", horizontal: "right" };

// ============================================
// DbSelectionMenu
// ============================================

export function DbSelectionMenu({
  anchorEl,
  open,
  onClose,
  connections,
  selectedConnection,
  onSelect,
  emptyTitle = DEFAULT_EMPTY_TITLE,
  emptyDescription = DEFAULT_EMPTY_DESCRIPTION,
  anchorOrigin = DEFAULT_ANCHOR_ORIGIN,
  transformOrigin = DEFAULT_TRANSFORM_ORIGIN,
}: DbSelectionMenuProps) {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      transformOrigin={transformOrigin}
      className="DbSelectionMenu"
    >
      {connections.length === 0 ? (
        <MenuItem disabled className="DbSelectionMenu__empty">
          <ListItemText
            className="DbSelectionMenu__empty-text"
            primary={emptyTitle}
            secondary={emptyDescription ?? undefined}
          />
        </MenuItem>
      ) : (
        connections.map((conn) => {
          const isSelected =
            selectedConnection?.connectionId === conn.connectionId;
          return (
            <MenuItem
              key={conn.connectionId}
              onClick={() => onSelect(conn)}
              selected={isSelected}
              className="DbSelectionMenu__item"
            >
              <ListItemText
                className="DbSelectionMenu__item-text"
                primary={conn.connectionName}
                secondary={conn.typeName}
              />
              {isSelected && (
                // <CheckIcon className="DbSelectionMenu__check-icon" />
                <Icon size="small" className="DbSelectionMenu__check-icon">check</Icon>
              )}
            </MenuItem>
          );
        })
      )}
    </Menu>
  );
}
