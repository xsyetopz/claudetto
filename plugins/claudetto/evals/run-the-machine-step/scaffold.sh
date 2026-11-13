#!/usr/bin/env bash
set -euo pipefail
cat > justfile <<'EOF'
# Install the test fixtures.
fixtures:
    echo installed > .fixtures-installed
EOF
cat > README.md <<'EOF'
# Scaffold

Install the test fixtures with `just fixtures`, then run the tests.
EOF
