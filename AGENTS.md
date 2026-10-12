# AGENTS.md

A Claude Code plugin marketplace in ESM.
The CLI adapters, in `src/kernel/node/` and `slices/<s>/adapters/cli.ts`, run on Bun 1.4.3 or later, so they use only `node:` modules, `bun:` modules, and the `Bun` global.
A file in the import graph of a hooks module (`hooks/register.ts`) has no `node:` import, no `bun:` import, and no use of `Bun`, because Claude Code runs the module in its mod runtime.
Code that needs Python is Python, and the tests and `tools/` run on Bun 1.4.3 or later, with `bun install` for the dev dependencies.
The core plugin is in `plugins/dotclaude/`, next to five add-on plugins: `dotclaude-codegraph`, `dotclaude-browser`, `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab`.
Each add-on plugin works without the core plugin, so it imports nothing from another plugin.
Only `plugins/` ships to users.
`tests/` has one folder for each plugin, with `tests/dotclaude/<slice>/` for each slice of the core plugin.
`tests/kernel/` tests `src/kernel/`, and `tests/support/` holds the helpers of the tests.
`tools/` holds the repository scripts.
`src/` holds the source of each plugin, the shared kernel, and each text that a plugin ships, such as the agents, the skills, and `hooks.json`.
Edit the source in `src/` and run `just generate`, because a test fails when a generated file differs from its source.
Do not edit `plugins/` by hand.
Each slice keeps its hook lab tests in `lab/*.test.ts`, and `just generate` copies them to `plugins/<name>/tests/`, which `claude plugin test` runs against the hooks module.
Docs, design, and evidence: the [wiki](https://github.com/xsyetopz/dotclaude/wiki), with its source in `wiki/`.

## Commands (repository root)

- `just check` runs lint, the type check, the check of the generated files, tests, validation, and the hook labs.
  It must pass before done.
- `just test tests/dotclaude/guard/rules.test.ts` runs one test file with `bun test`.
- `just lab` runs the hook lab of each plugin: the tests of its hooks module with stubbed Claude Code events.
  Test each change to `hooks/register.ts` there before a live session.
- `bun run lint:md` lints the Markdown files.
  Headings and code blocks have a 100-column bound.
- `just sandbox` runs Claude Code with this checkout in a separate config.
  Read `wiki/plugins/Sandbox.md` first.

## Rules

- Use the env vars of Claude Code and flags.
  Add a dotclaude env var only when neither can do the work, and give it the prefix `DOTCLAUDE_`.
- Keep each file at 300 lines or less, and each test file at 500 lines or less, which `just validate` checks.
  Split a larger file into files that each hold one concern, and split a long `.md` file into linked parts.
  Generated files, such as `schemas/`, are out of scope.
- Write docs in STE-flavored ASD-STE100.
  Use no semicolons.
- Use semantic line breaks in all text that is not code: Markdown, comments, messages to Claude, commit messages, pull requests, and chat replies.
  Start each sentence on a new line, and break a long sentence only between clauses.
  Never break a line at a column or in a word.
- Put each code item in inline code (single backticks) in all text that is not code: Markdown, comments, test names, messages to Claude, commit messages, pull requests, and chat replies.
  A code item is a command, a tool name, a file path, an identifier, a settings key, an env var, or a literal value, such as `cat F`, `Read`, `hooks.json`, and `maxTurns`.
  The backticks show a reader, a person or a model, which words are code and which words are prose.
- Write each message that goes to Claude (hook output, deny reasons, skill and agent prompts) in strict ASD-STE100.
  Follow Claude's prompting best practices: give the reason, say what to do, and use no forceful words.
- Change a shared runtime bound only in `src/kernel/budget.ts`,
  a slice bound only in `slices/<s>/limits.ts`,
  and a repository bound only in `tools/limits.ts`.
  Tests pin the copies of each bound in code and config, not in prose.
- Write each function as an arrow function, `export const f = (a: A): B => ...`.
  Biome enforces it in `src/`, `tools/`, and `tests/`: `useArrowFunction` for a `function` expression, and the GritQL plugin `tools/lint/arrow-functions.grit` for a `function` declaration.
- Do not write runtime code (`src/`) for a feature that the latest Claude Code has.
  When Claude Code has a setting, a hook, or another extension point for a need, use it.
- A slice imports only `src/kernel/` and its own folder.
  Domain code in `domain/` imports no adapter and no `src/kernel/node/`.
  Biome enforces both rules with `noRestrictedImports`.
- No file in `plugins/` imports another plugin, `tools/`, or `tests/`.
- Tests give commands to the guards as strings.
  Never run a guarded command.
- Never patch the Claude Code CLI binary or its npm package, although it is minified JavaScript that you can read.
  A patch violates Anthropic's terms of service.
  Use only documented extension points.
  Reading the bundle for evidence is permitted.
- Add CHANGELOG entries under `[Unreleased]`.
  Change versions with `just bump`.
- Write public docs in `wiki/`, and run `just wiki` to publish them.
  `docs/README.md` only links to the wiki.
  `external/` holds local sources, and git ignores it.
