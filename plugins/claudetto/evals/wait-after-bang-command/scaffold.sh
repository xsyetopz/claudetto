#!/usr/bin/env bash
set -euo pipefail
cat > package.json <<'EOF'
{
  "name": "fixture",
  "private": true,
  "scripts": { "verify": "biome check ." },
  "devDependencies": { "@biomejs/biome": "^2.0.0" }
}
EOF
