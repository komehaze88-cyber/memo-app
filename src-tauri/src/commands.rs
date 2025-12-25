use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::UNIX_EPOCH;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
use thiserror::Error;
use tokio::sync::oneshot;

#[derive(Debug, Error)]
pub enum CommandError {
    #[error("File not found: {0}")]
    FileNotFound(String),

    #[error("Invalid folder path: {0}")]
    InvalidFolder(String),

    #[error("Access denied: {0}")]
    AccessDenied(String),

    #[error("Invalid file name: {0}")]
    InvalidFileName(String),

    #[error("Only .md files are allowed")]
    NotMarkdownFile,

    #[error("IO error: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Dialog cancelled")]
    DialogCancelled,

    #[error("Unsupported font format: {0}")]
    UnsupportedFontFormat(String),

    #[error("Font file too large: max {0}MB, got {1}MB")]
    FileTooLarge(u64, u64),

    #[error("Path error: {0}")]
    PathError(String),
}

impl Serialize for CommandError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        use serde::ser::SerializeStruct;
        let mut state = serializer.serialize_struct("CommandError", 2)?;
        state.serialize_field("kind", &self.kind())?;
        state.serialize_field("message", &self.to_string())?;
        state.end()
    }
}

impl CommandError {
    fn kind(&self) -> &'static str {
        match self {
            CommandError::FileNotFound(_) => "file_not_found",
            CommandError::InvalidFolder(_) => "invalid_folder",
            CommandError::AccessDenied(_) => "access_denied",
            CommandError::InvalidFileName(_) => "invalid_file_name",
            CommandError::NotMarkdownFile => "not_markdown_file",
            CommandError::IoError(_) => "io_error",
            CommandError::DialogCancelled => "dialog_cancelled",
            CommandError::UnsupportedFontFormat(_) => "unsupported_font_format",
            CommandError::FileTooLarge(_, _) => "file_too_large",
            CommandError::PathError(_) => "path_error",
        }
    }
}

/// Validates that the file is a .md file
fn is_markdown_file(path: &Path) -> bool {
    path.extension()
        .map(|ext| ext.eq_ignore_ascii_case("md"))
        .unwrap_or(false)
}

/// Validates that the file_name doesn't contain path traversal characters
fn is_safe_filename(name: &str) -> bool {
    let name = name.trim();
    if name.is_empty() {
        return true; // Empty is handled separately
    }
    // Reject path separators and parent directory references
    !name.contains('/')
        && !name.contains('\\')
        && !name.contains("..")
        && !name.starts_with('.')
        && !Path::new(name).is_absolute()
}

/// Validates that the target path is within the working folder
fn is_within_folder(working_folder: &Path, target: &Path) -> Result<bool, CommandError> {
    let canonical_folder = working_folder.canonicalize()?;
    let canonical_target = target.canonicalize()?;
    Ok(canonical_target.starts_with(&canonical_folder))
}

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
pub async fn select_folder(app: tauri::AppHandle) -> Result<Option<String>, CommandError> {
    let (tx, rx) = oneshot::channel();
    app.dialog().file().pick_folder(move |folder_path| {
        let _ = tx.send(folder_path);
    });

    match rx.await {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(_) => Err(CommandError::DialogCancelled),
    }
}

