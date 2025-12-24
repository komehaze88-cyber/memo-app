use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::mpsc;
use std::time::UNIX_EPOCH;
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MemoMeta {
    pub path: String,
    pub name: String,
    pub modified_at: u64,
    pub created_at: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoFile {
    pub path: String,
    pub name: String,
    pub content: String,
    pub modified_at: u64,
    pub created_at: u64,
}

fn get_file_times(path: &PathBuf) -> (u64, u64) {
    let metadata = fs::metadata(path).ok();
    let modified_at = metadata
        .as_ref()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);
    let created_at = metadata
        .as_ref()
        .and_then(|m| m.created().ok())
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(modified_at);
    (modified_at, created_at)
}

#[tauri::command]
pub async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let (tx, rx) = mpsc::channel();
    app.dialog().file().pick_folder(move |folder_path| {
        let _ = tx.send(folder_path);
    });

    match rx.recv() {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub fn list_memos(folder_path: String) -> Result<Vec<MemoMeta>, String> {
    let path = PathBuf::from(&folder_path);
    if !path.exists() || !path.is_dir() {
        return Err("Invalid folder path".to_string());
    }

    let mut memos = Vec::new();
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let file_path = entry.path();
        if file_path.is_file() {
            if let Some(ext) = file_path.extension() {
                if ext == "md" {
                    let name = file_path
                        .file_stem()
                        .and_then(|s| s.to_str())
                        .unwrap_or("Untitled")
                        .to_string();
                    let (modified_at, created_at) = get_file_times(&file_path);
                    memos.push(MemoMeta {
                        path: file_path.to_string_lossy().to_string(),
                        name,
                        modified_at,
                        created_at,
                    });
                }
            }
        }
    }

    memos.sort_by(|a, b| b.modified_at.cmp(&a.modified_at));
    Ok(memos)
}

#[tauri::command]
pub fn read_memo(file_path: String) -> Result<MemoFile, String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() || !path.is_file() {
        return Err("File not found".to_string());
    }

    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let (modified_at, created_at) = get_file_times(&path);

    Ok(MemoFile {
        path: file_path,
        name,
        content,
        modified_at,
        created_at,
    })
}

#[tauri::command]
pub fn save_memo(file_path: String, content: String) -> Result<MemoMeta, String> {
    let path = PathBuf::from(&file_path);
    fs::write(&path, &content).map_err(|e| e.to_string())?;

    let name = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let (modified_at, created_at) = get_file_times(&path);

    Ok(MemoMeta {
        path: file_path,
        name,
        modified_at,
        created_at,
    })
}

#[tauri::command]
pub fn create_memo(folder_path: String, file_name: String) -> Result<MemoMeta, String> {
    let folder = PathBuf::from(&folder_path);
    if !folder.exists() || !folder.is_dir() {
        return Err("Invalid folder path".to_string());
    }

    let base_name = file_name.trim();
    let base_name = if base_name.is_empty() {
        "untitled"
    } else {
        base_name
    };

    let mut file_path = folder.join(format!("{}.md", base_name));
    let mut counter = 1;
    while file_path.exists() {
        file_path = folder.join(format!("{}-{}.md", base_name, counter));
        counter += 1;
    }

    fs::write(&file_path, "").map_err(|e| e.to_string())?;

    let name = file_path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Untitled")
        .to_string();
    let (modified_at, created_at) = get_file_times(&file_path);

    Ok(MemoMeta {
        path: file_path.to_string_lossy().to_string(),
        name,
        modified_at,
        created_at,
    })
}

#[tauri::command]
pub fn delete_memo(file_path: String) -> Result<(), String> {
    let path = PathBuf::from(&file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }
    fs::remove_file(&path).map_err(|e| e.to_string())
}
