// ============================================
// proShortcuts — Pro 모드 전역 단축키 레지스트리
// keydown 핸들러와 단축키 치트시트 UI의 single source of truth
// ============================================

export type ProShortcutCategory = "tab" | "editor" | "panel" | "view";

// global: window keydown 핸들러가 디스패치 (useProMode 내부 루프)
// editor: Monaco editor.addAction 으로 등록되어 에디터 포커스 시에만 동작.
//         치트시트 표시는 필요하지만 전역 keydown 루프에서는 매칭 스킵.
export type ProShortcutScope = "global" | "editor";

export interface ProShortcut {
  id: string;
  keys: string;
  category: ProShortcutCategory;
  label: string;
  scope?: ProShortcutScope;
  match: (e: KeyboardEvent) => boolean;
}

// editor scope 항목은 Monaco가 디스패치하므로 전역 match는 항상 false.
const NEVER_MATCH = () => false;

const tabActivationShortcuts: ProShortcut[] = Array.from({ length: 9 }, (_, i) => {
  const n = i + 1;
  return {
    id: `activateTab${n}`,
    keys: `Alt+${n}`,
    category: "tab",
    label: `${n}번 탭으로 이동`,
    match: (e) => e.altKey && e.key === String(n),
  };
});

export const PRO_SHORTCUTS: readonly ProShortcut[] = [
  {
    id: "addTab",
    keys: "Alt+T",
    category: "tab",
    label: "새 쿼리 탭",
    match: (e) => e.altKey && e.key === "t",
  },
  {
    id: "closeActiveTab",
    keys: "Alt+W",
    category: "tab",
    label: "활성 탭 닫기",
    match: (e) => e.altKey && e.key === "w",
  },
  {
    id: "toggleLeftSidebar",
    keys: "Ctrl+B",
    category: "panel",
    label: "좌측 사이드바 토글",
    match: (e) => e.ctrlKey && !e.shiftKey && e.key === "b",
  },
  {
    id: "toggleChatPanel",
    keys: "Ctrl+J",
    category: "panel",
    label: "채팅 패널 토글",
    match: (e) => e.ctrlKey && !e.shiftKey && e.key === "j",
  },
  {
    id: "toggleEditorMaximize",
    keys: "Ctrl+Shift+M",
    category: "view",
    label: "에디터 최대화 토글",
    match: (e) => e.ctrlKey && e.shiftKey && e.key === "M",
  },
  {
    id: "showShortcuts",
    keys: "Ctrl+Shift+/",
    category: "view",
    label: "단축키 도움말 토글",
    // 한글 IME/일부 환경에서 Ctrl 동반 시 e.key 가 "/" 로 오는 경우까지 커버
    match: (e) => e.ctrlKey && e.shiftKey && (e.key === "?" || e.key === "/"),
  },
  // ── Monaco editor scope (EditorPanelConnector.handleEditorMount에서 등록) ──
  // 실제 디스패치는 Monaco editor.addAction이 담당. 여기서는 치트시트 표시 목적.
  {
    id: "executeQuery",
    keys: "Ctrl+Enter",
    category: "editor",
    scope: "editor",
    label: "쿼리 실행",
    match: NEVER_MATCH,
  },
  {
    id: "cancelQuery",
    keys: "Esc / Ctrl+.",
    category: "editor",
    scope: "editor",
    label: "쿼리 중지 (실행 중)",
    match: NEVER_MATCH,
  },
  {
    id: "formatSql",
    keys: "Shift+Alt+F",
    category: "editor",
    scope: "editor",
    label: "SQL 포맷",
    match: NEVER_MATCH,
  },
  ...tabActivationShortcuts,
] as const;

export type ProShortcutId = (typeof PRO_SHORTCUTS)[number]["id"];

// 치트시트 UI에서 사용할 카테고리 라벨
export const PRO_SHORTCUT_CATEGORY_LABEL: Record<ProShortcutCategory, string> = {
  tab: "탭",
  editor: "에디터",
  panel: "패널",
  view: "뷰",
};

export interface ProShortcutDisplayRow {
  keys: string;
  label: string;
  category: ProShortcutCategory;
}

// Alt+1~9 처럼 동일 그룹 단축키는 한 줄로 합쳐서 표시
export function getCheatsheetRows(
  shortcuts: readonly ProShortcut[] = PRO_SHORTCUTS,
): ProShortcutDisplayRow[] {
  const rows: ProShortcutDisplayRow[] = [];
  let tabRangeAdded = false;
  for (const s of shortcuts) {
    if (/^activateTab\d+$/.test(s.id)) {
      if (!tabRangeAdded) {
        rows.push({ keys: "Alt+1~9", label: "N번 탭으로 이동", category: "tab" });
        tabRangeAdded = true;
      }
      continue;
    }
    rows.push({ keys: s.keys, label: s.label, category: s.category });
  }
  return rows;
}
