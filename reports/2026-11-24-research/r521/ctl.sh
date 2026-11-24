#!/bin/zsh
# usage: ctl.sh <arm> <n>
# Control: a familiar program (git). The docs line must not add calls.
arm=$1; n=$2; here=${0:A:h}; out=${R521_OUT:-$TMPDIR/r521}; w=$out/ctl-$arm-$n
rm -rf "${w:?}"; mkdir -p $out; cp -R $here/src $w; cd $w; git init -q; git add -A; git commit -qm "init demo"
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto --settings '{"outputStyle":"claudetto:Claudetto"}')
claude -p "Show the subject of the last commit." --setting-sources project --model sonnet \
  --output-format stream-json --verbose --allowedTools "Bash" "Read" --max-budget-usd 1 "${extra[@]}" > $w.jsonl 2>&1 < /dev/null
