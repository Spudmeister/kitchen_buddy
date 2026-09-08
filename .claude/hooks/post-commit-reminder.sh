#!/usr/bin/env bash
set -u
cmd="$(jq -r '.tool_input.command // empty' 2>/dev/null)"
case "$cmd" in
  *"git commit"*) echo "[hook] Check off finished tasks in .kiro/specs/kitchen-buddy-ios/tasks.md and update docs/ROADMAP.md if a milestone moved." ;;
esac
exit 0
