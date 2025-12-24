import type { MemoMeta } from "../types/memo";

interface MemoListProps {
  memos: MemoMeta[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
}

export function MemoList({
  memos,
  selectedPath,
  onSelect,
  onDelete,
}: MemoListProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          onClick={() => onSelect(memo.path)}
        >
          <div className="memo-list-item-content">
            <span className="memo-list-item-name">{memo.name}</span>
            <span className="memo-list-item-date">
              {formatDate(memo.modified_at)}
            </span>
          </div>
          <button
            className="memo-list-item-delete"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${memo.name}"?`)) {
                onDelete(memo.path);
              }
            }}
            title="Delete memo"
          >
            x
          </button>
        </li>
      ))}
    </ul>
  );
}
