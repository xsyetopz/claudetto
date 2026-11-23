#!/bin/bash
# usage: run.sh <fixture> <rep>   Vanilla claude -p (Sonnet 5.5 by default) through ../../2026-11-19-research/risks-reply/drive.py.
set -u
fx=$1 rep=$2
here=$(cd "$(dirname "$0")" && pwd)
G=${REPRO_ROOT:-/tmp/claude-501/repro}; name=$fx-$rep; repo=$G/repos/$name; out=$G/out/$name
rm -rf "$repo" "$out"; mkdir -p "$repo" "$out"
. "$here/fixtures.sh"
( cd "$repo" && git init -q && git config user.email t@t && git config user.name t && seed_$fx && git add -A && git commit -qm seed --allow-empty )
md=CLAUDE_CODE_DISABLE_CLAUDE_MDS=1; type -t md_$fx >/dev/null && md=
env $(cat /tmp/claude-501/risks/unset.txt) $md python3 -I "$here/../../2026-11-19-research/risks-reply/drive.py" "$repo" "$out" "$(prompt_$fx)" --max-turns 20 </dev/null > "$out/drive.txt"
python3 -I "$here/scorers/$fx.py" "$fx-$rep" "$repo" "$out" | tee -a "$G/results.txt"
