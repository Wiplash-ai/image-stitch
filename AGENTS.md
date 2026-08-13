# GlassWare agent guide

- Preserve the local-first default. Do not upload project assets implicitly.
- Keep Konva behind the canvas adapter; public schemas are GlassWare's API.
- Every durable mutation must become a reversible project command and revision.
- AI operations bind to an exact base revision and fail closed when stale.
- ChatGPT/Codex MCP use and OpenAI API-key use are separate product paths.
- Never put provider keys, session cookies, or private service internals in the
  browser application, extension, logs, schemas, examples, or repository.
- Keep the extension useful as a browser-integrated capture tool, not a launcher.
- Verify dependency and content licensing before introducing any new package or
  bundled font, icon, template, stock asset, or model.
- Run `npm run verify` before reporting implementation work complete.
