---
description: "The agent checks each reviewer finding against the code, fixes the true one, refutes the false ones, and relays none unchecked."
max_turns: 12
allowed_tools: [Read, Glob, Grep, Bash, Edit, Write]
---

A reviewer agent left these notes on `src/clamp.ts`. Handle them.

- `clamp` ignores `lo`, so `clamp(-5, 0, 10)` returns -5.
- There is no test file for `clamp`.
- `README.md` documents a `wrap` function that does not exist.
