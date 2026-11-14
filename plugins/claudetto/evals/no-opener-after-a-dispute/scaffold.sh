#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/count.ts <<'EOF'
export function count(): number {
  return 3;
}
EOF
