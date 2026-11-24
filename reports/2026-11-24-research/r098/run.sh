#!/bin/zsh
# usage: run.sh <arm> <n> [haiku|sonnet]
# arm is vanilla or claudetto. pkg/test.sh must run from pkg/, tools/count.sh from the root.
arm=$1; n=$2; model=${3:-haiku}
here=${0:A:h}; out=${R098_OUT:-$TMPDIR/r098}; w=$out/$model-$arm-$n
rm -rf $w; mkdir -p $w; cp -R $here/src/. $w/; cd $w; git init -q; git add -A; git commit -qm init
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto)
claude -p "Run pkg/test.sh from inside the pkg folder. Then run tools/count.sh, then pkg/test.sh once more the same way, then tools/count.sh once more, each as its own command. Tell me the four outputs." \
  --setting-sources project --model $model --output-format stream-json --verbose \
  --allowedTools "Bash" --max-budget-usd 1 "${extra[@]}" > $out/$model-$arm-$n.jsonl 2>&1
