import fs from "node:fs/promises";
import { ServerResponse } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import { Socket } from "node:net";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "@server/app";
import {
  appendChatMessages,
  getFile,
  insertFiles,
  setActiveConversationId,
} from "@server/dataStore";
import { initializeInMemoryDatabase, type PapertrailDatabase } from "@server/database";
import type { OpenAIFileUploader } from "@server/openaiFileUploadService";

type AppResponse = {
  body: string;
  status: number;
};

type InvokeOptions = {
  body?: Buffer;
  headers?: IncomingHttpHeaders;
};

let app: ReturnType<typeof createApp>;
let database: PapertrailDatabase;
let openAIFileUploader: OpenAIFileUploader;
let uploadDirectory = "";

function createMultipartBody(boundary: string): Buffer {
  return Buffer.from(
    [
      `--${boundary}`,
      'Content-Disposition: form-data; name="files"; filename="notes.txt"',
      "Content-Type: text/plain",
      "",
      "hello",
      `--${boundary}--`,
      "",
    ].join("\r\n"),
  );
}

function createJsonBody(payload: unknown): InvokeOptions {
  const body = Buffer.from(JSON.stringify(payload));

  return {
    body,
    headers: {
      "content-length": String(body.length),
      "content-type": "application/json",
    },
  };
}

function invokeApp(method: string, url: string, options: InvokeOptions = {}): Promise<AppResponse> {
  return new Promise((resolve, reject) => {
    const req = new PassThrough();
    req.method = method;
    req.url = url;
    req.headers = options.headers || {};
    req.socket = new Socket();

    const res = new ServerResponse(req);
    const chunks: Buffer[] = [];
    let resolved = false;

    res.write = ((chunk: Buffer | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      return true;
    }) as typeof res.write;

    res.end = ((chunk?: Buffer | string) => {
      if (chunk) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      resolved = true;
      resolve({ body: Buffer.concat(chunks).toString(), status: res.statusCode });
      return res;
    }) as typeof res.end;

    app.handle(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }

      if (!resolved) {
        resolve({ body: Buffer.concat(chunks).toString(), status: res.statusCode });
      }
    });

    setImmediate(() => {
      if (options.body) {
        req.push(options.body);
      }

      req.push(null);
    });
  });
}

function readJson<T>(response: AppResponse): T {
  return JSON.parse(response.body) as T;
}

function createOpenAIFileUploader(overrides: Partial<OpenAIFileUploader> = {}): OpenAIFileUploader {
  return {
    deleteFile: vi.fn(async () => {}),
    isConfigured: vi.fn(() => false),
    uploadFile: vi.fn(async () => "file-openai-1"),
    ...overrides,
  };
}

function createTestApp(uploader = openAIFileUploader): ReturnType<typeof createApp> {
  return createApp({
    database,
    openAIFileUploader: uploader,
    openAIModel: "gpt-5.5",
    uploadDirectory,
  });
}

function flushBackgroundTasks(): Promise<void> {
  return new Promise((resolve) => {
    setImmediate(resolve);
  });
}

async function settleBackgroundTasks(): Promise<void> {
  await flushBackgroundTasks();
  await Promise.resolve();
  await flushBackgroundTasks();
}

function uploadNotesFile(): Promise<AppResponse> {
  const boundary = "----papertrail-test";
  const body = createMultipartBody(boundary);

  return invokeApp("POST", "/api/files", {
    body,
    headers: {
      "content-length": String(body.length),
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
  });
}

async function insertUploadedOpenAIFile(): Promise<void> {
  await fs.writeFile(path.join(uploadDirectory, "notes.txt"), "hello");
  insertFiles(database, [
    {
      id: "notes.txt",
      name: "notes.txt",
      extension: "txt",
      size: 5,
      uploadedAt: "2026-05-29T13:05:00.000Z",
      openaiFileId: "file-openai-1",
      openaiUploadStatus: "uploaded",
      openaiUploadedAt: "2026-05-30T13:05:00.000Z",
    },
  ]);
}

beforeEach(async () => {
  database = initializeInMemoryDatabase();
  uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "papertrail-app-files-"));
  openAIFileUploader = createOpenAIFileUploader();
  app = createTestApp();
});

afterEach(async () => {
  database.close();
  await fs.rm(uploadDirectory, { force: true, recursive: true });
});

describe("app preferences routes", () => {
  it("reads and updates the theme preference", async () => {
    expect(readJson(await invokeApp("GET", "/api/preferences"))).toEqual({ theme: "light" });

    const updateResponse = await invokeApp(
      "PUT",
      "/api/preferences/theme",
      createJsonBody({ theme: "dark" }),
    );

    expect(updateResponse.status).toBe(200);
    expect(readJson(updateResponse)).toEqual({ theme: "dark" });
    expect(readJson(await invokeApp("GET", "/api/preferences"))).toEqual({ theme: "dark" });
  });

  it("rejects invalid themes", async () => {
    const response = await invokeApp(
      "PUT",
      "/api/preferences/theme",
      createJsonBody({ theme: "system" }),
    );

    expect(response.status).toBe(400);
    expect(readJson(response)).toEqual({ error: "Theme must be light or dark." });
  });
});

