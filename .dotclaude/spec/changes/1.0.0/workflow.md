# 1.0.0 design: workflow

## Spec store

```text
spec/specs/<capability>.md                    # the truth
spec/changes/<id>/change.md                   # why, scope, tasks
spec/changes/<id>/specs/<capability>.md       # the deltas of one capability
spec/changes/<id>/design.md                   # size large only
spec/changes/<id>/packages/NN-<slug>.md       # one brief for one agent
spec/changes/<id>/state.json                  # lanes, event log, the path of the handoff
spec/changes/<id>/handoff.md                  # the newest handoff of the change
spec/changes/archive/<date>-<id>/
```

The store is a committed top-level folder, as in OpenSpec and Spec Kitty.
`.claude/` holds only what Claude Code loads.
The deltas of each capability are in their own file, so two packages that change two capabilities do not edit one file.

## Formats

- A requirement uses the syntax of OpenSpec: `### Requirement: <name>`, a sentence with `SHALL`, and one or more `#### Scenario: <name>` with `WHEN` and `THEN` lines.
  EARS forms such as `WHILE <state>` and `IF <error> THEN` are valid in the sentence.
- A delta file has the sections `## ADDED`, `## MODIFIED`, `## REMOVED`, and `## RENAMED`.
  - `ADDED` fails when the capability has a requirement with that name.
  - `MODIFIED` replaces the full block of the requirement with that name, and fails when it does not exist.
  - `REMOVED` deletes the block, and fails when it does not exist.
  - `RENAMED` has `FROM: <name>` and `TO: <name>` lines, and runs before the other sections.
- A task is `- [ ] <id> <text>`, with a `Verify:` line that names a command or a test.
- A package has front matter and the sections Goal, Context (with `file:line` references), Steps, Acceptance, and Boundaries.

```yaml
id: P05
deps: [P01b]
owns: ["src/plugins/dotclaude/slices/guard/", "tests/dotclaude/guard/"]
verify: just test tests/dotclaude/guard
agent: implementer
```

- Each `owns` entry is a folder prefix or a file path, with no wildcard.
  Two entries overlap when one is a prefix of the other.
- No `owns` entry is under `plugins/`, because `plugins/` is generated.
- An agent reads its package and the files that it names, and nothing more.

## State

`state.json` holds `schema`, the lane of each package (`planned`, `doing`, `review`, `done`, `blocked`), an event log, and the path of the newest handoff.
Only the main session changes a lane, with `dotclaude-spec lane`, on the main checkout.
`lane` stops with a message in a linked worktree, so no merge has a conflict in `state.json`.
A model changes JSON less often than Markdown by mistake (Anthropic, "Effective harnesses for long-running agents", 2025).

## Sizes

| Size | Files | Gate |
| --- | --- | --- |
| Trivial | none, or `change.md` with tasks | the `Verify:` commands |
| Medium | `change.md` and delta files | `validate`, then the `Verify:` commands |
| Large | the medium files, `design.md` from `planner`, and packages | a `reviewer` pass on the design, then each package |
| Hotfix | none before the fix | the `Verify:` command, then `dotclaude-spec record` |

## CLI

`dotclaude-spec <command>`:

- `new <id> [--size trivial|medium|large]` writes the files of the size.
- `status [<id>]` prints the lane of each package, as numbers and icons.
- `next [<id>]` prints the brief of the next package whose deps are `done`.
- `lane <package> <lane>` moves a package and adds an event.
- `validate [<id>]` checks the specs, the deltas, the tasks, and the packages, and checks that no two open packages in one wave have overlapping `owns`.
- `archive <id>` applies the deltas to a temporary copy of `spec/specs/`, then replaces `spec/specs/` and moves the change to `archive/`.
  When one delta fails, nothing changes.
- `record <text>` writes the record of a hotfix.

## Skills

