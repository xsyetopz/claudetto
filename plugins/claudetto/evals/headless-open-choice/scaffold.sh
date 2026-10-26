#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF2'
{
  "type": "module"
}
EOF2
mkdir -p src
cat > src/app.mjs <<'EOF2'
export function start() {
  return "listening";
}
EOF2
