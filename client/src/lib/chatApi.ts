import { readJson } from "@client/lib/apiResponse";
import type { ChatMessage } from "@client/types";

type ChatStateResponse = {
  conversationId: string;
  messages: ChatMessage[];
};

const CHAT_ENDPOINT = "/api/chat";

export async function fetchChatState(signal?: AbortSignal): Promise<ChatStateResponse> {
  const response = await fetch(CHAT_ENDPOINT, { signal });

  return readJson<ChatStateResponse>(response, "Unable to load chat.");
}

export async function clearChatState(): Promise<ChatStateResponse> {
  const response = await fetch(CHAT_ENDPOINT, { method: "DELETE" });

  return readJson<ChatStateResponse>(response, "Unable to clear chat.");
}
