import { useEffect, useRef, useState } from "react";
import { makeId } from "@client/lib/id";
import { createConversation, fetchStatus, streamAssistantResponse } from "@client/lib/openaiApi";
import { loadStoredMessages, storageKeys } from "@client/lib/storage";
import type { ApiStatus, ChatMessage, StreamEvent } from "@client/types";

const INITIAL_STATUS: ApiStatus = { configured: false, model: "loading" };

type SetConversationId = (conversationId: string) => void;
type SetError = (error: string | null) => void;
type UpdateMessages = (update: (messages: ChatMessage[]) => ChatMessage[]) => void;

function createMessage(
  role: ChatMessage["role"],
  content: string,
  status: ChatMessage["status"],
): ChatMessage {
  return {
    id: makeId(role),
    role,
    content,
    createdAt: new Date().toISOString(),
    status,
  };
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function getStatusLabel(statusLoading: boolean, configured: boolean): string {
  if (statusLoading) {
    return "Checking API";
  }

  return configured ? "API ready" : "API missing";
}

function persistConversationId(conversationId: string): void {
  if (conversationId) {
    localStorage.setItem(storageKeys.conversationId, conversationId);
    return;
  }

  localStorage.removeItem(storageKeys.conversationId);
}

function updateAssistantMessage(
  messages: ChatMessage[],
  assistantId: string,
  update: (message: ChatMessage) => ChatMessage,
): ChatMessage[] {
  return messages.map((message) => (message.id === assistantId ? update(message) : message));
}

function appendAssistantDelta(
  messages: ChatMessage[],
  assistantId: string,
  delta: string,
): ChatMessage[] {
  return updateAssistantMessage(messages, assistantId, (message) => ({
    ...message,
    content: message.content + delta,
  }));
}

function completeAssistantMessage(
  messages: ChatMessage[],
  assistantId: string,
  output: string,
): ChatMessage[] {
  return updateAssistantMessage(messages, assistantId, (message) => ({
    ...message,
    content: output || message.content,
    status: "complete",
  }));
}

function failAssistantMessage(
  messages: ChatMessage[],
  assistantId: string,
  error: string,
): ChatMessage[] {
  return updateAssistantMessage(messages, assistantId, (message) => ({
    ...message,
    status: "error",
    error,
  }));
}

async function resolveConversationId(
  currentConversationId: string,
  signal: AbortSignal,
  onCreated: (conversationId: string, model: string) => void,
): Promise<string> {
  if (currentConversationId) {
    return currentConversationId;
  }

  const conversation = await createConversation(signal);
  onCreated(conversation.conversationId, conversation.model);
  return conversation.conversationId;
}

function handleStreamEvent(
  event: StreamEvent,
  assistantId: string,
  updateMessages: UpdateMessages,
  setConversationId: SetConversationId,
): void {
  switch (event.type) {
    case "metadata":
      setConversationId(event.conversationId);
      return;
    case "delta":
      updateMessages((current) => appendAssistantDelta(current, assistantId, event.delta));
      return;
    case "done":
      updateMessages((current) => completeAssistantMessage(current, assistantId, event.output));
      return;
    case "error":
      throw new Error(event.error);
  }
}

function useApiStatus(setError: SetError) {
  const [status, setStatus] = useState<ApiStatus>(INITIAL_STATUS);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetchStatus()
      .then((nextStatus) => {
        if (active) {
          setStatus(nextStatus);
        }
      })
      .catch((statusError: unknown) => {
        if (active) {
          setError(getErrorMessage(statusError, "Unable to read API status."));
        }
      })
      .finally(() => {
        if (active) {
          setStatusLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [setError]);

  return { status, setStatus, statusLoading };
}

function useChatStorage(messages: ChatMessage[], conversationId: string): void {
  useEffect(() => {
    if (!messages.length) {
      localStorage.removeItem(storageKeys.messages);
      return;
    }

    localStorage.setItem(storageKeys.messages, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    persistConversationId(conversationId);
  }, [conversationId]);
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(loadStoredMessages);
  const [conversationId, setConversationId] = useState(
    () => localStorage.getItem(storageKeys.conversationId) || "",
  );
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { status, setStatus, statusLoading } = useApiStatus(setError);
  const abortRef = useRef<AbortController | null>(null);

  useChatStorage(messages, conversationId);

  async function submitMessage(): Promise<void> {
    const text = input.trim();

    if (!text || streaming || !status.configured) {
      return;
    }

    const abortController = new AbortController();
    abortRef.current = abortController;
    setStreaming(true);
    setError(null);
    setInput("");

    const userMessage = createMessage("user", text, "complete");
    const assistantMessage = createMessage("assistant", "", "streaming");
    const assistantId = assistantMessage.id;

    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const activeConversationId = await resolveConversationId(
        conversationId,
        abortController.signal,
        (nextConversationId, model) => {
          setConversationId(nextConversationId);
          setStatus((current) => ({ ...current, model: model || current.model }));
        },
      );

      await streamAssistantResponse(activeConversationId, text, abortController.signal, (event) => {
        handleStreamEvent(event, assistantId, setMessages, setConversationId);
      });
    } catch (streamError) {
      if (abortController.signal.aborted) {
        return;
      }

      const message = getErrorMessage(streamError, "OpenAI request failed.");
      setError(message);
      setMessages((current) => failAssistantMessage(current, assistantId, message));
    } finally {
      if (abortRef.current === abortController) {
        abortRef.current = null;
      }
      setStreaming(false);
    }
  }

  function startNewChat(): void {
    abortRef.current?.abort();
    abortRef.current = null;
    setMessages([]);
    setConversationId("");
    setInput("");
    setError(null);
    setStreaming(false);
    localStorage.removeItem(storageKeys.messages);
    localStorage.removeItem(storageKeys.conversationId);
  }

  return {
    disabled: statusLoading || !status.configured,
    error,
    input,
    messages,
    setInput,
    startNewChat,
    status,
    statusLoading,
    streaming,
    submitMessage,
    statusLabel: getStatusLabel(statusLoading, status.configured),
  };
}
