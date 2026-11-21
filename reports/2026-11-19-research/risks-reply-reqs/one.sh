#!/bin/bash
# usage: one.sh <name> <arm: van|shipped|full|c111|c029|c140|cuc|chb> <prompt> [seed-script]
# Fresh repo under $TMPDIR/reqs/repos/<name>; drive.py is the one in ../risks-reply.
# Plugin dirs ($TMPDIR/reqs/plug-<arm>) come from mkplug.sh. Extra claude args via XARGS.
set -u
name=$1 arm=$2 prompt=$3 seed=${4:-:}
here=$(cd "$(dirname "$0")" && pwd)
R=${TMPDIR%/}/reqs; repo=$R/repos/$name; out=$R/out/$name
rm -rf "$repo" "$out"; mkdir -p "$repo" "$out"
( cd "$repo" && git init -q && git config user.email t@t && git config user.name t && eval "$seed" && git add -A && git commit -qm seed --allow-empty && eval "${POST:-:}" )
extra=()
case $arm in
  fhb) extra=(--plugin-dir "$R/plug-fhb" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  tree) extra=(--plugin-dir "$here/../../../plugins/claudetto" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  ccl) extra=(--plugin-dir "$R/plug-ccl" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  full) extra=(--plugin-dir "$R/plug-full" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  shipped) extra=(--plugin-dir "$R/plug-shipped" --settings '{"outputStyle":"claudetto:Claudetto"}');;
  c111|c029|c140|cuc|chb) extra=(--plugin-dir "$R/plug-$arm" --settings "{\"outputStyle\":\"$arm:Cure\"}");;
esac
env $(cat ${TMPDIR%/}/risks/unset.txt) CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 python3 -I "$here/../risks-reply/drive.py" "$repo" "$out" "$prompt" --max-turns 20 ${extra[@]+"${extra[@]}"} </dev/null
