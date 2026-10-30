# AGENTS.md

- `just check` runs lint, the type check, tests, validation, and the hook labs.
- Use `bun` for every package step, in code, docs, and messages: `bun add`, `bun add -g`, `bunx`. Never `node`, `npm`, `npx`, `yarn`, or `pnpm`, because the lockfile is `bun.lock`.
- Write no internal note in source: no decision or task ID such as `D27` or `2.1`, no path into `openspec/` or a plan, no history. The source is public, and the reasons live in `openspec/`.
- Never patch the Claude Code CLI binary or its npm package, although it is minified JavaScript that you can read.
- Give the expected cost and the current weekly share with the question.
- Put each code item in inline code (single backticks) in all text that is not code: Markdown, comments, test names, messages to Claude, commit messages, pull requests, and chat replies.
- A code item is a command, a tool name, a file path, an identifier, a settings key, an env var, or a literal value, such as `cat F`, `Read`, `hooks.json`, and `maxTurns`.
- The backticks show a reader, a person or a model, which words are code and which words are prose.
