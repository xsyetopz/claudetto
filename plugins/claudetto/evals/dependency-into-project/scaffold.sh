#!/usr/bin/env bash
set -euo pipefail
cat > package.json <<'EOF'
{
  "name": "fixture",
  "private": true
}
EOF
cat > bun.lock <<'EOF'
{
  "lockfileVersion": 1,
  "workspaces": {
    "": {
      "name": "fixture",
    },
  },
  "packages": {},
}
EOF
printf 'name: demo\n' > config.yaml
cat > config.ts <<'EOF'
import { parse } from "yaml";

export const config = parse(await Bun.file("config.yaml").text());
EOF
