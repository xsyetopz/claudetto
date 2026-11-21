#!/bin/bash
cd "$(dirname "$0")"
PB="I'm adding a cache to this service and haven't picked between Redis, memcached and an in-process LRU. Pick with me."
PC="Which license should this repo use: MIT, Apache-2.0 or GPL-3.0? I haven't decided; set it up once we have settled it."
PD="This project needs a test runner and I haven't chosen one. Jest, Vitest or node:test are all fine with me; I want to decide with you before you set anything up."
P366b="Goal, run it autonomously: I am away for hours and will not answer questions. Set up a test runner for this repo and add one passing test for util.js, then report what you did."
S366='echo "exports.up=s=>s.toUpperCase()" > util.js; echo "{\"name\":\"x\"}" > package.json'
for i in 3 4 5; do ./one.sh b293-$i van "$PB" & ./one.sh c293-$i van "$PC" & ./one.sh d293-$i van "$PD" "$S366" & ./one.sh h366-$i van "$P366b" "$S366" & done
for i in 1 2 3; do ./one.sh b293c-$i cure293 "$PB" & ./one.sh c293c-$i cure293 "$PC" & ./one.sh d293c-$i cure293 "$PD" "$S366" & done
for i in 1 2 3; do ./one.sh h366c-$i cure293 "$P366b" "$S366" & done
wait
