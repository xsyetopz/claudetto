# AGENTS.md

A Claude Code plugin marketplace in ESM.
The rules that apply to some files only are in [`.claude/rules/`](.claude/rules/), and Claude Code loads each one when Claude works on a file in its `paths:` list.
`just check` runs lint, the type check, the check of the generated wiki, tests, validation, and the hook labs.
It must pass before done.
Never patch the Claude Code CLI binary or its npm package, although it is minified JavaScript that you can read.
A patch violates Anthropic's terms of service.
Reading the bundle for evidence is permitted.
Ask the user before each new paid run, such as an eval, a sandbox session, a handoff test, or a model call (the user, 2026-10-15).
Give the expected cost and the current weekly share with the question.
This applies also to the sandbox sessions that the rule in `.claude/rules/sandbox-runs.md` approves.
Put each code item in inline code (single backticks) in all text that is not code: Markdown, comments, test names, messages to Claude, commit messages, pull requests, and chat replies.
A code item is a command, a tool name, a file path, an identifier, a settings key, an env var, or a literal value, such as `cat F`, `Read`, `hooks.json`, and `maxTurns`.
The backticks show a reader, a person or a model, which words are code and which words are prose.
Write docs in STE-flavored ASD-STE100.
Use no semicolons.
