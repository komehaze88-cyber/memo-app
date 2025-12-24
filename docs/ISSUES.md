# 現在の実装における問題点

このドキュメントでは、memo-appの現在の実装における問題点と改善が必要な箇所をまとめています。

---

## 1. フロントエンド

### 1.1 MarkdownEditor.tsx - エディタの同期問題

**場所**: `src/components/MarkdownEditor.tsx:30-44`

**問題**:
- `useEffect`で`content`を監視しているが、実際にはエディタの内容を更新する処理が実装されていない
- コメントに「Content is managed internally by Milkdown」とあるが、外部からのcontent変更（例：ファイル切り替え時）に対応できていない
- `filePath`をkeyとして使用しエディタ全体をリマウントしているが、これは重い操作であり大きなファイルでパフォーマンス問題となる

```tsx
// 現状: 何もしていない
useEffect(() => {
  const editor = get();
  if (editor) {
    editor.action((ctx) => {
      // ...実際の更新処理がない
    });
  }
}, [content, get]);
```

**推奨**: Milkdownの`replaceAll`コマンドを使用して、contentの変更を適切にエディタに反映させる

---

### 1.2 useAutoSave.ts - 未保存データの損失リスク

**場所**: `src/hooks/useAutoSave.ts:45-49`

**問題**:
- コンポーネントのアンマウント時にタイムアウトをクリアしているが、未保存の変更を保存していない
- ユーザーがページを離れる際にデータが失われる可能性がある

```tsx
// 現状: タイムアウトのクリアのみ
return () => {
  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current);
  }
};
```

**推奨**:
- アンマウント時に未保存の変更がある場合は即座に保存を実行する
- `beforeunload`イベントでも保存を処理する

---

### 1.3 useMemos.ts - useCallbackの依存配列の問題

**場所**: `src/hooks/useMemos.ts`

**問題**:
- 複数の`useCallback`で依存配列が空または不完全
- `store`を直接参照しているが依存配列に含めていない
- React のルールに違反しており、古いクロージャ問題が発生する可能性がある

```tsx
// 例: loadFolderは空の依存配列だがstoreを使用している
const loadFolder = useCallback(async (folderPath: string) => {
  store.setLoading(true);  // storeを参照
  // ...
}, []);  // 空の依存配列
```

**推奨**: Zustandのセレクターパターンを使用するか、依存配列を正しく設定する

---

### 1.4 memoStore.ts - 状態の永続化

**場所**: `src/stores/memoStore.ts:69-75`

**問題**:
- `partialize`で`workingFolder`と`selectedMemoPath`のみ永続化している
- `memos`リストを永続化していないため、アプリ再起動時に毎回フォルダを再スキャンする必要がある

**推奨**: 必要に応じて`memos`も永続化し、起動時のロード時間を短縮する（ただしファイルシステムとの同期問題には注意）

---

### 1.5 MemoList.tsx - ネイティブダイアログの使用

**場所**: `src/components/MemoList.tsx:50`

**問題**:
- `confirm()`はブラウザネイティブのダイアログであり、Tauriアプリのデザインと一貫性がない
- カスタマイズ不可

```tsx
if (confirm(`Delete "${memo.name}"?`)) {
  onDelete(memo.path);
}
```

**推奨**: `@tauri-apps/plugin-dialog`の`ask()`を使用してネイティブダイアログを表示する

---

### 1.6 エラーハンドリングの欠如

**場所**: 全体

**問題**:
- エラー発生時は`console.error`のみでユーザーへのフィードバックがない
- エラー状態を管理するストアやUIがない
- ユーザーは操作が失敗したことに気づけない

```tsx
} catch (error) {
  console.error("Failed to load folder:", error);  // ユーザーには見えない
  return null;
}
```

**推奨**:
- トースト通知やエラーダイアログでユーザーに通知する
- エラー状態をストアで管理し、UIに反映する

---

### 1.7 ローディング状態の未使用

**場所**: `src/stores/memoStore.ts:11`, `src/hooks/useMemos.ts:124`

**問題**:
- `isLoading`状態がストアに存在し、useMemosから返されているが、UIで使用されていない
- ユーザーはデータ読み込み中かどうかわからない

**推奨**: ローディングインジケーターやスケルトンUIを実装する

---

### 1.8 型安全性の問題

**場所**: `src/components/MarkdownEditor.tsx:34-38`

**問題**:
- 過度な型キャストが行われており、型安全性が損なわれている
- `unknown`への変換を経由した危険なキャスト

```tsx
const view = ctx.get(rootCtx) as HTMLElement | null;
if (view) {
  const editorView = (view as unknown as { view?: { state?: unknown } }).view;
```

