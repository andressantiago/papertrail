import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteFile, getFile, insertFiles } from "@server/dataStore";
import { initializeInMemoryDatabase, type PapertrailDatabase } from "@server/database";
import { uploadStoredFileToOpenAI, type OpenAIFileUploader } from "@server/openaiFileUploadService";

let database: PapertrailDatabase;
let uploadDirectory = "";

function createUploader(overrides: Partial<OpenAIFileUploader> = {}): OpenAIFileUploader {
  return {
    deleteFile: vi.fn(async () => {}),
    isConfigured: vi.fn(() => true),
    uploadFile: vi.fn(async () => "file-openai-1"),
    ...overrides,
  };
}

async function writeLocalFile(fileId = "notes.txt", content = "hello"): Promise<void> {
  await fs.writeFile(path.join(uploadDirectory, fileId), content);
}

function insertPendingFile(fileId = "notes.txt"): void {
  insertFiles(database, [
    {
      id: fileId,
      name: fileId,
      extension: "txt",
      size: 5,
      uploadedAt: "2026-05-29T13:05:00.000Z",
      openaiUploadStatus: "pending",
    },
  ]);
}

beforeEach(async () => {
  database = initializeInMemoryDatabase();
  uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "papertrail-openai-files-"));
});

afterEach(async () => {
  database.close();
  await fs.rm(uploadDirectory, { force: true, recursive: true });
});

describe("openAI file upload service states", () => {
  it("uploads pending files and records the OpenAI file id", async () => {
    await writeLocalFile();
    insertPendingFile();
    const uploader = createUploader({
      uploadFile: vi.fn(async (filePath: string) => {
        expect(filePath).toBe(path.join(uploadDirectory, "notes.txt"));
        expect(getFile(database, "notes.txt")).toMatchObject({
          openaiUploadStatus: "uploading",
        });
        return "file-openai-1";
      }),
    });
    const file = getFile(database, "notes.txt");

    expect(file).not.toBeNull();
    await uploadStoredFileToOpenAI({ database, file: file!, uploadDirectory, uploader });

    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiFileId: "file-openai-1",
      openaiUploadStatus: "uploaded",
      openaiUploadedAt: expect.any(String),
    });
    expect(uploader.deleteFile).not.toHaveBeenCalled();
  });

  it("marks pending files as not configured without uploading", async () => {
    await writeLocalFile();
    insertPendingFile();
    const uploader = createUploader({
      isConfigured: vi.fn(() => false),
    });
    const file = getFile(database, "notes.txt");

    expect(file).not.toBeNull();
    await uploadStoredFileToOpenAI({ database, file: file!, uploadDirectory, uploader });

    expect(uploader.uploadFile).not.toHaveBeenCalled();
    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiUploadStatus: "not_configured",
    });
  });

  it("ignores local-only files without pending OpenAI upload metadata", async () => {
    await writeLocalFile();
    insertFiles(database, [
      {
        id: "notes.txt",
        name: "notes.txt",
        extension: "txt",
        size: 5,
        uploadedAt: "2026-05-29T13:05:00.000Z",
      },
    ]);
    const uploader = createUploader();
    const file = getFile(database, "notes.txt");

    expect(file).not.toBeNull();
    await uploadStoredFileToOpenAI({ database, file: file!, uploadDirectory, uploader });

    expect(uploader.uploadFile).not.toHaveBeenCalled();
    expect(getFile(database, "notes.txt")).not.toHaveProperty("openaiUploadStatus");
  });
});

describe("openAI file upload service failures", () => {
  it("records failed upload status when OpenAI upload rejects", async () => {
    await writeLocalFile();
    insertPendingFile();
    const uploader = createUploader({
      uploadFile: vi.fn(async () => {
        throw new Error("OpenAI upload failed.");
      }),
    });
    const file = getFile(database, "notes.txt");

    expect(file).not.toBeNull();
    await uploadStoredFileToOpenAI({ database, file: file!, uploadDirectory, uploader });

    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiUploadError: "OpenAI upload failed.",
      openaiUploadStatus: "failed",
    });
  });

  it("deletes the OpenAI file when the local row disappears during upload", async () => {
    await writeLocalFile();
    insertPendingFile();
    const uploader = createUploader({
      uploadFile: vi.fn(async () => {
        deleteFile(database, "notes.txt");
        return "file-openai-1";
      }),
    });
    const file = getFile(database, "notes.txt");

    expect(file).not.toBeNull();
    await uploadStoredFileToOpenAI({ database, file: file!, uploadDirectory, uploader });

    expect(getFile(database, "notes.txt")).toBeNull();
    expect(uploader.deleteFile).toHaveBeenCalledWith("file-openai-1");
  });
});
