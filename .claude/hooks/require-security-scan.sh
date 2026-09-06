#!/bin/bash
# Block push/merge until claude-security has scanned the current HEAD.
#
# The marker .claude/.security-scan holds the SHA that was scanned. Any new
# commit makes it stale, so the gate re-arms itself after every change.
# Record a passing scan with:  git rev-parse HEAD > .claude/.security-scan

cmd=$(jq -r '.tool_input.command // empty')

case "$cmd" in
  *"git push"*|*"git merge"*|*"gh pr merge"*) ;;
  *) echo '{}'; exit 0 ;;
esac

root="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
head=$(git -C "$root" rev-parse HEAD 2>/dev/null)
scanned=$(cat "$root/.claude/.security-scan" 2>/dev/null)

if [ -n "$head" ] && [ "$head" = "$scanned" ]; then
  echo '{}'
  exit 0
fi

jq -n --arg h "${head:0:12}" '{
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: ("BLOCKED: no security scan recorded for HEAD (" + $h + "). Run /claude-security on this branch, then record it with: git rev-parse HEAD > .claude/.security-scan")
  }
}'
