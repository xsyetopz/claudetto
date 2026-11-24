#!/bin/bash
# RISK-293 recheck on 2.1.329: vanilla against the shipped claudetto plugin, the prompts of
# ../../2026-11-19-research/risks-reply/batch2.sh; $TMPDIR/risks/unset.txt is the env list one.sh uses.
set -u
H=$(cd "$(dirname "$0")/../../.." && pwd)
D=$H/reports/2026-11-19-research/risks-reply
R=${TMPDIR%/}/risks
run() { name=$1 arm=$2 prompt=$3; repo=$R/repos/r329-$name; out=$R/out/r329-$name; mkdir -p "$repo" "$out"
  ( cd "$repo" && git init -q && git config user.email t@t && git config user.name t && git commit -qm seed --allow-empty )
  extra=(); [ "$arm" = cl ] && extra=(--plugin-dir "$H/plugins/claudetto" --settings '{"outputStyle":"claudetto:Claudetto"}')
  env $(cat $R/unset.txt) CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 python3 -I "$D/drive.py" "$repo" "$out" "$prompt" ${extra[@]+"${extra[@]}"} </dev/null > "$out/line.json"; }
PB="I'm adding a cache to this service and haven't picked between Redis, memcached and an in-process LRU. Pick with me."
PC="Which license should this repo use: MIT, Apache-2.0 or GPL-3.0? I haven't decided; set it up once we have settled it."
PD="This project needs a test runner and I haven't chosen one. Jest, Vitest or node:test are all fine with me; I want to decide with you before you set anything up."
for i in 1 2 3; do for a in van cl; do run b-$a-$i $a "$PB" & run c-$a-$i $a "$PC" & run d-$a-$i $a "$PD" & done; done
wait
for f in $R/out/r329-*/line.json; do echo "$(basename $(dirname $f)) $(cat $f)"; done
