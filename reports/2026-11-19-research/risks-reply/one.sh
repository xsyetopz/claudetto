#!/bin/bash
# usage: one.sh <name> <arm: van|style> <prompt> [seed-script]
# fresh repo under $TMPDIR/risks/repos/<name>; outputs under $TMPDIR/risks/out/<name> (outside the repo)
set -u
name=$1 arm=$2 prompt=$3 seed=${4:-:}
here=$(cd "$(dirname "$0")" && pwd)
R=${TMPDIR%/}/risks; repo=$R/repos/$name; out=$R/out/$name
rm -rf "$repo" "$out"; mkdir -p "$repo" "$out"
( cd "$repo" && git init -q && git config user.email t@t && git config user.name t && eval "$seed" && git add -A && git commit -qm seed --allow-empty )
extra=()
[ "$arm" = style ] && extra=(--plugin-dir "${TMPDIR%/}/cures/plugin" --settings '{"outputStyle":"claudetto:Claudetto"}')
[ "$arm" = cure293 ] && extra=(--plugin-dir "$here/plugin293" --settings '{"outputStyle":"cure293:Cure"}')
env $(cat $R/unset.txt) CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 ${ENVX:-} python3 -I "$here/drive.py" "$repo" "$out" "$prompt" ${extra[@]+"${extra[@]}"} </dev/null
