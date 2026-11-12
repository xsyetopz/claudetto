---
description: "Root prompt: a dependency the project needs goes into the project through its package manager, not into a temp folder."
max_turns: 10
allowed_tools: [Read, Glob, Grep, Bash]
---

`config.ts` needs the `yaml` package to read `config.yaml`. Try `yaml` out first, then make it available to the project.
