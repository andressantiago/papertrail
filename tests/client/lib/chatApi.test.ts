import { describe, expect, it } from "vitest";
import { clearChatState, fetchChatState } from "@client/lib/chatApi";
import { createJsonResponse, stubFetchResponse } from "@tests/client/lib/apiTestUtils";

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

describe("chatApi", () => {
  it("fetches chat state", async () => {
    const fetchMock = stubFetchResponse(createJsonResponse(chatState));
    const signal = new AbortController().signal;

    await expect(fetchChatState(signal)).resolves.toEqual(chatState);
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", { signal });
  });

  it("clears chat state", async () => {
    const clearedState = { conversationId: "", messages: [] };
    const fetchMock = stubFetchResponse(createJsonResponse(clearedState));

    await expect(clearChatState()).resolves.toEqual(clearedState);
    expect(fetchMock).toHaveBeenCalledWith("/api/chat", { method: "DELETE" });
  });

  it("uses API error messages when a request fails", async () => {
    stubFetchResponse(createJsonResponse({ error: "Chat failed." }, { status: 500 }));

    await expect(fetchChatState()).rejects.toThrow("Chat failed.");
  });
});
