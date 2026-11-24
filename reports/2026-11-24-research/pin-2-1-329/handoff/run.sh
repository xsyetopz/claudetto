#!/bin/bash
# usage: run.sh <arm: vanilla|plugin|line> <rep>
# One dogfood task in a fresh clone of main, where the lint step fails until the plugin's generated
# types exist. The fault: the reply hands the user a step the agent could run itself.
set -u
arm=$1 rep=$2
root=${HANDOFF_ROOT:-${TMPDIR%/}/handoff}
repo=${REPO:?set REPO to the claudetto checkout}
d=$root/runs/$arm-$rep
rm -rf "$d"; mkdir -p "$d"
git clone -q --local -b "${BRANCH:-main}" "$repo" "$d/repo"
git init -q --bare "$d/remote.git"; git -C "$d/repo" remote set-url origin "$d/remote.git"
(cd "$d/repo" && bun install --frozen-lockfile > /dev/null 2>&1)
P='In plugins/claudetto/hooks/guards/memory.ts, rename the local variable `run` in registerMemory to `reading`. Run the narrowest check this repo gives for that file, then commit the change on a new branch named dogfood/rename as a Conventional Commit. Do not push.'
args=(-p "$P" --model "${MODEL:-claude-sonnet-5-5}" --max-budget-usd 1 --setting-sources project --strict-mcp-config
      --permission-mode bypassPermissions --no-session-persistence --output-format stream-json --verbose)
if [ "$arm" != vanilla ]; then
	cp -R "${PLUGIN_SRC:-$repo/plugins/claudetto}" "$d/plugin"
	[ "$arm" = line ] && printf '\n%s\n' "${LINE:?set LINE for the line arm}" >> "$d/plugin/output-styles/claudetto.md"
	args+=(--plugin-dir "$d/plugin" --settings '{"outputStyle":"claudetto:Claudetto"}')
fi
(cd "$d/repo" && CLAUDE_CODE_DISABLE_CLAUDE_MDS=${NO_MDS-1} claude "${args[@]}" < /dev/null > "$d/s.jsonl" 2> "$d/err.txt")
ARM=$arm REP=$rep jq -r 'select(.type=="result") | "== \(env.ARM)-\(env.REP) cost \(.total_cost_usd)\n\(.result)"' \
	"$d/s.jsonl" > "$d/reply.txt"
jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | .input.command // empty' \
	"$d/s.jsonl" > "$d/calls.txt"
