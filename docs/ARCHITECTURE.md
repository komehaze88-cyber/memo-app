# Memo App - アーキテクチャドキュメント

## 概要

Markdownメモアプリのプロトタイプ。WYSIWYGライクなエディタでMarkdownを編集し、ローカルの`.md`ファイルとして保存する。

## 技術スタック

| レイヤー | 技術 | バージョン |
|----------|------|------------|
| デスクトップフレームワーク | Tauri | v2 |
| フロントエンド | React | 19.1.0 |
| 言語 | TypeScript | 5.8.3 |
| ビルドツール | Vite | 7.0.4 |
| バックエンド | Rust | 2021 edition |
| 状態管理 | Zustand | 5.0.0 |
| エディタ | Milkdown | 7.6.0 |

## ディレクトリ構造

```
memo/
├── src/                          # フロントエンド
│   ├── components/               # UIコンポーネント
│   │   ├── Layout.tsx            # 2カラムレイアウト
│   │   ├── Sidebar.tsx           # サイドバー（フォルダ選択・メモ一覧）
│   │   ├── MemoList.tsx          # メモ一覧リスト
│   │   └── MarkdownEditor.tsx    # Milkdownエディタラッパー
│   ├── hooks/                    # カスタムフック
│   │   ├── useMemos.ts           # メモCRUD操作
│   │   └── useAutoSave.ts        # 自動保存ロジック
│   ├── stores/                   # 状態管理
│   │   └── memoStore.ts          # Zustandストア
│   ├── tauri/                    # Tauri連携
│   │   └── commands.ts           # Rustコマンドのラッパー
│   ├── types/                    # 型定義
│   │   └── memo.ts
│   ├── App.tsx                   # ルートコンポーネント
│   ├── App.css                   # グローバルスタイル
│   └── main.tsx                  # エントリーポイント
│
├── src-tauri/                    # バックエンド（Rust）
│   ├── src/
│   │   ├── commands.rs           # ファイル操作コマンド
│   │   ├── lib.rs                # Tauriプラグイン・コマンド登録
│   │   └── main.rs               # エントリーポイント
│   ├── capabilities/
│   │   └── default.json          # 権限設定
│   ├── Cargo.toml                # Rust依存関係
│   └── tauri.conf.json           # Tauri設定
│
├── docs/                         # ドキュメント
└── package.json                  # npm依存関係
```

## データフロー

```
┌─────────────────────────────────────────────────────────────┐
│                        React Frontend                        │
│  ┌─────────┐    ┌──────────┐    ┌─────────────────────────┐ │
│  │ Sidebar │◄──►│ useMemos │◄──►│ memoStore (Zustand)     │ │
│  └─────────┘    └──────────┘    └─────────────────────────┘ │
│       │              │                      ▲               │
│       ▼              ▼                      │               │
│  ┌─────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │MemoList │    │MarkdownEditor│───►│ useAutoSave  │       │
│  └─────────┘    └──────────────┘    └──────────────┘       │
│                                            │                │
└────────────────────────────────────────────│────────────────┘
                                             │
                      invoke()               ▼
                    ┌────────────────────────────┐
                    │     tauri/commands.ts      │
                    └────────────────────────────┘
                                │
                                ▼ IPC
┌─────────────────────────────────────────────────────────────┐
│                        Rust Backend                          │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                    commands.rs                       │    │
│  │  select_folder | list_memos | read_memo | save_memo │    │
│  │  create_memo   | delete_memo                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│                              ▼                               │
│                    ┌─────────────────┐                      │
│                    │   File System   │                      │
│                    └─────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

## 主要コンポーネント詳細

### Rustコマンド（src-tauri/src/commands.rs）

| コマンド | 引数 | 戻り値 | 説明 |
|----------|------|--------|------|
| `select_folder` | - | `Option<String>` | フォルダ選択ダイアログを表示 |
| `list_memos` | `folder_path: String` | `Vec<MemoMeta>` | フォルダ内の.mdファイル一覧 |
| `read_memo` | `file_path: String` | `MemoFile` | ファイル内容を読み込み |
| `save_memo` | `file_path, content` | `MemoMeta` | ファイルを保存 |
| `create_memo` | `folder_path, file_name` | `MemoMeta` | 新規ファイル作成 |
| `delete_memo` | `file_path: String` | `()` | ファイル削除 |

### 型定義

```typescript
// MemoMeta: ファイルのメタ情報
interface MemoMeta {
  path: string;        // フルパス
  name: string;        // ファイル名（拡張子なし）
  modified_at: number; // 更新日時（Unix ms）
  created_at: number;  // 作成日時（Unix ms）
}

