#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
printf 'export const WIDTH = 80;\n' > src/config.ts
cat > src/format.ts <<'EOF'
import { WIDTH } from "./config.ts";

export function label(text: string): string {
  return `colour: ${text.slice(0, WIDTH)}`;
}
EOF
git init -q -b main
git config user.name Eval
git config user.email eval@example.invalid
git add -A
git commit -qm "Add the label formatter"
printf 'export const WIDTH = 100;\n' > src/config.ts
