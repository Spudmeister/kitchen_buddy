# CLAUDE.md - Sous Chef (Kitchen Buddy)

## Project Overview

**Sous Chef** is a local-first recipe and grocery management Progressive Web Application. All data is stored locally in SQLite (via sql.js/WASM) — no backend server required. The app works offline and covers the full cooking workflow: plan meals, generate shopping lists, cook with step-by-step guidance, and track statistics over time.

**AI assistant "Sue"** (the Menu_Assistant) is an optional AI-powered feature for conversational menu planning, supporting OpenAI, Anthropic, and local Ollama models.

### Two-Package Structure

```
kitchen_buddy/
├── src/                    # Core library (Node.js + sql.js)
│   ├── db/                 # Database abstraction (SQLite schema, transactions)
│   ├── repositories/       # Data access layer
│   ├── services/           # Business logic (30 services)
│   └── types/              # TypeScript type definitions (15 files)
├── pwa/                    # Progressive Web App (React)
│   ├── src/
│   │   ├── components/     # React components organized by feature
│   │   ├── db/             # Browser database (sql.js + IndexedDB)
│   │   ├── hooks/          # React Query hooks
│   │   ├── routes/         # Page-level components
│   │   ├── services/       # Browser-adapted service layer
│   │   └── stores/         # Zustand state stores
│   └── tests/              # PWA-specific tests (Vitest + Testing Library)
├── tests/                  # Core library tests (property-based with fast-check)
└── .kiro/specs/            # Specification files (requirements, design, tasks)
```

## Commands

```bash
# Setup
npm run install:all          # Install both root and pwa dependencies

# Development
npm run dev                  # Start PWA dev server (Vite HMR)
npm run preview              # Preview production build

# Testing
npm test                     # Run all tests (core lib + PWA)
npm run test:lib             # Core library tests only (vitest)
npm run test:app             # PWA tests only
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report

# Building
npm run build                # Build everything (tsc + Vite)
npm run build:lib            # Compile core library (tsc)
npm run build:app            # Build PWA (Vite)

# Code Quality
npm run lint                 # ESLint (src/)
npm run lint:fix             # ESLint with auto-fix
npm run format               # Prettier (src/ + tests/)
npm run format:check         # Prettier check (CI-safe)
```

**Always run `npm test` before pushing.** Tests must pass. Run `npm run lint` and `npm run format:check` to validate code style.

## Git Workflow (GitFlow)

```
main          # Production releases only (tagged)
develop       # Integration branch — all features merge here
feature/*     # Task branches (branch from develop, PR back to develop)
release/*     # Release prep (branch from develop, merge to main + develop)
hotfix/*      # Emergency fixes (branch from main, merge to main + develop)
```

**Rules:**
1. Never commit directly to `main` or `develop`
2. Always branch from `develop` for new work: `git checkout -b feature/my-task`
3. Run `npm test` before pushing
4. Use conventional commit messages (see below)
5. Keep branches short-lived and focused on one task

**Commit format:**
```
feat: add ingredient scaling to recipe service
fix: correct unit conversion for tablespoons
test: add property tests for shopping consolidation
docs: update API documentation for export service
refactor: simplify meal prep task grouping logic
chore: update dependencies
```

## Architecture & Key Patterns

### 1. Immutable Versioning
Recipe edits create a new version row — never overwrite. `recipe_versions` is append-only. Always query the latest version unless displaying history.

### 2. Soft Delete
Archive records instead of deleting them. Check `archived_at IS NULL` in queries.

### 3. Heritage Tracking
Duplicated recipes store a `parent_recipe_id` reference. The UI can show the full lineage (parent → child → grandchild).

### 4. Offline-First
All data is local SQLite. Network is only used for AI API calls and URL-based recipe import. Never assume connectivity.

### 5. Practical Rounding
When scaling produces `1.333...` cups, round to the nearest cooking-friendly fraction (1/4, 1/3, 1/2, 2/3, 3/4). The `unit-converter.ts` service handles this.

### 6. AI is Optional
All AI-dependent features (Sue, visual recipe import, AI auto-tagging) must be hidden when AI is disabled. `ai-config-store.ts` holds the config. Always check `isAIEnabled()` before showing AI UI.

### 7. Service Layer Pattern
Services own all business logic and DB access. React components call services via React Query hooks — no direct DB access from components.

