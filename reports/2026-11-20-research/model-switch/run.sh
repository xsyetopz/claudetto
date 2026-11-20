#!/bin/bash
# Provokes each model-switch path of RISK-193 against stub.ts and prints what the client shows (issue #62).
# Usage: bash run.sh <out-dir> <claude-binary> [plugin-dir]
out=$1 bin=$2 plug=$3
here=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$out"
arm=van; extra=()
[ -n "$plug" ] && { arm=cto; extra=(--plugin-dir "$plug"); }
port=47820
probe() { # name mode bad-model input-kind args...
	local name=$1 mode=$2 bad=$3 kind=$4; shift 4
	local log="$out/$name-$arm.log" res="$out/$name-$arm.out"
	: > "$log"
	port=$((port + 1))
	bun "$here/stub.ts" "$port" "$log" "$mode" "$bad" & local sp=$!
	sleep 1
	local common=(--output-format stream-json --verbose --setting-sources "" "${extra[@]}" "$@")
	if [ "$kind" = compact ]; then
		printf '%s\n' '{"type":"user","message":{"role":"user","content":"say ok"}}' '{"type":"user","message":{"role":"user","content":"/compact"}}' |
			(cd "$out" && env -u CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_BASE_URL=http://127.0.0.1:$port ANTHROPIC_API_KEY=sk-stub DISABLE_AUTOUPDATER=1 timeout 150 "$bin" -p --input-format stream-json "${common[@]}") > "$res" 2>"$res.err"
	else
		(cd "$out" && env -u CLAUDE_CODE_OAUTH_TOKEN ANTHROPIC_BASE_URL=http://127.0.0.1:$port ANTHROPIC_API_KEY=sk-stub DISABLE_AUTOUPDATER=1 timeout 150 "$bin" -p "say ok" "${common[@]}" </dev/null) > "$res" 2>"$res.err"
	fi
	echo "== $name $arm exit=$?"
	kill "$sp" 2>/dev/null
	python3 -I "$here/show.py" "$res" "$log"
}
probe overload-flag overload claude-sonnet-5-5 plain --model claude-sonnet-5-5 --fallback-model claude-haiku-5-5
probe overload-noflag overload claude-sonnet-5-5 plain --model claude-sonnet-5-5
probe server-flag server claude-sonnet-5-5 plain --model claude-sonnet-5-5 --fallback-model claude-haiku-5-5
probe compact-flag compact claude-sonnet-5-5 compact --model claude-sonnet-5-5 --fallback-model claude-haiku-5-5
probe compact-noflag compact claude-sonnet-5-5 compact --model claude-sonnet-5-5
probe known-model ok none plain --model claude-sonnet-5-5 --effort high
probe unknown-model ok none plain --model claude-zeta-9-1 --effort high
