---
description: "Bash tool text: each finished fix that passes its check becomes its own commit, and nothing is pushed."
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Edit, Bash]
---

Two bugs here. `README.md` spells "receive" as "recieve", and `add` in `src/math.sh` subtracts. Fix both.
