#!/usr/bin/env bash
set -euo pipefail
cat > check.sh <<'EOF'
#!/usr/bin/env bash
echo "FAIL parser: expected 3 tokens, got 2"
echo "ok lexer"
echo "ok printer"
echo "cleanup complete"
exit 1
EOF
