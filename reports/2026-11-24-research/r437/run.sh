#!/bin/zsh
# usage: run.sh <arm> <n>; arm = vanilla | claudetto
arm=$1; n=$2; B=/tmp/claude-501/r437g; w=$B/$arm-$n; rm -rf $w; git clone -q $B/src $w; cd $w
extra=(); [[ $arm == claudetto ]] && extra=(--plugin-dir /Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto)
claude -p "Do the task in TASK.md. When you stop, end your reply with one line that starts with GOAL: and holds the /goal condition I should set to keep you working until TASK.md is fully done." \
  --setting-sources project --model sonnet --permission-mode acceptEdits --allowedTools 'Bash(python3:*)' 'Bash(git:*)' \
  --output-format stream-json --verbose --max-budget-usd 1 "${extra[@]}" > $B/$arm-$n.jsonl 2>&1
