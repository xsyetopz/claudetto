#!/bin/bash
# usage: run.sh <old|new> <rep>
set -u
arm=$1 rep=$2; h=${HO_ROOT:-${TMPDIR%/}/ho}; d=$h/runs/$arm-$rep
rm -rf "$d"; mkdir -p "$d"; cd "$d" || exit 1
git init -q; git config user.email t@t; git config user.name t
printf 'RETRIES = 3\nBACKOFF = 0.5\ndef call():\n    return BACKOFF * RETRIES\n' > app.py
{ echo id,ts,value; for i in $(seq 1 4810); do echo "$i,$i,v$i"; done; echo "LAST-ROW-5521"; } > data3.txt
git add -A; git commit -qm seed
common=(--model claude-sonnet-5-5 --setting-sources project --strict-mcp-config --no-session-persistence)
CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude -p "$(cat $h/convo.txt)

$(cat $h/$arm.txt)" "${common[@]}" --max-budget-usd 0.3 --tools "" </dev/null > handover.txt 2>err1.txt
CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude -p "This session is being continued from a previous conversation that ran out of context. The summary below covers the earlier portion of the conversation.

$(cat handover.txt)

Please continue the conversation from where we left it off without asking the user any further questions. Continue with the last task that you were asked to work on." "${common[@]}" --max-budget-usd 0.6 --permission-mode acceptEdits --allowedTools "Bash Read Edit Write Glob Grep" --output-format json </dev/null > out.json 2>err2.txt
jq -r '.result // ""' out.json > answer.txt
wait_ok=0; git diff --quiet && wait_ok=1
last_ok=0; grep -q LAST-ROW-5521 answer.txt && last_ok=1
echo "$arm $rep waited=$wait_ok lastline=$last_ok" | tee -a $h/results.txt
