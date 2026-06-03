import fs from "node:fs/promises";
import path from "node:path";
import {
  ACCEPTED_FILE_ERROR_LABEL,
  ACCEPTED_FILE_EXTENSIONS,
  FILE_UPLOAD_FIELD,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  type AcceptedFileExtension,
} from "../shared/fileUpload.js";

export { FILE_UPLOAD_FIELD, MAX_FILE_COUNT, MAX_FILE_SIZE_BYTES };

const MAX_FILENAME_BASE_LENGTH = 80;
const MAX_UNIQUE_FILENAME_ATTEMPTS = 1_000;
const SAFE_FILENAME_PARTS_REGEX = /[a-zA-Z0-9._-]+/g;

export type FileExtension = AcceptedFileExtension;

export type OpenAIUploadStatus = "pending" | "uploading" | "uploaded" | "failed" | "not_configured";

export type StoredFile = {
  id: string;
  name: string;
  extension: FileExtension;
  size: number;
  uploadedAt: string;
  openaiFileId?: string;
  openaiUploadStatus?: OpenAIUploadStatus;
  openaiUploadError?: string;
  openaiUploadedAt?: string;
};

export class FileStorageError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
  }
}

function isAllowedFileExtension(extension: string): extension is FileExtension {
  return ACCEPTED_FILE_EXTENSIONS.includes(extension as FileExtension);
}

function getFileExtension(fileName: string): FileExtension | null {
  const extension = path.extname(fileName).slice(1).toLowerCase();

  return isAllowedFileExtension(extension) ? extension : null;
}

function getUnsupportedFileTypeMessage(): string {
  return `Unsupported file type. Allowed file types: ${ACCEPTED_FILE_ERROR_LABEL}.`;
}

function sanitizeBaseName(baseName: string): string {
  const sanitized = (baseName.trim().match(SAFE_FILENAME_PARTS_REGEX) || [])
    .join("-")
    .replace(/^\.+/, "")
    .slice(0, MAX_FILENAME_BASE_LENGTH);

  return sanitized || "file";
}

function createSafeFileName(originalName: string): string {
  const extension = getFileExtension(originalName);

  if (!extension) {
    throw new FileStorageError(getUnsupportedFileTypeMessage());
  }

  const originalExtension = path.extname(originalName);
  const baseName = path.basename(originalName, originalExtension);

  return `${sanitizeBaseName(baseName)}.${extension}`;
}

function isSafeStoredFileId(fileId: string): boolean {
  if (!fileId.length) {
    return false;
  }

  for (const character of fileId) {
    const characterCode = character.charCodeAt(0);

    if (character === "/" || character === "\\" || characterCode < 32 || characterCode === 127) {
      return false;
    }
  }

  return true;
}

export function validateStoredFileId(fileId: string): string {
  const fileName = fileId.trim();

  if (!isSafeStoredFileId(fileName)) {
    throw new FileStorageError("Invalid upload filename.");
  }

  if (!getFileExtension(fileName)) {
    throw new FileStorageError(getUnsupportedFileTypeMessage());
  }

  return fileName;
}

function assertInsideDirectory(directory: string, filePath: string): void {
  const relativePath = path.relative(directory, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new FileStorageError("Invalid upload filename.");
  }
}

function createCandidateName(fileName: string, attempt: number): string {
  if (attempt === 0) {
    return fileName;
  }

  const extension = path.extname(fileName);
  const baseName = path.basename(fileName, extension);

  return `${baseName}-${attempt + 1}${extension}`;
}

function isFileExistsError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "EEXIST";
}

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

function isStoredFile(file: StoredFile | null): file is StoredFile {
  return Boolean(file);
}

function sortStoredFiles(files: StoredFile[]): StoredFile[] {
  return [...files].sort((first, second) => {
    return Date.parse(second.uploadedAt) - Date.parse(first.uploadedAt);
  });
}

