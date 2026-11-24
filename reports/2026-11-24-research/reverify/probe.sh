#!/bin/zsh
# usage: probe.sh <name> <git|nogit> <prompt> [claude args...]
# Runs one headless claude with all three plugins in a fresh folder; the folder's setup comes from
# setup/<name>.sh when it exists. The stream-json transcript lands in $REVERIFY_OUT/<name>.jsonl.
name=$1; kind=$2; prompt=$3; shift 3
here=${0:A:h}; repo=${here:h:h:h}; out=${REVERIFY_OUT:-$TMPDIR/reverify}; w=$out/$name
rm -rf "${w:?}"; mkdir -p $w; cd $w
[[ -f $here/setup/$name.sh ]] && zsh $here/setup/$name.sh
if [[ $kind == git ]]; then git init -q; git add -A; git commit -qm init --allow-empty; fi
claude -p "$prompt" --setting-sources project --model ${REVERIFY_MODEL:-sonnet} --output-format stream-json --verbose \
  --plugin-dir $repo/plugins/claudetto --plugin-dir $repo/plugins/claudetto-spec \
  --plugin-dir $repo/plugins/claudetto-you-should-know \
  --disallowedTools "Bash(brew:*)" "Bash(sudo:*)" --max-budget-usd 2 "$@" > $out/$name.jsonl 2>&1 < /dev/null
echo "$name exit $? -> $out/$name.jsonl"
