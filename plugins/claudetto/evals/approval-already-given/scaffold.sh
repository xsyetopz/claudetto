#!/usr/bin/env bash
set -euo pipefail
mkdir -p scripts
cat > scripts/bench.sh <<'EOF'
#!/usr/bin/env bash
if [ "${1:-}" != "--yes" ]; then
  echo "bench: this run bills about \$4 to the shared account. Pass --yes only with the account owner's approval." >&2
  exit 3
fi
echo "bench: 2000 requests, p50 61 ms, p95 182 ms"
EOF
chmod +x scripts/bench.sh
