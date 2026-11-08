#!/bin/zsh
# One real session of the working-tree plugin through the budget gate, with a small handover size so the idle fork runs.
set -u
P=/tmp/probe-paid; D=/tmp/probe-147; LOG=$D/gate.jsonl
rm -f $LOG $D/bodies.jsonl $D/gate-url.txt; rm -rf $P/work/.claude/claudetto/handoffs
echo first-handover > /tmp/ab/arm.txt
bun $P/trust.ts on
bun /tmp/ab/gate.ts https://api.anthropic.com $LOG 150000 150000 $D/bodies.jsonl > $D/gate-url.txt & gpid=$!
until [ -s $D/gate-url.txt ]; do sleep 0.2; done
(cd $P/work && env -u ANTHROPIC_API_KEY ANTHROPIC_BASE_URL=$(cat $D/gate-url.txt) DISABLE_TELEMETRY=1 DISABLE_AUTOUPDATER=1 DISABLE_AUTO_COMPACT=1 \
  python3 -I /Users/krystian/CodeProjects/xsyetopz/claudetto/claudekit/summary-cost/pty.py $D/capture.txt 240 \
  claude --setting-sources project \
  --plugin-dir /Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto --model claude-sonnet-5-5 \
  "$(cat /tmp/probe-147/prompt.txt)")
bun $P/trust.ts off
sleep 2; kill $gpid
ls $P/work/.claude/claudetto/handoffs 2>&1
bun -e 'for (const l of require("fs").readFileSync(process.argv[1],"utf8").trim().split("\n")) { const e=JSON.parse(l); console.log(e.refused?"REFUSED":`${e.model} msgs ${e.msgs} tools ${e.tools} in ${e.usage?.input_tokens} write ${e.usage?.cache_creation_input_tokens} read ${e.usage?.cache_read_input_tokens} out ${e.usage?.output_tokens} total ${e.total}`); }' $LOG
