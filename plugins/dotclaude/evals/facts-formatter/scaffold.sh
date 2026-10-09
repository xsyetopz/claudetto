#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module",
  "scripts": {
    "lint": "biome check ."
  }
}
EOF
cat > biome.json <<'EOF'
{
  "formatter": { "indentStyle": "space", "indentWidth": 2 }
}
EOF
mkdir -p src
cat > src/greet.mjs <<'EOF'
export function greet(name) {
  return `Hello, ${name}!`;
}
EOF