- `/spec` sizes a request and runs `dotclaude-spec new`.
- `/hotfix` fixes a known cause with no gate before the fix, runs the check, and runs `record`.
- `/ship` runs the open packages of a change: an `implementer` for each package with `isolation: worktree`, then a `reviewer` that sees only the diff and the package.
  The main session merges, runs `just generate`, moves the lanes, and asks the user before a push.
- `/handoff` starts the handoff by hand.

## Handoff

The flow uses the mod API that the probes of 2026-10 showed in a live session:

1. A trigger sets a flag: a package goes to `done`, or `$.session.usage()` shows `context.percent` at the bound in `slices/handoff/limits.ts`.
2. At `turn.complete`, the mod submits a prompt that asks Claude to write the handoff.
   The cache is warm at that point.
3. The handoff file holds the goal, the state, the next step, and the constraints of the user, word for word, because compaction drops constraints (arXiv 2608.11242).
4. The mod runs `$.command.run({ command: "clear" })`.
5. The mod runs `$.prompt.submit({ text })` with the path of the handoff and the output of `dotclaude-spec next`.

The handoff of a change is `spec/changes/<id>/handoff.md`, and `state.json` names it.
A handoff with no change is `.claude/dotclaude/handoff.md`, which git ignores.
The `userConfig` option `mainHandover` takes `auto`, `manual`, or `off`, and its default is in `slices/handoff/limits.ts`.
P14 measures one handoff against one compaction, and the main session sets the default from that report.

## Agents

| Agent | Model | Effort | Tools |
| --- | --- | --- | --- |
| `investigator` | Haiku | medium | read-only, no web |
| `researcher` | Sonnet | medium | read-only, web |
| `implementer` | Sonnet | medium | all except `Agent` |
| `debugger` | Sonnet | high | all except `Agent` |
| `reviewer` | Opus | high | read-only |
| `test-runner` | Haiku | low | `Bash`, read-only |
| `planner` | Opus | high | read-only, writes only under `spec/` |

The model is fixed in the front matter.
The main session does not set `model` on a spawn, and it can raise `effort` for a retry.
After an outside failure, the main session retries once on the next model up with the same brief.
An outside failure is a failing check, a finding of `reviewer`, a run that stops at `maxTurns`, or a guard deny.
The report of the agent itself is not a check.
Evidence: a router on tool calls was wrong on about 1 route in 6 (arXiv 2605.07112).
A `model` on one spawn is ignored for background teammates (claude-code issue #86006).

## Status line

- Rows of segments: folder, git, model, context, cost, limits, and the active change.
  A slice adds a segment through the `segments` field of its manifest.
- Each value is a number with a Unicode icon, with no bar.
- A color scale of three steps for each percent.
- `NO_COLOR` (no-color.org) turns off each color, and the icons stay.
- The change segment reads the store through `src/kernel/spec-store.ts`, such as `◆ 1.0.0 4/13`.

## Settings snippet

- The generator writes the snippet from the `settings` entries of each slice.
- Its keys are in the property order of `schemas/claude-code-settings.json`.
- The keys of `env` are in alphabetical order.
- The generator fails when two slices set one key to different values.
- The `styles` slice sets `outputStyle` to `dotclaude:Concise`.

## Settings schemas

- `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json` hold the exact keys and values of `settings.json` and `managed-settings.json` that the Claude Code binary of the pinned version reads, now 2.1.296.
- Each key has a short description of what it does.
- `dotclaude-lab schema` writes both files from the binary, and a test fails on a key that the binary does not read.

## Core slices

| Slice | 0.28.0 | 0.29.0 |
| --- | --- | --- |
| `guard`, `reads` | mod | mod, slice `guard` |
| `adherence` | 11 files | mod, slice `asks`, one file for each ask |
| `prompt`, `surface`, `sembr` | mod | mod, three slices |
| `context` | classic hook and mod | mod, slice `handoff` |
| `drift` | mod at `session.start` | a check in slice `setup` |
| `setup` | skill with scripts | `/setup` with a CLI, with no OpenSpec step |
| `statusline` | 18 files | rebuilt |
| `spec` | none | new |
| `agents` | 5 agents | slice `agents`, 7 agents |
