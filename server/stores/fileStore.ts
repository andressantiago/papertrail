import type { PapertrailDatabase } from "../database.js";
import type { FileExtension, StoredFile } from "../fileStorage.js";

type FileRow = {
  id: string;
  name: string;
  extension: FileExtension;
  size: number;
  uploaded_at: string;
};

type FileIdParams = {
  id: string;
};

type InsertFileParams = FileIdParams & {
  extension: FileExtension;
  name: string;
  size: number;
  uploadedAt: string;
};

function mapFile(row: FileRow): StoredFile {
  return {
    id: row.id,
    name: row.name,
    extension: row.extension,
    size: row.size,
    uploadedAt: row.uploaded_at,
  };
}

export function listFiles(database: PapertrailDatabase): StoredFile[] {
  return database
    .prepare<[], FileRow>(
      `SELECT id, name, extension, size, uploaded_at
       FROM files
       ORDER BY datetime(uploaded_at) DESC, name ASC`,
    )
    .all()
    .map(mapFile);
}

export function getFile(database: PapertrailDatabase, fileId: string): StoredFile | null {
  const row = database
    .prepare<FileIdParams, FileRow>(
      `SELECT id, name, extension, size, uploaded_at
       FROM files
       WHERE id = @id`,
    )
    .get({ id: fileId });

  return row ? mapFile(row) : null;
}

export function insertFiles(database: PapertrailDatabase, files: StoredFile[]): void {
  const insertFile = database.prepare<InsertFileParams, never>(
    `INSERT INTO files (id, name, extension, size, uploaded_at)
     VALUES (@id, @name, @extension, @size, @uploadedAt)`,
  );
  const insertMany = database.transaction((storedFiles: StoredFile[]) => {
    for (const file of storedFiles) {
      insertFile.run({
        id: file.id,
        name: file.name,
        extension: file.extension,
        size: file.size,
        uploadedAt: file.uploadedAt,
      });
    }
  });

  insertMany(files);
}

export function deleteFile(database: PapertrailDatabase, fileId: string): void {
  database.prepare<FileIdParams, never>("DELETE FROM files WHERE id = @id").run({ id: fileId });
}
