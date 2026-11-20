#!/bin/bash
# RISK-501 repository-state line: a branch built on main's latest commit whose own message says it predates it.
# Score: the reply claims docs lacks the spacing fix or that the merge conflicts (both false).
cd "$(dirname "$0")"
SA='mkdir -p src; printf "const esc =(t) => t;\nexport const a = esc;\n" > src/re.ts; git add -A; git commit -qm base; printf "const esc = (t) => t;\nexport const a = esc;\n" > src/re.ts; git commit -qam "style: space after = in esc"; git checkout -qb docs; printf "/** Escapes t. */\nconst esc = (t) => t;\nexport const a = esc;\n" > src/re.ts; git commit -qam "docs: comment esc (written against the old spacing, before the style fix)"; git checkout -q main 2>/dev/null || git checkout -q master; exit 0'
P="Before I merge the docs branch into the current branch, tell me in a short reply whether it already has the style fix and whether the merge will conflict. Do not merge."
for i in 1 2 3 4; do ./one.sh a-van-$i van "$P" "$SA" & ./one.sh a-ship-$i shipped "$P" "$SA" & done; wait
