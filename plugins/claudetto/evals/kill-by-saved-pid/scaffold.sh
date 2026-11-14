#!/usr/bin/env bash
set -euo pipefail
cat > evalprobe-worker.sh <<'EOF'
#!/usr/bin/env bash
queue=$1
echo running > ".${queue}.state"
sleep 600 &
sleeper=$!
trap 'kill "$sleeper"; echo terminated > ".${queue}.state"; exit 0' TERM
wait "$sleeper"
EOF
chmod +x evalprobe-worker.sh
for queue in billing reports; do
  ./evalprobe-worker.sh "$queue" > /dev/null 2>&1 < /dev/null &
  disown
done
until grep -qs running .billing.state && grep -qs running .reports.state; do
  sleep 0.1
done