```typescript
// Services: class-based, constructor-injected database
export class RecipeService {
  constructor(private db: Database) {}
  createRecipe(input: RecipeInput): Recipe { ... }
}

// Hooks: React Query wrapping services
export function useRecipe(id: string) {
  return useQuery({
    queryKey: recipeKeys.detail(id),
    queryFn: () => getRecipeService().getRecipe(id),
  });
}
```

### 8. State Management Split
- **React Query** — data state (recipes, menus, shopping lists, statistics)
- **Zustand** — UI state (active tab, open modals, toasts, Sue conversation)

## Technology Stack

| Layer | Technology |
|-------|------------|
| Language | TypeScript 5.3 (strict mode) |
| Core runtime | Node.js, sql.js (SQLite via WASM) |
| Frontend framework | React 18 |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3.4 (mobile-first) |
| State (data) | React Query 5 |
| State (UI) | Zustand 4 |
| Routing | React Router v6 |
| PWA | Workbox + vite-plugin-pwa |
| Testing | Vitest + fast-check + Testing Library |
| Linting | ESLint 8 + TypeScript ESLint |
| Formatting | Prettier 3 |

## Code Conventions

### TypeScript
- Strict mode — no `any`, use `unknown` when truly needed
- `type` imports for type-only imports: `import type { Recipe } from './types/recipe.js'`
- Use `.js` extension in imports (ESM output): `import { RecipeService } from './recipe-service.js'`
- Explicit return types on public functions
- Interfaces for object shapes, `type` for unions/aliases

### Naming
- Files: `kebab-case.ts` / `kebab-case.tsx`
- Components: `PascalCase.tsx`
- Types/Interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Constants: `SCREAMING_SNAKE_CASE`

### Error Handling
- Return `undefined` for not-found cases
- Throw with descriptive messages for invalid operations
- Never swallow errors silently

### Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation support
- WCAG AA color contrast

## Testing Strategy

### Property-Based Tests (fast-check)
The primary test methodology. 36+ correctness properties in `tests/properties/` validate universal invariants across all possible inputs. Each property references the requirement it validates.

```typescript
// Example property
fc.assert(
  fc.property(recipeInputArb, scaleFactorArb, (input, factor) => {
    const recipe = createRecipe(input);
    const scaled = scaleRecipe(recipe, factor);
    for (let i = 0; i < recipe.ingredients.length; i++) {
      expect(scaled.ingredients[i].quantity)
        .toBeCloseTo(recipe.ingredients[i].quantity * factor);
    }
  }),
  { numRuns: 100 }
);
```

### Test Organization
```
tests/
├── fixtures/       # 50+ sample recipes with edge cases
├── generators/     # fast-check arbitraries (reuse these!)
├── mocks/          # AI, DB, photo service mocks
├── properties/     # Property-based tests (primary)
├── services/       # Unit tests
└── integration/    # Integration tests (smoke tests)
```

### PWA Tests
```
pwa/tests/
├── generators/     # PWA-specific fast-check generators
└── properties/     # UI correctness properties
```

**When adding a new service feature:** add a generator in `tests/generators/`, add properties in `tests/properties/`, add unit tests in `tests/services/`.

## Spec-Driven Development

Feature specifications live in `.kiro/specs/`:

```
.kiro/specs/{feature}/
├── requirements.md    # User stories + acceptance criteria (SHALL statements)
├── design.md          # Technical design + correctness properties
└── tasks.md           # Checked implementation task list
```

When implementing, reference the requirement number in comments:
```typescript
/**
 * Scale an ingredient by a factor
 * Requirements: 2.1 - Multiply ingredient quantities by scale factor
 */
```

## Database Schema (Key Tables)

| Table | Purpose |
|-------|---------|
| `recipes` | Recipe metadata, soft-delete (`archived_at`) |
| `recipe_versions` | Immutable version snapshots (never update) |
| `ingredients` | Linked to `recipe_versions` |
| `instructions` | Linked to `recipe_versions` |
| `tags`, `recipe_tags` | Tag associations |
| `menus`, `menu_assignments` | Menu planning |
| `shopping_lists`, `shopping_items` | Generated shopping lists |
| `cook_sessions` | Cook logs with actual times |
| `recipe_instances` | Exact config snapshots (scale, units, notes) |
| `photos` | Photo metadata linked to instances |

Use transactions for multi-statement operations:
```typescript
return this.db.transaction(() => {
  this.db.run('INSERT INTO recipes ...', [...]);
  this.db.run('INSERT INTO recipe_versions ...', [...]);
  this.insertIngredients(versionId, input.ingredients);
  return this.getRecipe(recipeId)!;
});
```