**推奨**: Milkdownの正しいAPIを使用し、型キャストを最小限に抑える

---

## 2. バックエンド (Rust)

### 2.1 select_folder - ブロッキング操作

**場所**: `src-tauri/src/commands.rs:43-54`

**問題**:
- `async`関数として定義されているが、内部で`mpsc::channel`を使った同期的なブロッキング呼び出しをしている
- これはUIスレッドをブロックする可能性がある

```rust
#[tauri::command]
pub async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = mpsc::channel();  // 同期チャネル
    app.dialog().file().pick_folder(move |folder_path| {
        let _ = tx.send(folder_path);
    });
    match rx.recv() {  // ブロッキング受信
```

**推奨**: `tokio::sync::oneshot`などの非同期チャネルを使用する

---

### 2.2 エラー型の設計

**場所**: `src-tauri/src/commands.rs` 全体

**問題**:
- すべてのエラーが`String`型に変換されている
- エラーの種類（ファイルが見つからない、権限がない、など）をフロントエンドで区別できない

```rust
fs::write(&path, &content).map_err(|e| e.to_string())?;
```

**推奨**:
- カスタムエラー型を定義し、エラーの種類を明確にする
- `thiserror`クレートの活用

---

### 2.3 セキュリティ - パストラバーサル

**場所**: `src-tauri/src/commands.rs`

**問題**:
- ファイルパスのバリデーションが不十分
- パストラバーサル攻撃（`../../../etc/passwd`など）に対する対策がない
- `save_memo`や`delete_memo`で任意のパスが指定可能

**推奨**:
- パスを正規化し、作業フォルダ内にあることを確認する
- 許可されたファイル拡張子のみを処理する

---

### 2.4 大容量ファイルのメモリ効率

**場所**: `src-tauri/src/commands.rs:99, 119`

**問題**:
- `fs::read_to_string`と`fs::write`はファイル全体をメモリにロードする
- 大きなファイルでメモリ使用量が増大する

**推奨**: 必要に応じてストリーミング処理やファイルサイズ制限を実装する

---

## 3. CSS / UI

### 3.1 ダークモードの切り替え

**場所**: `src/App.css:395-420`

**問題**:
- `@media (prefers-color-scheme: dark)`のみでシステム設定に依存
- ユーザーが手動でテーマを切り替える機能がない

**推奨**:
- テーマ状態をストアで管理
- 手動切り替えUIを実装
- `data-theme`属性などでテーマを制御

---

### 3.2 レスポンシブ対応

**場所**: `src/App.css`

**問題**:
- サイドバーが固定幅（240px）
- モバイルデバイスでの表示に対応していない
- メディアクエリによるレスポンシブ対応がない

**推奨**:
- サイドバーの折りたたみ機能
- モバイル向けのレイアウト調整

---

## 4. 全般的な問題

### 4.1 テストの欠如

**問題**:
- ユニットテストが存在しない
- E2E テストが存在しない
- コードの品質保証が難しい

**推奨**:
- Vitest等でユニットテストを実装
- Playwright等でE2Eテストを実装

---

### 4.2 アクセシビリティ (a11y)

**問題**:
- キーボードナビゲーションのサポートが不十分
- ARIA属性がない
- フォーカス管理がない
- スクリーンリーダー対応がない

**推奨**:
- 適切なARIA属性を追加
- キーボードショートカットを実装
- フォーカストラップを実装

---

### 4.3 国際化 (i18n)

**問題**:
- UIテキストがハードコードされている（英語）
- 日付フォーマットのみ日本語ロケール対応
- 多言語対応の仕組みがない

**推奨**: i18nライブラリ（react-i18next等）の導入

---

### 4.4 ファイル監視の欠如

**問題**:
- 外部でファイルが変更された場合に検知できない
- 他のエディタで編集した変更が反映されない

**推奨**: Tauriのファイルシステム監視機能を使用して変更を検知する

---

## 優先度

| 優先度 | 問題 |
|--------|------|
| 高 | 1.2 未保存データの損失リスク |
| 高 | 1.6 エラーハンドリングの欠如 |
| 高 | 2.3 セキュリティ - パストラバーサル |
| 中 | 1.1 エディタの同期問題 |
| 中 | 1.3 useCallbackの依存配列の問題 |
| 中 | 1.5 ネイティブダイアログの使用 |
| 中 | 4.1 テストの欠如 |
| 低 | 1.4 状態の永続化 |
| 低 | 1.7 ローディング状態の未使用 |
| 低 | 3.1 ダークモードの切り替え |
| 低 | 3.2 レスポンシブ対応 |
| 低 | 4.2 アクセシビリティ |
| 低 | 4.3 国際化 |
