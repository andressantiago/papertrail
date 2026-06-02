import fs from "node:fs/promises";
import path from "node:path";
import Database from "better-sqlite3";

export type PapertrailDatabase = Database.Database;

function createSchema(database: PapertrailDatabase): void {
  database.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      extension TEXT NOT NULL,
      size INTEGER NOT NULL,
      uploaded_at TEXT NOT NULL,
      openai_file_id TEXT,
      openai_upload_status TEXT CHECK (
        openai_upload_status IN ('pending', 'uploading', 'uploaded', 'failed', 'not_configured')
      ),
      openai_upload_error TEXT,
      openai_uploaded_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('streaming', 'complete', 'error')),
      error TEXT,
      response_id TEXT,
      created_at TEXT NOT NULL,
      position INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS chat_messages_position_idx
      ON chat_messages(position);

    CREATE TABLE IF NOT EXISTS app_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);
}

function ensureFileOpenAIColumns(database: PapertrailDatabase): void {
  const columns = database.prepare("PRAGMA table_info(files)").all() as Array<{ name: string }>;
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has("openai_file_id")) {
    database.exec("ALTER TABLE files ADD COLUMN openai_file_id TEXT");
  }

  if (!columnNames.has("openai_upload_status")) {
    database.exec(`
      ALTER TABLE files
      ADD COLUMN openai_upload_status TEXT CHECK (
        openai_upload_status IN ('pending', 'uploading', 'uploaded', 'failed', 'not_configured')
      )
    `);
  }

  if (!columnNames.has("openai_upload_error")) {
    database.exec("ALTER TABLE files ADD COLUMN openai_upload_error TEXT");
  }

  if (!columnNames.has("openai_uploaded_at")) {
    database.exec("ALTER TABLE files ADD COLUMN openai_uploaded_at TEXT");
  }
}

function configureDatabase(database: PapertrailDatabase): PapertrailDatabase {
  database.pragma("journal_mode = WAL");
  database.pragma("busy_timeout = 5000");
  database.pragma("foreign_keys = ON");
  createSchema(database);
  ensureFileOpenAIColumns(database);

  return database;
}

async function ensureDatabaseDirectory(databasePath: string): Promise<void> {
  if (databasePath === ":memory:") {
    return;
  }

  await fs.mkdir(path.dirname(databasePath), { recursive: true });
}

export async function initializeDatabase(databasePath: string): Promise<PapertrailDatabase> {
  await ensureDatabaseDirectory(databasePath);

  return configureDatabase(new Database(databasePath));
}

export function initializeInMemoryDatabase(): PapertrailDatabase {
  return configureDatabase(new Database(":memory:"));
}
