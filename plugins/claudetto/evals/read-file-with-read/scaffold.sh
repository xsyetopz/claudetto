#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/config.ts <<'EOF'
export const HOST = "0.0.0.0";
export const PORT = 7341;
EOF
