#!/bin/zsh
# usage: run.sh <arm> <n> [haiku|sonnet]
# vemu is a stub on PATH that takes single-dash options and logs every call. docs/vemu.md has them; README.md does not point there.
arm=$1; n=$2; model=${3:-haiku}
here=${0:A:h}; out=${R521_OUT:-$TMPDIR/r521}; w=$out/$model-$arm-$n
rm -rf $w; mkdir -p $out; cp -R $here/src $w; cd $w; git init -q; git add -A; git commit -qm init
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir ${here:h:h:h}/plugins/claudetto --settings '{"outputStyle":"claudetto:Claudetto"}')
VEMU_LOG=$out/$model-$arm-$n.calls PATH=$here/bin:$PATH claude -p "Run the emulator headless on roms/demo.bin and tell me what it prints." \
  --setting-sources project --model $model --output-format stream-json --verbose \
  --allowedTools "Bash" "Read" --disallowedTools "Bash(brew:*)" "Bash(sudo:*)" "Bash(curl:*)" \
  --max-budget-usd 1 "${extra[@]}" > $out/$model-$arm-$n.jsonl 2>&1 < /dev/null
