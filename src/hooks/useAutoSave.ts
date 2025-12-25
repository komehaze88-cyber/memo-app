import { useRef, useCallback, useEffect } from "react";

export function useManualSave(
  content: string,
  filePath: string | null,
  saveCallback: (path: string, content: string) => Promise<void>
) {
  const contentRef = useRef<string>(content);
  const filePathRef = useRef<string | null>(filePath);
  const lastSavedRef = useRef<string>(content);
  const saveCallbackRef = useRef(saveCallback);
  const prevFilePathRef = useRef<string | null>(filePath);

  contentRef.current = content;
  filePathRef.current = filePath;
  saveCallbackRef.current = saveCallback;

  // ファイルパスが変わったらlastSavedをリセット
  useEffect(() => {
    if (prevFilePathRef.current !== filePath) {
      lastSavedRef.current = content;
      prevFilePathRef.current = filePath;
    }
  }, [filePath, content]);

  const saveNow = useCallback(async () => {
    const path = filePathRef.current;
    const currentContent = contentRef.current;
    if (path && currentContent !== lastSavedRef.current) {
      await saveCallbackRef.current(path, currentContent);
      lastSavedRef.current = currentContent;
      return true;
    }
    return false;
  }, []);

  const flushSave = useCallback(async () => {
    const path = filePathRef.current;
    const currentContent = contentRef.current;
    if (path && currentContent !== lastSavedRef.current) {
      await saveCallbackRef.current(path, currentContent);
      lastSavedRef.current = currentContent;
    }
  }, []);

  return { saveNow, flushSave };
}