// MemoFile: メタ情報 + 内容
interface MemoFile extends MemoMeta {
  content: string;     // Markdown内容
}
```

### Zustandストア（memoStore.ts）

**状態**
- `workingFolder`: 現在の作業フォルダパス
- `memos`: メモ一覧（メタ情報のみ）
- `selectedMemoPath`: 選択中のメモパス
- `currentMemo`: 編集中のメモ（内容含む）
- `isDirty`: 未保存の変更があるか
- `isLoading`: ローディング状態

**永続化**
- `workingFolder`と`selectedMemoPath`はLocalStorageに保存
- アプリ再起動時に前回の状態を復元

### 自動保存（useAutoSave.ts）

- 内容変更後1秒のデバウンスで自動保存
- ファイルパスが変わった場合は保存済みとしてリセット
- 保存完了後に`markAsSaved()`で`isDirty`をfalseに

## Milkdownエディタ

WYSIWYGライクなMarkdownエディタとして[Milkdown](https://milkdown.dev/)を採用。

**使用プラグイン**
- `@milkdown/core`: コア機能
- `@milkdown/preset-commonmark`: CommonMark構文サポート
- `@milkdown/react`: React統合
- `@milkdown/theme-nord`: Nordテーマ
- `@milkdown/plugin-listener`: 変更イベント監視

**注意点**
- `MilkdownProvider`に`key={content}`を設定し、別のメモに切り替えた際にエディタを再初期化
- `listenerCtx.markdownUpdated`で内容変更を検知

## 開発コマンド

```bash
# 開発サーバー起動（ホットリロード対応）
npm run tauri dev

# フロントエンドのみビルド
npm run build

# 本番ビルド（配布用バイナリ生成）
npm run tauri build
```

## 権限設定

`src-tauri/capabilities/default.json`で必要な権限を定義：

```json
{
  "permissions": [
    "core:default",
    "opener:default",
    "dialog:default"  // フォルダ選択ダイアログに必要
  ]
}
```

## 拡張ポイント

### 機能追加候補

1. **検索機能**: `list_memos`を拡張してファイル内容も検索
2. **タグ機能**: フロントマターからタグを抽出
3. **エクスポート**: PDF/HTML出力（Rust側でpandoc連携など）
4. **キーボードショートカット**: `Ctrl+S`で手動保存、`Ctrl+N`で新規作成
5. **サイドバーリサイズ**: ドラッグでサイドバー幅を調整

### スタイルカスタマイズ

- `App.css`にダークモード対応済み（`prefers-color-scheme: dark`）
- Milkdownのテーマは`@milkdown/theme-nord`を使用、変更可能

## トラブルシューティング

### ビルドエラー: `tauri-plugin-dialog`

```
error[E0277]: expected a `FnOnce` closure
```

`pick_folder`はコールバック形式のAPI。`mpsc::channel`でブロッキング呼び出しに変換している。

### Milkdownが再レンダリングされない

`MilkdownProvider`の`key`プロパティにコンテンツやファイルパスを設定し、変更時に再マウントさせる。

### 自動保存が動作しない

1. `useAutoSave`の引数を確認（`filePath`がnullだと保存されない）
2. `saveMemo`関数が正しく渡されているか確認
3. デバウンス時間（デフォルト1000ms）を確認
