import { invoke } from "@tauri-apps/api/core";
import type { MemoMeta, MemoFile } from "../types/memo";
import type { InstalledFont } from "../types/font";

export const tauriCommands = {
  selectFolder: (): Promise<string | null> => invoke("select_folder"),

  listMemos: (folderPath: string): Promise<MemoMeta[]> =>
    invoke("list_memos", { folderPath }),

  readMemo: (filePath: string, workingFolder: string): Promise<MemoFile> =>
    invoke("read_memo", { filePath, workingFolder }),

  saveMemo: (filePath: string, content: string, workingFolder: string): Promise<MemoMeta> =>
    invoke("save_memo", { filePath, content, workingFolder }),

  createMemo: (folderPath: string, fileName: string): Promise<MemoMeta> =>
    invoke("create_memo", { folderPath, fileName }),

  deleteMemo: (filePath: string, workingFolder: string): Promise<void> =>
    invoke("delete_memo", { filePath, workingFolder }),

  renameMemo: (filePath: string, newName: string, workingFolder: string): Promise<MemoMeta> =>
    invoke("rename_memo", { filePath, newName, workingFolder }),

  // Font management commands
  pickFontFile: (): Promise<string | null> => invoke("pick_font_file"),

  installFont: (fontFilePath: string, label: string): Promise<InstalledFont> =>
    invoke("install_font", { fontFilePath, label }),

  getInstalledFontPath: (fontId: string, format: string): Promise<string> =>
    invoke("get_installed_font_path", { fontId, format }),

  deleteInstalledFont: (fontId: string, format: string): Promise<void> =>
    invoke("delete_installed_font", { fontId, format }),
};
