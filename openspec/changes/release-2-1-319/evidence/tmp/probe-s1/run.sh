#!/bin/sh
# usage: run.sh 'command'  (runs in /tmp/probe-s1/proj, CLAUDE_CONFIG_DIR=$CCD HOME=/tmp/probe-s1/home)
cd /tmp/probe-s1/proj || exit 1
PORT=$((20000 + $$ % 10000)); export PORT PROBE_TOOL PROBE_INPUT PROBE_CMD="$1"
bun /tmp/probe-s1/api.ts & S=$!; sleep 1
CLAUDE_CONFIG_DIR=$CCD HOME=/tmp/probe-s1/home ANTHROPIC_BASE_URL=http://127.0.0.1:$PORT ANTHROPIC_API_KEY=sk-fake DISABLE_TELEMETRY=1 \
 claude -p go --no-session-persistence --setting-sources project --permission-mode default --allowedTools "${ALLOW:-Bash}" >/dev/null 2>/tmp/probe-s1/err.log
kill $S
