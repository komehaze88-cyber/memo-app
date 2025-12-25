import { useCallback, useState } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { tauriCommands } from "../tauri/commands";
import { showError, showSuccess } from "../stores/toastStore";

export function SettingsDialog() {
  const isOpen = useSettingsStore((state) => state.settingsDialogOpen);
  const setOpen = useSettingsStore((state) => state.setSettingsDialogOpen);
  const editorFont = useSettingsStore((state) => state.editorFont);
  const setEditorFont = useSettingsStore((state) => state.setEditorFont);
  const addInstalledFont = useSettingsStore((state) => state.addInstalledFont);
  const resetEditorFontToDefault = useSettingsStore(
    (state) => state.resetEditorFontToDefault
  );

  const [isLoading, setIsLoading] = useState(false);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, [setOpen]);

  const handleSelectFont = useCallback(async () => {
    try {
      setIsLoading(true);

      // Pick font file
      const fontPath = await tauriCommands.pickFontFile();
      if (!fontPath) {
        return; // User cancelled
      }

      // Extract label from file path
      const fileName = fontPath.split(/[/\\]/).pop() || "Custom Font";
      const label = fileName.replace(/\.[^.]+$/, "");

      // Install font
      const installedFont = await tauriCommands.installFont(fontPath, label);
      addInstalledFont(installedFont);

      // Set as editor font
      setEditorFont({
        type: "file",
        id: installedFont.id,
        label: installedFont.label,
        format: installedFont.format,
      });

      showSuccess(`フォント「${label}」を適用しました`);
    } catch (error) {
      console.error("Failed to install font:", error);
      showError("フォントのインストールに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, [addInstalledFont, setEditorFont]);

  const handleResetToDefault = useCallback(() => {
    resetEditorFontToDefault();
    showSuccess("デフォルトフォントに戻しました");
  }, [resetEditorFontToDefault]);

  if (!isOpen) {
    return null;
  }

  const currentFontLabel =
    editorFont.type === "default" ? "デフォルト" : editorFont.label;

  return (
    <div className="settings-overlay" onClick={handleClose}>
      <div className="settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 className="settings-title">設定</h2>
          <button
            className="settings-close-btn"
            onClick={handleClose}
            aria-label="閉じる"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M4 4L12 12M12 4L4 12" />
            </svg>
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3 className="settings-section-title">エディタのフォント</h3>
            <div className="settings-font-current">
              <span className="settings-font-label">現在のフォント:</span>
              <span className="settings-font-value">{currentFontLabel}</span>
            </div>
            <div className="settings-font-actions">
              <button
                className="settings-btn settings-btn-primary"
                onClick={handleSelectFont}
                disabled={isLoading}
              >
                {isLoading ? "読み込み中..." : "フォントファイルを選択..."}
              </button>
              {editorFont.type !== "default" && (
                <button
                  className="settings-btn settings-btn-secondary"
                  onClick={handleResetToDefault}
                  disabled={isLoading}
                >
                  デフォルトに戻す
                </button>
              )}
            </div>
            <p className="settings-font-hint">
              対応形式: .ttf, .otf, .woff, .woff2
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
