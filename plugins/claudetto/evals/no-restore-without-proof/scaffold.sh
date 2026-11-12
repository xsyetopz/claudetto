#!/usr/bin/env bash
set -euo pipefail
cat > AGENTS.before.md <<'EOF'
# Rules

## Setup

Run `just setup`.

## Style

Use tabs.

## Release

Tag each release.
EOF
cat > AGENTS.md <<'EOF'
# Rules

## Setup

Run `just setup`.
EOF
