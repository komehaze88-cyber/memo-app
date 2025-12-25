import { useState, useRef, useEffect } from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import type { MemoMeta } from "../types/memo";

interface MemoListProps {
  memos: MemoMeta[];
  selectedPath: string | null;
  isLoading: boolean;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
}

function SkeletonItem() {
  return (
    <li className="memo-list-item memo-list-item-skeleton">
      <div className="memo-list-item-content">
        <span className="skeleton-text skeleton-name" />
        <span className="skeleton-text skeleton-date" />
      </div>
    </li>
  );
}

export function MemoList({
  memos,
  selectedPath,
  isLoading,
  onSelect,
  onDelete,
  onRename,
}: MemoListProps) {
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingPath && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingPath]);

  const startRename = (memo: MemoMeta, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingPath(memo.path);
    setEditingName(memo.name);
  };

  const handleRenameSubmit = () => {
    if (editingPath && editingName.trim()) {
      const originalMemo = memos.find(m => m.path === editingPath);
      if (originalMemo && editingName.trim() !== originalMemo.name) {
        onRename(editingPath, editingName.trim());
      }
    }
    setEditingPath(null);
    setEditingName("");
  };

  const handleRenameCancel = () => {
    setEditingPath(null);
    setEditingName("");
  };

  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleRenameSubmit();
    } else if (e.key === "Escape") {
      handleRenameCancel();
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading && memos.length === 0) {
    return (
      <ul className="memo-list">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </ul>
    );
  }

  if (memos.length === 0) {
    return <div className="memo-list-empty">No memos yet</div>;
  }

  return (
    <ul className="memo-list">
      {memos.map((memo) => (
        <li
          key={memo.path}
          className={`memo-list-item ${
            selectedPath === memo.path ? "selected" : ""
          }`}
          onClick={() => editingPath !== memo.path && onSelect(memo.path)}
        >
          <div className="memo-list-item-content">
            {editingPath === memo.path ? (
              <input
                ref={inputRef}
                type="text"
                className="memo-list-item-rename-input"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={handleRenameSubmit}
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <>
                <span
                  className="memo-list-item-name"
                  onDoubleClick={(e) => startRename(memo, e)}
                >
                  {memo.name}
                </span>
                <span className="memo-list-item-date">
                  {formatDate(memo.modified_at)}
                </span>
              </>
            )}
          </div>
          <div className="memo-list-item-actions">
            <button
              className="memo-list-item-action memo-list-item-rename"
              onClick={(e) => startRename(memo, e)}
              title="Rename memo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
            <button
              className="memo-list-item-action memo-list-item-delete"
              onClick={async (e) => {
                e.stopPropagation();
                const confirmed = await ask(`Delete "${memo.name}"?`, {
                  title: "Confirm Delete",
                  kind: "warning",
                });
                if (confirmed) {
                  onDelete(memo.path);
                }
              }}
              title="Delete memo"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
