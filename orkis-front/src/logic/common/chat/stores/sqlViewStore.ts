import { create } from "zustand";

interface SqlViewState {
  isOpen: boolean;
  sqlQuery: string;
  title: string;

  openSqlView: (sqlQuery: string, title?: string) => void;
  closeSqlView: () => void;
}

export const useSqlViewStore = create<SqlViewState>((set) => ({
  isOpen: false,
  sqlQuery: "",
  title: "SQL 쿼리",

  openSqlView: (sqlQuery, title = "SQL 쿼리") => {
    if (!sqlQuery) return;
    set({ isOpen: true, sqlQuery, title });
  },

  closeSqlView: () =>
    set({ isOpen: false, sqlQuery: "", title: "SQL 쿼리" }),
}));
