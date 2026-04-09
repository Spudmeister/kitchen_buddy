Run tests scoped to only the files changed since the last commit, giving faster feedback than running the full suite.

Steps:

1. Run `git diff --name-only HEAD` to get the list of changed files. Also include staged changes with `git diff --name-only --cached`.
2. For each changed file, map it to its test counterparts:
   - `src/services/foo-service.ts`
     → `tests/services/foo-service.test.ts`
     → any `tests/properties/*.test.ts` whose filename contains "foo" or whose content imports from `foo-service`
   - `src/types/foo.ts`
     → any test file that imports from `types/foo`
   - `pwa/src/components/Foo.tsx` or `pwa/src/routes/Foo.tsx`
     → `pwa/tests/` files whose name contains "foo" (case-insensitive) or whose content imports `Foo`
   - `pwa/src/hooks/useFoo.ts`
     → `pwa/tests/` files that reference `useFoo`
   - `tests/**` or `pwa/tests/**` files map to themselves
3. Deduplicate the resolved test file list.
4. Separate the list into two groups:
   - **Core lib tests**: files under `tests/` — run with `npx vitest run --reporter=verbose <file> ...` from the project root
   - **PWA tests**: files under `pwa/tests/` — run with `cd pwa && npx vitest run --reporter=verbose <file> ...`
5. If no test counterparts are found for a changed file, note it as "no test found" but continue.
6. If the changed file list is empty (nothing changed), say so and exit without running any tests.
7. Run each group. After both finish, print a summary:

```
=== Test-Focused Run ===
Changed files : N
Test files run: N  (N core lib, N PWA)

Core lib results : PASS / FAIL  (N passed, N failed)
PWA results      : PASS / FAIL  (N passed, N failed)

Files with no test counterpart:
  - <path>
  ...
```

Use `Bash` for git commands and vitest execution. Use `Grep` to check test file imports when needed.
