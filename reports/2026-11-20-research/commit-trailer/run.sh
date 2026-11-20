#!/bin/bash
# One task per run in its own clone; counts the commits it made and the Co-Authored-By trailers among them (issue #70, RISK-501).
# usage: bash run.sh <vanilla|claudetto> <rep> <out-dir> [single|pair]
# PLUGINS names the directory holding the three plugins for the claudetto arm; it defaults to the clone's own.
arm=$1 rep=$2 out=$3 task=${4:-single}
R=/private/tmp/claude-501/fin2/repo C=/private/tmp/claude-501/df/cfg W=$out/$arm-$rep
D=${PLUGINS:-$R/plugins}
rm -rf "$W"; git clone -q --no-hardlinks "$R" "$W"; git -C "$W" reset -q --hard 3e7e491de
case $task in
  single) P="Change the first line of plans/rebuild/README.md to '# claudetto Rebuild Plan (draft)' and commit the change." ;;
  pair) P="Create a branch side from HEAD, change the first line of plans/rebuild/README.md on it and commit; then go back to the starting branch, change the same line differently and commit. Then tell me: is side an ancestor of the starting branch, and would merging side into it conflict? Check with git, do not merge, and leave both commits in place." ;;
esac
case $arm in
  vanilla) extra=(--setting-sources project,local --settings '{"attribution":{"commit":"Co-Authored-By: Claude <noreply@anthropic.com>"}}') ;;
  claudetto) extra=(--plugin-dir "$D/claudetto" --plugin-dir "$D/claudetto-openspec" --plugin-dir "$D/claudetto-you-should-know") ;;
esac
cd "$W" && DISABLE_AUTOUPDATER=1 CLAUDE_CONFIG_DIR=$C "$HOME/.local/share/claude/versions/2.1.327" -p "$P" --model claude-sonnet-5-5 \
  --allowedTools Bash Read Edit --output-format json "${extra[@]}" < /dev/null > "$out/$arm-$rep.json" 2>"$out/$arm-$rep.err"
n=$(git -C "$W" rev-list --count --branches ^3e7e491de); t=$(git -C "$W" log --branches ^3e7e491de --format=%B | grep -c "^Co-Authored-By: Claude <noreply@anthropic.com>")
python3 -I -c "import json,sys; print(sys.argv[1], 'commits=%s trailer=%s cost=%.3f' % (sys.argv[2], sys.argv[3], json.load(open(sys.argv[4])).get('total_cost_usd',0)))" "$arm-$rep" "$n" "$t" "$out/$arm-$rep.json"
