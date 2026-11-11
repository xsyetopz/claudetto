#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > package.json <<'EOF'
{
  "name": "fixture",
  "private": true,
  "scripts": { "test": "bun test" }
}
EOF
cat > bun.lock <<'EOF'
{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "fixture",
    },
  },
  "packages": {},
}
EOF
cat > src/slug.ts <<'EOF'
export const slugify = (s: string): string => s.trim().replace(/\s+/gu, "-");
EOF
