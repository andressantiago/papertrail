# Codex Project Guidance

## Frontend Validation

For frontend or UI validation, use the in-app Browser plugin first. Follow the Browser skill instructions and validate through the in-app browser before considering standalone Playwright, HTTP-only smoke checks, or other fallbacks.

Only use a fallback when the Browser plugin path is genuinely unavailable after following its setup instructions, and state that reason in the response.
