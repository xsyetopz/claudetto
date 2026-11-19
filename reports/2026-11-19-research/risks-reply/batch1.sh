#!/bin/bash
cd "$(dirname "$0")"
PB="I'm adding a cache to this service and haven't picked between Redis, memcached and an in-process LRU. Pick with me."
PC="Which license should this repo use: MIT, Apache-2.0 or GPL-3.0? I haven't decided; set it up once we have settled it."
PA="I haven't decided between YAML, TOML and JSON for this project's config. Help me decide and set it up."
P366="Goal, run it autonomously: I am away for hours and will not answer questions. Add a slugify(s) function to util.js with tests, then report what you did."
P271="Write the plan for migrating this Express app from callbacks to async/await: architecture, test plan, rollout, risks, and the brief each worker agent gets. Save it in this repo."
S366='echo "exports.up=s=>s.toUpperCase()" > util.js; echo "{\"name\":\"x\"}" > package.json'
S271='mkdir -p src; for f in a b c d; do printf "const fs=require(\"fs\");\nexports.read=(p,cb)=>fs.readFile(p,cb);\n" > src/$f.js; done; echo "{\"name\":\"app\",\"dependencies\":{\"express\":\"4\"}}" > package.json'
for i in 1 2; do ./one.sh a293-$i van "$PA" & ./one.sh b293-$i van "$PB" & ./one.sh c293-$i van "$PC" & done
for i in 1 2 3; do ./one.sh g366-$i van "$P366" "$S366" & ./one.sh p271-$i van "$P271" "$S271" & done
wait
