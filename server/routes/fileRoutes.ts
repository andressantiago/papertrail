import type express from "express";
import multer from "multer";
import { deleteFile as deleteFileRecord, getFile, insertFiles, listFiles } from "../dataStore.js";
import type { PapertrailDatabase } from "../database.js";
import {
  FILE_UPLOAD_FIELD,
  FileStorageError,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
  deleteStoredFile,
  saveUploadedFiles,
  validateStoredFileId,
  type StoredFile,
} from "../fileStorage.js";

type ErrorResponse = {
  error: string;
};

const fileUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILE_COUNT,
  },
});

function getUploadedFiles(files: Express.Request["files"]): Express.Multer.File[] {
  return Array.isArray(files) ? files : [];
}

function readFileUpload(
  req: express.Request,
  res: express.Response,
): Promise<Express.Multer.File[]> {
  const uploadFiles = fileUpload.array(FILE_UPLOAD_FIELD, MAX_FILE_COUNT);

  return new Promise((resolve, reject) => {
    uploadFiles(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve(getUploadedFiles(req.files));
    });
  });
}

function getMulterErrorMessage(error: multer.MulterError): string {
  switch (error.code) {
    case "LIMIT_FILE_SIZE":
      return "Files must be 25 MB or smaller.";
    case "LIMIT_FILE_COUNT":
      return "Upload up to 10 files at a time.";
    default:
      return "Invalid file upload.";
  }
}

function getFileApiError(error: unknown): { statusCode: number; message: string } {
  if (error instanceof FileStorageError) {
    return { statusCode: error.statusCode, message: error.message };
  }

  if (error instanceof multer.MulterError) {
    return { statusCode: 400, message: getMulterErrorMessage(error) };
  }

  return { statusCode: 500, message: "File request failed." };
}

async function cleanUpUntrackedFiles(uploadDirectory: string, files: StoredFile[]): Promise<void> {
  await Promise.all(
    files.map((file) => deleteStoredFile(uploadDirectory, file.id, { missingOk: true })),
  );
}

export function registerFileRoutes(
  app: express.Express,
  database: PapertrailDatabase,
  uploadDirectory: string,
): void {
  app.get<never, { files: StoredFile[] } | ErrorResponse>("/api/files", (_req, res) => {
    try {
      return res.json({ files: listFiles(database) });
    } catch (error) {
      console.error("File listing failed:", error);
      return res.status(500).json({ error: "File listing failed." });
    }
  });

  app.post<never, { files: StoredFile[] } | ErrorResponse>("/api/files", async (req, res) => {
    let savedFiles: StoredFile[] = [];

    try {
      const uploadFiles = await readFileUpload(req, res);
      const reservedFileIds = new Set(listFiles(database).map((file) => file.id));
      savedFiles = await saveUploadedFiles(uploadDirectory, uploadFiles, reservedFileIds);
      insertFiles(database, savedFiles);

      return res.json({ files: listFiles(database) });
    } catch (error) {
      await cleanUpUntrackedFiles(uploadDirectory, savedFiles);
      const apiError = getFileApiError(error);

      if (apiError.statusCode >= 500) {
        console.error("File upload failed:", error);
      }

      return res.status(apiError.statusCode).json({ error: apiError.message });
    }
  });

  app.delete<{ fileId: string }, { files: StoredFile[] } | ErrorResponse>(
    "/api/files/:fileId",
    async (req, res) => {
      try {
        const fileId = validateStoredFileId(req.params.fileId);
        const storedFile = getFile(database, fileId);

        if (!storedFile) {
          throw new FileStorageError("File not found.", 404);
        }

        await deleteStoredFile(uploadDirectory, storedFile.id, { missingOk: true });
        deleteFileRecord(database, storedFile.id);

        return res.json({ files: listFiles(database) });
      } catch (error) {
        const apiError = getFileApiError(error);

        if (apiError.statusCode >= 500) {
          console.error("File delete failed:", error);
        }

        return res.status(apiError.statusCode).json({ error: apiError.message });
      }
    },
  );
}
