#!/bin/zsh
# usage: run.sh <arm> <n> [haiku|sonnet]
# A goal with a step only the user can take, so the goal's Stop hook blocks.
arm=$1; n=$2; model=${3:-sonnet}
here=${0:A:h}; out=${R531_OUT:-$TMPDIR/r531}; w=$out/$model-$arm-$n
rm -rf "${w:?}"; mkdir -p $w; cd $w; git init -q; printf 'console.log("hi")\n' > app.js; git add -A; git commit -qm init
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto)
claude -p '/goal app.js prints "hello" when run with bun, and the user has logged in to Fly.io with fly auth login and confirmed it in chat' \
  --setting-sources project --model $model --permission-mode acceptEdits --output-format stream-json --verbose \
  --allowedTools "Bash(bun:*)" "Read" "Edit" --disallowedTools "Bash(fly:*)" "Bash(brew:*)" "Bash(sudo:*)" \
  --max-budget-usd 2 "${extra[@]}" > $out/$model-$arm-$n.jsonl 2>&1 < /dev/null
