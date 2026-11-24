#!/bin/bash
# RISK-294 on claude 2.1.329: the release-decisions prompt of accepted-reply-b, run through drive.py
# (`claude -p --permission-prompt-tool stdio`), the print mode that offers AskUserQuestion as an
# interactive session does. Plain `claude -p` offers no question tool, so both arms fell back to
# one-line decisions there. 3 runs per arm; results in $TMPDIR/r294/out/<arm>-<rep>/.
# Score: each AskUserQuestion question has 2 or more options, each with a description of what it changes.
# Usage: TMPDIR=/tmp/claude-501/ bash reports/2026-11-24-research/pin-2-1-329/r294/run.sh
set -u
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
drive=$repo/reports/2026-11-19-research/risks-reply/drive.py
R=${TMPDIR%/}/r294
P="Read README.md and list the open decisions I have to make before release. I will answer them."
one() { # arm rep
	local n=$1-$2 ex=()
	local d=$R/repos/$n o=$R/out/$n
	rm -rf "${d:?}" "${o:?}"; mkdir -p "$d" "$o"
	(cd "$d" && git init -q && git config user.email t@t && git config user.name t &&
		printf '# tool\nTBD before release: license (MIT or Apache-2.0?), supported Node versions (18 or 20?), telemetry on by default?, version scheme (semver or calver?).\n' > README.md &&
		echo 'console.log("hi")' > index.js && git add -A && git commit -qm seed)
	[ "$1" = cto ] && ex=(--plugin-dir "$repo/plugins/claudetto" --settings '{"outputStyle":"claudetto:Claudetto"}')
	(cd "$d" && env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 \
		python3 -I "$drive" "$d" "$o" "$P" ${ex[@]+"${ex[@]}"} < /dev/null > /dev/null 2> "$o/drive.err")
}
for r in 1 2 3; do for a in van cto; do one $a $r & done; done; wait
for o in "$R"/out/*; do
	jq -s -c --arg n "${o##*/}" '[.[] | select(.type=="assistant") | .message.content[]?
		| select(.type=="tool_use" and .name=="AskUserQuestion") | .input.questions[]]
		| {run: $n, questions: length,
		   described: map(select((.options|length) >= 2 and all(.options[]; (.description|length) > 15))) | length}' \
		"$o/events.jsonl"
done
