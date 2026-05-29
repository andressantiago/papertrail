# Codex Project Guidance

## Frontend Validation

For frontend or UI validation, use the in-app Browser plugin first. Follow the Browser skill instructions and validate through the in-app browser before considering standalone Playwright, HTTP-only smoke checks, or other fallbacks.

Only use a fallback when the Browser plugin path is genuinely unavailable after following its setup instructions, and state that reason in the response.

## Git

Do not run `git add`, stage files, or otherwise update the index unless the user explicitly asks for staging.

## Dead Code Cleanup

When removing references or usages for any symbol, component, asset, style, or file, verify whether it still has other references or usages elsewhere in the codebase. If it appears to be dead code, ask before deleting it unless the cleanup is explicitly part of the user's requested change.
