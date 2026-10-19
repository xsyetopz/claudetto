#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module"
}
EOF
mkdir -p src
cat > src/stats.mjs <<'EOF'
export const mean = (xs) => xs.reduce((a, b) => a + b, 0) / (xs.length - 1);
EOF
