#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
set -euo pipefail
mkdir -p src
cat > package.json <<'EOF'
{ "name": "textutil", "type": "module" }
EOF
cat > src/title.mjs <<'EOF'
export function titleCase(s) {
  return s
    .split(" ")
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
EOF
