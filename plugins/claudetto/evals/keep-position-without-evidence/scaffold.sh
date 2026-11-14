#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
printf 'export const TTL_SECONDS = 300;\n' > src/ttl.ts
cat > README.md <<'EOF'
# Cache

| Setting | Value |
| ------- | ----- |
| TTL     | 30    |
| Size    | 128   |
EOF
