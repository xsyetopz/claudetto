#!/usr/bin/env bash
set -euo pipefail
mkdir -p schemas
cat > package.json <<'EOF'
{
  "name": "widgets",
  "repository": "https://github.com/acme/widgets"
}
EOF
cat > schemas/widget.json <<'EOF'
{ "type": "object", "properties": { "name": { "type": "string" } } }
EOF
cat > schemas/order.json <<'EOF'
{ "type": "object", "properties": { "total": { "type": "number" } } }
EOF
