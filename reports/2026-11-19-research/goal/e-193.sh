#!/bin/bash
# RISK-193 probe. usage: e-193.sh <fixture: r193a|r193b|r193x> <van|cto> <rep>
#  r193a: main Sonnet 5.5, Agent call with model param "haiku"      -> expect resolvedModel claude-haiku-5-5
#  r193c: as r193a but subagent_type is a project agent `probe2` with NO model line (r193a failed on cto: claudetto removes general-purpose, so 6/6 cto runs were fixture errors, not served-model faults)
#  r193b: main Haiku 5.5, Agent call to project agent `probe` (file model claude-sonnet-5-5) -> expect claude-sonnet-5-5
#  r193x: POSITIVE control (van only): r193b plus CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5 and CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1 (FORCE alone only strips the model param and defers to _MODEL); the scorer must flag it.
# Writes $out/events.jsonl (stream-json) and summary.json; scorer: scorers/r193*.py.
set -u
fx=$1 arm=$2 rep=$3
here=$(cd "$(dirname "$0")" && pwd)
G=${GOAL_ROOT:-/tmp/claude-501/goal}; name=$fx-$arm-$rep; repo=$G/repos/$name; out=$G/out/$name
rm -rf "$repo" "$out"; mkdir -p "$repo/.claude/agents" "$out"; (cd "$repo" && git init -q)
unset_args=(); for v in $(sed 's/=.*//' /tmp/claude-501/risks/unset.txt | grep -v '^-u$'); do unset_args+=(-u "$v"); done
extra=(); [ "$arm" = cto ] && extra=(--plugin-dir "$G/plug" --settings '{"outputStyle":"claudetto:Claudetto"}')
fxenv=(); main=claude-sonnet-5-5
case $fx in
 r193a) P='Call the Agent tool once with subagent_type general-purpose, model "haiku", and prompt "Reply with the single word PONG." Then say DONE.';;
 r193c) printf -- '---\nname: probe2\ndescription: replies PONG\n---\nReply with the single word PONG.\n' > "$repo/.claude/agents/probe2.md"
   P='Call the Agent tool once with subagent_type probe2, model "haiku", and prompt "Reply with the single word PONG." Then say DONE.';;
 r193b|r193x) main=claude-haiku-5-5
   printf -- '---\nname: probe\ndescription: replies PONG\nmodel: claude-sonnet-5-5\n---\nReply with the single word PONG.\n' > "$repo/.claude/agents/probe.md"
   P='Call the Agent tool once with subagent_type probe and prompt "Reply PONG." Then say DONE.'
   [ $fx = r193x ] && fxenv=(CLAUDE_CODE_SUBAGENT_MODEL=claude-haiku-5-5 CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1);;
esac
cd "$repo"
env "${unset_args[@]}" CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 ${fxenv[@]+"${fxenv[@]}"} claude -p "$P" --model $main --max-budget-usd 0.4 --setting-sources project --strict-mcp-config \
  --allowedTools "Agent" --no-session-persistence --output-format stream-json --verbose ${extra[@]+"${extra[@]}"} </dev/null > "$out/events.jsonl" 2> "$out/err.txt"
python3 -I - "$out" <<'P'
import json,sys
o=sys.argv[1]; tools=[]; r={}
for l in open(o+"/events.jsonl"):
    try: e=json.loads(l)
    except Exception: continue
    if e.get("type")=="assistant":
        tools+=[b["name"] for b in e["message"].get("content",[]) if b.get("type")=="tool_use"]
    if e.get("type")=="result": r=e
json.dump({"tools":tools,"ask":0,"cost":r.get("total_cost_usd",0),"answer":r.get("result","")},open(o+"/summary.json","w"))
P
python3 -I "$here/scorers/$fx.py" "$fx" "$repo" "$out" | sed "s/^$fx /$fx $arm /" | tee -a "$G/results.txt"
