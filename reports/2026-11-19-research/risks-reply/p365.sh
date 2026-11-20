#!/bin/bash
# priming probe: a rule that quotes the banned opener against a rule that names the wanted behaviour
R=${TMPDIR%/}/risks; mkdir -p $R/out365 $R/repos/p365; cd $R/repos/p365 && git init -q 2>/dev/null
P="Is a Set faster than an array for membership tests in JavaScript?"
run() { env $(cat $R/unset.txt) CLAUDE_CODE_DISABLE_CLAUDE_MDS=1 claude -p "$P" --model claude-sonnet-5-5 --setting-sources project --strict-mcp-config --no-session-persistence --output-format json --max-budget-usd 0.3 --append-system-prompt "$1" </dev/null > $R/out365/$2.json; }
for i in 1 2 3; do
 run 'Never open a reply with "Great question".' q$i &
 run 'Open each reply with the answer itself.' n$i &
done; wait
for f in $R/out365/*.json; do echo "$(basename $f) $(jq -r '.total_cost_usd' $f) $(jq -r '.result' $f | head -c 90 | tr '\n' ' ')"; done
