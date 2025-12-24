import { useCallback } from "react";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor, EditorPlaceholder } from "./components/MarkdownEditor";
import { useMemos } from "./hooks/useMemos";
import { useAutoSave } from "./hooks/useAutoSave";
import "./App.css";

function App() {
  const {
    workingFolder,
    memos,
    selectedMemoPath,
    currentMemo,
    isDirty,
    updateContent,
    selectFolder,
    openMemo,
    saveMemo,
    createMemo,
    deleteMemo,
  } = useMemos();

  const handleSave = useCallback(
    async (path: string, content: string) => {
      await saveMemo(path, content);
    },
    [saveMemo]
  );

  useAutoSave(currentMemo?.content || "", selectedMemoPath, handleSave);

  return (
    <Layout
      sidebar={
        <Sidebar
          workingFolder={workingFolder}
          memos={memos}
          selectedPath={selectedMemoPath}
          isDirty={isDirty}
          onSelectFolder={selectFolder}
          onCreateMemo={createMemo}
          onSelectMemo={openMemo}
          onDeleteMemo={deleteMemo}
        />
      }
      editor={
        currentMemo ? (
          <MarkdownEditor
            content={currentMemo.content}
            onChange={updateContent}
            filePath={selectedMemoPath ?? undefined}
          />
        ) : (
          <EditorPlaceholder />
        )
      }
    />
  );
}

export default App;
