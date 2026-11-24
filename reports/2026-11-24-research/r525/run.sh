#!/bin/zsh
# usage: run.sh <arm> <n> [batch|free] [haiku|sonnet]
# arm is vanilla or claudetto; batch asks for all six at once, free leaves the fan-out to the model.
arm=$1; n=$2; kind=${3:-batch}; model=${4:-haiku}
here=${0:A:h}; out=${R525_OUT:-$TMPDIR/r525}; w=$out/$kind-$model-$arm-$n
rm -rf $w; mkdir -p $w; cp $here/src/*.py $w/; cd $w
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto)
how="all of them at once in the background"; [[ $kind == free ]] && how="in the background"
CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS=4 claude -p "For each of the six files mod1.py to mod6.py, start one subagent, $how, that first runs the shell command sleep 40, then reads its file and reports the largest multiplier in it. When all six have reported, give me a table of file and largest multiplier." \
  --setting-sources project --model $model --output-format stream-json --verbose \
  --allowedTools "Bash(sleep:*)" --max-budget-usd 2 "${extra[@]}" > $out/$kind-$model-$arm-$n.jsonl 2>&1
