#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
set -euo pipefail
mkdir -p src legacy
cat > package.json <<'EOF'
{
  "name": "acme-web",
  "version": "2.3.0",
  "type": "module",
  "files": [
    "src",
    "legacy"
  ]
}
EOF
cat > MIGRATION.md <<'EOF'
# Migration

Version 2.0 replaced `legacy/` with `src/`.
We kept `legacy/` through 2.x as a rollback path.
The rollback window closed with the release of 2.3.0.
Delete `legacy/` in 2.3. Nothing in `src/` imports it.
EOF
cat > src/app.mjs <<'EOF'
import { routes } from "./routes.mjs";

export function start() {
  return routes.map((r) => r.path);
}
EOF
cat > src/routes.mjs <<'EOF'
export const routes = [{ path: "/" }, { path: "/about" }];
EOF
cat > legacy/README.md <<'EOF'
Deprecated since 2.0. Replaced by `src/`. Removable after the rollback window.
EOF
cat > legacy/old-app.mjs <<'EOF'
export const start = () => ["/"];
EOF
