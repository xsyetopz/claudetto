#!/usr/bin/env bash
set -euo pipefail
cat > package.json <<'EOF'
{
  "name": "fixture",
  "private": true,
  "scripts": { "sync": "bun run --cwd job sync.ts" }
}
EOF
mkdir -p job
printf 'SYNC_KEY=abc\n' > .env
printf 'console.log(process.env.SYNC_KEY);\n' > job/sync.ts
