#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
mkdir -p src
cat > src/load.mjs <<'EOF'
import fs from "node:fs";

export const load = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
EOF
