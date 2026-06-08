// ============================================
// ExportMenu — Pro 모드 결과 다운로드 드롭다운
// Design Layer: props 기반 (로직 없음)
//
// 4 메뉴 항목 (그룹 라벨 없음, Divider 로 두 그룹을 시각 분리):
//   - CSV       / JSON       — 화면 데이터 (필터·정렬 적용된 limit, 클라 동기 빌드)
//   - 전체 CSV  / 전체 JSON  — 원본 SQL 결과 전체 (서버 streaming, LIMIT·필터·정렬 무시)
//
// secondary 텍스트가 각 항목의 의미를 명시하므로 그룹 라벨 없이도 구분 가능.
// RowLimitMenu 와 동일한 base/Menu + MenuItem 패턴 사용.
// ============================================

import {
  Divider,
  Icon,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
} from "@/components";

export interface ExportMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  /** 화면 데이터 CSV 다운로드 (현재 필터·정렬 적용된 limit) */
  onExportScreenCsv?: () => void;
  /** 화면 데이터 JSON 다운로드 */
  onExportScreenJson?: () => void;
  /** 전체 데이터 CSV 다운로드 (서버 streaming, 원본 그대로) */
  onExportFullCsv?: () => void;
  /** 전체 데이터 JSON 다운로드 */
  onExportFullJson?: () => void;
}

export function ExportMenu({
  anchorEl,
  open,
  onClose,
  onExportScreenCsv,
  onExportScreenJson,
  onExportFullCsv,
  onExportFullJson,
}: ExportMenuProps) {
  const hasScreenGroup = !!onExportScreenCsv || !!onExportScreenJson;
  const hasFullGroup = !!onExportFullCsv || !!onExportFullJson;

  const handleClick = (handler?: () => void) => () => {
    onClose();
    handler?.();
  };

  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      className="ExportMenu"
    >
      {onExportScreenCsv && (
        <MenuItem
          onClick={handleClick(onExportScreenCsv)}
          className="ExportMenu__item"
        >
          <ListItemIcon className="ExportMenu__item-icon">
            <Icon size="small">table_view</Icon>
          </ListItemIcon>
          <ListItemText
            className="ExportMenu__item-text"
            primary="CSV"
            secondary="필터·정렬 적용"
          />
        </MenuItem>
      )}
      {onExportScreenJson && (
        <MenuItem
          onClick={handleClick(onExportScreenJson)}
          className="ExportMenu__item"
        >
          <ListItemIcon className="ExportMenu__item-icon">
            <Icon size="small">data_object</Icon>
          </ListItemIcon>
          <ListItemText
            className="ExportMenu__item-text"
            primary="JSON"
            secondary="필터·정렬 적용"
          />
        </MenuItem>
      )}

      {hasScreenGroup && hasFullGroup && (
        <Divider className="ExportMenu__divider" />
      )}

      {onExportFullCsv && (
        <MenuItem
          onClick={handleClick(onExportFullCsv)}
          className="ExportMenu__item"
        >
          <ListItemIcon className="ExportMenu__item-icon">
            <Icon size="small">cloud_download</Icon>
          </ListItemIcon>
          <ListItemText
            className="ExportMenu__item-text"
            primary="전체 CSV"
            secondary="LIMIT 무시, 서버 streaming"
          />
        </MenuItem>
      )}
      {onExportFullJson && (
        <MenuItem
          onClick={handleClick(onExportFullJson)}
          className="ExportMenu__item"
        >
          <ListItemIcon className="ExportMenu__item-icon">
            <Icon size="small">cloud_download</Icon>
          </ListItemIcon>
          <ListItemText
            className="ExportMenu__item-text"
            primary="전체 JSON"
            secondary="LIMIT 무시, 서버 streaming"
          />
        </MenuItem>
      )}
    </Menu>
  );
}
