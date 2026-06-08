import { create } from "zustand";

interface DataViewState {
  isOpen: boolean;
  columns: string[];
  data: Array<Record<string, unknown>>;
  title: string;
  isLoading: boolean;

  openDataView: (params: {
    columns: string[];
    data: Array<Record<string, unknown>>;
    title?: string;
  }) => void;
  closeDataView: () => void;
  setLoading: (loading: boolean) => void;
}

export const useDataViewStore = create<DataViewState>((set) => ({
  isOpen: false,
  columns: [],
  data: [],
  title: "전체 데이터",
  isLoading: false,

  openDataView: ({ columns, data, title = "전체 데이터" }) => {
    set({ isOpen: true, columns, data, title, isLoading: false });
  },

  closeDataView: () =>
    set({ isOpen: false, columns: [], data: [], title: "전체 데이터", isLoading: false }),

  setLoading: (isLoading) => set({ isLoading }),
}));
