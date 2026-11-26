#!/usr/bin/env bash
# Runs each seeded case <runs> times in tmux with --plugin-dir plugins/claudetto-you-should-know,
# on the user's own login, through proxy.ts. Each run rebuilds the case's git repo in one fixed
# probe folder (trusted once), so no per-run trust entry is written. Child-session variables of the
# calling session are removed, as a user's terminal has none. The mode is dontAsk: auto mode refuses
# every checked action behind the proxy, which does not pass its server-side check through, so a
# case's commands would not run; dontAsk runs the allowed tools and refuses the rest unasked.
# YSK_PLUGIN names another copy of the plugin to load, such as one at an earlier commit.
# Usage: drive.sh <out-dir> <runs> [case ...]
set -euo pipefail
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../../.." && pwd)
out=$1 runs=$2
shift 2
mkdir -p "$out"
probe=$(cd "${TMPDIR:-/tmp}" && pwd -P)/ysk-ab-project
plugin=${YSK_PLUGIN:-$repo/plugins/claudetto-you-should-know}
cases=("$@")
# With no case named, runs the cases of set $SET (default tune). macOS bash 3.2 has no mapfile.
if ((${#cases[@]} == 0)); then
	while IFS= read -r c; do cases+=("$c"); done < <(bun -e 'import { CASES } from "'"$here"'/cases"; for (const c of CASES) if ((c.set ?? "tune") === process.argv[1]) console.log(c.name)' "${SET:-tune}")
fi
settings='{"enabledPlugins":{"bedrock@bedrock":false,"humanizer@humanizer":false},"permissions":{"allow":["Bash","Write","Edit","Read"]}}'
for run in $(seq 1 "$runs"); do
	for name in "${cases[@]}"; do
		tag="$name-$run"
		# a case may leave a folder read-only, which rm -rf cannot empty
		[[ -d $probe ]] && chmod -R u+w "$probe"
		rm -rf "$probe" && mkdir -p "$probe"
		# The plugin keeps its recent offers user-wide; a note from an earlier run would suppress the
		# same topic here (the prompt asks for a different one), so each run starts with none.
		for st in "$HOME"/.claude/plugins/store/claudetto-you-should-know_inline-*.json; do
			[[ -f $st ]] || continue
			jq '.seen = []' "$st" >"$st.tmp" && mv "$st.tmp" "$st"
		done
		bun -e '
			import { CASES } from "'"$here"'/cases";
			import { mkdirSync, writeFileSync } from "node:fs";
			import { dirname } from "node:path";
			const c = CASES.find((k) => k.name === process.argv[1])!;
			for (const [p, body] of Object.entries(c.files)) {
				mkdirSync(dirname(`${process.argv[2]}/${p}`), { recursive: true });
				writeFileSync(`${process.argv[2]}/${p}`, body);
			}' "$name" "$probe"
		git -C "$probe" init -q
		git -C "$probe" config user.name probe
		git -C "$probe" config user.email probe@example.invalid
		git -C "$probe" add -A
		git -C "$probe" commit -q -m init
		setup=$(bun -e 'import { CASES } from "'"$here"'/cases"; console.log(CASES.find((k) => k.name === process.argv[1])!.setup ?? "")' "$name")
		[[ -z $setup ]] || (cd "$probe" && bash -c "$setup")
		log="$out/$tag.jsonl"
		: >"$log"
		bun "$here/proxy.ts" 0 "$log" "$name" "$probe" >"$out/$tag.proxy" &
		px=$!
		until grep -q listening "$out/$tag.proxy" 2>/dev/null; do sleep 0.2; done
		port=$(awk '{print $2}' "$out/$tag.proxy")
		tmux new-session -d -s "$tag" -x 140 -y 45 -c "$probe" \
			env -u CLAUDECODE -u CLAUDE_CODE_CHILD_SESSION -u CLAUDE_CODE_SESSION_KIND -u CLAUDE_JOB_DIR \
			CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG=1 ANTHROPIC_BASE_URL="http://127.0.0.1:$port" \
			claude --model claude-haiku-5-5 --permission-mode dontAsk --settings "$settings" --plugin-dir "$plugin"
		sleep 8
		tmux capture-pane -p -t "$tag" | grep -q "trust this folder" && { tmux send-keys -t "$tag" Down Enter; sleep 4; }
		prompt=$(bun -e 'import { CASES } from "'"$here"'/cases"; console.log(CASES.find((k) => k.name === process.argv[1])!.prompt)' "$name")
		tmux send-keys -t "$tag" -l "$prompt"
		sleep 1
		tmux send-keys -t "$tag" Enter
		for _ in $(seq 1 90); do grep -q '"end":true' "$log" && break; sleep 2; done
		sleep 25 # the turn-end check and any recheck
		if [[ -n ${YSK_VARIANTS:-} ]]; then
			# Replays finish after the session does; wait for every copy before the proxy stops.
			per=$(($(ls "$YSK_VARIANTS"/*.txt | wc -l) * ${YSK_REPEAT:-3}))
			for _ in $(seq 1 90); do
				want=$(($(grep -c '"kind":"propose"' "$log") * per))
				(($(grep -c '"kind":"variant"' "$log") >= want)) && break
				sleep 2
			done
		fi
		tmux capture-pane -p -t "$tag" >"$out/$tag.pane"
		tmux kill-session -t "$tag"
		kill "$px"
	done
done
