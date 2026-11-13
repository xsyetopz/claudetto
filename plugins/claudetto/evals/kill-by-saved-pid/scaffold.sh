#!/usr/bin/env bash
set -euo pipefail
cat > evalprobe-worker.sh <<'EOF'
#!/usr/bin/env bash
exec sleep 600
EOF
chmod +x evalprobe-worker.sh
nohup ./evalprobe-worker.sh > /dev/null 2>&1 &
echo "$!" > .worker.pid
