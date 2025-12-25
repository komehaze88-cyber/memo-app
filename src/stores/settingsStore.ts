import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { InstalledFont, EditorFontSetting } from "../types/font";

interface SettingsState {
  editorFont: EditorFontSetting;
  installedFonts: InstalledFont[];
  settingsDialogOpen: boolean;

  setEditorFont: (font: EditorFontSetting) => void;
  addInstalledFont: (font: InstalledFont) => void;
  removeInstalledFont: (fontId: string) => void;
  resetEditorFontToDefault: () => void;
  setSettingsDialogOpen: (open: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      editorFont: { type: "default" },
      installedFonts: [],
      settingsDialogOpen: false,

      setEditorFont: (font) => set({ editorFont: font }),

      addInstalledFont: (font) =>
        set((state) => ({
          installedFonts: [...state.installedFonts, font],
        })),

      removeInstalledFont: (fontId) =>
        set((state) => ({
          installedFonts: state.installedFonts.filter((f) => f.id !== fontId),
          editorFont:
            state.editorFont.type === "file" && state.editorFont.id === fontId
              ? { type: "default" }
              : state.editorFont,
        })),

      resetEditorFontToDefault: () => set({ editorFont: { type: "default" } }),

      setSettingsDialogOpen: (open) => set({ settingsDialogOpen: open }),
    }),
    {
      name: "memo-settings",
      partialize: (state) => ({
        editorFont: state.editorFont,
        installedFonts: state.installedFonts,
      }),
    }
  )
);
