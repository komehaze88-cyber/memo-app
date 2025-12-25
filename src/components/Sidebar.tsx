import { useState, useRef, useEffect } from "react";
import { MemoList } from "./MemoList";
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
