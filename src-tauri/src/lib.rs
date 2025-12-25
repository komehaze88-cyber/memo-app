mod commands;

use commands::{create_memo, delete_memo, list_memos, read_memo, rename_memo, save_memo, select_folder};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            select_folder,
            list_memos,
            read_memo,
            save_memo,
            create_memo,
            delete_memo,
            rename_memo,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
