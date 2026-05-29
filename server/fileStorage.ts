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

export type StoredFile = {
  id: string;
  name: string;
  extension: FileExtension;
  size: number;
  uploadedAt: string;
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
): Promise<string> {
  for (let attempt = 0; attempt < MAX_UNIQUE_FILENAME_ATTEMPTS; attempt++) {
    const candidateName = createCandidateName(fileName, attempt);
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
): Promise<StoredFile | null> {
  const fileName = createSafeFileName(file.originalname);
  const savedName = await writeUniqueFile(uploadDirectory, fileName, file.buffer);

  return readStoredFile(uploadDirectory, savedName);
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
): Promise<StoredFile[]> {
  if (!files.length) {
    throw new FileStorageError("Upload at least one file.");
  }

  await ensureUploadDirectory(uploadDirectory);

  const savedFiles = await Promise.all(
    files.map((file) => saveUploadedFile(uploadDirectory, file)),
  );

  return sortStoredFiles(savedFiles.filter(isStoredFile));
}
