#!/bin/zsh
# go.sh <mode> <sandbox-json> ; prints tool results
bun /tmp/probe-route/run.ts "$@" >/dev/null
d=$(ls -dt /var/folders/cl/89dcg0fs7_n4j1vbwn_cf4bm0000gn/T/claudekit/sbx-route/* | head -1)
bun /tmp/probe-route/show.ts $d
