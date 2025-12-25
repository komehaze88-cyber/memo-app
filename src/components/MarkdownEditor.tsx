import { useEffect, useRef, useState } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
import { commonmark, listItemSchema } from "@milkdown/preset-commonmark";
import { gfm } from "@milkdown/preset-gfm";
import { nord } from "@milkdown/theme-nord";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import { $prose } from "@milkdown/utils";
import { keymap } from "prosemirror-keymap";
import { liftListItem } from "prosemirror-schema-list";
import "@milkdown/theme-nord/style.css";

interface MarkdownEditorProps {
  memoKey: string;
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

interface MilkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave?: () => void;
}

// インラインコードから抜けるためのカスタムkeymapプラグイン
const customKeymapPlugin = $prose((ctx) => {
  const listItem = listItemSchema.type(ctx);

  return keymap({
    // ArrowRight: インラインコードの終端で押すとコードの外に移動
    ArrowRight: (state, dispatch) => {
      const { $cursor } = state.selection as any;
      if (!$cursor) return false;

      // インラインコードマーク内にいるか確認
      const codeMarkType = state.schema.marks.inlineCode;
      if (!codeMarkType) return false;

      const marks = $cursor.marks();
      const hasCodeMark = marks.some((m: any) => m.type === codeMarkType);

      if (!hasCodeMark) return false;

      // カーソル位置の後ろにテキストがあるか確認
      const { nodeAfter } = $cursor;

      // nodeAfterがない、またはnodeAfterにinlineCodeマークがない場合は終端にいる
      if (!nodeAfter || !nodeAfter.marks.some((m: any) => m.type === codeMarkType)) {
        // storedMarksをクリアしてコードから抜ける
        if (dispatch) {
          const tr = state.tr;
          tr.removeStoredMark(codeMarkType);
          // 空のスペースを挿入してコードの外に確実に出る
          tr.insertText(" ", $cursor.pos);
          dispatch(tr);
        }
        return true; // デフォルトの動作を防止
      }

      return false;
    },
    // Backspace: 空のリストアイテムでリストを解除
    Backspace: (state, dispatch) => {
      const { $cursor } = state.selection as any;
      if (!$cursor) return false;

      // リストアイテム内にいるか確認
      let listItemNode = null;

      for (let d = $cursor.depth; d > 0; d--) {
        const node = $cursor.node(d);
        if (node.type === listItem) {
          listItemNode = node;
          break;
        }
      }

      if (!listItemNode) return false;

      // カーソルが先頭にあり、リストアイテムが空かどうか確認
      const isEmpty = listItemNode.textContent.length === 0;
      const isAtStart = $cursor.parentOffset === 0;

      if (isEmpty && isAtStart) {
        // 空のリストアイテムをリフト
        return liftListItem(listItem)(state, dispatch);
      }

      return false;
    },
  });
});

function MilkdownEditor({ content, onChange, onSave }: MilkdownEditorProps) {
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  const onSaveRef = useRef(onSave);
  const isInitialUpdateRef = useRef(true);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  // Ctrl+S で保存
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        onSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEditor((root) =>
    Editor.make()
      .config(nord)
      .use(commonmark)
      .use(gfm)
      .use(listener)
      .use(customKeymapPlugin)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          if (isInitialUpdateRef.current) {
            isInitialUpdateRef.current = false;
            if (markdown === contentRef.current) return;
          }
          if (markdown === contentRef.current) return;
          onChangeRef.current(markdown);
        });
      })
  );

  return <Milkdown />;
}

export function MarkdownEditor({
  memoKey,
  content,
  onChange,
  onSave,
}: MarkdownEditorProps) {
  const [isRawMode, setIsRawMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // メモが切り替わった時にエディタにフォーカス
  useEffect(() => {
    // 少し遅延させてDOMの準備を待つ
    const timer = setTimeout(() => {
      focusEditor();
    }, 50);
    return () => clearTimeout(timer);
  }, [memoKey, isRawMode]);

  const focusEditor = () => {
    if (isRawMode) {
      textareaRef.current?.focus();
    } else {
      const proseMirror = containerRef.current?.querySelector('.ProseMirror') as HTMLElement;
      proseMirror?.focus();
    }
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    // ツールバーやエディタ内部のクリックは除外
    const target = e.target as HTMLElement;
    if (target.closest('.editor-toolbar') || target.closest('.ProseMirror') || target.closest('.editor-raw-textarea')) {
      return;
    }
    focusEditor();
  };

  return (
    <div className="editor-container" ref={containerRef} onClick={handleContainerClick}>
      <div className="editor-toolbar">
        <button
          className={`editor-toggle-btn ${isRawMode ? "active" : ""}`}
          onClick={() => setIsRawMode(!isRawMode)}
          title={isRawMode ? "Switch to preview mode" : "Switch to raw text mode"}
        >
          {isRawMode ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="4 7 4 4 20 4 20 7" />
              <line x1="9" y1="20" x2="15" y2="20" />
              <line x1="12" y1="4" x2="12" y2="20" />
            </svg>
          )}
          <span>{isRawMode ? "Preview" : "Raw"}</span>
        </button>
      </div>
      {isRawMode ? (
        <textarea
          ref={textareaRef}
          className="editor-raw-textarea"
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
              e.preventDefault();
              onSave?.();
            }
          }}
          spellCheck={false}
        />
      ) : (
        <MilkdownProvider key={memoKey}>
          <MilkdownEditor content={content} onChange={onChange} onSave={onSave} />
        </MilkdownProvider>
      )}
    </div>
  );
}

export function EditorPlaceholder() {
  return (
    <div className="editor-placeholder">
      <p>Select a memo or create a new one</p>
    </div>
  );
}
