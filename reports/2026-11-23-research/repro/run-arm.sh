#!/bin/bash
# usage: run.sh <fixture> <rep> <root> [extra claude args]  run.sh from the repro with extra args passed to claude.
set -u
fx=$1 rep=$2 G=$3; shift 3
here=/Users/krystian/CodeProjects/xsyetopz/claudetto/reports/2026-11-23-research/repro
name=$fx-$rep; repo=$G/repos/$name; out=$G/out/$name
rm -rf "$repo" "$out"; mkdir -p "$repo" "$out"
. "$here/fixtures.sh"
( cd "$repo" && git init -q && git config user.email t@t && git config user.name t && seed_$fx && git add -A && git commit -qm seed --allow-empty )
env $(cat /tmp/claude-501/risks/unset.txt) CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 python3 -I "$here/../../2026-11-19-research/risks-reply/drive.py" "$repo" "$out" "$(prompt_$fx)" --max-turns 20 "$@" </dev/null > "$out/drive.txt"
python3 -I "$here/scorers/$fx.py" "$name" "$repo" "$out" >> "$G/results.txt"
