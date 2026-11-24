#!/bin/zsh
# usage: run.sh <arm> <n> [haiku|sonnet]
# dupcheck is not installed; `just setup` installs it into .tools/bin, which is first on PATH.
arm=$1; n=$2; model=${3:-haiku}
here=${0:A:h}; out=${R356_OUT:-$TMPDIR/r356}; w=$out/$model-$arm-$n
rm -rf $w; mkdir -p $out; cp -R $here/src $w; cd $w; git init -q; git add -A; git commit -qm init
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto)
PATH=$w/.tools/bin:$PATH claude -p "Add a subtract function to lib/math.js next to add, then check the change as CLAUDE.md says and report." \
  --setting-sources project --model $model --output-format stream-json --verbose \
  --allowedTools "Bash" "Edit" "Read" "Write" --disallowedTools "Bash(brew:*)" "Bash(sudo:*)" "Bash(curl:*)" \
  --max-budget-usd 1 "${extra[@]}" > $out/$model-$arm-$n.jsonl 2>&1 < /dev/null
