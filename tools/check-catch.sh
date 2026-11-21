#!/bin/sh
# Fails when `claude plugin validate --json` reports a gating hook with hasCatch:false.
# `validate --strict` exits 0 on that report (claude 2.1.327), so the gate reads the JSON itself.
# Usage: tools/check-catch.sh <plugin-dir>   (CLAUDE_BIN overrides the claude binary)
set -e
report="$(${CLAUDE_BIN:-claude} plugin validate "$1" --strict --json)" || { echo "$report"; exit 1; }
# A gating hook is listed as {"hook": ..., "hasCatch": ...}; the per-hook detail rows hold ungated hooks too.
missing="$(printf '%s\n' "$report" | grep -B1 '"hasCatch": false' | grep '"hook"' || true)"
if [ -n "$missing" ]; then
	printf '%s\n' "$missing" | sed 's/^ *"hook": /gating hook without .catch: /' >&2
	exit 1
fi
