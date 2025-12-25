mod commands;

use commands::{
    create_memo, delete_installed_font, delete_memo, get_installed_font_path, install_font,
    list_memos, pick_font_file, read_memo, rename_memo, save_memo, select_folder,
};

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
            pick_font_file,
            install_font,
            get_installed_font_path,
            delete_installed_font,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
