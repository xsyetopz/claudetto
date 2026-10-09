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
cat > data/keep.db <<'EOF'
rows
EOF
mkdir -p tmp-output
cat > tmp-output/a.log <<'EOF'
log
EOF
