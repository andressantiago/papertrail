import fs from "node:fs";
import path from "node:path";
import type { PapertrailDatabase } from "./database.js";
import {
  getFile,
  getFileOpenAIMetadata,
  recordOpenAIFileUpload,
  setFileOpenAIUploadStatus,
} from "./dataStore.js";
import { validateStoredFileId, type StoredFile } from "./fileStorage.js";
import { getOpenAIClient, isOpenAIConfigured } from "./openai.js";

export type OpenAIFileUploader = {
  deleteFile(openaiFileId: string): Promise<void>;
  isConfigured(): boolean;
  uploadFile(filePath: string): Promise<string>;
};

type UploadStoredFileToOpenAIOptions = {
  database: PapertrailDatabase;
  file: StoredFile;
  uploadDirectory: string;
  uploader: OpenAIFileUploader;
};

type ScheduleOpenAIFileUploadsOptions = {
  database: PapertrailDatabase;
  files: StoredFile[];
  uploadDirectory: string;
  uploader: OpenAIFileUploader;
};

function getStoredFilePath(uploadDirectory: string, fileId: string): string {
  return path.join(uploadDirectory, validateStoredFileId(fileId));
}

function getUploadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "OpenAI file upload failed.";
}

export function createOpenAIFileUploader(): OpenAIFileUploader {
  return {
    async deleteFile(openaiFileId: string) {
      await getOpenAIClient().files.delete(openaiFileId);
    },
    isConfigured: isOpenAIConfigured,
    async uploadFile(filePath: string) {
      const openAIFile = await getOpenAIClient().files.create({
        file: fs.createReadStream(filePath),
        purpose: "assistants",
      });

      return openAIFile.id;
    },
  };
}

export async function uploadStoredFileToOpenAI({
  database,
  file,
  uploadDirectory,
  uploader,
}: UploadStoredFileToOpenAIOptions): Promise<void> {
  const metadata = getFileOpenAIMetadata(database, file.id);

  if (!metadata || metadata.openaiUploadStatus !== "pending") {
    return;
  }

  if (!uploader.isConfigured()) {
    setFileOpenAIUploadStatus(database, file.id, "not_configured");
    return;
  }

  const claimed = setFileOpenAIUploadStatus(database, file.id, "uploading");

  if (!claimed) {
    return;
  }

  let openaiFileId: string;

  try {
    openaiFileId = await uploader.uploadFile(getStoredFilePath(uploadDirectory, file.id));
  } catch (error) {
    if (getFile(database, file.id)) {
      setFileOpenAIUploadStatus(database, file.id, "failed", getUploadErrorMessage(error));
    }
    return;
  }

  if (!getFile(database, file.id)) {
    await uploader.deleteFile(openaiFileId);
    return;
  }

  recordOpenAIFileUpload(database, file.id, openaiFileId, new Date().toISOString());
}

export function scheduleOpenAIFileUploads({
  database,
  files,
  uploadDirectory,
  uploader,
}: ScheduleOpenAIFileUploadsOptions): void {
  setImmediate(() => {
    for (const file of files) {
      void uploadStoredFileToOpenAI({ database, file, uploadDirectory, uploader }).catch(
        (error) => {
          console.error(`OpenAI upload failed for ${file.id}:`, error);
        },
      );
    }
  });
}
