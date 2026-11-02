# AGENTS.md

- `just check` runs lint, the type check, tests, validation, and the hook labs.
- Use `bun` for every package step, in code, docs, and messages: `bun add`, `bun add -g`, `bunx`. Never `node`, `npm`, `npx`, `yarn`, or `pnpm`, because the lockfile is `bun.lock`.
- Write no internal note in source: no decision or task ID such as `D27` or `2.1`, no path into `openspec/` or a plan, no history. The source is public, and the reasons live in `openspec/`.
- Put debug or probe code in `claudekit/`, the in-house tool library, once it is used more than once and is useful, such as a fake Messages API, a forwarding proxy, or a request reader. Reuse what `claudekit/` already holds before you write a new one, and leave a one-off probe in `/tmp`.
- Never patch the Claude Code CLI binary or its npm package, although it is minified JavaScript that you can read.
- Run a paid model call or eval by asking first, and report its cost and the weekly share after the run.
- Count, price, and look up only `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, because they are the models this account runs. Measure the weekly limit in tokens.
- Stop a process only by the pid its launcher recorded, with `kill <pid>`. Never use `pkill` or `killall` with a pattern, because a pattern also matches the user's own processes.
- Write prompt text by the guides in `external/please-use-me-often/`, `xml-prompting-guide.md` first.
- Put each code item in inline code (single backticks) in all text that is not code: Markdown, comments, test names, messages to Claude, commit messages, pull requests, and chat replies.
- A code item is a command, a tool name, a file path, an identifier, a settings key, an env var, or a literal value, such as `cat F`, `Read`, `hooks.json`, and `maxTurns`.
- The backticks show a reader, a person or a model, which words are code and which words are prose.
