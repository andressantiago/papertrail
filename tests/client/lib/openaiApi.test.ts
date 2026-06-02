import { describe, expect, it, vi } from "vitest";
import { createConversation, fetchStatus, streamAssistantResponse } from "@client/lib/openaiApi";
import type { StreamEvent } from "@client/types";

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

function streamResponse(chunks: string[]): Response {
  const encoder = new TextEncoder();

  return new Response(
    new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(encoder.encode(chunk));
        }
        controller.close();
      },
    }),
  );
}

describe("openaiApi status and conversations", () => {
  it("fetches API status", async () => {
    const status = { configured: true, model: "gpt-5.5" };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(status));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStatus()).resolves.toEqual(status);
    expect(fetchMock).toHaveBeenCalledWith("/api/openai/status");
  });

  it("creates a conversation with a POST request", async () => {
    const response = { conversationId: "conversation-1", model: "gpt-5.5" };
    const signal = new AbortController().signal;
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(response));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createConversation(signal)).resolves.toEqual(response);
    expect(fetchMock).toHaveBeenCalledWith("/api/openai/conversations", {
      method: "POST",
      signal,
    });
  });
});

describe("openaiApi streaming", () => {
  it("parses newline-delimited stream events across chunks", async () => {
    const events: StreamEvent[] = [];
    const signal = new AbortController().signal;
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        streamResponse([
          '{"type":"metadata","conversationId":"conversation-1","responseId":"response-1"}\n{"type":"delta",',
          '"delta":"Hel"}\n\n{"type":"done","output":"Hello"}',
        ]),
      );
    vi.stubGlobal("fetch", fetchMock);

    await streamAssistantResponse({
      assistantMessageId: "assistant-1",
      conversationId: "conversation-1",
      input: "Hello?",
      userMessageId: "user-1",
      signal,
      onEvent: (event) => {
        events.push(event);
      },
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/openai/conversations/conversation-1/stream", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: "Hello?",
        userMessageId: "user-1",
        assistantMessageId: "assistant-1",
      }),
      signal,
    });
    expect(events).toEqual([
      { type: "metadata", conversationId: "conversation-1", responseId: "response-1" },
      { type: "delta", delta: "Hel" },
      { type: "done", output: "Hello" },
    ]);
  });

  it("throws API error messages for failed streams", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(jsonResponse({ error: "OpenAI is not configured." }, { status: 503 })),
    );

    await expect(
      streamAssistantResponse({
        assistantMessageId: "assistant-1",
        conversationId: "conversation-1",
        input: "Hello?",
        onEvent: () => {},
        signal: new AbortController().signal,
        userMessageId: "user-1",
      }),
    ).rejects.toThrow("OpenAI is not configured.");
  });

  it("throws when a successful stream has no readable body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null)));

    await expect(
      streamAssistantResponse({
        assistantMessageId: "assistant-1",
        conversationId: "conversation-1",
        input: "Hello?",
        onEvent: () => {},
        signal: new AbortController().signal,
        userMessageId: "user-1",
      }),
    ).rejects.toThrow("Streaming is not available in this browser.");
  });
});
