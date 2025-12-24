import { useEffect, useRef } from "react";

export function useAutoSave(
  content: string,
  filePath: string | null,
  saveCallback: (path: string, content: string) => Promise<void>,
  delay: number = 1000
) {
  const timeoutRef = useRef<number | null>(null);
  const lastSavedRef = useRef<string>("");
  const lastFilePathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!filePath) {
      lastFilePathRef.current = null;
      lastSavedRef.current = "";
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (lastFilePathRef.current !== filePath) {
      lastFilePathRef.current = filePath;
      lastSavedRef.current = content;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    if (content === lastSavedRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(async () => {
      await saveCallback(filePath, content);
      lastSavedRef.current = content;
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [content, filePath, saveCallback, delay]);
}
