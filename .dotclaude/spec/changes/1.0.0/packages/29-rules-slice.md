---
id: P29
deps: [P28, P24, P26, P27]
owns: ["src/plugins/dotclaude/slices/rules/domain/", "src/plugins/dotclaude/slices/rules/adapters/", "src/plugins/dotclaude/slices/rules/slice.ts", "src/plugins/dotclaude/slices/setup/domain/drift.ts", "src/plugins/dotclaude/slices/setup/adapters/mod.ts", "tests/dotclaude/setup/rules.test.ts", "src/plugins/dotclaude/slices/trim/domain/", "src/plugins/dotclaude/slices/surface/adapters/mod.ts", "src/plugins/dotclaude/slices/surface/domain/tools.ts", "tests/dotclaude/rules/domain/", "tests/dotclaude/trim/", "tests/dotclaude/surface/"]
verify: just test tests/dotclaude/rules && just lab
agent: implementer
---

# P29 `rules` slice

## Goal

dotclaude uses `.claude/rules/`.
The setup and its drift check know each entry of P28.
`trim` and `surface` count rules as a source of context.
Each part of a slice that adds guidance for some files only at runtime becomes a `paths:` rule, when P28 shows that a rule can do the same work.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:153-157`, and the evidence: `.dotclaude/spec/changes/1.0.0/evidence/claude-directory.md` from P28.
- The rules parts of the setup are in `src/plugins/dotclaude/slices/setup/domain/drift.ts` and `adapters/mod.ts`.
  The `adapters/mod.ts` file also names `rules.ts` in a comment.
- The rules parts of `surface` are in `src/plugins/dotclaude/slices/surface/adapters/mod.ts` and `domain/tools.ts`.
  The `trim` slice has no file that names a rule in this checkout, so its folder is in `owns`.
- The `skills/` folder of the slice `rules` is P30, so this package does not own it.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Create the slice `rules` in `src/plugins/dotclaude/slices/rules/`, without the folder `skills/`.
2. Change the drift check in `setup/domain/drift.ts` to know each entry of P28.
3. Count the rules as a source of context in `trim` and in `surface`.
4. Turn each runtime guidance for some files into a `paths:` rule, when P28 shows that a rule can do the same work.
5. Write the tests in `tests/dotclaude/setup/rules.test.ts`, `tests/dotclaude/rules/domain/`, `tests/dotclaude/trim/`, and `tests/dotclaude/surface/`.
6. Run `just test tests/dotclaude/rules`, `just lab`, and `just generate`.

## Acceptance

- `just test tests/dotclaude/rules` and `just lab` pass.
- The drift check reports a gap for each entry of P28 that is missing.

## Boundaries

- Change only the paths of `owns`.
- Write each text that goes to Claude in strict ASD-STE100, with no forceful words.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.

## Findings

Step 4 is open: this run converts no part, and the main session decides.

Facts that decide each part (Claude Code 2.1.296, live checks):

- A rule with no `paths` loads in the main session and in a `general-purpose` subagent.
- A rule with `paths` loads after a matching `Read`.
- A `--worktree` session loads the rules of its worktree.
- A `rules/` folder at a plugin root does not load, and the manifest has no `rules` key.
  So a plugin cannot ship a rule.
  A rule helps only the repository of a project, and never a user of a plugin.

No slice part adds guidance text for some files only at runtime.
Each part that reacts to a kind of file or tool does a different work, and a rule cannot do that work.

| Part | What it does for some files | Can a `paths:` rule do the same work? |
| - | - | - |
| `sembr` `tool.call` (`Write`, `Edit`, `Bash`) | Rewrites the content of a Markdown file so that each sentence has its own line. | No. It changes the input of the call, and a rule only adds text. A rule for `**/*.md` could add a reminder, but the rewrite is still needed, because a rule does not enforce. |
| `asks` `tool.check` (`Bash`, `Write`, `Edit`, `MultiEdit`) | Asks the user before a change to a test file, a limits file, a lint config, a CI file, or a hook file. | No. It is a permission decision, not guidance. |
| `guard` `tool.call` (`Bash`) | Denies a command by its text. | No. It is not tied to a file, and it denies. |
| `dotclaude-codegraph` `graph` `PostToolUse` (`Edit`, `Write`, `MultiEdit`, `NotebookEdit`) | Syncs the index after an edit. It adds no text. | No. It runs a command. |
| `dotclaude-codegraph` `graph` `SessionStart` | Adds one line about the graph when `.codegraph/codegraph.db` exists. It is for the whole session, not for some files. | No. The condition is a file in the project, and a plugin cannot ship a rule. |
| `dotclaude` `hooks/PostToolUse/context.ts` | Tells a subagent over its context bound to report now. The condition is the size of the context. | No. A rule has no condition on the context size. |
| `surface` `tool.describe` (`Read` and others) | Shortens the description of a tool for every file. | No. It replaces the text of a tool description. |

The only candidate for a rule is guidance that lives in `AGENTS.md` for some files.
P31 moves it to `.claude/rules/` for this repository.
