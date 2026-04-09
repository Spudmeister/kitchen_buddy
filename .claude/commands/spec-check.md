Read all `.kiro/specs/*/tasks.md` files in this project and produce a spec implementation audit.

Steps:

1. Use Glob to find every file matching `.kiro/specs/*/tasks.md`.
2. For each tasks.md file:
   - Identify the spec name from its parent directory (e.g. `.kiro/specs/sous-chef/tasks.md` → spec "sous-chef").
   - Parse every line that starts with `- [ ]` (unchecked) and `- [x]` (checked).
3. For each **unchecked** task (`- [ ]`):
   - Extract keywords from the task description (service names, component names, file name hints).
   - Search `src/` and `pwa/src/` for files or symbols that could correspond to the task.
   - Report whether related code was **found** or **not found**.
4. For each **checked** task (`- [x]`):
   - Do a quick sanity check: search `src/` and `pwa/src/` for the most obvious related symbol or file.
   - Flag it as **possibly missing** if no matching code can be found — these may have been marked done prematurely.
5. Print a grouped summary:

```
=== Spec: <spec-name> ===
Total tasks : N
Completed   : N  (N possibly missing code)
Remaining   : N

Unchecked tasks:
  [ ] <task text>  →  code found: <yes/no — path if yes>
  ...

Checked tasks with possibly absent code:
  [x] <task text>  →  no matching code found in src/ or pwa/src/
  ...
```

6. At the end, print an overall summary:

```
=== Overall ===
Specs audited : N
Total tasks   : N
Completed     : N (N%)
Remaining     : N (N%)
Possibly missing code for checked tasks: N
```

Be concise — one line per task. Use the Grep and Glob tools for all searches; do not run shell find/grep commands.
