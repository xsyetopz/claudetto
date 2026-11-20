#!/bin/bash
# RISK-014 probe. usage: e-014.sh <fixture: r014a|r014b|r014c> <van|cto> <rep>
# Seed session (Haiku 5.5, persisted) uses a deferred tool through ToolSearch; then `claude -p` resumes it with an EMPTY prompt
# (stdin </dev/null), the shape that hits chunk-rap1tzf6.js "No deferred tool marker found".
#  r014a: resume by id (--resume <id>);  r014b: --continue;  r014c: resume by id WITH a prompt argument (control: no message expected).
# Output: line "<fx> <arm> <rep> msg=<0|1> rc=<n> cost=<usd>" to $G/results.txt. Message judged on stderr+stdout of the resume only.
set -u
fx=$1 arm=$2 rep=$3
here=$(cd "$(dirname "$0")" && pwd)
G=${GOAL_ROOT:-/tmp/claude-501/goal}; name=$fx-$arm-$rep; repo=$G/repos/$name; out=$G/out/$name
rm -rf "$repo" "$out"; mkdir -p "$repo" "$out"; (cd "$repo" && git init -q)
unset_args=(); for v in $(sed 's/=.*//' /tmp/claude-501/risks/unset.txt | grep -v '^-u$'); do unset_args+=(-u "$v"); done
extra=(); [ "$arm" = cto ] && extra=(--plugin-dir "$G/plug" --settings '{"outputStyle":"claudetto:Claudetto"}')
C=(env "${unset_args[@]}" CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude)
common=(--model claude-haiku-5-5 --max-budget-usd 0.3 --setting-sources project --strict-mcp-config ${extra[@]+"${extra[@]}"})
cd "$repo"
"${C[@]}" -p "Use the ToolSearch tool to load the schema of the deferred tool NotebookEdit, then reply with just OK." "${common[@]}" --allowedTools ToolSearch --output-format stream-json --verbose </dev/null > "$out/seed.jsonl" 2> "$out/seed.err"
sid=$(jq -r 'select(.type=="result")|.session_id' "$out/seed.jsonl")
used=$(jq -r 'select(.type=="assistant")|.message.content[]?|select(.type=="tool_use" and .name=="ToolSearch")|.name' "$out/seed.jsonl" | wc -l | tr -d ' ')
c1=$(jq -r 'select(.type=="result")|.total_cost_usd' "$out/seed.jsonl")
case $fx in
 r014a) "${C[@]}" -p --resume "$sid" "${common[@]}" </dev/null > "$out/res.out" 2> "$out/res.err"; rc=$?;;
 r014b) "${C[@]}" -p --continue "${common[@]}" </dev/null > "$out/res.out" 2> "$out/res.err"; rc=$?;;
 r014c) "${C[@]}" -p "Reply with just PONG." --resume "$sid" "${common[@]}" </dev/null > "$out/res.out" 2> "$out/res.err"; rc=$?;;
esac
msg=$(cat "$out/res.out" "$out/res.err" | grep -c -F "No deferred tool marker found")
echo "$fx $arm $rep msg=$msg rc=$rc seed_toolsearch=$used cost=$c1" | tee -a "$G/results.txt"
