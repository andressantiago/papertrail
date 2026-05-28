import type { ChatMessage } from "../types";

export const storageKeys = {
  conversationId: "papertrail.conversationId",
  messages: "papertrail.messages",
};

export function loadStoredMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKeys.messages);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as ChatMessage[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((message) => {
      return (
        typeof message.id === "string" &&
        (message.role === "user" || message.role === "assistant") &&
        typeof message.content === "string" &&
        typeof message.createdAt === "string"
      );
    });
  } catch {
    return [];
  }
}
