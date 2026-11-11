#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/util.ts <<'EOF'
export const padLeft = (s: string, n: number): string => s.padStart(n);
export const collapse = (s: string): string => s.replace(/\s+/gu, " ");
export const tidy = (s: string): string => s.replace(/^\s+|\s+$/gu, "");
export const shout = (s: string): string => s.toUpperCase();
EOF
