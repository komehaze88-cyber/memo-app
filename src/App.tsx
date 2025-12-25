import { useCallback } from "react";
import { Layout } from "./components/Layout";
import { Sidebar } from "./components/Sidebar";
import { MarkdownEditor, EditorPlaceholder } from "./components/MarkdownEditor";
import { ToastContainer } from "./components/Toast";
import { useMemos } from "./hooks/useMemos";
import { useManualSave } from "./hooks/useAutoSave";
import "./App.css";

function App() {
  const {
    workingFolder,
    memos,
    selectedMemoPath,
    currentMemo,
    isDirty,
    isLoading,
    updateContent,
    selectFolder,
    openMemo,
    saveMemo,
    createMemo,
    deleteMemo,
    renameMemo,
  } = useMemos();

  const handleSave = useCallback(
    async (path: string, content: string) => {
      await saveMemo(path, content);
    },
    [saveMemo]
  );

  const { saveNow, flushSave } = useManualSave(currentMemo?.content || "", currentMemo?.path || null, handleSave);

  const handleSelectMemo = useCallback(
    async (path: string) => {
      // メモ切り替え前に未保存データをフラッシュ保存
      await flushSave();
      await openMemo(path);
    },
    [flushSave, openMemo]
  );

  return (
    <>
      <Layout
        sidebar={
          <Sidebar
            workingFolder={workingFolder}
            memos={memos}
            selectedPath={selectedMemoPath}
            isDirty={isDirty}
            isLoading={isLoading}
            onSelectFolder={selectFolder}
            onCreateMemo={createMemo}
            onSelectMemo={handleSelectMemo}
            onDeleteMemo={deleteMemo}
            onRenameMemo={renameMemo}
          />
        }
        editor={
          currentMemo ? (
            <MarkdownEditor
              memoKey={currentMemo.path}
              content={currentMemo.content}
              onChange={updateContent}
              onSave={saveNow}
            />
          ) : (
            <EditorPlaceholder />
          )
        }
      />
      <ToastContainer />
    </>
  );
}

export default App;
