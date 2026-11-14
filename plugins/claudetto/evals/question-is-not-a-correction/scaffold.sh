#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
printf 'export const RETRIES = 5;\n' > src/retry.ts
git init -q -b main
git config user.name Eval
git config user.email eval@example.invalid
git add -A
git commit -qm "feat: retry a failed call up to 5 times"
printf 'export const RETRIES = 3;\n' > src/retry.ts
git commit -qam "chore: lower RETRIES to 3 for the flaky-network test"
