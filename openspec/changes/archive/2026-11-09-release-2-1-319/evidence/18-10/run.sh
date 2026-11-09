#!/bin/zsh
# usage: run.sh ; starts the fake, runs one claude -p, prints results
cd /tmp/probe-18-10
rm -rf fake/*; cp plan.json fake/plan.json
bun /tmp/claudekit-leftovers/claudekit/src/fake/server.ts fake/plan.json fake > fake/out.txt 2>&1 &
pid=$!
# The fake and the claude child stop however the script ends, so an interrupt leaves no orphan (task 18.17).
trap 'kill $pid $cpid 2>/dev/null' EXIT
trap 'exit 1' INT TERM HUP
for i in {1..50}; do grep -q listening fake/out.txt && break; sleep 0.2; done
port=$(sed -n 's/^listening //p' fake/out.txt)
env -i HOME="$HOME" PATH="$PATH" TMPDIR="$TMPDIR" CLAUDE_CONFIG_DIR=/tmp/probe-18-10/config \
 DISABLE_TELEMETRY=1 DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
 ANTHROPIC_BASE_URL=http://127.0.0.1:$port ANTHROPIC_API_KEY=sk-ant-fake-key-for-local-fake \
 claude -p go --no-session-persistence --debug-file /tmp/probe-18-10/debug.log \
 --settings /tmp/probe-18-10/sandbox.json --setting-sources "" --output-format stream-json --verbose \
 > out.jsonl 2> err.txt &
cpid=$!
wait $cpid
echo "claude exit $?"
