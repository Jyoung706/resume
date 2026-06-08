/**
 * snippetStore — SQL 스니펫 로컬 저장소
 * 백엔드 API 미구현으로 localStorage persist 사용 (P3)
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createUserStorage } from "./createUserStorage";
import type { Snippet } from "@/pages/pro/parts/SnippetsPanel";

interface SnippetState {
  snippets: Snippet[];
  addSnippet: (title: string, sqlQuery: string) => void;
  removeSnippet: (id: string) => void;
  updateSnippet: (id: string, patch: Partial<Pick<Snippet, "title" | "sqlQuery">>) => void;
  reset: () => void;
}

const INITIAL_STATE = {
  snippets: [] as Snippet[],
};

let snippetCounter = 0;
function generateSnippetId(): string {
  snippetCounter += 1;
  return `snippet-${Date.now()}-${snippetCounter}`;
}

export const useSnippetStore = create<SnippetState>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      addSnippet: (title, sqlQuery) => {
        const newSnippet: Snippet = {
          id: generateSnippetId(),
          title,
          sqlQuery,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          snippets: [newSnippet, ...state.snippets],
        }));
      },

      removeSnippet: (id) =>
        set((state) => ({
          snippets: state.snippets.filter((s) => s.id !== id),
        })),

      updateSnippet: (id, patch) =>
        set((state) => ({
          snippets: state.snippets.map((s) =>
            s.id === id ? { ...s, ...patch } : s
          ),
        })),

      reset: () => set(INITIAL_STATE),
    }),
    {
      name: "orkis-snippets",
      storage: createJSONStorage(() => createUserStorage()),
      // queryPanelStore 와 동일 — 사용자별 키 적용 보장 위해 수동 rehydrate.
      skipHydration: true,
    }
  )
);
