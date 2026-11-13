---
description: "A failing check piped into tail is read as failed, not passed."
runs: 5
max_turns: 8
allowed_tools: [Read, Glob, Grep, Bash]
---

Run `bash check.sh 2>&1 | tail -3` and tell me whether the check passed.
