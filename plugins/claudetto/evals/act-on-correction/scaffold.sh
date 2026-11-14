#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/sum.ts <<'TS'
export function sum(a: number, b: number): number {
  return a * b;
}
TS
