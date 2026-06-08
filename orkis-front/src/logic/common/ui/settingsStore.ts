/**
 * settingsStore — 환경설정 패널 UI 상태
 * 아코디언 확장 상태 + RAG 선택 DB를 localStorage에 영속화
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { SETTINGS_SECTION, type SettingsSectionId } from "@/logic/common/ui/types";

export { SETTINGS_SECTION, type SettingsSectionId };

// ── State ────────────────────────────────────
interface SettingsState {
  /** 현재 펼쳐진 아코디언 섹션 (null = 모두 닫힘) */
  expandedSection: SettingsSectionId | null;
  /** 아코디언 토글 */
  toggleSection: (id: string) => void;

  /** RAG 전처리용 선택된 DB ID */
  ragSelectedDbId: number | null;
  /** RAG DB 선택 변경 */
  setRagSelectedDbId: (id: number | null) => void;
}

// ── Store ────────────────────────────────────
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      expandedSection: SETTINGS_SECTION.USER,

      toggleSection: (id) =>
        set((state) => ({
          expandedSection:
            state.expandedSection === id
              ? null
              : (id as SettingsSectionId),
        })),

      ragSelectedDbId: null,

      setRagSelectedDbId: (id) => set({ ragSelectedDbId: id }),
    }),
    {
      name: "orkis-settings",
      partialize: (state) => ({
        expandedSection: state.expandedSection,
        ragSelectedDbId: state.ragSelectedDbId,
      }),
    }
  )
);
