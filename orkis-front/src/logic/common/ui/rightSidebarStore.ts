/**
 * rightSidebarStore — 우측 사이드바 상태 관리
 * CreamChatPage의 rightSidebarStore 기준
 */
import { create } from "zustand";
import type { RightSidebarTab } from "@/logic/common/ui/types";
import { chatConfig } from "@/logic/shared/config/chatConfig";

interface RightSidebarState {
  isOpen: boolean;
  mode: "resize" | "overlay";
  activeTab: RightSidebarTab;
  isFullScreen: boolean;

  openPanel: (tab: RightSidebarTab) => void;
  closePanel: () => void;
  togglePanel: (tab: RightSidebarTab) => void;
  setMode: (mode: "resize" | "overlay") => void;
  toggleFullScreen: () => void;
  setActiveTab: (tab: RightSidebarTab) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  isOpen: false,
  mode: chatConfig.rightSidebar.defaultMode,
  activeTab: "help" as RightSidebarTab,
  isFullScreen: false,
};

export const useRightSidebarStore = create<RightSidebarState>((set, get) => ({
  ...INITIAL_STATE,

  openPanel: (tab) => {
    set({ isOpen: true, activeTab: tab, isFullScreen: false });
  },

  closePanel: () => {
    set({ isOpen: false, isFullScreen: false });
  },

  togglePanel: (tab) => {
    const { isOpen, activeTab } = get();
    if (isOpen && activeTab === tab) {
      set({ isOpen: false, isFullScreen: false });
    } else {
      set({ isOpen: true, activeTab: tab, isFullScreen: false });
    }
  },

  setMode: (mode) => {
    set({ mode });
  },

  toggleFullScreen: () => {
    set((state) => ({ isFullScreen: !state.isFullScreen }));
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  reset: () => {
    set(INITIAL_STATE);
  },
}));
