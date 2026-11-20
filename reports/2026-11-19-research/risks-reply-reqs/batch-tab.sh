#!/bin/bash
here=$(cd "$(dirname "$0")" && pwd)
P='In guard.js, replace the three lines from `const words` through `const home` with one line `const home = process.env.HOME;`, and change the `hit` line so it also matches when the command includes `${home}/${w}`. Use the Edit tool.'
for i in 1 2 3 4 5 6; do "$here/one.sh" tab-$ARM-$i $ARM "$P" "$(cat "$here/tab-seed.sh")" >/dev/null 2>&1 & done; wait
