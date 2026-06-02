import type express from "express";
import {
  appendChatMessages,
  setChatMessageResponseId,
  updateChatMessage,
  type StoredChatMessage,
} from "./dataStore.js";
import type { PapertrailDatabase } from "./database.js";
import { streamConversationResponse } from "./openaiService.js";

export type OpenAIStreamRequestBody = {
  assistantMessageId?: unknown;
  input?: unknown;
  userMessageId?: unknown;
};

export type StreamState = {
  completed: boolean;
  output: string;
  responseId?: string;
};

export type StreamRequest = {
  assistantMessageId: string;
  input: string;
  userMessageId: string;
};

type OpenAIStream = Awaited<ReturnType<typeof streamConversationResponse>>;
type OpenAIStreamEvent = OpenAIStream extends AsyncIterable<infer Event> ? Event : never;

type StreamContext = {
  assistantMessageId: string;
  conversationId: string;
  database: PapertrailDatabase;
  res: express.Response;
  state: StreamState;
};

type StreamExecution = {
  abortController: AbortController;
  conversationId: string;
  database: PapertrailDatabase;
  request: StreamRequest;
  res: express.Response;
  state: StreamState;
};

function writeNdjson(res: express.Response, payload: unknown): void {
  res.write(`${JSON.stringify(payload)}\n`);
}

function configureNdjsonStream(res: express.Response): void {
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
}

function readTrimmedInput(body: OpenAIStreamRequestBody): string {
  return typeof body.input === "string" ? body.input.trim() : "";
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function createChatMessages(request: StreamRequest): StoredChatMessage[] {
  const createdAt = new Date().toISOString();

  return [
    {
      id: request.userMessageId,
      role: "user",
      content: request.input,
      createdAt,
      status: "complete",
    },
    {
      id: request.assistantMessageId,
      role: "assistant",
      content: "",
      createdAt,
      status: "streaming",
    },
  ];
}

function completeOpenAIStream(context: StreamContext, output: string): void {
  context.state.output = output || context.state.output;
  context.state.completed = true;
  updateChatMessage(context.database, context.assistantMessageId, {
    content: context.state.output,
    status: "complete",
    responseId: context.state.responseId,
  });
  writeNdjson(context.res, { type: "done", output: context.state.output });
}

function writeOpenAIStreamEvent(context: StreamContext, event: OpenAIStreamEvent): void {
  switch (event.type) {
    case "response.created":
      context.state.responseId = event.response.id;
      setChatMessageResponseId(
        context.database,
        context.assistantMessageId,
        context.state.responseId,
      );
      writeNdjson(context.res, {
        type: "metadata",
        conversationId: context.conversationId,
        responseId: context.state.responseId,
      });
      return;
    case "response.output_text.delta":
      context.state.output += event.delta;
      writeNdjson(context.res, { type: "delta", delta: event.delta });
      return;
    case "response.completed":
      completeOpenAIStream(context, event.response.output_text);
      return;
    case "response.failed":
      throw new Error(event.response.error?.message || "OpenAI response failed.");
    case "error":
      throw new Error(event.message);
  }
}

export function attachAbortOnClose(
  res: express.Response,
  abortController: AbortController,
  state: StreamState,
): void {
  res.on("close", () => {
    if (!state.completed && !res.writableEnded) {
      abortController.abort();
    }
  });
}

export function readStreamRequest(body: OpenAIStreamRequestBody): StreamRequest | null {
  const input = readTrimmedInput(body);
  const userMessageId = readString(body.userMessageId);
  const assistantMessageId = readString(body.assistantMessageId);

  if (!input || !userMessageId || !assistantMessageId) {
    return null;
  }

  return { assistantMessageId, input, userMessageId };
}

export function getStreamErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function updateAssistantFailure(
  database: PapertrailDatabase,
  assistantMessageId: string,
  state: StreamState,
  error: string,
): void {
  updateChatMessage(database, assistantMessageId, {
    content: state.output,
    status: "error",
    error,
    responseId: state.responseId,
  });
}

export async function sendOpenAIStream({
  abortController,
  conversationId,
  database,
  request,
  res,
  state,
}: StreamExecution): Promise<void> {
  appendChatMessages(database, createChatMessages(request));

  const stream = await streamConversationResponse(conversationId, request.input, {
    signal: abortController.signal,
  });
  const context: StreamContext = {
    assistantMessageId: request.assistantMessageId,
    conversationId,
    database,
    res,
    state,
  };

  configureNdjsonStream(res);

  for await (const event of stream) {
    writeOpenAIStreamEvent(context, event);
  }

  if (!state.completed) {
    completeOpenAIStream(context, state.output);
  }

  res.end();
}
