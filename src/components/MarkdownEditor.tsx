import { useEffect } from "react";
import { Editor, rootCtx, defaultValueCtx } from "@milkdown/core";
import { commonmark } from "@milkdown/preset-commonmark";
import { nord } from "@milkdown/theme-nord";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { listener, listenerCtx } from "@milkdown/plugin-listener";
import "@milkdown/theme-nord/style.css";

interface MarkdownEditorProps {
  content: string;
  onChange: (content: string) => void;
  filePath?: string;
}

function MilkdownEditor({ content, onChange }: MarkdownEditorProps) {
  const { get } = useEditor((root) =>
    Editor.make()
      .config(nord)
      .config((ctx) => {
        ctx.set(rootCtx, root);
        ctx.set(defaultValueCtx, content);
        ctx.get(listenerCtx).markdownUpdated((_ctx, markdown) => {
          onChange(markdown);
        });
      })
      .use(commonmark)
      .use(listener)
  );

  useEffect(() => {
    const editor = get();
    if (editor) {
      editor.action((ctx) => {
        const view = ctx.get(rootCtx) as HTMLElement | null;
        if (view) {
          const editorView = (view as unknown as { view?: { state?: unknown } })
            .view;
          if (editorView?.state) {
            // Content is managed internally by Milkdown
          }
        }
      });
    }
  }, [content, get]);

  return <Milkdown />;
}

export function MarkdownEditor({ content, onChange, filePath }: MarkdownEditorProps) {
  return (
    <div className="editor-container">
      <MilkdownProvider key={filePath}>
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
