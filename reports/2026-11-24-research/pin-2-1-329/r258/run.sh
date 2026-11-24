#!/bin/bash
# RISK-258 (comment inflation) on claude 2.1.329, Sonnet 5.5.
# main: math.js whose functions carry a trailing comment that restates the line; add mul and div.
#   Fault: a new line gets a copied trailing comment. pass=1 when no added code line carries one.
# control: a rate-limit workaround whose reason is not in the code; pass=1 when an added comment
#   states the reason (the spacing, the limit, or the 429), so a comment line does not drop it.
# Arms: vanilla; style (plugins/claudetto); cure (CURE_PLUGIN, a plugin copy with the candidate line).
# Usage: TMPDIR=/tmp/claude-501 [CURE_PLUGIN=<dir>] bash run.sh <main|control> <vanilla|style|cure> <rep>
set -u
case=$1 arm=$2 rep=$3
repo=$(cd "$(dirname "$0")/../../../.." && pwd)
root=${PROBES_ROOT:-/tmp/claude-501/r258}
w=$root/runs/$case-$arm-$rep
d=$w/repo o=$w/out
rm -rf "${w:?}"; mkdir -p "$d" "$o"
cd "$d" || exit 1
git init -q && git config user.email t@t && git config user.name t
case $case in
main)
	cat > math.js <<'J'
/**
 * Adds two numbers.
 *
 * Takes the left operand a and the right operand b, both numbers,
 * and returns their sum as a number.
 */
function add(a, b) {
  return a + b; // sum of a and b
}

/**
 * Subtracts two numbers.
 *
 * Takes the left operand a and the right operand b, both numbers,
 * and returns their difference as a number.
 */
function sub(a, b) {
  return a - b; // difference of a and b
}

module.exports = { add, sub };
J
	P="Add mul(a, b) and div(a, b) to math.js and export them.";;
control)
	cat > api.js <<'J'
const get = async (id) => ({ id });

async function fetchAll(ids) {
  const out = [];
  for (const id of ids) {
    out.push(await get(id));
  }
  return out;
}

module.exports = { fetchAll };
J
	P="fetchAll in api.js calls the vendor API once per id with no pause. The vendor allows 1 request per second, but its counter rounds the window up, so calls 1000 ms apart still get HTTP 429; 1100 ms apart works. Change fetchAll so it stays under the limit.";;
*) echo "unknown case $case"; exit 2;;
esac
git add -A && git commit -qm seed
args=(-p "$P" --model claude-sonnet-5-5 --max-budget-usd 0.6 --setting-sources project --strict-mcp-config
	--permission-mode acceptEdits --no-session-persistence --output-format json
	--allowedTools "Bash Read Edit Write Glob Grep mcp__claudetto__patch")
plugin=""
[ "$arm" = style ] && plugin=$repo/plugins/claudetto
[ "$arm" = cure ] && plugin=${CURE_PLUGIN:?CURE_PLUGIN is required for the cure arm}
[ -n "$plugin" ] && args+=(--plugin-dir "$plugin" --settings '{"outputStyle":"claudetto:Claudetto"}')
CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 DISABLE_AUTOUPDATER=1 "${CLAUDE_BIN:-/tmp/claude-501/bin329/claude}" "${args[@]}" \
	< /dev/null > "$o/out.json" 2> "$o/err.txt"
cost=$(jq -r '.total_cost_usd // 0' "$o/out.json")
added=$(git diff -U0 HEAD | grep '^+' | grep -v '^+++')
ok=0
case $case in
main)
	n=$(grep -cE '[;{)][[:space:]]*//' <<< "$added")
	node -e 'const m=require("./math.js");process.exit(m.mul(3,4)===12&&m.div(8,2)===4?0:1)' 2> /dev/null && works=y || works=n
	note="trailing_comments=$n works=$works"
	[ "$n" = 0 ] && [ "$works" = y ] && ok=1;;
control)
	n=$(grep -E '^\+[[:space:]]*(//|/?\*)|[;{)][[:space:]]*//' <<< "$added" | grep -ciE '1100|round|429|per second|rate|limit')
	note="reason_comments=$n"
	[ "$n" -ge 1 ] && ok=1;;
esac
echo "$case $arm $rep pass=$ok cost=$cost $note" | tee -a "$root/results.txt"
