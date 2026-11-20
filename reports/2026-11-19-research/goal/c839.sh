#!/bin/bash
# CTX-839: c839.sh <arm: mf|af> <model> <rep>. mf = plugin $.model.fork after the first answer (claudetto's
# handover call); af = the built-in Agent fork (subagent_type "fork") after the Read; ai = the same fork as the
# first call, before any other history; ms = mf with a one-line prompt and no tool call. Same fixture: a 600-line file.
# Prints the parent's last-request prompt total and the fork's first-request cache read.
export TMPDIR=/tmp/claude-501/ PATH=/tmp/claude-501/bin327:$PATH
G=$(cd "$(dirname "$0")" && pwd); arm=$1 m=$2 r=$3; W=/tmp/claude-501/goal/c839; d=$W/$arm-$m-$r; rm -rf $d; mkdir -p $d; cd $d; git init -q
python3 -c "
import random; random.seed(7)
w=['alpha','delta','river','stone','cloud','ember','quartz','maple','harbor','violet']
open('notes.txt','w').write('\n'.join(' '.join(random.choice(w) for _ in range(12)) for _ in range(600))+'\nLAST-LINE-5521\n')"
if [ $arm = mf ] || [ $arm = ms ]; then
  : > $W/fork.log; q="Read notes.txt with the Read tool and tell me its last line."; [ $arm = ms ] && q="Reply with the word ready."
  claude -p "$q" --plugin-dir $G/plugin839 --setting-sources project --model $m --output-format stream-json --verbose </dev/null 2>err > s.jsonl
elif [ $arm = ai ]; then
  CLAUDE_CODE_FORK_SUBAGENT=1 claude -p "Before anything else, call the Agent tool exactly once, with the description \"probe\", the prompt \"reply with the word fine\" and subagent_type \"fork\". When it finishes, reply with one word." --setting-sources project --model $m --permission-mode bypassPermissions --output-format stream-json --verbose </dev/null 2>err > s.jsonl
else
  CLAUDE_CODE_FORK_SUBAGENT=1 claude -p "Read notes.txt with the Read tool and tell me its last line. Then call the Agent tool exactly once, with the description \"probe\", the prompt \"reply with the word fine\" and subagent_type \"fork\". When it finishes, reply with one word." --setting-sources project --model $m --permission-mode bypassPermissions --output-format stream-json --verbose </dev/null 2>err > s.jsonl
fi
python3 - "$arm-$m-$r" s.jsonl $W/fork.log <<'PY'
import json,sys,os
lab,s,fl=sys.argv[1:]; par=[]; sub=[]; cost=None
for l in open(s):
  e=json.loads(l)
  if e.get("type")=="assistant":
    u=e["message"]["usage"]; t=(u["input_tokens"]+u["cache_read_input_tokens"]+u["cache_creation_input_tokens"], u["cache_read_input_tokens"])
    (sub if e.get("parent_tool_use_id") else par).append(t)
  if e.get("type")=="result": cost=e.get("total_cost_usd")
if os.path.exists(fl) and open(fl).read().strip():
  u=json.loads(open(fl).read().strip().splitlines()[-1])["usage"]; sub=[(u["input_tokens"]+u["cache_read_input_tokens"]+u["cache_creation_input_tokens"],u["cache_read_input_tokens"])]
# The fork resends what the parent sent last before it: the parent's last request (mf) or the request carrying the Agent call (af).
prev=par[-1] if lab[:2] in ("mf","ms") else par[-2]
f=sub[0] if sub else (0,0)
print(f"{lab} parent_prev_total={prev[0]} fork_total={f[0]} fork_read={f[1]} read_share_of_parent={f[1]/prev[0]:.3f} cost={cost}")
PY
