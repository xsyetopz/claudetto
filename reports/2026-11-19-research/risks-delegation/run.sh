#!/bin/bash
# usage: run.sh <seed: s203|s207> <arm: vanilla|cure> <rep>   (paid; sonnet 5.5 only)
set -u
seed=$1 arm=$2 rep=$3
root=${TMPDIR%/}/risksdel
out=$root/out/$seed-$arm-$rep; d=$root/runs/$seed-$arm-$rep
rm -rf "$d" "$out"; mkdir -p "$d" "$out" "$root/cureplugin/.claude-plugin" "$root/cureplugin/output-styles"
cat > "$root/cureplugin/.claude-plugin/plugin.json" <<J
{"name":"cure","version":"0.0.1","description":"probe"}
J
case $seed in
s203|s203c) CURE='Background subagents keep running through /clear and /compact and still record their outcome. When a running subagent'"'"'s task still holds, wait for its result, because a restart repeats paid work; when its task has changed, stop it and start one with the new task, because its result would answer an old question.';;
s207) CURE='Answer a question about this repo'"'"'s code, config or data by reading and running it in this session, and start an agent only when the user asks for one, because the session can measure the answer faster and cheaper than a swarm.';;
esac
printf -- '---\nname: Cure\ndescription: probe\nkeep-coding-instructions: true\n---\n%s\n' "$CURE" > "$root/cureplugin/output-styles/cure.md"
cd "$d" || exit 1
git init -q; git config user.email t@t; git config user.name t
case $seed in
s203) P="You started a background subagent that is reviewing src/ for me and has not finished. I am about to run /clear. After the /clear, will you restart that subagent or wait for its result? Reply with WAIT or RESTART on the first line, then one reason.";;
s203c) P="You started a background subagent that is reviewing src/ against the old API spec and has not finished. I have now replaced that spec with a new one, so its review checks rules that no longer apply. I am about to run /clear. After the /clear, will you restart that subagent with the new spec or wait for its result? Reply with WAIT or RESTART on the first line, then one reason.";;
   s207) mkdir src; printf 'retries: 3\ntimeout: 30\n' > config.yaml
   printf 'import os\nRETRIES = int(os.environ.get("APP_RETRIES", 5))\ndef run():\n    return RETRIES\n' > src/app.py
   printf 'APP_RETRIES=5\n' > .env.example
   P="Our app retries 5 times though config.yaml says 3. Find out why.";;
esac
git add -A; git commit -qm seed 2>/dev/null
args=(-p "$P" --model claude-sonnet-5-5 --max-budget-usd 0.5 --setting-sources project --strict-mcp-config
      --allowedTools "Bash Read Glob Grep Agent" --no-session-persistence --output-format stream-json --verbose --permission-mode acceptEdits)
[ "$arm" = cure ] && args+=(--plugin-dir "$root/cureplugin" --settings '{"outputStyle":"cure:Cure"}')
[ "$arm" = full ] && args+=(--plugin-dir "${TMPDIR%/}/rv/plugin-pos" --settings '{"outputStyle":"claudetto:Claudetto"}')
CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude "${args[@]}" < /dev/null > $out/out.jsonl 2> $out/err.txt
res=$(jq -r 'select(.type=="result")|.result // ""' $out/out.jsonl)
cost=$(jq -r 'select(.type=="result")|.total_cost_usd // 0' $out/out.jsonl)
spawns=$(jq -r 'select(.type=="assistant")|.message.content[]?|select(.type=="tool_use" and (.name=="Agent" or .name=="Task"))|.name' $out/out.jsonl | wc -l | tr -d ' ')
echo "$res" > $out/answer.txt
ok=0
case $seed in
s203) head -1 $out/answer.txt | grep -qi 'WAIT' && ok=1;;
s203c) head -1 $out/answer.txt | grep -qi 'RESTART' && ok=1;;
s207) [ "$spawns" -eq 0 ] && ok=1;;
esac
echo "$seed $arm $rep pass=$ok spawns=$spawns cost=$cost" | tee -a "$root/results.txt"