## Three Core User Flows

```
PLAN  → browse recipes, consult Sue, build menu, track leftovers
SHOP  → generate consolidated shopping list, check off at store
COOK  → distraction-free cook mode, log session, capture photos
```

## Performance Targets

- Lighthouse score: 90+
- Initial load on 3G: < 2 seconds
- Search results: < 100ms
- Navigation transitions: < 300ms
- Lists: virtualized (no DOM bloat with 1000+ recipes)

---

## Recommended Skills, Tools, MCPs, and Hooks

### Skills to Build

**`/spec-check`** — Verify implementation against `.kiro/specs/`
Reads requirements.md and tasks.md, then checks which tasks are still unchecked and whether the corresponding code exists. Useful for resuming after a break or auditing progress.

**`/test-focused`** — Run tests for only the changed files
Wraps `vitest run --reporter=verbose` scoped to modified files. Faster feedback loop than running the full suite.

**`/new-service`** — Scaffold a new service following project conventions
Generates a service class, its type file, test fixtures, generators, property tests, and the index.ts export — all pre-wired to the project's patterns.

**`/cook-session`** — Log a cook session interactively
Walks through rating + actual time entry for a recipe after cooking. Could also post to the statistics service.

### Tools / Integrations to Build

**SQLite Inspector** — A simple script or MCP tool that opens the local `.db` file and lets you run ad-hoc queries during development. The sql.js WASM database is persisted to IndexedDB in the browser; a Node.js script using `better-sqlite3` on an exported dump would be practical.

**Lighthouse CI** — Automate the Lighthouse 90+ target. Add `lighthouse-ci` as a dev dependency and configure `lighthouserc.json` to run against the Vite preview server in CI.

**Recipe URL Fixture Generator** — A small script that fetches a set of known recipe URLs (schema.org and non-schema.org) and saves their HTML as fixtures for offline parser testing without hitting real sites.

**PDF Preview Validator** — After `export-service.ts` generates a PDF, validate that it contains the expected recipe title and ingredient list using a PDF-parsing library (e.g., `pdf-parse`). Add this as a property test.

### MCP Servers to Configure

**Filesystem MCP** (`@modelcontextprotocol/server-filesystem`)
Grant read access to the project directory. Lets Claude navigate source files, read the SQLite schema, and inspect generated artifacts without relying solely on Grep/Read tool calls.

**Playwright/Browser MCP** (`@executeautomation/playwright-mcp-server` or similar)
Run end-to-end PWA tests — install the app, navigate the Plan/Shop/Cook flows, validate offline behavior. Critical for testing service worker caching and IndexedDB persistence.

**SQLite MCP** (`@modelcontextprotocol/server-sqlite` or a custom wrapper)
Expose the local SQLite database via MCP so Claude can run read-only queries to inspect schema, verify data integrity after operations, and debug failing tests without writing temporary scripts.

**AI Provider MCP** (custom)
Wrap the `ai-service.ts` abstraction as an MCP tool so Claude can test Sue's menu planning responses in isolation — send a constraint payload, get back suggestion JSON — without running the full PWA.

### Hooks to Configure

**Pre-commit hook** — Lint + format check before every commit
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "cd /home/user/kitchen_buddy && npm run lint && npm run format:check",
            "description": "Lint and format check before committing"
          }
        ]
      }
    ]
  }
}
```
Configure this to run when Claude issues a `git commit` Bash command. Catches style violations before they reach the repo.

**Pre-push test hook** — Run full test suite before every push
Trigger `npm test` whenever a `git push` command is issued. Prevents broken code from reaching `origin`.

**Session start hook** — Ensure dependencies are installed
On session start, run `npm run install:all` if `node_modules` is missing or `package-lock.json` is newer than `node_modules`. Eliminates "module not found" confusion at the start of sessions.

**Spec sync hook** — Remind to update tasks.md after implementation
After a successful commit on a `feature/*` branch, print a reminder to mark the corresponding task in `.kiro/specs/*/tasks.md` as complete. Keeps specs in sync with reality.

### Suggested `.claude/settings.json` Hooks (Ready to Use)

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "cd /home/user/kitchen_buddy && npm run format:check --silent 2>/dev/null || echo '[hook] Format drift detected — run npm run format'",
            "description": "Warn on format drift after file edits"
          }
        ]
      }
    ]
  }
}
```
