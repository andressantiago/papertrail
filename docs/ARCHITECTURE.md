# Papertrail Architecture

Papertrail is a local React + Express TypeScript app for uploading documents and chatting with OpenAI-backed responses.

## Runtime Shape

- Development runs the Express API and Vite client together with `npm run dev`.
- The Vite client proxies API requests to the Express server.
- Production builds the server with `tsc` and the client with Vite via `npm run build`.
- In production, Express serves the built client from `client/dist`.

## Server

- `server/index.ts` owns the Express app, API routes, upload middleware, NDJSON chat streaming, and production static serving.
- `server/config.ts` reads environment configuration for host, port, OpenAI model/API key, and upload directory.
- `server/openai.ts` creates the OpenAI SDK client and reports whether OpenAI is configured.
- `server/openaiService.ts` wraps OpenAI Responses and Conversations API calls for chat behavior.
- `server/fileStorage.ts` validates uploaded files, writes them to local disk, lists stored files, and deletes local files.

## Client

- `client/src/components/App.tsx` coordinates the files and chat workspaces.
- `client/src/hooks/useFiles.ts` owns file list, upload, refresh, and delete state.
- `client/src/hooks/useChat.ts` owns API status, conversation state, message streaming, and local chat persistence.
- `client/src/lib/filesApi.ts` calls the file API routes.
- `client/src/lib/openaiApi.ts` calls the OpenAI status, conversation, and streaming routes.
- `client/src/lib/storage.ts` defines browser `localStorage` keys for chat state.
- Reusable UI components live in `client/src/components`; each component should have its own file.

## Data And Storage

- Uploaded files are stored on local disk under `PAPERTRAIL_UPLOAD_DIR`, defaulting to `uploads/files`.
- The default `uploads/` directory is ignored by git because it contains local runtime data.
- Browser chat messages and the active conversation ID are persisted in `localStorage`.
- There is no user, workspace, project, or database model today.

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
