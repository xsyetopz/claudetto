# AGENTS.md

- `just check` runs lint, the type check, tests, validation, and the hook labs.
- Write no internal note in source: no decision or task ID such as `D27` or `2.1`, no path into `openspec/` or a plan, no history. The source is public, and the reasons live in `openspec/`.
- Read Claude docs and schemas through `clawdipedia-docs` or their URL, and keep no copy of them in the repo or in a cache.
- Never patch the Claude Code CLI binary or its npm package, although it is minified JavaScript that you can read.
- Run a paid model call or eval by asking first, and report its cost and the weekly share after the run.
- Count, price, and look up only `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, because they are the models this account runs. Measure the weekly limit in tokens.
- Stop a process only by the pid its launcher recorded, with `kill <pid>`. Never use `pkill` or `killall` with a pattern, because a pattern also matches the user's own processes.
- The backticks show a reader, a person or a model, which words are code and which words are prose.
- Write prompts using the `Claude Opus 5.5` and general prompting best-practices from `clawdipedia-docs`: give clear, direct instructions, explain the reason for each rule, and tell `Claude` **what to do** rather than **what to avoid**.
