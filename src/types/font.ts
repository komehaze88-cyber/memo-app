export interface InstalledFont {
  id: string;
  label: string;
  filename: string;
  format: string;
  installed_at: number;
}

export type EditorFontSetting =
  | { type: "default" }
  | { type: "file"; id: string; label: string; format: string };
