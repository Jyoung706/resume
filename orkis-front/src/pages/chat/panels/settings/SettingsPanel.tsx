// ============================================
// SettingsPanel — 환경설정
// Design Layer: 슬롯 기반 (로직 없음)
// ============================================
// 4개 아코디언 섹션: 사용자 정보, 언어모델, 데이터베이스, RAG
// 각 섹션 내용은 ReactNode 슬롯으로 외부에서 주입
// ============================================

import type { ReactNode } from "react";
import { Accordion, FlexBox } from "@/components";
import {
  SETTINGS_SECTION,
  type SettingsSectionId
} from "@/logic/common/ui/settingsStore";
import "./SettingsPanel.scss";

// ============================================
// Props
// ============================================

export interface SettingsPanelProps {
  /** 현재 펼쳐진 아코디언 섹션 */
  expandedSection: SettingsSectionId | null;
  /** 아코디언 토글 핸들러 */
  onToggleSection: (id: string) => void;
  /** 사용자 정보 섹션 슬롯 */
  userSection: ReactNode;
  /** 언어모델 섹션 슬롯 */
  llmSection: ReactNode;
  /** 데이터베이스 섹션 슬롯 */
  databaseSection: ReactNode;
  /** RAG 섹션 슬롯 */
  ragSection: ReactNode;
}

// ============================================
// SettingsPanel
// ============================================

export function SettingsPanel({
  expandedSection,
  onToggleSection,
  userSection,
  llmSection,
  databaseSection,
  ragSection,
}: SettingsPanelProps) {
  return (
    <FlexBox direction="column" className="SettingsPanel">
      {/* ── 사용자 정보 ─────────────────────── */}
      <Accordion
        id={SETTINGS_SECTION.USER}
        title="사용자 정보"
        expanded={expandedSection === SETTINGS_SECTION.USER}
        onChange={onToggleSection}
      >
        {userSection}
      </Accordion>

      {/* ── 언어모델 ───────────────────────── */}
      <Accordion
        id={SETTINGS_SECTION.LLM}
        title="언어모델"
        expanded={expandedSection === SETTINGS_SECTION.LLM}
        onChange={onToggleSection}
      >
        {llmSection}
      </Accordion>

      {/* ── 데이터베이스 ───────────────────── */}
      <Accordion
        id={SETTINGS_SECTION.DATABASE}
        title="데이터베이스"
        expanded={expandedSection === SETTINGS_SECTION.DATABASE}
        onChange={onToggleSection}
      >
        {databaseSection}
      </Accordion>

      {/* ── RAG 전처리 ─────────────────────── */}
      <Accordion
        id={SETTINGS_SECTION.RAG}
        title="RAG"
        expanded={expandedSection === SETTINGS_SECTION.RAG}
        onChange={onToggleSection}
      >
        {ragSection}
      </Accordion>
    </FlexBox>
  );
}
