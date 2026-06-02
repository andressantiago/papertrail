import type { PapertrailDatabase } from "../database.js";
import { clearActiveConversationId } from "./appStateStore.js";

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageStatus = "streaming" | "complete" | "error";

export type StoredChatMessage = {
  id: string;
  role: ChatMessageRole;
  content: string;
  createdAt: string;
  status: ChatMessageStatus;
  error?: string;
  responseId?: string;
};

type ChatMessageRow = {
  id: string;
  role: ChatMessageRole;
  content: string;
  status: ChatMessageStatus;
  error: string | null;
  response_id: string | null;
  created_at: string;
};

type MaxPositionRow = {
  position: number | null;
};

type InsertChatMessageParams = {
  content: string;
  createdAt: string;
  error: string | null;
  id: string;
  position: number;
  responseId: string | null;
  role: ChatMessageRole;
  status: ChatMessageStatus;
};

type UpdateChatMessageParams = {
  content: string;
  error: string | null;
  id: string;
  responseId: string | null;
  status: ChatMessageStatus;
};

type ChatMessageResponseParams = {
  id: string;
  responseId: string;
};

function mapMessage(row: ChatMessageRow): StoredChatMessage {
  return {
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
    status: row.status,
    ...(row.error ? { error: row.error } : {}),
    ...(row.response_id ? { responseId: row.response_id } : {}),
  };
}

function getNextMessagePosition(database: PapertrailDatabase): number {
  const row = database
    .prepare<[], MaxPositionRow>("SELECT MAX(position) AS position FROM chat_messages")
    .get();

  return (row?.position ?? -1) + 1;
}

export function listChatMessages(database: PapertrailDatabase): StoredChatMessage[] {
  return database
    .prepare<[], ChatMessageRow>(
      `SELECT id, role, content, status, error, response_id, created_at
       FROM chat_messages
       ORDER BY position ASC, datetime(created_at) ASC`,
    )
    .all()
    .map(mapMessage);
}

export function appendChatMessages(
  database: PapertrailDatabase,
  messages: StoredChatMessage[],
): void {
  const insertMessage = database.prepare<InsertChatMessageParams, never>(
    `INSERT INTO chat_messages
       (id, role, content, status, error, response_id, created_at, position)
     VALUES (@id, @role, @content, @status, @error, @responseId, @createdAt, @position)`,
  );
  const insertMany = database.transaction((chatMessages: StoredChatMessage[]) => {
    let position = getNextMessagePosition(database);

    for (const message of chatMessages) {
      insertMessage.run({
        id: message.id,
        role: message.role,
        content: message.content,
        status: message.status,
        error: message.error || null,
        responseId: message.responseId || null,
        createdAt: message.createdAt,
        position,
      });
      position += 1;
    }
  });

  insertMany(messages);
}

export function updateChatMessage(
  database: PapertrailDatabase,
  messageId: string,
  updates: Pick<StoredChatMessage, "content" | "status"> &
    Partial<Pick<StoredChatMessage, "error" | "responseId">>,
): void {
  database
    .prepare<UpdateChatMessageParams, never>(
      `UPDATE chat_messages
       SET content = @content,
           status = @status,
           error = @error,
           response_id = @responseId
       WHERE id = @id`,
    )
    .run({
      id: messageId,
      content: updates.content,
      status: updates.status,
      error: updates.error || null,
      responseId: updates.responseId || null,
    });
}

export function setChatMessageResponseId(
  database: PapertrailDatabase,
  messageId: string,
  responseId: string,
): void {
  database
    .prepare<ChatMessageResponseParams, never>(
      `UPDATE chat_messages
       SET response_id = @responseId
       WHERE id = @id`,
    )
    .run({ id: messageId, responseId });
}

export function clearChat(database: PapertrailDatabase): void {
  const clear = database.transaction(() => {
    database.prepare("DELETE FROM chat_messages").run();
    clearActiveConversationId(database);
  });

  clear();
}
