# Tauri + React + Typescript

This template should help get you started developing with Tauri, React and Typescript in Vite.

## Supported Platforms

- Linux
- Windows

※ macOSは対象外です。

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)

## WSLで日本語が「□」になる場合

WSL/Ubuntu等のLinux側に日本語フォントが入っていないと、TauriのWebViewやヘッドレス環境で日本語が豆腐化します。

- 例: `sudo apt-get update && sudo apt-get install -y fonts-noto-cjk fonts-noto-cjk-extra`
- 反映が弱い場合: `fc-cache -f -v`