describe("app chat routes", () => {
  it("reads and clears persisted chat state", async () => {
    setActiveConversationId(database, "conversation-1");
    appendChatMessages(database, [
      {
        id: "message-1",
        role: "user",
        content: "Hello",
        createdAt: "2026-05-29T13:05:00.000Z",
        status: "complete",
      },
    ]);

    expect(readJson(await invokeApp("GET", "/api/chat"))).toMatchObject({
      conversationId: "conversation-1",
      messages: [{ id: "message-1", content: "Hello" }],
    });

    const clearResponse = await invokeApp("DELETE", "/api/chat");

    expect(clearResponse.status).toBe(200);
    expect(readJson(clearResponse)).toEqual({ conversationId: "", messages: [] });
  });
});

describe("app file upload routes", () => {
  it("stores upload metadata in the database", async () => {
    const uploadResponse = await uploadNotesFile();

    expect(uploadResponse.status).toBe(200);
    expect(readJson(uploadResponse)).toEqual({
      files: [
        expect.objectContaining({
          id: "notes.txt",
          openaiUploadStatus: "pending",
          size: 5,
        }),
      ],
    });
    await expect(fs.readFile(path.join(uploadDirectory, "notes.txt"), "utf8")).resolves.toBe(
      "hello",
    );

    expect(readJson(await invokeApp("GET", "/api/files"))).toMatchObject({
      files: [{ id: "notes.txt" }],
    });
    await settleBackgroundTasks();
  });

  it("returns the local upload response before OpenAI upload completes", async () => {
    let resolveUpload: (openaiFileId: string) => void = () => {};
    const uploadPromise = new Promise<string>((resolve) => {
      resolveUpload = resolve;
    });
    const uploader = createOpenAIFileUploader({
      isConfigured: vi.fn(() => true),
      uploadFile: vi.fn(() => uploadPromise),
    });
    app = createTestApp(uploader);

    const uploadResponse = await uploadNotesFile();

    expect(uploadResponse.status).toBe(200);
    expect(readJson(uploadResponse)).toEqual({
      files: [expect.objectContaining({ id: "notes.txt", openaiUploadStatus: "pending" })],
    });

    await flushBackgroundTasks();

    expect(uploader.uploadFile).toHaveBeenCalledWith(path.join(uploadDirectory, "notes.txt"));
    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiUploadStatus: "uploading",
    });

    resolveUpload("file-openai-1");
    await settleBackgroundTasks();

    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiFileId: "file-openai-1",
      openaiUploadStatus: "uploaded",
      openaiUploadedAt: expect.any(String),
    });
  });

  it("marks new uploads as not configured when OpenAI is unavailable", async () => {
    const uploadResponse = await uploadNotesFile();

    expect(uploadResponse.status).toBe(200);
    await settleBackgroundTasks();

    expect(openAIFileUploader.uploadFile).not.toHaveBeenCalled();
    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiUploadStatus: "not_configured",
    });
  });

  it("records failed OpenAI upload status in the background", async () => {
    const uploader = createOpenAIFileUploader({
      isConfigured: vi.fn(() => true),
      uploadFile: vi.fn(async () => {
        throw new Error("OpenAI upload failed.");
      }),
    });
    app = createTestApp(uploader);

    const uploadResponse = await uploadNotesFile();

    expect(uploadResponse.status).toBe(200);
    await settleBackgroundTasks();

    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiUploadError: "OpenAI upload failed.",
      openaiUploadStatus: "failed",
    });
  });
});

describe("app file delete routes", () => {
  it("deletes metadata when uploaded bytes are already missing", async () => {
    await uploadNotesFile();
    await settleBackgroundTasks();
    await fs.unlink(path.join(uploadDirectory, "notes.txt"));

    const deleteResponse = await invokeApp("DELETE", "/api/files/notes.txt");

    expect(deleteResponse.status).toBe(200);
    expect(readJson(deleteResponse)).toEqual({ files: [] });
  });

  it("deletes the OpenAI file object before removing rows with OpenAI file ids", async () => {
    await insertUploadedOpenAIFile();

    const deleteResponse = await invokeApp("DELETE", "/api/files/notes.txt");

    expect(deleteResponse.status).toBe(200);
    expect(openAIFileUploader.deleteFile).toHaveBeenCalledWith("file-openai-1");
    expect(readJson(deleteResponse)).toEqual({ files: [] });
    await expect(fs.stat(path.join(uploadDirectory, "notes.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("preserves local files and metadata when OpenAI file deletion fails", async () => {
    const uploader = createOpenAIFileUploader({
      deleteFile: vi.fn(async () => {
        throw new Error("OpenAI delete failed.");
      }),
    });
    app = createTestApp(uploader);
    await insertUploadedOpenAIFile();

    const deleteResponse = await invokeApp("DELETE", "/api/files/notes.txt");

    expect(deleteResponse.status).toBe(500);
    expect(uploader.deleteFile).toHaveBeenCalledWith("file-openai-1");
    expect(readJson(deleteResponse)).toEqual({ error: "File request failed." });
    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiFileId: "file-openai-1",
      openaiUploadStatus: "uploaded",
    });
    await expect(fs.readFile(path.join(uploadDirectory, "notes.txt"), "utf8")).resolves.toBe(
      "hello",
    );
  });
});
