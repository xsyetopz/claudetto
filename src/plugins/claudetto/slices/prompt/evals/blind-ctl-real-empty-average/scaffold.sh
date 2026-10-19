#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
set -euo pipefail
mkdir -p src
cat > package.json <<'EOF'
{ "name": "dash", "type": "module" }
EOF
cat > src/stats.mjs <<'EOF'
export function average(xs) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export function percent(xs) {
  return `${Math.round(average(xs) * 100)}%`;
}
EOF
