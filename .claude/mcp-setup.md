# MCP Server Setup

Claude Code MCP servers are configured in `.claude/settings.json` under `mcpServers`.
Two servers are pre-configured; two require additional work.

---

## Filesystem MCP (pre-configured)

Gives Claude read access to the project tree without relying solely on Grep/Read.

**Auto-installs via npx — no manual install needed.**

Config already in `settings.json`:
```json
"filesystem": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/home/user/kitchen_buddy"]
}
```

---

## SQLite MCP (pre-configured)

Lets Claude run read-only SQL queries against a dev/test database exported from the browser.

**Auto-installs via npx — no manual install needed.**

Config already in `settings.json`:
```json
"sqlite": {
  "type": "stdio",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-sqlite", "--db-path", "/tmp/sous-chef-dev.db"]
}
```

To use: export the IndexedDB database from the browser DevTools as a `.db` file, copy it to
`/tmp/sous-chef-dev.db`, then start a Claude Code session. You can also use the inspector
script: `npm run inspect-db /tmp/sous-chef-dev.db`.

---

## Playwright/Browser MCP (manual install required)

Enables end-to-end PWA tests — install the app, navigate Plan/Shop/Cook flows, validate
offline behavior and service worker caching.

**Install:**
```bash
npm install -g @executeautomation/playwright-mcp-server
```

**Add to `.claude/settings.json`** under `mcpServers`:
```json
"playwright": {
  "type": "stdio",
  "command": "playwright-mcp-server"
}
```

Use cases:
- Test PWA install prompt and offline fallback
- Validate IndexedDB persistence across page reloads
- Run cook-mode distraction-free view end-to-end
- Assert Lighthouse performance budget

---

## AI Provider MCP (future — custom implementation)

A custom MCP that wraps `src/services/ai-service.ts` so Claude can test Sue's menu planning
in isolation — send a constraint payload, receive suggestion JSON — without running the full PWA.

**Planned implementation:**
1. Create `mcp-servers/ai-provider/index.ts` that starts an MCP stdio server
2. Expose a `planMenu` tool that accepts `MenuConstraints` and returns `RecipeSuggestion[]`
3. Expose a `substituteIngredient` tool for testing the substitution engine via AI
4. Add to `settings.json`:
   ```json
   "ai-provider": {
     "type": "stdio",
     "command": "tsx",
     "args": ["mcp-servers/ai-provider/index.ts"]
   }
   ```

This allows testing Sue's responses without a browser and with full observability.
