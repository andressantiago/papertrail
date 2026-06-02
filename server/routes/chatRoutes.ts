import type express from "express";
import {
  clearChat,
  getActiveConversationId,
  listChatMessages,
  type StoredChatMessage,
} from "../dataStore.js";
import type { PapertrailDatabase } from "../database.js";

type ChatStateResponse = {
  conversationId: string;
  messages: StoredChatMessage[];
};

function getChatState(database: PapertrailDatabase): ChatStateResponse {
  return {
    conversationId: getActiveConversationId(database),
    messages: listChatMessages(database),
  };
}

export function registerChatRoutes(app: express.Express, database: PapertrailDatabase): void {
  app.get<never, ChatStateResponse>("/api/chat", (_req, res) => {
    res.json(getChatState(database));
  });

  app.delete<never, ChatStateResponse>("/api/chat", (_req, res) => {
    clearChat(database);
    res.json(getChatState(database));
  });
}
