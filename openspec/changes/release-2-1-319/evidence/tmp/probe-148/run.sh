#!/bin/zsh
# Usage: run.sh NAME TIMEOUT SETTINGS-JSON  PROMPT-FILE  [FOLLOWUPS]
# One real session of the working-tree plugin through the budget gate, with typed follow-ups from drive.py.
set -u
D=/tmp/probe-148; NAME=$1; TO=$2; SET=$3; PROMPT=$4; FOLLOW=${5:-}
LOG=$D/gate-$NAME.jsonl
rm -f $LOG $D/bodies-$NAME.jsonl $D/gate-url-$NAME.txt; rm -rf $D/work/.claude/claudetto/handoffs
echo $NAME > /tmp/ab/arm.txt
if [ "${FAKE:-}" = 1 ]; then rm -f $D/url.txt $D/fake-bodies.jsonl; bun $D/fake.ts > $D/fake.log 2>&1 & fpid=$!; until [ -s $D/url.txt ]; do sleep 0.2; done; UP=$(cat $D/url.txt); ENVS=(); else fpid=; UP=https://api.anthropic.com; ENVS=(); fi; bun $D/trust.ts on
bun /tmp/ab/gate.ts $UP $LOG 4000000 8000000 $D/bodies-$NAME.jsonl > $D/gate-url-$NAME.txt & gpid=$!
until [ -s $D/gate-url-$NAME.txt ]; do sleep 0.2; done
(cd $D/work && env -u ANTHROPIC_API_KEY $ENVS ANTHROPIC_BASE_URL=$(cat $D/gate-url-$NAME.txt) DISABLE_TELEMETRY=1 DISABLE_AUTOUPDATER=1 DISABLE_AUTO_COMPACT=1 \
  python3 -I $D/drive.py $D/capture-$NAME.txt $TO $LOG "$FOLLOW" \
  claude --setting-sources project --settings "$SET" \
  --plugin-dir /Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto --model claude-sonnet-5-5 \
  "$(cat $PROMPT)")
bun $D/trust.ts off
sleep 2; kill $gpid; [ -n "$fpid" ] && kill $fpid
