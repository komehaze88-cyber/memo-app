import { useEffect, useRef } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useSettingsStore } from "../stores/settingsStore";
import { tauriCommands } from "../tauri/commands";

const FONT_FAMILY_ALIAS = "MemoUserSans";
const STYLE_ELEMENT_ID = "memo-user-font-style";

export function useFontLoader() {
  const editorFont = useSettingsStore((state) => state.editorFont);
  const resetEditorFontToDefault = useSettingsStore(
    (state) => state.resetEditorFontToDefault
  );
  const loadedFontRef = useRef<string | null>(null);

  useEffect(() => {
    const loadFont = async () => {
      // Remove existing style element
      const existingStyle = document.getElementById(STYLE_ELEMENT_ID);
      if (existingStyle) {
        existingStyle.remove();
      }

      if (editorFont.type === "default") {
        // Remove override so CSS fallback applies
        document.documentElement.style.removeProperty("--font-user-sans");
        loadedFontRef.current = null;
        return;
      }

      // Skip if already loaded
      if (loadedFontRef.current === editorFont.id) {
        return;
      }

      try {
        // Get the font file path from backend
        const fontPath = await tauriCommands.getInstalledFontPath(
          editorFont.id,
          editorFont.format
        );

        // Convert to asset URL
        const fontUrl = convertFileSrc(fontPath);

        // Determine format for @font-face
        const formatMap: Record<string, string> = {
          ttf: "truetype",
          otf: "opentype",
          woff: "woff",
          woff2: "woff2",
        };
        const fontFormat = formatMap[editorFont.format] || "truetype";

        // Create @font-face style
        const styleElement = document.createElement("style");
        styleElement.id = STYLE_ELEMENT_ID;
        styleElement.textContent = `
          @font-face {
            font-family: "${FONT_FAMILY_ALIAS}";
            src: url("${fontUrl}") format("${fontFormat}");
            font-weight: normal;
            font-style: normal;
            font-display: swap;
          }
        `;
        document.head.appendChild(styleElement);

        // Update CSS variable
        document.documentElement.style.setProperty(
          "--font-user-sans",
          `"${FONT_FAMILY_ALIAS}"`
        );

        loadedFontRef.current = editorFont.id;
      } catch (error) {
        console.error("Failed to load custom font:", error);
        // Fallback to default font
        document.documentElement.style.removeProperty("--font-user-sans");
        loadedFontRef.current = null;
        // Reset setting to default
        resetEditorFontToDefault();
      }
    };

    loadFont();
  }, [editorFont, resetEditorFontToDefault]);
}
