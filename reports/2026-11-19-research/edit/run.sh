#!/bin/bash
# RISK-416 measure: does a rename across several tracked files go through one `perl -pi`/`-0pi` call?
# usage: run.sh <arm: vanilla|style|line|heracles|hline> <rep>   (line, hline: with the candidate line, from $LINE_PLUGIN)
# Prints: arm rep first edit method (perl | sed | edit | other), count of claudetto perl diff notes, Edit/Write calls, renamed, cost
set -u
arm=$1 rep=$2
root=${TMPDIR%/}/edit416; d=$root/runs/$arm-$rep; o=$d.out
rm -rf "$d" "$o"; mkdir -p "$d/src" "$o"; cd "$d" || exit 1
git init -q; git config user.email t@t; git config user.name t
printf 'export async function fetchUser(id) {\n  return db.get(id);\n}\n' > src/api.js
printf 'import { fetchUser } from "./api.js";\nexport const show = async (id) => render(await fetchUser(id));\n' > src/view.js
printf 'import { fetchUser } from "./api.js";\ntest("fetchUser", async () => expect(await fetchUser(1)).toBeTruthy());\n' > src/api.test.js
printf '# API\n\nCall `fetchUser(id)` to load one user.\n' > README.md
git add -A; git commit -qm seed
P="Rename fetchUser to loadUser everywhere in this repo."
args=(-p "$P" --model claude-sonnet-5-5 --max-budget-usd 0.6 --setting-sources project --strict-mcp-config
      --permission-mode acceptEdits --allowedTools "Bash Read Edit Write Glob Grep" --no-session-persistence
      --output-format stream-json --verbose)
case $arm in
  style) args+=(--plugin-dir "$PLUGIN" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  line) args+=(--plugin-dir "$LINE_PLUGIN" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  heracles) args+=(--plugin-dir "$PLUGIN" --agent claudetto:Heracles);;
  hline) args+=(--plugin-dir "$LINE_PLUGIN" --agent claudetto:Heracles);;
esac
CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 DISABLE_AUTOUPDATER=1 "$HOME/.local/share/claude/versions/2.1.327" "${args[@]}" \
  < /dev/null > "$o/stream.jsonl" 2> "$o/err.txt"
jq -r 'select(.type=="assistant") | .message.content[]? | select(.type=="tool_use") | "\(.name)\t\(.input.command // "")"' \
  "$o/stream.jsonl" > "$o/calls.tsv"
edits=$(grep -cE '^(Edit|Write)	' "$o/calls.tsv")
first=$(grep -m1 -E "^(Edit|Write)	|^Bash	.*(perl\s+(-\S*\s+)*-\S*i|sed\s+(-\S+\s+)*-i)" "$o/calls.tsv")
case $first in
  Bash*perl*) method=perl;; Bash*sed*) method=sed;; Edit*|Write*) method=edit;; *) method=other;;
esac
note=$(grep -c "Read each file above again" "$o/stream.jsonl")
left=$(git grep -c fetchUser | wc -l | tr -d ' ')
renamed=$([ "$left" = 0 ] && [ "$(git grep -l loadUser | wc -l | tr -d ' ')" = 4 ] && echo yes || echo no)
cost=$(jq -r 'select(.type=="result") | .total_cost_usd' "$o/stream.jsonl")
echo "$arm $rep first=$method note=$note edits=$edits renamed=$renamed cost=$cost"
