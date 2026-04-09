Scaffold a new service following the Sous Chef project conventions.

Usage: `/new-service <name>` — e.g. `/new-service notification`

The `<name>` argument is the kebab-case service name without the `-service` suffix.

---

If no argument is provided, ask the user:
1. What is the kebab-case name of the service? (e.g. `notification`)
2. What does this service do? (one sentence)
3. What are the 2-3 primary public methods it will expose?
4. Which requirement numbers from `.kiro/specs/` does this service relate to? (optional)

---

Once you have the name and description, scaffold the following files. For each file, use the exact patterns shown in the existing codebase.

**Reference files to read first:**
- `src/services/recipe-service.ts` — service class pattern
- `src/types/recipe.ts` — domain type pattern
- `src/services/index.ts` — export index pattern
- `src/types/index.ts` — types export index pattern
- `tests/generators/recipe-generators.ts` — fast-check generator pattern
- `tests/properties/recipe-roundtrip.test.ts` — property test pattern
- `tests/services/` — any existing unit test for structure reference

**Files to create:**

### 1. `src/types/$NAME.ts`
- Export TypeScript interfaces for the domain types this service works with.
- Use `PascalCase` for interface names.
- Include an `Input` variant (for creation) and a main entity type (with `id: string`).
- Add JSDoc comments on every interface and field.
- Reference requirement numbers in comments if provided.

### 2. `src/services/$NAME-service.ts`
- Export a class named `$NameService` (PascalCase).
- Constructor: `constructor(private db: Database) {}`
- Import `Database` from `'../db/database.js'`.
- Import domain types from `'../types/$NAME.js'`.
- Import `{ v4 as uuidv4 }` from `'uuid'`.
- Stub each public method with a JSDoc comment referencing the requirement number.
- Use `this.db.transaction(() => { ... })` for write operations.
- Return `undefined` for not-found cases; throw with a descriptive message for invalid operations.
- Check `archived_at IS NULL` in queries (soft-delete pattern).

### 3. Update `src/services/index.ts`
- Add `export * from './$NAME-service.js';` in alphabetical order among the existing exports.

### 4. Update `src/types/index.ts`
- Add `export * from './$NAME.js';` in alphabetical order among the existing exports.

### 5. `tests/generators/$NAME-generators.ts`
- Import `* as fc from 'fast-check'`.
- Import the Input type from `'../../src/types/$NAME.js'`.
- Export one `fc.Arbitrary` per input type, named `${camelCase(name)}InputArb`.
- Use `fc.record({})` with appropriate field generators.
- Follow the patterns in `tests/generators/recipe-generators.ts`.

### 6. `tests/properties/$NAME.test.ts`
- Write at least 2 `fc.assert(fc.property(...))` tests.
- Import arbitraries from `'../generators/$NAME-generators.js'`.
- Import the service and types needed.
- Each test must have a comment referencing the requirement it validates.
- Use `{ numRuns: 100 }` on every `fc.assert` call.

### 7. `tests/services/$NAME-service.test.ts`
- Import `describe`, `it`, `expect`, `beforeEach` from `'vitest'`.
- Stub one `describe` block per public method.
- Each stub has an `it('should ...')` test that calls the method and asserts a basic expectation.
- Use an in-memory test database (follow the pattern in other files under `tests/services/`).

---

After creating all files, print a checklist confirming each file was created, and remind the user to:
- Run `npm test` to verify the scaffolding compiles and the stub tests pass.
- Fill in the service logic and strengthen the property tests.
- Mark the relevant task in `.kiro/specs/*/tasks.md` as complete once implemented.
