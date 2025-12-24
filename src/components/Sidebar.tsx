import { MemoList } from "./MemoList";
import type { MemoMeta } from "../types/memo";

interface SidebarProps {
  workingFolder: string | null;
  memos: MemoMeta[];
  selectedPath: string | null;
  isDirty: boolean;
  onSelectFolder: () => void;
  onCreateMemo: () => void;
  onSelectMemo: (path: string) => void;
  onDeleteMemo: (path: string) => void;
}

export function Sidebar({
  workingFolder,
  memos,
  selectedPath,
  isDirty,
  onSelectFolder,
  onCreateMemo,
  onSelectMemo,
  onDeleteMemo,
}: SidebarProps) {
  const folderName = workingFolder?.split(/[/\\]/).pop() || null;

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
          <button className="sidebar-new-btn" onClick={onCreateMemo}>
            + New Memo
          </button>

          <MemoList
            memos={memos}
            selectedPath={selectedPath}
            onSelect={onSelectMemo}
            onDelete={onDeleteMemo}
          />
        </>
      )}
    </div>
  );
}
