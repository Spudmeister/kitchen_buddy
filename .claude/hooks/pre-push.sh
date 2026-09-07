#!/usr/bin/env bash
# PreToolUse(Bash): before any `git push`, the package must build and test.
# Exit 2 blocks the tool call and feeds stderr back to Claude.
set -u
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
case "$cmd" in
  *"git push"*) ;;
  *) exit 0 ;;
esac
cd "$CLAUDE_PROJECT_DIR/KitchenBuddyKit" || exit 0
if ! swift test 2>&1 | tail -30 >&2; then
  echo "[hook] swift test failed — fix before pushing." >&2
  exit 2
fi
