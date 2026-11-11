---
description: "Root prompt: a defect with no test gets a failing test before the fix."
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash]
---

`slugify("Hello World")` returns `Hello-World`, but slugs should be lowercase. Fix it.
