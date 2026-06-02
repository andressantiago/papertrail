import { readJson, readResponseError } from "@client/lib/apiResponse";
import type { ApiStatus, StreamEvent } from "@client/types";

type ConversationResponse = {
  conversationId: string;
  model: string;
};

type StreamAssistantResponseOptions = {
  assistantMessageId: string;
  conversationId: string;
  input: string;
  onEvent: (event: StreamEvent) => void;
  signal: AbortSignal;
  userMessageId: string;
};

const OPENAI_ENDPOINTS = {
  status: "/api/openai/status",
  conversations: "/api/openai/conversations",
  streamConversation: (conversationId: string) =>
    `/api/openai/conversations/${encodeURIComponent(conversationId)}/stream`,
};

function getStreamingBody(response: Response): ReadableStream<Uint8Array> {
  if (!response.body) {
    throw new Error("Streaming is not available in this browser.");
  }

  return response.body;
}

function parseStreamEvent(line: string): StreamEvent {
  return JSON.parse(line) as StreamEvent;
}

function parseStreamLines(lines: string[]): StreamEvent[] {
  return lines
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseStreamEvent);
}

async function* readStreamEvents(body: ReadableStream<Uint8Array>): AsyncGenerator<StreamEvent> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const event of parseStreamLines(lines)) {
        yield event;
      }
    }

    for (const event of parseStreamLines([buffer + decoder.decode()])) {
      yield event;
    }
  } finally {
    reader.releaseLock();
  }
}

export async function fetchStatus(): Promise<ApiStatus> {
  const response = await fetch(OPENAI_ENDPOINTS.status);

  return readJson<ApiStatus>(response, "Unable to read API status.");
}

export async function createConversation(signal?: AbortSignal): Promise<ConversationResponse> {
  const response = await fetch(OPENAI_ENDPOINTS.conversations, {
    method: "POST",
    signal,
  });

  return readJson<ConversationResponse>(response, "Unable to create a conversation.");
}

export async function streamAssistantResponse({
  assistantMessageId,
  conversationId,
  input,
  onEvent,
  signal,
  userMessageId,
}: StreamAssistantResponseOptions): Promise<void> {
  const response = await fetch(OPENAI_ENDPOINTS.streamConversation(conversationId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input, userMessageId, assistantMessageId }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readResponseError(response, "OpenAI request failed."));
  }

  for await (const event of readStreamEvents(getStreamingBody(response))) {
    onEvent(event);
  }
}
