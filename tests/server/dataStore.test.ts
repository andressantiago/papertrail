import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendChatMessages,
  clearChat,
  deleteFile,
  getActiveConversationId,
  getFile,
  getFileOpenAIMetadata,
  getTheme,
  insertFiles,
  listChatMessages,
  listFiles,
  recordOpenAIFileUpload,
  setActiveConversationId,
  setFileOpenAIUploadStatus,
  setChatMessageResponseId,
  setTheme,
  updateChatMessage,
} from "@server/dataStore";
import { initializeInMemoryDatabase, type PapertrailDatabase } from "@server/database";

let database: PapertrailDatabase;

beforeEach(() => {
  database = initializeInMemoryDatabase();
});

afterEach(() => {
  database.close();
});

describe("dataStore preferences", () => {
  it("stores app state with defaults", () => {
    expect(getTheme(database)).toBe("light");
    expect(getActiveConversationId(database)).toBe("");

    setTheme(database, "dark");
    setActiveConversationId(database, "conversation-1");

    expect(getTheme(database)).toBe("dark");
    expect(getActiveConversationId(database)).toBe("conversation-1");
  });
});

describe("dataStore files", () => {
  it("stores and lists file metadata newest first", () => {
    insertFiles(database, [
      {
        id: "older.txt",
        name: "older.txt",
        extension: "txt",
        size: 10,
        uploadedAt: "2026-05-29T13:05:00.000Z",
      },
      {
        id: "newer.pdf",
        name: "newer.pdf",
        extension: "pdf",
        size: 20,
        uploadedAt: "2026-05-30T13:05:00.000Z",
      },
    ]);

    expect(listFiles(database).map((file) => file.id)).toEqual(["newer.pdf", "older.txt"]);

    deleteFile(database, "newer.pdf");

    expect(listFiles(database).map((file) => file.id)).toEqual(["older.txt"]);
  });
});

describe("dataStore file OpenAI metadata", () => {
  it("leaves OpenAI metadata unset for existing local-only rows", () => {
    insertFiles(database, [
      {
        id: "local-only.txt",
        name: "local-only.txt",
        extension: "txt",
        size: 10,
        uploadedAt: "2026-05-29T13:05:00.000Z",
      },
    ]);

    const file = getFile(database, "local-only.txt");

    expect(file).toEqual(
      expect.objectContaining({
        id: "local-only.txt",
        uploadedAt: "2026-05-29T13:05:00.000Z",
      }),
    );
    expect(file).not.toHaveProperty("openaiFileId");
    expect(file).not.toHaveProperty("openaiUploadStatus");
    expect(getFileOpenAIMetadata(database, "local-only.txt")).toEqual({});
  });

  it("stores OpenAI upload status and records uploaded file ids", () => {
    insertFiles(database, [
      {
        id: "notes.txt",
        name: "notes.txt",
        extension: "txt",
        size: 10,
        uploadedAt: "2026-05-29T13:05:00.000Z",
        openaiUploadStatus: "pending",
      },
    ]);

    expect(getFile(database, "notes.txt")).toMatchObject({
      id: "notes.txt",
      openaiUploadStatus: "pending",
    });

    expect(setFileOpenAIUploadStatus(database, "notes.txt", "uploading")).toBe(true);
    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiUploadStatus: "uploading",
    });

    expect(
      recordOpenAIFileUpload(database, "notes.txt", "file-openai-1", "2026-05-30T13:05:00.000Z"),
    ).toBe(true);
    expect(getFile(database, "notes.txt")).toMatchObject({
      openaiFileId: "file-openai-1",
      openaiUploadStatus: "uploaded",
      openaiUploadedAt: "2026-05-30T13:05:00.000Z",
    });
    expect(getFileOpenAIMetadata(database, "notes.txt")).toEqual({
      openaiFileId: "file-openai-1",
      openaiUploadStatus: "uploaded",
      openaiUploadedAt: "2026-05-30T13:05:00.000Z",
    });
  });
});

describe("dataStore file OpenAI upload failures", () => {
  it("records OpenAI upload failures without touching local metadata", () => {
    insertFiles(database, [
      {
        id: "failed.txt",
        name: "failed.txt",
        extension: "txt",
        size: 10,
        uploadedAt: "2026-05-29T13:05:00.000Z",
        openaiUploadStatus: "pending",
      },
    ]);

    expect(setFileOpenAIUploadStatus(database, "failed.txt", "failed", "Upload failed.")).toBe(
      true,
    );
    expect(getFile(database, "failed.txt")).toMatchObject({
      id: "failed.txt",
      openaiUploadError: "Upload failed.",
      openaiUploadStatus: "failed",
      uploadedAt: "2026-05-29T13:05:00.000Z",
    });
  });
});

describe("dataStore chat", () => {
  it("stores, updates, and clears chat state", () => {
    setActiveConversationId(database, "conversation-1");
    appendChatMessages(database, [
      {
        id: "user-1",
        role: "user",
        content: "Question",
        createdAt: "2026-05-29T13:05:00.000Z",
        status: "complete",
      },
      {
        id: "assistant-1",
        role: "assistant",
        content: "",
        createdAt: "2026-05-29T13:05:01.000Z",
        status: "streaming",
      },
    ]);

    setChatMessageResponseId(database, "assistant-1", "response-1");
    updateChatMessage(database, "assistant-1", {
      content: "Answer",
      status: "complete",
      responseId: "response-1",
    });

    expect(listChatMessages(database)).toEqual([
      expect.objectContaining({ id: "user-1", content: "Question" }),
      expect.objectContaining({
        id: "assistant-1",
        content: "Answer",
        responseId: "response-1",
        status: "complete",
      }),
    ]);

    clearChat(database);

    expect(getActiveConversationId(database)).toBe("");
    expect(listChatMessages(database)).toEqual([]);
  });
});
