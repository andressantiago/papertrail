import { describe, expect, it, vi } from "vitest";
import { clearChatState, fetchChatState } from "@client/lib/chatApi";

const chatState = {
  conversationId: "conversation-1",
  messages: [
    {
      id: "message-1",
      role: "user" as const,
      content: "Hello",
      createdAt: "2026-05-29T13:05:00.000Z",
      status: "complete" as const,
    },
  ],
};

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("chatApi", () => {
  it("fetches chat state", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(chatState));
    const signal = new AbortController().signal;
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchChatState(signal)).resolves.toEqual(chatState);
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", { signal });
  });

  it("clears chat state", async () => {
    const clearedState = { conversationId: "", messages: [] };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(clearedState));
    vi.stubGlobal("fetch", fetchMock);

    await expect(clearChatState()).resolves.toEqual(clearedState);
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", { method: "DELETE" });
  });

  it("uses API error messages when a request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Chat failed." }, { status: 500 })),
    );

    await expect(fetchChatState()).rejects.toThrow("Chat failed.");
  });
});
