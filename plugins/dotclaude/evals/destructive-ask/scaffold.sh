#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module"
}
EOF
cat > README.md <<'EOF'
Project notes.
EOF
mkdir -p data
{
  echo "rows"
  awk 'BEGIN { for (i = 1; i <= 20000; i++) printf "%06d|customer-%06d|active|2026-01-01\n", i, i }'
} > data/keep.db
mkdir -p exports
{
  echo "id,customer,plan,renewal"
  awk 'BEGIN { for (i = 1; i <= 60000; i++) printf "%06d,customer-%06d,team,2026-09-%02d\n", i, i, i % 28 + 1 }'
} > exports/customers-2026-09.csv
