import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendChatMessages,
  clearChat,
  deleteFile,
  getActiveConversationId,
  getTheme,
  insertFiles,
  listChatMessages,
  listFiles,
  setActiveConversationId,
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
