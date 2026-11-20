#!/bin/bash
# usage: ARM=<arm> batch-name.sh <n>
here=$(cd "$(dirname "$0")" && pwd)
for i in $(seq 1 "$1"); do
  "$here/one.sh" "name-$ARM-$i" "$ARM" "Find one real defect in src (not tests), prove it with a failing test, fix it, and commit. Tests run with: bun test" "source $here/name-seed.sh" >/dev/null 2>&1 &
done; wait
