#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module"
}
EOF
mkdir -p src/config
cat > src/config/load.mjs <<'EOF'
export function loadConfig() {
  return {};
}
EOF
mkdir -p src/jobs
cat > src/jobs/queue.mjs <<'EOF'
export const flushQueue = () => 0;
EOF
mkdir -p src/jobs
cat > src/jobs/run.mjs <<'EOF'
import { flushQueue } from "./queue.mjs";
export const stop = () => flushQueue();
EOF
mkdir -p src/misc
cat > src/misc/a.mjs <<'EOF'
// loadConfig is not here.
EOF
mkdir -p src/net
cat > src/net/retry.mjs <<'EOF'
export const max = Number(process.env.RETRY_MAX ?? 3);
EOF
mkdir -p src/text
cat > src/text/slug.mjs <<'EOF'
export const toSlug = (s) => s;
EOF
