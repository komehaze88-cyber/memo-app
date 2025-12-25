import { useState, useRef, useEffect, useCallback } from "react";
import { MemoList } from "./MemoList";
import { useSettingsStore } from "../stores/settingsStore";
import type { MemoMeta } from "../types/memo";

interface SidebarProps {
  workingFolder: string | null;
  memos: MemoMeta[];
  selectedPath: string | null;
  isDirty: boolean;
  isLoading: boolean;
  onSelectFolder: () => void;
  onCreateMemo: (name?: string) => void;
  onSelectMemo: (path: string) => void;
  onDeleteMemo: (path: string) => void;
  onRenameMemo: (path: string, newName: string) => void;
}

export function Sidebar({
  workingFolder,
  memos,
  selectedPath,
  isDirty,
  isLoading,
  onSelectFolder,
  onCreateMemo,
  onSelectMemo,
  onDeleteMemo,
  onRenameMemo,
}: SidebarProps) {
  const folderName = workingFolder?.split(/[/\\]/).pop() || null;
  const [isCreating, setIsCreating] = useState(false);
  const [newMemoName, setNewMemoName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setSettingsDialogOpen = useSettingsStore(
    (state) => state.setSettingsDialogOpen
  );

  const handleOpenSettings = useCallback(() => {
    setSettingsDialogOpen(true);
  }, [setSettingsDialogOpen]);

  useEffect(() => {
    if (isCreating && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isCreating]);

  const handleCreateSubmit = () => {
    if (newMemoName.trim()) {
      onCreateMemo(newMemoName.trim());
    } else {
      onCreateMemo();
    }
    setNewMemoName("");
    setIsCreating(false);
  };

  const handleCreateCancel = () => {
    setNewMemoName("");
    setIsCreating(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateSubmit();
    } else if (e.key === "Escape") {
      handleCreateCancel();
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">
          Memo
          {isDirty && <span className="dirty-indicator" />}
        </h1>
        <button
          className="sidebar-settings-btn"
          onClick={handleOpenSettings}
          aria-label="設定"
          title="設定"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="8" cy="8" r="2" />
            <path d="M13.5 8c0-.4-.2-.8-.4-1.1l1-1.5-1-1.7-1.8.3c-.5-.4-1-.7-1.7-.9L9 1.5H7l-.6 1.6c-.6.2-1.2.5-1.7.9l-1.8-.3-1 1.7 1 1.5c-.2.3-.4.7-.4 1.1s.2.8.4 1.1l-1 1.5 1 1.7 1.8-.3c.5.4 1 .7 1.7.9l.6 1.6h2l.6-1.6c.6-.2 1.2-.5 1.7-.9l1.8.3 1-1.7-1-1.5c.2-.3.4-.7.4-1.1z" />
          </svg>
        </button>
      </div>

      <div className="sidebar-folder">
        {workingFolder ? (
          <button className="sidebar-folder-btn" onClick={onSelectFolder}>
            {folderName}
          </button>
        ) : (
          <button className="sidebar-folder-btn" onClick={onSelectFolder}>
            Open Folder
          </button>
        )}
      </div>

      {workingFolder && (
        <>
          {isCreating ? (
            <div className="sidebar-new-form">
              <input
                ref={inputRef}
                type="text"
                className="sidebar-new-input"
                placeholder="Memo name (optional)"
                value={newMemoName}
                onChange={(e) => setNewMemoName(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleCreateSubmit}
              />
            </div>
          ) : (
            <button className="sidebar-new-btn" onClick={() => setIsCreating(true)}>
              + New Memo
            </button>
          )}

          <MemoList
            memos={memos}
            selectedPath={selectedPath}
            isLoading={isLoading}
            onSelect={onSelectMemo}
            onDelete={onDeleteMemo}
            onRename={onRenameMemo}
          />
        </>
      )}
    </div>
  );
}
