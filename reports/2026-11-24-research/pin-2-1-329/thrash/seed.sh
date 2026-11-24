#!/bin/bash
# Seeds a repo whose logs/ holds 10 files of about 20k tokens each, one ERROR line planted per file,
# and a project agent with autoCompactWindow 100000 that is told to Read whole files.
set -eu
mkdir -p logs .claude/agents
for i in $(seq 1 10); do
  python3 -I -c "
import random
r=random.Random($i)
lines=[f'2026-11-{(n%28)+1:02d}T{n%24:02d}:{n%60:02d}:00Z INFO worker-{r.randint(1,99)} handled request id={r.getrandbits(64):016x} path=/api/v1/items/{r.randint(1,99999)} status=200 ms={r.randint(1,900)}' for n in range(1700)]
lines.insert(r.randint(200,1500), f'2026-11-05T03:04:05Z ERROR worker-7 code=E{$i*111:04d} disk quota exceeded')
open('logs/app-$i.log','w').write('\n'.join(lines)+'\n')"
done
cat > .claude/agents/reader.md <<'A'
---
name: reader
description: Reads log files in full and reports what they hold.
model: claude-haiku-5-5
tools: Read
autoCompactWindow: 100000
---
Read each file you are given in full with the Read tool, every part of it, and report what you were asked for.
A
git init -q && git config user.email t@t && git config user.name t && git add -A && git commit -qm seed
