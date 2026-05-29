import { describe, expect, it } from "vitest";
import { loadStoredMessages, loadStoredTheme, storageKeys } from "@client/lib/storage";

describe("storage helpers", () => {
  it("loads dark mode only when the saved value is dark", () => {
    expect(loadStoredTheme()).toBe("light");

    localStorage.setItem(storageKeys.theme, "dark");
    expect(loadStoredTheme()).toBe("dark");

    localStorage.setItem(storageKeys.theme, "system");
    expect(loadStoredTheme()).toBe("light");
  });

  it("returns an empty message list for missing, invalid, or non-array payloads", () => {
    expect(loadStoredMessages()).toEqual([]);

    localStorage.setItem(storageKeys.messages, "{not-json");
    expect(loadStoredMessages()).toEqual([]);

    localStorage.setItem(storageKeys.messages, JSON.stringify({ id: "message-1" }));
    expect(loadStoredMessages()).toEqual([]);
  });

  it("keeps only valid stored chat messages", () => {
    const validMessage = {
      id: "message-1",
      role: "assistant",
      content: "Done",
      createdAt: "2026-05-29T13:05:00.000Z",
      status: "complete",
    };

    localStorage.setItem(
      storageKeys.messages,
      JSON.stringify([
        validMessage,
        { ...validMessage, id: 12 },
        { ...validMessage, role: "system" },
        { ...validMessage, content: null },
        { ...validMessage, createdAt: null },
      ]),
    );

    expect(loadStoredMessages()).toEqual([validMessage]);
  });
});
