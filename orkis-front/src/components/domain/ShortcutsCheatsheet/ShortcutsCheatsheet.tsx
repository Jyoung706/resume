// ============================================
// ShortcutsCheatsheet — Pro 모드 단축키 도움말 모달 (Design)
// props-only — 그룹화된 단축키 데이터를 받아 렌더링만 한다.
// 단축키 정의(PRO_SHORTCUTS)나 그룹화 로직(getCheatsheetRows)은 Connector 책임.
//
// 컴포넌트 선택: ui/Modal (정보 표시용)
// chat의 SqlViewModal/DataViewModal과 동일한 시맨틱(정보 조회/표시) — 일관성 확보.
// ============================================

import { Box } from "@/components/base";
import { Modal } from "@/components/ui/Modal";
import { FlexBox } from "@/components/layout";
import "./ShortcutsCheatsheet.scss";

export interface ShortcutsCheatsheetRow {
  /** 표시할 키 조합 텍스트 (예: "Alt+T", "Alt+1~9") */
  keys: string;
  /** 행에 표시할 라벨 */
  label: string;
}

export interface ShortcutsCheatsheetGroup {
  /** 그룹 식별자 (React key 용) */
  id: string;
  /** 그룹 헤더 라벨 (예: "탭", "패널", "뷰") */
  label: string;
  /** 그룹 안에 표시할 행 목록 */
  rows: ShortcutsCheatsheetRow[];
}

export interface ShortcutsCheatsheetProps {
  isOpen: boolean;
  onClose: () => void;
  /** 카테고리별로 그룹화·정렬된 단축키 목록. Connector에서 PRO_SHORTCUTS를 가공하여 전달 */
  groups: ShortcutsCheatsheetGroup[];
  /** 모달 제목 (기본 "단축키") */
  title?: string;
}

const DEFAULT_TITLE = "단축키";

export function ShortcutsCheatsheet({
  isOpen,
  onClose,
  groups,
  title = DEFAULT_TITLE,
}: ShortcutsCheatsheetProps) {
  return (
    <Modal
      className="ShortcutsCheatsheet"
      open={isOpen}
      onClose={onClose}
      title={title}
      size="large"
      showClose
    >
      {/* CSS columns 2열 — 그룹 높이 차이를 자동 균형 분배 (소화면은 1열 폴백) */}
      <Box className="ShortcutsCheatsheet__groups">
        {groups.map((group) => (
          <Box key={group.id} className="ShortcutsCheatsheet__group">
            <Box className="ShortcutsCheatsheet__group-title">
              {group.label}
            </Box>
            <FlexBox direction="column" gap={0.25}>
              {group.rows.map((row) => (
                <ShortcutRow key={`${group.id}-${row.keys}`} row={row} />
              ))}
            </FlexBox>
          </Box>
        ))}
      </Box>
    </Modal>
  );
}

function ShortcutRow({ row }: { row: ShortcutsCheatsheetRow }) {
  return (
    <FlexBox
      className="ShortcutsCheatsheet__row"
      align="center"
      justify="space-between"
      gap={1}
    >
      <Box className="ShortcutsCheatsheet__label">{row.label}</Box>
      <Box className="ShortcutsCheatsheet__keys">{row.keys}</Box>
    </FlexBox>
  );
}
