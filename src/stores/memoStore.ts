import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MemoMeta, MemoFile } from "../types/memo";

interface MemoState {
  workingFolder: string | null;
  memos: MemoMeta[];
  selectedMemoPath: string | null;
  currentMemo: MemoFile | null;
  isDirty: boolean;
  isLoading: boolean;

  setWorkingFolder: (folder: string | null) => void;
  setMemos: (memos: MemoMeta[]) => void;
  selectMemo: (path: string | null) => void;
  setCurrentMemo: (memo: MemoFile | null) => void;
  updateContent: (content: string) => void;
  markAsSaved: () => void;
  setLoading: (loading: boolean) => void;
  addMemo: (memo: MemoMeta) => void;
  removeMemo: (path: string) => void;
  updateMemoMeta: (path: string, meta: Partial<MemoMeta>) => void;
  renameMemo: (oldPath: string, newMeta: MemoMeta) => void;
}

export const useMemoStore = create<MemoState>()(
  persist(
    (set) => ({
      workingFolder: null,
      memos: [],
      selectedMemoPath: null,
      currentMemo: null,
      isDirty: false,
      isLoading: false,

      setWorkingFolder: (folder) => set({ workingFolder: folder }),
      setMemos: (memos) => set({ memos }),
      selectMemo: (path) => set({ selectedMemoPath: path }),
      setCurrentMemo: (memo) => set({ currentMemo: memo, isDirty: false }),
      updateContent: (content) =>
        set((state) => {
          if (!state.currentMemo) return state;
          if (state.currentMemo.content === content) return state;
          return {
            currentMemo: { ...state.currentMemo, content },
            isDirty: true,
          };
        }),
      markAsSaved: () => set({ isDirty: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      addMemo: (memo) =>
        set((state) => ({
          memos: [memo, ...state.memos].sort(
            (a, b) => b.modified_at - a.modified_at
          ),
        })),
      removeMemo: (path) =>
        set((state) => ({
          memos: state.memos.filter((m) => m.path !== path),
          selectedMemoPath:
            state.selectedMemoPath === path ? null : state.selectedMemoPath,
          currentMemo:
            state.currentMemo?.path === path ? null : state.currentMemo,
          isDirty: state.currentMemo?.path === path ? false : state.isDirty,
        })),
      updateMemoMeta: (path, meta) =>
        set((state) => ({
          memos: state.memos
            .map((m) => (m.path === path ? { ...m, ...meta } : m))
            .sort((a, b) => b.modified_at - a.modified_at),
          currentMemo:
            state.currentMemo?.path === path
              ? { ...state.currentMemo, ...meta }
              : state.currentMemo,
        })),
      renameMemo: (oldPath, newMeta) =>
        set((state) => ({
          memos: state.memos
            .map((m) => (m.path === oldPath ? newMeta : m))
            .sort((a, b) => b.modified_at - a.modified_at),
          selectedMemoPath:
            state.selectedMemoPath === oldPath ? newMeta.path : state.selectedMemoPath,
          currentMemo:
            state.currentMemo?.path === oldPath
              ? { ...state.currentMemo, path: newMeta.path, name: newMeta.name }
              : state.currentMemo,
        })),
    }),
    {
      name: "memo-storage",
      partialize: (state) => ({
        workingFolder: state.workingFolder,
        selectedMemoPath: state.selectedMemoPath,
      }),
    }
  )
);
