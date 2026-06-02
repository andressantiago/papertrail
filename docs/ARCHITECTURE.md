# Papertrail Architecture

Papertrail is a local React + Express TypeScript app for uploading documents and chatting with OpenAI-backed responses.

## Runtime Shape

- Development runs the Express API and Vite client together with `npm run dev`.
- The Vite client proxies API requests to the Express server.
- Production builds the server with `tsc` and the client with Vite via `npm run build`.
- In production, Express serves the built client from `client/dist`.

## Server

- `server/index.ts` initializes SQLite, creates the Express app, and starts the local server.
- `server/app.ts` owns the Express app factory and composes API route modules with production static serving.
- `server/config.ts` reads environment configuration for host, port, OpenAI model/API key, upload directory, and database path.
- `server/database.ts` initializes the local SQLite schema.
- `server/routes/*` contains focused Express route registration for files, chat state, preferences, and OpenAI APIs.
- `server/openaiStream.ts` owns NDJSON chat streaming persistence and stream event handling.
- `server/dataStore.ts` is the thin persistence facade used by routes and services.
- `server/stores/*` contains focused SQLite-backed stores for app state, file metadata, and chat messages.
- `server/openai.ts` creates the OpenAI SDK client and reports whether OpenAI is configured.
- `server/openaiService.ts` wraps OpenAI Responses and Conversations API calls for chat behavior.
- `server/fileStorage.ts` validates uploaded files, writes them to local disk, and deletes local file bytes.

## Client

- `client/src/components/App.tsx` coordinates the files and chat workspaces.
- `client/src/hooks/useFiles.ts` owns file list, upload, refresh, and delete state.
- `client/src/hooks/useChat.ts` owns API status, conversation state, message streaming, and DB-backed chat loading/clearing through API calls.
- `client/src/hooks/useTheme.ts` owns DB-backed theme loading and updates through API calls.
- `client/src/lib/chatApi.ts` calls the chat state API routes.
- `client/src/lib/filesApi.ts` calls the file API routes.
- `client/src/lib/openaiApi.ts` calls the OpenAI status, conversation, and streaming routes.
- `client/src/lib/preferencesApi.ts` calls the preferences API routes.
- Reusable UI components live in `client/src/components`; each component should have its own file.

## Data And Storage

- Uploaded file bytes are stored on local disk under `PAPERTRAIL_UPLOAD_DIR`, defaulting to `uploads/files`.
- File metadata, chat messages, the active OpenAI conversation ID, and theme are stored in SQLite under `PAPERTRAIL_DB_PATH`, defaulting to `data/papertrail.sqlite`.
- The default `uploads/` and `data/` directories are ignored by git because they contain local runtime data.
- Browser `localStorage` is not used for app metadata or chat/theme persistence.
- There is no user, workspace, or project model today.

## Shared Code

- `shared/fileUpload.ts` defines accepted file extensions, upload field name, max file count, and max file size.
- Client and server code both rely on this shared upload contract.

## Tests And Validation

- Server tests live under `tests/server`.
- Client hook, component, and lib tests live under `tests/client`.
- Shared tests live under `tests/shared`.
- Test setup files live under `tests/setup`.
- Preferred checks are `npm run lint`, `npm run typecheck`, `npm run format:check`, and `npm test`.
- For frontend or UI validation, use the in-app Browser plugin first and state the reason before using any fallback.
