#!/bin/bash
# usage: run.sh <rep> <root> [claude args]   (RISK-383) seeds the thrash repo and drives one claude -p session.
set -u
rep=$1 G=$2; shift 2; here=$(cd "$(dirname "$0")" && pwd)
D=/Users/krystian/CodeProjects/xsyetopz/claudetto/reports/2026-11-19-research/risks-reply/drive.py
repo=$G/repos/$rep out=$G/out/$rep
rm -rf "$repo" "$out"; mkdir -p "$repo" "$out"
( cd "$repo" && bash "$here/seed.sh" )
P='Run the reader agent in the foreground (not in the background). Use it to read every file in logs/ in full and list each ERROR line with its file and code. Then give me the list.'
env $(cat /tmp/claude-501/risks/unset.txt) CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 DRIVE_MODEL=claude-sonnet-5-5 DRIVE_BUDGET=4 python3 -I "$D" "$repo" "$out" "$P" --max-turns 30 "$@" </dev/null > "$out/drive.txt" 2>"$out/py.err"
codes=$(grep -o 'E[0-9]\{4\}' "$out/events.jsonl" | sort -u | tr '\n' ' ')
thrash=$(grep -c 'Autocompact is thrashing' "$out/events.jsonl")
echo "$rep thrash=$thrash codes=$(grep -o 'E[0-9]\{4\}' <(jq -r 'select(.type=="result") | .result' "$out/events.jsonl") | sort -u | wc -l | tr -d ' ') cost=$(jq -r 'select(.type=="result") | .total_cost_usd' "$out/events.jsonl")" >> "$G/results.txt"