async function ensureUploadDirectory(uploadDirectory: string): Promise<void> {
  await fs.mkdir(uploadDirectory, { recursive: true });
}

async function readStoredFile(
  uploadDirectory: string,
  fileName: string,
): Promise<StoredFile | null> {
  const extension = getFileExtension(fileName);

  if (!extension) {
    return null;
  }

  const filePath = path.join(uploadDirectory, fileName);
  assertInsideDirectory(uploadDirectory, filePath);

  const stats = await fs.stat(filePath);

  if (!stats.isFile()) {
    return null;
  }

  return {
    id: fileName,
    name: fileName,
    extension,
    size: stats.size,
    uploadedAt: stats.birthtime.toISOString(),
  };
}

async function writeUniqueFile(
  uploadDirectory: string,
  fileName: string,
  buffer: Buffer,
  reservedFileIds: Set<string>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_UNIQUE_FILENAME_ATTEMPTS; attempt++) {
    const candidateName = createCandidateName(fileName, attempt);

    if (reservedFileIds.has(candidateName)) {
      continue;
    }

    const filePath = path.join(uploadDirectory, candidateName);
    assertInsideDirectory(uploadDirectory, filePath);

    try {
      await fs.writeFile(filePath, buffer, { flag: "wx" });
      return candidateName;
    } catch (error) {
      if (!isFileExistsError(error)) {
        throw error;
      }
    }
  }

  throw new FileStorageError("Unable to create a unique filename.");
}

async function saveUploadedFile(
  uploadDirectory: string,
  file: Express.Multer.File,
  reservedFileIds: Set<string>,
): Promise<StoredFile | null> {
  const fileName = createSafeFileName(file.originalname);
  const savedName = await writeUniqueFile(uploadDirectory, fileName, file.buffer, reservedFileIds);
  reservedFileIds.add(savedName);

  return readStoredFile(uploadDirectory, savedName);
}

type DeleteStoredFileOptions = {
  missingOk?: boolean;
};

export async function deleteStoredFile(
  uploadDirectory: string,
  fileId: string,
  options: DeleteStoredFileOptions = {},
): Promise<void> {
  const fileName = validateStoredFileId(fileId);

  await ensureUploadDirectory(uploadDirectory);

  const filePath = path.join(uploadDirectory, fileName);
  assertInsideDirectory(uploadDirectory, filePath);

  try {
    const stats = await fs.stat(filePath);

    if (!stats.isFile()) {
      throw new FileStorageError("File not found.", 404);
    }

    await fs.unlink(filePath);
  } catch (error) {
    if (error instanceof FileStorageError) {
      throw error;
    }

    if (isFileNotFoundError(error)) {
      if (options.missingOk) {
        return;
      }

      throw new FileStorageError("File not found.", 404);
    }

    throw error;
  }
}

export async function listStoredFiles(uploadDirectory: string): Promise<StoredFile[]> {
  await ensureUploadDirectory(uploadDirectory);

  const entries = await fs.readdir(uploadDirectory, { withFileTypes: true });
  const fileNames = entries.filter((entry) => entry.isFile()).map((entry) => entry.name);
  const files = await Promise.all(
    fileNames.map((fileName) => readStoredFile(uploadDirectory, fileName)),
  );

  return sortStoredFiles(files.filter(isStoredFile));
}

export async function saveUploadedFiles(
  uploadDirectory: string,
  files: Express.Multer.File[],
  reservedFileIds = new Set<string>(),
): Promise<StoredFile[]> {
  if (!files.length) {
    throw new FileStorageError("Upload at least one file.");
  }

  await ensureUploadDirectory(uploadDirectory);

  const savedFiles: Array<StoredFile | null> = [];

  for (const file of files) {
    savedFiles.push(await saveUploadedFile(uploadDirectory, file, reservedFileIds));
  }

  return sortStoredFiles(savedFiles.filter(isStoredFile));
}
