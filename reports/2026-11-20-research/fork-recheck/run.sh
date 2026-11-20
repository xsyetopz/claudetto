#!/bin/bash
# RISK-507 recheck (issue #64), free: fake API stub, no paid calls. run.sh <claude-binary> <port>
# Runs claudetto's handover call ($.model.fork via plugin839) after a one-line first answer and logs request bodies.
# Then cmp.py reports whether the fork resends the parent's last message in the shape the parent sent it.
set -u
BIN=$1 PORT=$2 H=$(cd "$(dirname "$0")" && pwd) R=$(cd "$H/../../.." && pwd)
V=$("$BIN" --version | cut -d' ' -f1); D=/tmp/claude-501/fork-recheck/$V; rm -rf $D; mkdir -p $D/cfg $D/proj /tmp/claude-501/goal/c839
bun $R/reports/2026-11-19-research/tick-rerun/ctx/stub.ts $PORT $D/raw.log >/dev/null 2>&1 & S=$!; sleep 1.5
(cd $D/proj && git init -q && env -i HOME=$HOME PATH=/usr/bin:/bin:/opt/homebrew/bin TMPDIR=/tmp/claude-501/ DISABLE_AUTOUPDATER=1 \
  CLAUDE_CODE_MAX_RETRIES=0 CLAUDE_CONFIG_DIR=$D/cfg ANTHROPIC_API_KEY=sk-ant-fake ANTHROPIC_BASE_URL=http://127.0.0.1:$PORT \
  "$BIN" -p "Reply with the word ready." --plugin-dir $R/reports/2026-11-19-research/goal/plugin839 --setting-sources project </dev/null >/dev/null 2>$D/err)
sleep 1; kill $S
python3 -I $H/cmp.py "$V" $D/raw.log
