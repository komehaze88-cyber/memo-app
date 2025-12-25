import { useCallback, useEffect, useRef } from "react";
import { useMemoStore } from "../stores/memoStore";
import { tauriCommands } from "../tauri/commands";
import { showError, showSuccess } from "../stores/toastStore";

function generateDefaultFileName(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const timeStr = now.toTimeString().slice(0, 5).replace(":", "");
  return `memo-${dateStr}-${timeStr}`;
}

export function useMemos() {
  const store = useMemoStore();
  const openMemoRequestIdRef = useRef(0);

  const loadFolder = useCallback(async (folderPath: string) => {
    store.setLoading(true);
    try {
      store.setWorkingFolder(folderPath);
      const memos = await tauriCommands.listMemos(folderPath);
      store.setMemos(memos);
      return memos;
    } catch (error) {
      console.error("Failed to load folder:", error);
      showError(`Failed to load folder: ${error}`);
      return null;
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  const openMemo = useCallback(
    async (filePath: string) => {
      const { workingFolder } = store;
      if (!workingFolder) return;

      // レース対策: リクエストIDをインクリメントして最新リクエストのみを反映
      const requestId = ++openMemoRequestIdRef.current;

      store.setLoading(true);
      try {
        const memo = await tauriCommands.readMemo(filePath, workingFolder);
        // 最新のリクエストでない場合は結果を破棄
        if (requestId !== openMemoRequestIdRef.current) {
          return;
        }
        store.selectMemo(filePath);
        store.setCurrentMemo(memo);
      } catch (error) {
        // 最新のリクエストでない場合はエラーも表示しない
        if (requestId !== openMemoRequestIdRef.current) {
          return;
        }
        console.error("Failed to open memo:", error);
        showError(`Failed to open memo: ${error}`);
      } finally {
        // 最新のリクエストの場合のみローディングを解除
        if (requestId === openMemoRequestIdRef.current) {
          store.setLoading(false);
        }
      }
    },
    [store]
  );

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
      showError(`Failed to select folder: ${error}`);
    }
  }, [loadFolder, openMemo, store]);

  const saveMemo = useCallback(async (filePath: string, content: string) => {
    const { workingFolder } = store;
    if (!workingFolder) return;

    try {
      const meta = await tauriCommands.saveMemo(filePath, content, workingFolder);
      store.updateMemoMeta(filePath, meta);
      store.markAsSaved();
      showSuccess("Saved");
    } catch (error) {
      console.error("Failed to save memo:", error);
      showError(`Failed to save memo: ${error}`);
    }
  }, [store]);

  const createMemo = useCallback(async (name?: string) => {
    const { workingFolder } = store;
    if (!workingFolder) return;

    try {
      const fileName = name?.trim() || generateDefaultFileName();
      const meta = await tauriCommands.createMemo(workingFolder, fileName);
      store.addMemo(meta);
      await openMemo(meta.path);
      showSuccess("Memo created");
    } catch (error) {
      console.error("Failed to create memo:", error);
      showError(`Failed to create memo: ${error}`);
    }
  }, [openMemo, store]);

  const deleteMemo = useCallback(async (filePath: string) => {
    const { workingFolder } = store;
    if (!workingFolder) return;

    try {
      await tauriCommands.deleteMemo(filePath, workingFolder);
      store.removeMemo(filePath);
      showSuccess("Memo deleted");
    } catch (error) {
      console.error("Failed to delete memo:", error);
      showError(`Failed to delete memo: ${error}`);
    }
  }, [store]);

  const renameMemo = useCallback(async (filePath: string, newName: string) => {
    const { workingFolder } = store;
    if (!workingFolder) return;

    try {
      const meta = await tauriCommands.renameMemo(filePath, newName, workingFolder);
      store.renameMemo(filePath, meta);
      showSuccess("Memo renamed");
    } catch (error) {
      console.error("Failed to rename memo:", error);
      showError(`Failed to rename memo: ${error}`);
    }
  }, [store]);

  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const workingFolder = useMemoStore.getState().workingFolder;
    const selectedPath = useMemoStore.getState().selectedMemoPath;

    if (workingFolder) {
      loadFolder(workingFolder).then((memos) => {
        if (!selectedPath) return;
        if (memos?.some((memo) => memo.path === selectedPath)) {
          openMemo(selectedPath);
        } else {
          useMemoStore.getState().selectMemo(null);
          useMemoStore.getState().setCurrentMemo(null);
        }
      });
    }
  }, [loadFolder, openMemo]);

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
    renameMemo,
  };
}
