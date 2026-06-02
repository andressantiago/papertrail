import fs from "node:fs/promises";
import { ServerResponse } from "node:http";
import type { IncomingHttpHeaders } from "node:http";
import { Socket } from "node:net";
import os from "node:os";
import path from "node:path";
import { PassThrough } from "node:stream";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "@server/app";
import { appendChatMessages, setActiveConversationId } from "@server/dataStore";
import { initializeInMemoryDatabase, type PapertrailDatabase } from "@server/database";

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

beforeEach(async () => {
  database = initializeInMemoryDatabase();
  uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "papertrail-app-files-"));
  app = createApp({
    database,
    openAIModel: "gpt-5.5",
    uploadDirectory,
  });
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

describe("app file routes", () => {
  it("stores upload metadata in the database", async () => {
    const boundary = "----papertrail-test";
    const body = createMultipartBody(boundary);
    const uploadResponse = await invokeApp("POST", "/api/files", {
      body,
      headers: {
        "content-length": String(body.length),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
    });

    expect(uploadResponse.status).toBe(200);
    expect(readJson(uploadResponse)).toEqual({
      files: [expect.objectContaining({ id: "notes.txt", size: 5 })],
    });
    await expect(fs.readFile(path.join(uploadDirectory, "notes.txt"), "utf8")).resolves.toBe(
      "hello",
    );

    expect(readJson(await invokeApp("GET", "/api/files"))).toMatchObject({
      files: [{ id: "notes.txt" }],
    });
  });

  it("deletes metadata when uploaded bytes are already missing", async () => {
    const boundary = "----papertrail-test";
    const body = createMultipartBody(boundary);

    await invokeApp("POST", "/api/files", {
      body,
      headers: {
        "content-length": String(body.length),
        "content-type": `multipart/form-data; boundary=${boundary}`,
      },
    });
    await fs.unlink(path.join(uploadDirectory, "notes.txt"));

    const deleteResponse = await invokeApp("DELETE", "/api/files/notes.txt");

    expect(deleteResponse.status).toBe(200);
    expect(readJson(deleteResponse)).toEqual({ files: [] });
  });
});
