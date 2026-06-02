import type { PapertrailDatabase } from "../database.js";

const ACTIVE_CONVERSATION_ID_KEY = "activeConversationId";
const THEME_KEY = "theme";

export type ThemeMode = "light" | "dark";

type AppStateRow = {
  value: string;
};

type AppStateParams = {
  key: string;
};

type WriteAppStateParams = AppStateParams & {
  updatedAt: string;
  value: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function readAppState(database: PapertrailDatabase, key: string): string {
  const row = database
    .prepare<AppStateParams, AppStateRow>("SELECT value FROM app_state WHERE key = @key")
    .get({ key });

  return row?.value ?? "";
}

function writeAppState(database: PapertrailDatabase, key: string, value: string): void {
  database
    .prepare<WriteAppStateParams, never>(
      `INSERT INTO app_state (key, value, updated_at)
       VALUES (@key, @value, @updatedAt)
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = excluded.updated_at`,
    )
    .run({ key, updatedAt: nowIso(), value });
}

function deleteAppState(database: PapertrailDatabase, key: string): void {
  database.prepare<AppStateParams, never>("DELETE FROM app_state WHERE key = @key").run({ key });
}

export function getTheme(database: PapertrailDatabase): ThemeMode {
  return readAppState(database, THEME_KEY) === "dark" ? "dark" : "light";
}

export function setTheme(database: PapertrailDatabase, theme: ThemeMode): void {
  writeAppState(database, THEME_KEY, theme);
}

export function getActiveConversationId(database: PapertrailDatabase): string {
  return readAppState(database, ACTIVE_CONVERSATION_ID_KEY);
}

export function setActiveConversationId(
  database: PapertrailDatabase,
  conversationId: string,
): void {
  if (conversationId) {
    writeAppState(database, ACTIVE_CONVERSATION_ID_KEY, conversationId);
    return;
  }

  clearActiveConversationId(database);
}

export function clearActiveConversationId(database: PapertrailDatabase): void {
  deleteAppState(database, ACTIVE_CONVERSATION_ID_KEY);
}
