#!/usr/bin/env bash
# Scaffold: two constants in separate files, plus two files that must stay as written. Offline, deterministic.
set -euo pipefail
mkdir -p src
cat > src/tax.ts <<'TS'
export const TAX_RATE = 0.2;

export const withTax = (net: number): number => net * (1 + TAX_RATE);
TS
cat > src/limits.ts <<'TS'
export const MAX_RETRIES = 3;

export const retryDelayMs = (attempt: number): number => attempt * 100;
TS
cat > src/index.ts <<'TS'
import { MAX_RETRIES } from "./limits";
import { withTax } from "./tax";

console.log(withTax(100), MAX_RETRIES);
TS
cat > README.md <<'MD'
# Shop

Computes prices with tax and retries failed requests.
MD
