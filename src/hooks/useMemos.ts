import { useCallback, useEffect } from "react";
import { useMemoStore } from "../stores/memoStore";
import { tauriCommands } from "../tauri/commands";

function generateDefaultFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  return `memo-${dateStr}-${timeStr}`;
}

export function useMemos() {
  const store = useMemoStore();

  const loadFolder = useCallback(async (folderPath: string) => {
    store.setLoading(true);
    try {
      store.setWorkingFolder(folderPath);
      const memos = await tauriCommands.listMemos(folderPath);
      store.setMemos(memos);
      return memos;
    } catch (error) {
      console.error("Failed to load folder:", error);
      return null;
    } finally {
      store.setLoading(false);
    }
  }, []);

  const selectFolder = useCallback(async () => {
    try {
      const folder = await tauriCommands.selectFolder();
      if (folder) {
        const isSameFolder = folder === store.workingFolder;
        if (!isSameFolder) {
          store.selectMemo(null);
          store.setCurrentMemo(null);
        }
        const memos = await loadFolder(folder);
        if (
          isSameFolder &&
          store.selectedMemoPath &&
          memos?.some((memo) => memo.path === store.selectedMemoPath)
        ) {
          await openMemo(store.selectedMemoPath);
        } else if (isSameFolder && store.selectedMemoPath) {
          store.selectMemo(null);
          store.setCurrentMemo(null);
        }
      }
    } catch (error) {
      console.error("Failed to select folder:", error);
    }
  }, [loadFolder, openMemo, store]);

  const openMemo = useCallback(async (filePath: string) => {
    store.setLoading(true);
    try {
      const memo = await tauriCommands.readMemo(filePath);
      store.selectMemo(filePath);
      store.setCurrentMemo(memo);
    } catch (error) {
      console.error("Failed to open memo:", error);
    } finally {
      store.setLoading(false);
    }
  }, []);

  const saveMemo = useCallback(async (filePath: string, content: string) => {
    try {
      const meta = await tauriCommands.saveMemo(filePath, content);
      store.updateMemoMeta(filePath, meta);
      store.markAsSaved();
    } catch (error) {
      console.error("Failed to save memo:", error);
    }
  }, []);

  const createMemo = useCallback(async () => {
    const { workingFolder } = store;
    if (!workingFolder) return;

    try {
      const fileName = generateDefaultFileName();
      const meta = await tauriCommands.createMemo(workingFolder, fileName);
      store.addMemo(meta);
      await openMemo(meta.path);
    } catch (error) {
      console.error("Failed to create memo:", error);
    }
  }, [openMemo]);

  const deleteMemo = useCallback(async (filePath: string) => {
    try {
      await tauriCommands.deleteMemo(filePath);
      store.removeMemo(filePath);
    } catch (error) {
      console.error("Failed to delete memo:", error);
    }
  }, []);

  useEffect(() => {
    const { workingFolder } = store;
    if (workingFolder) {
      const selectedPath = store.selectedMemoPath;
      loadFolder(workingFolder).then((memos) => {
        if (!selectedPath) return;
        if (memos?.some((memo) => memo.path === selectedPath)) {
          openMemo(selectedPath);
        } else {
          store.selectMemo(null);
          store.setCurrentMemo(null);
        }
      });
    }
  }, []);

  return {
    workingFolder: store.workingFolder,
    memos: store.memos,
    selectedMemoPath: store.selectedMemoPath,
    currentMemo: store.currentMemo,
    isDirty: store.isDirty,
    isLoading: store.isLoading,
    updateContent: store.updateContent,
    selectFolder,
    openMemo,
    saveMemo,
    createMemo,
    deleteMemo,
  };
}
