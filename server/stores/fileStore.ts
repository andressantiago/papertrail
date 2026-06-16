import type { PapertrailDatabase } from "../database.js";
import type { FileExtension, OpenAIUploadStatus, StoredFile } from "../fileStorage.js";

type FileRow = {
  id: string;
  name: string;
  extension: FileExtension;
  size: number;
  uploaded_at: string;
  openai_file_id: string | null;
  openai_upload_status: OpenAIUploadStatus | null;
  openai_upload_error: string | null;
  openai_uploaded_at: string | null;
};

type FileIdParams = {
  id: string;
};

export type FileOpenAIMetadata = {
  openaiFileId?: string;
  openaiUploadStatus?: OpenAIUploadStatus;
  openaiUploadError?: string;
  openaiUploadedAt?: string;
};

type FileOpenAIMetadataRow = {
  openai_file_id: string | null;
  openai_upload_status: OpenAIUploadStatus | null;
  openai_upload_error: string | null;
  openai_uploaded_at: string | null;
};

type InsertFileParams = FileIdParams & {
  extension: FileExtension;
  name: string;
  openaiFileId: string | null;
  openaiUploadError: string | null;
  openaiUploadedAt: string | null;
  openaiUploadStatus: OpenAIUploadStatus | null;
  size: number;
  uploadedAt: string;
};

type OpenAIUploadStatusParams = FileIdParams & {
  error: string | null;
  status: OpenAIUploadStatus;
};

type OpenAIFileUploadParams = FileIdParams & {
  openaiFileId: string;
  uploadedAt: string;
};

function mapOpenAIMetadata(row: FileOpenAIMetadataRow): FileOpenAIMetadata {
  const metadata: FileOpenAIMetadata = {};

  if (row.openai_file_id !== null) {
    metadata.openaiFileId = row.openai_file_id;
  }

  if (row.openai_upload_status !== null) {
    metadata.openaiUploadStatus = row.openai_upload_status;
  }

  if (row.openai_upload_error !== null) {
    metadata.openaiUploadError = row.openai_upload_error;
  }

  if (row.openai_uploaded_at !== null) {
    metadata.openaiUploadedAt = row.openai_uploaded_at;
  }

  return metadata;
}

function mapFile(row: FileRow): StoredFile {
  return {
    id: row.id,
    name: row.name,
    extension: row.extension,
    size: row.size,
    uploadedAt: row.uploaded_at,
    ...mapOpenAIMetadata(row),
  };
}

export function listFiles(database: PapertrailDatabase): StoredFile[] {
  return database
    .prepare<[], FileRow>(
      `SELECT
         id,
         name,
         extension,
         size,
         uploaded_at,
         openai_file_id,
         openai_upload_status,
         openai_upload_error,
         openai_uploaded_at
       FROM files
       ORDER BY datetime(uploaded_at) DESC, name ASC`,
    )
    .all()
    .map(mapFile);
}

export function getFile(database: PapertrailDatabase, fileId: string): StoredFile | null {
  const row = database
    .prepare<FileIdParams, FileRow>(
      `SELECT
         id,
         name,
         extension,
         size,
         uploaded_at,
         openai_file_id,
         openai_upload_status,
         openai_upload_error,
         openai_uploaded_at
       FROM files
       WHERE id = @id`,
    )
    .get({ id: fileId });

  return row ? mapFile(row) : null;
}

export function getFileOpenAIMetadata(
  database: PapertrailDatabase,
  fileId: string,
): FileOpenAIMetadata | null {
  const row = database
    .prepare<FileIdParams, FileOpenAIMetadataRow>(
      `SELECT
         openai_file_id,
         openai_upload_status,
         openai_upload_error,
         openai_uploaded_at
       FROM files
       WHERE id = @id`,
    )
    .get({ id: fileId });

  return row ? mapOpenAIMetadata(row) : null;
}

export function insertFiles(database: PapertrailDatabase, files: StoredFile[]): void {
  const insertFile = database.prepare<InsertFileParams, never>(
    `INSERT INTO files (
       id,
       name,
       extension,
       size,
       uploaded_at,
       openai_file_id,
       openai_upload_status,
       openai_upload_error,
       openai_uploaded_at
     )
     VALUES (
       @id,
       @name,
       @extension,
       @size,
       @uploadedAt,
       @openaiFileId,
       @openaiUploadStatus,
       @openaiUploadError,
       @openaiUploadedAt
     )`,
  );
  const insertMany = database.transaction((storedFiles: StoredFile[]) => {
    for (const file of storedFiles) {
      insertFile.run({
        id: file.id,
        name: file.name,
        extension: file.extension,
        size: file.size,
        uploadedAt: file.uploadedAt,
        openaiFileId: file.openaiFileId ?? null,
        openaiUploadStatus: file.openaiUploadStatus ?? null,
        openaiUploadError: file.openaiUploadError ?? null,
        openaiUploadedAt: file.openaiUploadedAt ?? null,
      });
    }
  });

  insertMany(files);
}

export function setFileOpenAIUploadStatus(
  database: PapertrailDatabase,
  fileId: string,
  status: OpenAIUploadStatus,
  error: string | null = null,
): boolean {
  const result = database
    .prepare<OpenAIUploadStatusParams, never>(
      `UPDATE files
       SET openai_upload_status = @status,
           openai_upload_error = @error
       WHERE id = @id`,
    )
    .run({ id: fileId, status, error });

  return result.changes > 0;
}

export function claimFileOpenAIUpload(database: PapertrailDatabase, fileId: string): boolean {
  const result = database
    .prepare<FileIdParams, never>(
      `UPDATE files
       SET openai_upload_status = 'uploading',
           openai_upload_error = NULL
       WHERE id = @id
         AND openai_upload_status = 'pending'`,
    )
    .run({ id: fileId });

  return result.changes > 0;
}

export function recordOpenAIFileUpload(
  database: PapertrailDatabase,
  fileId: string,
  openaiFileId: string,
  uploadedAt: string,
): boolean {
  const result = database
    .prepare<OpenAIFileUploadParams, never>(
      `UPDATE files
       SET openai_file_id = @openaiFileId,
           openai_upload_status = 'uploaded',
           openai_upload_error = NULL,
           openai_uploaded_at = @uploadedAt
       WHERE id = @id`,
    )
    .run({ id: fileId, openaiFileId, uploadedAt });

  return result.changes > 0;
}

export function deleteFile(database: PapertrailDatabase, fileId: string): void {
  database.prepare<FileIdParams, never>("DELETE FROM files WHERE id = @id").run({ id: fileId });
}
