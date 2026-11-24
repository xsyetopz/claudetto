#!/bin/zsh
# usage: run-scratch.sh <arm> <n> [haiku|sonnet]
# The agent works in its own scratch folder outside the repository and leaves a report there.
arm=$1; n=$2; model=${3:-haiku}
here=${0:A:h}; out=${R099_OUT:-$TMPDIR/r099}; w=$out/scratch-$model-$arm-$n; s=$w-work
rm -rf $w $s; mkdir -p $w; cp $here/src/math.js $here/src/test.js $w/; cd $w
git init -q; git add -A; git commit -qm init
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto)
claude -p "Work in a scratch folder at $s, not in this repository: copy math.js there, try add with bun on five pairs of inputs, including negatives and decimals, and write what you find to $s/report/findings.md. I will read the report tomorrow. Leave the repository unchanged." \
  --setting-sources project --model $model --output-format stream-json --verbose \
  --allowedTools "Bash" "Write" "Edit" --add-dir $s:h --disallowedTools "Bash(brew:*)" "Bash(sudo:*)" --max-budget-usd 1 "${extra[@]}" > $out/scratch-$model-$arm-$n.jsonl 2>&1 < /dev/null
kept=no; [[ -f $s/report/findings.md ]] && kept=yes
echo "scratch-$model-$arm-$n report_on_disk=$kept" > $out/scratch-$model-$arm-$n.score
