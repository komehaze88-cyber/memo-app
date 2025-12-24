import { invoke } from "@tauri-apps/api/core";
import type { MemoMeta, MemoFile } from "../types/memo";

export const tauriCommands = {
  selectFolder: (): Promise<string | null> => invoke("select_folder"),

  listMemos: (folderPath: string): Promise<MemoMeta[]> =>
    invoke("list_memos", { folderPath }),

  readMemo: (filePath: string): Promise<MemoFile> =>
    invoke("read_memo", { filePath }),

  saveMemo: (filePath: string, content: string): Promise<MemoMeta> =>
    invoke("save_memo", { filePath, content }),

  createMemo: (folderPath: string, fileName: string): Promise<MemoMeta> =>
    invoke("create_memo", { folderPath, fileName }),

  deleteMemo: (filePath: string): Promise<void> =>
    invoke("delete_memo", { filePath }),
};
