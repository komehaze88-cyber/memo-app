import { useEffect, useRef } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import "@milkdown/theme-nord/style.css";

interface MarkdownEditorProps {
  memoKey: string;
  content: string;
  onChange: (content: string) => void;
}

interface MilkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function MilkdownEditor({ content, onChange }: MilkdownEditorProps) {
  const contentRef = useRef(content);
  const onChangeRef = useRef(onChange);
  const isInitialUpdateRef = useRef(true);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEditor((root) =>
    Editor.make()
      .config(nord)
      .use(commonmark)
      .use(listener)
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
}: MarkdownEditorProps) {
  return (
    <div className="editor-container">
      <MilkdownProvider key={memoKey}>
        <MilkdownEditor content={content} onChange={onChange} />
      </MilkdownProvider>
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
