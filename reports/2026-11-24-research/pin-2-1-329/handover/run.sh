#!/bin/bash
# REQ-HANDOVER-060: the cost of a session that auto-compacts mid-task, claudetto with its handover
# against claudetto with CLAUDETTO_DISABLE_HANDOVER=1 (core's summarizer answers). claude 2.1.329.
# usage: run.sh <ho|core> <rep> ; CLAUDE_CODE_AUTO_COMPACT_WINDOW (WINDOW, default 60000) puts the
# threshold mid-task: five ~11k-token files on a 1M-window model. PROMPT and TAG (a results suffix)
# run the format variant.
set -u
arm=$1 rep=$2; root=${HO_ROOT:-${TMPDIR%/}/ho60}${TAG:-}; d=$root/$arm-$rep
plugin=/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto
rm -rf "$d"; mkdir -p "$d/repo"; cd "$d/repo" || exit 1
git init -q; git config user.email t@t; git config user.name t
for f in a b c d e; do { for i in $(seq 1 700); do echo "$f row $i: the quick brown fox jumps over the lazy dog $i"; done; echo "END-$f-$((RANDOM % 9000 + 1000))"; } > $f.txt; done
git add -A; git commit -qm seed
off=CLAUDETTO_ARM=ho; [ "$arm" = core ] && off=CLAUDETTO_DISABLE_HANDOVER=1
env "$off" CLAUDE_CODE_AUTO_COMPACT_WINDOW=${WINDOW:-60000} CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude -p \
  "${PROMPT:-Read a.txt, then b.txt, then c.txt, then d.txt, then e.txt, one Read call each, in that order. Then reply with the last line of each file, one per line.}" \
  --model claude-sonnet-5-5 --setting-sources project --strict-mcp-config --no-session-persistence \
  --plugin-dir "$plugin" --max-budget-usd 1.5 --allowedTools "Read" \
  --output-format stream-json --verbose </dev/null > "$d/events.jsonl" 2> "$d/err.txt"
want=$(tail -qn1 a.txt b.txt c.txt d.txt e.txt | tr '\n' ' ')
jq -s --arg arm "$arm" --arg rep "$rep" --arg want "$want" '
  (map(select(.type=="result"))|last) as $r
  | {arm:$arm, rep:$rep, cost:$r.total_cost_usd, compactions:(map(select(.type=="system" and .subtype=="compact_boundary"))|length),
     lines_ok:([$want|split(" ")[]|select(.!="")] | map(. as $w | ($r.result|contains($w))) | all),
     usage:$r.modelUsage}' "$d/events.jsonl" | tee -a "$root/results.jsonl"