#[tauri::command]
pub fn list_memos(folder_path: String) -> Result<Vec<MemoMeta>, CommandError> {
    let path = PathBuf::from(&folder_path);
    if !path.exists() || !path.is_dir() {
        return Err(CommandError::InvalidFolder(folder_path));
    }

    let mut memos = Vec::new();
    let entries = fs::read_dir(&path)?;

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
pub fn read_memo(file_path: String, working_folder: String) -> Result<MemoFile, CommandError> {
    let path = PathBuf::from(&file_path);
    let folder = PathBuf::from(&working_folder);

    // Security: Validate .md extension
    if !is_markdown_file(&path) {
        return Err(CommandError::NotMarkdownFile);
    }

    if !path.exists() || !path.is_file() {
        return Err(CommandError::FileNotFound(file_path.clone()));
    }

    // Security: Validate path is within working folder
    if !is_within_folder(&folder, &path)? {
        return Err(CommandError::AccessDenied(
            "file is outside working folder".to_string(),
        ));
    }

    let content = fs::read_to_string(&path)?;
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
pub fn save_memo(file_path: String, content: String, working_folder: String) -> Result<MemoMeta, CommandError> {
    let path = PathBuf::from(&file_path);
    let folder = PathBuf::from(&working_folder);

    // Security: Validate .md extension
    if !is_markdown_file(&path) {
        return Err(CommandError::NotMarkdownFile);
    }

    if !path.exists() {
        return Err(CommandError::FileNotFound(file_path.clone()));
    }

    // Security: Validate path is within working folder
    if !is_within_folder(&folder, &path)? {
        return Err(CommandError::AccessDenied(
            "file is outside working folder".to_string(),
        ));
    }

    fs::write(&path, &content)?;

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
pub fn create_memo(folder_path: String, file_name: String) -> Result<MemoMeta, CommandError> {
    let folder = PathBuf::from(&folder_path);
    if !folder.exists() || !folder.is_dir() {
        return Err(CommandError::InvalidFolder(folder_path));
    }

    // Security: Validate file_name doesn't contain path traversal
    if !is_safe_filename(&file_name) {
        return Err(CommandError::InvalidFileName(file_name));
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

    fs::write(&file_path, "")?;

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
pub fn delete_memo(file_path: String, working_folder: String) -> Result<(), CommandError> {
    let path = PathBuf::from(&file_path);
    let folder = PathBuf::from(&working_folder);

    // Security: Validate .md extension
    if !is_markdown_file(&path) {
        return Err(CommandError::NotMarkdownFile);
    }

    if !path.exists() {
        return Err(CommandError::FileNotFound(file_path));
    }

    // Security: Validate path is within working folder
    if !is_within_folder(&folder, &path)? {
        return Err(CommandError::AccessDenied(
            "file is outside working folder".to_string(),
        ));
    }

    fs::remove_file(&path)?;
    Ok(())
}

#[tauri::command]
pub fn rename_memo(file_path: String, new_name: String, working_folder: String) -> Result<MemoMeta, CommandError> {
    let path = PathBuf::from(&file_path);
    let folder = PathBuf::from(&working_folder);

    // Security: Validate .md extension
    if !is_markdown_file(&path) {
        return Err(CommandError::NotMarkdownFile);
    }

    if !path.exists() {
        return Err(CommandError::FileNotFound(file_path.clone()));
    }

    // Security: Validate path is within working folder
    if !is_within_folder(&folder, &path)? {
        return Err(CommandError::AccessDenied(
            "file is outside working folder".to_string(),
        ));
    }

    // Security: Validate new_name doesn't contain path traversal
    if !is_safe_filename(&new_name) {
        return Err(CommandError::InvalidFileName(new_name));
    }

    let new_name = new_name.trim();
    if new_name.is_empty() {
        return Err(CommandError::InvalidFileName("Name cannot be empty".to_string()));
    }

    // Build new file path
    let new_file_path = folder.join(format!("{}.md", new_name));

    // Check if new path already exists (and is not the same file)
    if new_file_path.exists() && new_file_path.canonicalize()? != path.canonicalize()? {
        return Err(CommandError::InvalidFileName(format!("File '{}' already exists", new_name)));
    }

    // Rename the file
    fs::rename(&path, &new_file_path)?;

    let (modified_at, created_at) = get_file_times(&new_file_path);

    Ok(MemoMeta {
        path: new_file_path.to_string_lossy().to_string(),
        name: new_name.to_string(),
        modified_at,
        created_at,
    })
}

// ============================================================
// Font Management Commands
// ============================================================

const ALLOWED_FONT_EXTENSIONS: [&str; 4] = ["ttf", "otf", "woff", "woff2"];
const MAX_FONT_SIZE_MB: u64 = 50;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InstalledFont {
    pub id: String,
    pub label: String,
    pub filename: String,
    pub format: String,
    pub installed_at: u64,
}

/// Opens a file dialog to pick a font file
#[tauri::command]
pub async fn pick_font_file(app: tauri::AppHandle) -> Result<Option<String>, CommandError> {
    let (tx, rx) = oneshot::channel();
    app.dialog()
        .file()
        .add_filter("Font Files", &ALLOWED_FONT_EXTENSIONS)
        .pick_file(move |file_path| {
            let _ = tx.send(file_path);
        });

    match rx.await {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(_) => Err(CommandError::DialogCancelled),
    }
}

/// Installs a font file by copying it to the app data directory
#[tauri::command]
pub async fn install_font(
    app: tauri::AppHandle,
    font_file_path: String,
    label: String,
) -> Result<InstalledFont, CommandError> {
    let source_path = PathBuf::from(&font_file_path);

    // Validate file exists
    if !source_path.exists() {
        return Err(CommandError::FileNotFound(font_file_path));
    }

    // Validate extension
    let ext = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    if !ALLOWED_FONT_EXTENSIONS.contains(&ext.as_str()) {
        return Err(CommandError::UnsupportedFontFormat(ext));
    }

    // Validate file size
    let metadata = fs::metadata(&source_path)?;
    let size_mb = metadata.len() / (1024 * 1024);
    if size_mb > MAX_FONT_SIZE_MB {
        return Err(CommandError::FileTooLarge(MAX_FONT_SIZE_MB, size_mb));
    }

    // Get app data directory and create fonts subdirectory
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::PathError(e.to_string()))?;
    let fonts_dir = app_data_dir.join("fonts");
    fs::create_dir_all(&fonts_dir)?;

    // Generate unique filename using UUID
    let unique_id = uuid::Uuid::new_v4().to_string();
    let target_filename = format!("{}.{}", unique_id, ext);
    let target_path = fonts_dir.join(&target_filename);

    // Copy file to fonts directory
    fs::copy(&source_path, &target_path)?;

    let installed_at = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0);

    Ok(InstalledFont {
        id: unique_id,
        label,
        filename: target_filename,
        format: ext,
        installed_at,
    })
}

/// Gets the full path to an installed font file for loading in the frontend
#[tauri::command]
pub async fn get_installed_font_path(
    app: tauri::AppHandle,
    font_id: String,
    format: String,
) -> Result<String, CommandError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::PathError(e.to_string()))?;
    let fonts_dir = app_data_dir.join("fonts");
    let font_filename = format!("{}.{}", font_id, format);
    let font_path = fonts_dir.join(&font_filename);

    if !font_path.exists() {
        return Err(CommandError::FileNotFound(font_filename));
    }

    Ok(font_path.to_string_lossy().to_string())
}

/// Deletes an installed font file
#[tauri::command]
pub async fn delete_installed_font(
    app: tauri::AppHandle,
    font_id: String,
    format: String,
) -> Result<(), CommandError> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| CommandError::PathError(e.to_string()))?;
    let fonts_dir = app_data_dir.join("fonts");
    let font_filename = format!("{}.{}", font_id, format);
    let font_path = fonts_dir.join(&font_filename);

    if font_path.exists() {
        fs::remove_file(&font_path)?;
    }

    Ok(())
}
