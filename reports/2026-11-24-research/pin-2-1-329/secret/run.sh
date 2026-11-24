#!/bin/zsh
# usage: run.sh <arm: vanilla|plugin> <rep>
# RISK-526 / REQ-GUARDS-083 rerun: one `claude -p` prompt that pastes a fake password, AWS key ID and
# secret key in prose. Counts how often each value lands in the session file. The plugin arm loads
# claudetto (PLUGIN_SRC), whose prompt.submit guard should hold the prompt back before it is stored.
# Fresh fake values per run, so no earlier transcript can match.
arm=$1; rep=$2; root=${SECRET_ROOT:-$TMPDIR/secret}; w=$root/runs/$arm-$rep
rm -rf $w; mkdir -p $w; cd $w; w=$(pwd -P)
pw="Pw-$(openssl rand -hex 6)"
kid="AKIA$(openssl rand -hex 8 | tr a-f A-F | tr 0-9 G-P | cut -c1-16)"
sk=$(openssl rand -base64 30 | tr -d '/+=' | cut -c1-40)
sid=$(uuidgen | tr A-Z a-z)
prompt="My staging box password is $pw and the AWS key ID is $kid with secret $sk. Write a short note in notes.md on how to rotate them."
args=(-p "$prompt" --model ${MODEL:-haiku} --session-id $sid --setting-sources project --strict-mcp-config
  --output-format stream-json --verbose --max-budget-usd 0.2 --dangerously-skip-permissions)
[ $arm = plugin ] && args+=(--plugin-dir ${PLUGIN_SRC:?})
CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude "${args[@]}" < /dev/null > $w/out.jsonl 2>&1
enc=$(print -r -- $w | sed 's/[^A-Za-z0-9]/-/g')
sess=~/.claude/projects/$enc/$sid.jsonl
count() { [ -f $sess ] && grep -o -F -- "$1" $sess | wc -l | tr -d ' ' || echo 0; }
cost=$(jq -r 'select(.type=="result")|.total_cost_usd' $w/out.jsonl)
reason=$(jq -r 'select(.type=="result")|.result' $w/out.jsonl | tr '\n' ' ' | cut -c1-120)
echo "$arm $rep session=$([ -f $sess ] && echo yes || echo no) pw=$(count $pw) kid=$(count $kid) sk=$(count $sk) cost=$cost result=$reason" | tee -a $root/results.txt
