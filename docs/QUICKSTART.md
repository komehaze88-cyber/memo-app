# クイックスタートガイド

## 前提条件

- Node.js 18+
- Rust (rustup経由でインストール)
- Tauriの依存関係（[公式ドキュメント](https://v2.tauri.app/start/prerequisites/)参照）

## セットアップ

```bash
# リポジトリをクローン後
cd memo

# npm依存関係をインストール
npm install

# 開発サーバー起動
npm run tauri dev
```

初回起動時はRustのコンパイルに時間がかかる（数分）。

## 使い方

1. **フォルダを開く**: 「Open Folder」ボタンでメモを保存するフォルダを選択
2. **新規メモ**: 「+ New Memo」ボタンで新しいメモを作成
3. **編集**: 右側のエディタでMarkdownを編集（WYSIWYGスタイル）
4. **自動保存**: 編集後1秒で自動的に保存される
5. **削除**: メモ一覧でホバーし、「x」ボタンで削除

## ファイル構成の理解

変更を加える際に参照すべきファイル：

| やりたいこと | 変更するファイル |
|--------------|------------------|
| UIの見た目を変更 | `src/App.css` |
| サイドバーの機能追加 | `src/components/Sidebar.tsx` |
| エディタの設定変更 | `src/components/MarkdownEditor.tsx` |
| 新しいRustコマンド追加 | `src-tauri/src/commands.rs`, `lib.rs` |
| 状態管理の変更 | `src/stores/memoStore.ts` |

## 本番ビルド

```bash
npm run tauri build
```

ビルド成果物は `src-tauri/target/release/bundle/` に生成される。

## 次のステップ

詳細なアーキテクチャについては [ARCHITECTURE.md](./ARCHITECTURE.md) を参照。
