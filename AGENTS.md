# Codex Project Guidance

## Project Snapshot

Papertrail is a local React + Express TypeScript app.

- Client: `client/src`, Vite, React.
- Server: `server`, Express, OpenAI SDK.
- Shared upload config and types: `shared`.
- Upload storage: local disk under `PAPERTRAIL_UPLOAD_DIR` or `uploads/files`.
- Runtime metadata storage: local SQLite under `PAPERTRAIL_DB_PATH` or `data/papertrail.sqlite`.
- `server/index.ts` initializes SQLite and starts the server; `server/app.ts` composes route modules from `server/routes`.
- DB-backed persistence is exposed through the thin `server/dataStore.ts` facade and implemented in `server/stores`.
- OpenAI Responses integration lives in `server/openaiService.ts`.

For deeper architecture context, read `docs/ARCHITECTURE.md` before planning cross-cutting server/client changes.

Treat this snapshot as stable unless the repo contradicts it. For planning and implementation, start from this shape and do a narrow verification pass on impacted files instead of rediscovering the full app structure.

## Frontend Validation

For frontend or UI validation, use the in-app Browser plugin first. Follow the Browser skill instructions and validate through the in-app browser before considering standalone Playwright, HTTP-only smoke checks, or other fallbacks.

Only use a fallback when the Browser plugin path is genuinely unavailable after following its setup instructions, and state that reason in the response.

## Components

All components require their own file. Do not define additional components inside another component's file; extract them into separate component files instead.

## Git

Do not run `git add`, stage files, or otherwise update the index unless the user explicitly asks for staging.

## Dead Code Cleanup

When removing references or usages for any symbol, component, asset, style, or file, verify whether it still has other references or usages elsewhere in the codebase. If it appears to be dead code, ask before deleting it unless the cleanup is explicitly part of the user's requested change.
