#!/bin/bash
# usage: ARM=vanilla|style TOKEN=none|dummy run405.sh <rep>   RISK-405: does a claude.ai login credential reach a custom ANTHROPIC_BASE_URL?
set -u
here=$(cd "$(dirname "$0")" && pwd)
rep=$1 arm=${ARM:-vanilla} tok=${TOKEN:-none}
root=/tmp/claude-501/acc-reply-c; bin=/tmp/claude-501/bin329/claude
plugin=/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto
w=$root/runs/405-$arm-$tok-$rep; d=$w/repo o=$w/out
rm -rf "$w"; mkdir -p "$d" "$o"; : > "$o/requests.jsonl"; cd "$d" && git init -q -b main && echo x > a.txt && git add -A && git -c user.email=t@t -c user.name=t commit -qm seed
port=$((20000 + RANDOM % 20000)); dummy=dummy-not-a-real-token
python3 -I "$here/fakeapi.py" $port "$o/requests.jsonl" "$dummy" & srv=$!
sleep 1
args=(-p "Say hi." --model claude-sonnet-5-5 --max-budget-usd 0.6 --setting-sources project --strict-mcp-config --no-session-persistence --output-format json)
settings='{}'
[ "$arm" = style ] && { settings='{"outputStyle":"claudetto:Claudetto"}'; args+=(--plugin-dir "$plugin"); }
[ "$settings" != '{}' ] && args+=(--settings "$settings")
envs=(DISABLE_AUTOUPDATER=1 CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 ANTHROPIC_BASE_URL=http://127.0.0.1:$port API_TIMEOUT_MS=15000)
[ "$tok" = dummy ] && envs+=(ANTHROPIC_AUTH_TOKEN=$dummy)
env -u ANTHROPIC_API_KEY -u ANTHROPIC_AUTH_TOKEN "${envs[@]}" "$bin" "${args[@]}" < /dev/null > "$o/out.jsonl" 2> "$o/err.txt" & cp=$!
for _ in $(seq 1 60); do kill -0 $cp 2>/dev/null || break; sleep 1; done; kill $cp 2>/dev/null
kill $srv 2>/dev/null
n=$(jq -s length "$o/requests.jsonl")
auth=$(jq -s '[.[]|select(.authorization)]|length' "$o/requests.jsonl" 2>/dev/null || echo 0)
xk=$(jq -s '[.[]|select(.x_api_key)]|length' "$o/requests.jsonl" 2>/dev/null || echo 0)
dummyok=$(jq -s '[.[]|select(.authorization_is_expected_dummy==true or .x_api_key_is_expected_dummy==true)]|length' "$o/requests.jsonl" 2>/dev/null || echo 0)
cost=$(jq -r '.total_cost_usd // 0' "$o/out.jsonl" 2>/dev/null || echo 0)
# pass (token=none): requests arrived and none carried Authorization or x-api-key. token=dummy control: credential headers carry the dummy.
if [ "$tok" = none ]; then ok=0; [ "$n" -gt 0 ] && [ "$auth" = 0 ] && [ "$xk" = 0 ] && ok=1
else ok=0; [ "$n" -gt 0 ] && [ "$dummyok" -gt 0 ] && ok=1; fi
echo "405 $arm-$tok $rep pass=$ok cost=$cost requests=$n with_authorization=$auth with_x_api_key=$xk with_expected_dummy=$dummyok" | tee -a $root/results.txt
