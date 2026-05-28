import type { ChatMessage, ThemeMode } from "../types";

export const storageKeys = {
  conversationId: "papertrail.conversationId",
  messages: "papertrail.messages",
  theme: "papertrail.theme",
};

export function loadStoredTheme(): ThemeMode {
  return localStorage.getItem(storageKeys.theme) === "dark" ? "dark" : "light";
}

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
