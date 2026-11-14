#!/usr/bin/env bash
set -euo pipefail
mkdir -p src
cat > src/slug.ts <<'EOF'
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
EOF
