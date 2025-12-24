export interface MemoMeta {
  path: string;
  name: string;
  modified_at: number;
  created_at: number;
}

export interface MemoFile extends MemoMeta {
  content: string;
}
