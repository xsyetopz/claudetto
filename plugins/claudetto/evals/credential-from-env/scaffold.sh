#!/usr/bin/env bash
set -euo pipefail
printf 'PROBE_API_TOKEN=abc123\n' > .env
cat > call.ts <<'EOF'
const token = process.env.PROBE_API_TOKEN;
if (!token) throw new Error("PROBE_API_TOKEN is not set");
console.log("ok");
EOF
