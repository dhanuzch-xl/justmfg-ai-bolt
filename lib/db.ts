import Database from 'better-sqlite3';
import { FileItem } from '@/app/types';

const db = new Database('files.db');

// Initialize database tables
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('assembly', 'part')),
    parent_id TEXT,
    path TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES folders(id)
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    path TEXT NOT NULL,
    preview TEXT,
    folder_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES folders(id)
  );

  CREATE TABLE IF NOT EXISTS file_metadata (
    file_id TEXT PRIMARY KEY,
    metadata JSON NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (file_id) REFERENCES files(id)
  );
`);

// Create indexes for better query performance
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
  CREATE INDEX IF NOT EXISTS idx_files_folder_id ON files(folder_id);
  CREATE INDEX IF NOT EXISTS idx_folders_path ON folders(path);
  CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
`);

// Prepared statements for common operations
const insertFolder = db.prepare(`
  INSERT INTO folders (id, name, type, parent_id, path)
  VALUES (@id, @name, @type, @parent_id, @path)
`);

const insertFile = db.prepare(`
  INSERT INTO files (id, name, type, path, preview, folder_id)
  VALUES (@id, @name, @type, @path, @preview, @folder_id)
`);

const insertMetadata = db.prepare(`
  INSERT INTO file_metadata (file_id, metadata)
  VALUES (@file_id, @metadata)
`);

const updateMetadata = db.prepare(`
  UPDATE file_metadata
  SET metadata = @metadata,
      updated_at = CURRENT_TIMESTAMP
  WHERE file_id = @file_id
`);

const getFolderById = db.prepare(`
  SELECT * FROM folders WHERE id = ?
`);

const getFileById = db.prepare(`
  SELECT f.*, m.metadata
  FROM files f
  LEFT JOIN file_metadata m ON f.id = m.file_id
  WHERE f.id = ?
`);

const getFilesByFolderId = db.prepare(`
  SELECT f.*, m.metadata
  FROM files f
  LEFT JOIN file_metadata m ON f.id = m.file_id
  WHERE f.folder_id = ?
`);

const getSubfoldersByParentId = db.prepare(`
  SELECT * FROM folders WHERE parent_id = ?
`);

export function saveFolder(folder: { id: string; name: string; type: string; parent_id?: string; path: string }) {
  return insertFolder.run(folder);
}

export function saveFile(file: FileItem, folderId?: string) {
  const fileData = {
    id: file.id,
    name: file.name,
    type: file.type,
    path: file.path,
    preview: file.preview,
    folder_id: folderId
  };

  db.transaction(() => {
    insertFile.run(fileData);
    insertMetadata.run({
      file_id: file.id,
      metadata: JSON.stringify(file.metadata)
    });
  })();
}

export function updateFileMetadata(fileId: string, metadata: any) {
  return updateMetadata.run({
    file_id: fileId,
    metadata: JSON.stringify(metadata)
  });
}

export function getFolder(id: string) {
  return getFolderById.get(id);
}

export function getFile(id: string) {
  const result = getFileById.get(id);
  if (result) {
    return {
      ...result,
      metadata: JSON.parse(result.metadata)
    };
  }
  return null;
}

export function getFilesInFolder(folderId: string) {
  const results = getFilesByFolderId.all(folderId);
  return results.map(result => ({
    ...result,
    metadata: JSON.parse(result.metadata)
  }));
}

export function getSubfolders(parentId: string) {
  return getSubfoldersByParentId.all(parentId);
}

export function deleteFile(id: string) {
  return db.transaction(() => {
    db.prepare('DELETE FROM file_metadata WHERE file_id = ?').run(id);
    db.prepare('DELETE FROM files WHERE id = ?').run(id);
  })();
}

export function deleteFolder(id: string) {
  return db.transaction(() => {
    // First, recursively delete all subfolders and their contents
    const subfolders = getSubfoldersByParentId.all(id);
    for (const subfolder of subfolders) {
      deleteFolder(subfolder.id);
    }

    // Delete all files in this folder
    const files = getFilesByFolderId.all(id);
    for (const file of files) {
      deleteFile(file.id);
    }

    // Finally, delete the folder itself
    db.prepare('DELETE FROM folders WHERE id = ?').run(id);
  })();
}

export default db;