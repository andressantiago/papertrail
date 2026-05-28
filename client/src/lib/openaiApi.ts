import type { ApiStatus, StreamEvent } from "../types";

type ConversationResponse = {
  conversationId: string;
  model: string;
};

const OPENAI_ENDPOINTS = {
  status: "/api/openai/status",
  conversations: "/api/openai/conversations",
  streamConversation: (conversationId: string) =>
    `/api/openai/conversations/${encodeURIComponent(conversationId)}/stream`,
};

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

async function readJson<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await readError(response, fallbackError));
  }

  return response.json() as Promise<T>;
}

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
  return lines.map((line) => line.trim()).filter(Boolean).map(parseStreamEvent);
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

export async function streamAssistantResponse(
  conversationId: string,
  input: string,
  signal: AbortSignal,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const response = await fetch(OPENAI_ENDPOINTS.streamConversation(conversationId), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ input }),
    signal,
  });

  if (!response.ok) {
    throw new Error(await readError(response, "OpenAI request failed."));
  }

  for await (const event of readStreamEvents(getStreamingBody(response))) {
    onEvent(event);
  }
}
