#!/usr/bin/env bash
# Prompt-cache lifetime on the main thread, claude 2.1.329, subscription auth.
# Turn 1 writes the cache; each later turn resumes the session after a gap and prints the usage
# split, so a cache read after a gap proves the cache outlived it and a full write proves it expired.
# Gaps: 6 min (past the 5-minute TTL), then 55 min, then 62 min. Usage: bash probe.sh > results.txt
set -euo pipefail
dir=$(mktemp -d)
cd "$dir"
git init -q
turn() {
	claude -p "$1" --model claude-haiku-5-5 --output-format json "${@:2}" |
		bun -e 'const r=await Bun.stdin.json(); console.log(new Date().toISOString(), r.session_id,
			JSON.stringify({read:r.usage.cache_read_input_tokens, write:r.usage.cache_creation_input_tokens,
			split:r.usage.cache_creation}))'
}
first=$(turn "Reply with the word one.")
echo "turn1 $first"
id=$(echo "$first" | awk '{print $2}')
for gap in 6 55 62; do
	sleep $((gap * 60))
	echo "after ${gap}m $(turn "Reply with the word again." --resume "$id")"
done
