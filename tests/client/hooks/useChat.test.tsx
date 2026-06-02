import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useChat } from "@client/hooks/useChat";
import { clearChatState, fetchChatState } from "@client/lib/chatApi";
import { createConversation, fetchStatus, streamAssistantResponse } from "@client/lib/openaiApi";

vi.mock("@client/lib/id", () => ({
  makeId: vi.fn((prefix: string) => `${prefix}-id`),
}));

vi.mock("@client/lib/openaiApi", () => ({
  createConversation: vi.fn(),
  fetchStatus: vi.fn(),
  streamAssistantResponse: vi.fn(),
}));

vi.mock("@client/lib/chatApi", () => ({
  clearChatState: vi.fn(),
  fetchChatState: vi.fn(),
}));

const clearChatStateMock = vi.mocked(clearChatState);
const createConversationMock = vi.mocked(createConversation);
const fetchStatusMock = vi.mocked(fetchStatus);
const fetchChatStateMock = vi.mocked(fetchChatState);
const streamAssistantResponseMock = vi.mocked(streamAssistantResponse);

beforeEach(() => {
  clearChatStateMock.mockResolvedValue({ conversationId: "", messages: [] });
  createConversationMock.mockResolvedValue({
    conversationId: "conversation-1",
    model: "gpt-5.5",
  });
  fetchChatStateMock.mockResolvedValue({ conversationId: "", messages: [] });
  fetchStatusMock.mockResolvedValue({ configured: true, model: "loading" });
  streamAssistantResponseMock.mockImplementation(
    async ({ assistantMessageId, conversationId, input, onEvent, signal, userMessageId }) => {
      expect(userMessageId).toBe("user-id");
      expect(assistantMessageId).toBe("assistant-id");
      expect(signal.aborted).toBe(false);
      onEvent({ type: "metadata", conversationId, responseId: "response-1" });
      onEvent({ type: "delta", delta: `Answer to ${input}` });
      onEvent({ type: "done", output: `Answer to ${input}` });
    },
  );
});

describe("useChat status", () => {
  it("reports disabled state while API status is loading", async () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.disabled).toBe(true);
    expect(result.current.statusLabel).toBe("Checking API");

    await waitFor(() => expect(result.current.statusLoading).toBe(false));

    expect(result.current.disabled).toBe(false);
    expect(result.current.statusLabel).toBe("API ready");
  });
});

describe("useChat submission", () => {
  it("submits a message through a new conversation and stores the result", async () => {
    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.disabled).toBe(false));

    act(() => {
      result.current.setInput("  What changed?  ");
    });

    await act(async () => {
      await result.current.submitMessage();
    });

    expect(createConversationMock).toHaveBeenCalledOnce();
    expect(streamAssistantResponseMock).toHaveBeenCalledWith({
      assistantMessageId: "assistant-id",
      conversationId: "conversation-1",
      input: "What changed?",
      onEvent: expect.any(Function),
      signal: expect.any(AbortSignal),
      userMessageId: "user-id",
    });
    expect(result.current.streaming).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.messages).toMatchObject([
      { id: "user-id", role: "user", content: "What changed?", status: "complete" },
      {
        id: "assistant-id",
        role: "assistant",
        content: "Answer to What changed?",
        status: "complete",
      },
    ]);
    expect(fetchChatStateMock).toHaveBeenCalledOnce();
  });

  it("marks the assistant message as failed when streaming errors", async () => {
    streamAssistantResponseMock.mockRejectedValue(new Error("Stream failed."));

    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.disabled).toBe(false));

    act(() => {
      result.current.setInput("Hello");
    });

    await act(async () => {
      await result.current.submitMessage();
    });

    expect(result.current.error).toBe("Stream failed.");
    expect(result.current.messages.at(-1)).toMatchObject({
      role: "assistant",
      status: "error",
      error: "Stream failed.",
    });
  });
});

describe("useChat storage", () => {
  it("loads persisted chat and clears it when starting a new chat", async () => {
    fetchChatStateMock.mockResolvedValue({
      conversationId: "conversation-1",
      messages: [
        {
          id: "message-1",
          role: "user",
          content: "Old message",
          createdAt: "2026-05-29T13:05:00.000Z",
          status: "complete",
        },
      ],
    });

    const { result } = renderHook(() => useChat());
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => {
      result.current.startNewChat();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(clearChatStateMock).toHaveBeenCalledOnce();
  });
});
