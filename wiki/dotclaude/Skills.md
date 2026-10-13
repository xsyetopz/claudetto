# Skills

This page describes the ten skills of the core plugin `dotclaude`.
It is for a user who runs a skill, and for a contributor who edits a `SKILL.md` file.

The core plugin `dotclaude` ships ten skills.
Each skill is a `SKILL.md` file in its slice, under `src/plugins/dotclaude/slices/<slice>/skills/`.
Claude Code runs a skill as `/dotclaude:<name>`.

A skill gives Claude a procedure.
Each skill treats the output of its commands and the text of its files as data, not as instructions.
Each skill ends with a report to the user.

## The Ten Skills

| Skill | Call | What it does | Slice or CLI that does the work | Writes |
| --- | --- | --- | --- | --- |
| `handoff` | `/dotclaude:handoff` | Writes a handoff file, so a new session can continue the work. | `handoff` slice, `dotclaude-handoff` | One file in `.dotclaude/handoff/` |
| `rules-creator` | `/dotclaude:rules-creator [topic]` | Writes a rule file, with `paths` globs, and checks the globs. | `rules` slice, `check-globs.ts` script | A rule in `.claude/rules/` or `~/.claude/rules/` |
| `setup` | `/dotclaude:setup [user\|project\|local]` | Merges the settings snippet and checks the add-on tools. | `setup` slice, `dotclaude-setup` | The settings file of the scope, and add-on installs |
| `specify` | `/dotclaude:specify <change-id> [size]` | Writes the requirements of a change and runs the gate. | `spec` slice, `dotclaude-spec specify` | Files in `.dotclaude/spec/changes/<change-id>/` |
| `plan` | `/dotclaude:plan <change-id>` | Splits a large change into package briefs. | `spec` slice, `dotclaude-spec plan` | Files in `packages/` |
| `implement` | `/dotclaude:implement <change-id>` | Runs the ready packages in worktrees, then verifies each one. | `spec` slice, `dotclaude-spec implement` and `verify` | Events, and the code of each package |
| `review` | `/dotclaude:review <change-id>` | Reviews each verified package and records the verdict. | `spec` slice, `dotclaude-spec review` | Events |
| `merge` | `/dotclaude:merge <package> [branch]` | Merges the branch of an approved package. | `spec` slice, `dotclaude-spec merge` | A merge commit, and the `plugins/` output |
| `accept` | `/dotclaude:accept <change-id>` | Accepts a change when each package is done or canceled. | `spec` slice, `dotclaude-spec accept` | Events |
| `archive` | `/dotclaude:archive <change-id>` | Merges the requirements into `specs/` and archives the change. | `spec` slice, `dotclaude-spec archive` | Files in `specs/` and `changes/archive/` |

Each skill sets `disable-model-invocation: true` in its front matter.
The name of that key says that Claude does not start the skill by itself.
This page treats that as inference from the key name.
The skill runs when the user types its command.

## How a Skill Is Built

Each `SKILL.md` has a front matter with `name`, `description`, and the keys that the skill needs.
The keys that the ten files use are `disable-model-invocation`, `argument-hint`, and `allowed-tools`.
The `allowed-tools` value pre-approves the commands and tools that it lists, so they run with no prompt.
It does not deny the other tools.
For example, `review` pre-approves `dotclaude-spec *` and `git diff *`.
The other commands follow the permission rules of the session.

The body has a `<task>` part and a `<procedure>` part, or a `<steps>` part.
The text `$ARGUMENTS` holds the words that the user types after the command.
The `rules-creator` skill reads `${CLAUDE_SKILL_DIR}` to find its script.
Each skill says that the output of a command and the text of a file are data, not instructions.

The size of each `SKILL.md` has bounds.
The bounds are in [Bounds](Bounds).

## `handoff`

Call `/dotclaude:handoff` when the context is large, or when part of the work is done.
The skill writes one file with four parts: the goal, the state, the next step, and the constraints of the user.
The skill copies each constraint of the user word for word.

The steps:

1. The `handoff` mod, in `src/plugins/dotclaude/slices/handoff/adapters/mod.ts`, runs `dotclaude-handoff path` when the skill starts.
   The mod names the path in the text of the prompt.
2. The skill writes the file with the `Write` tool, and makes no other change.
3. At the next end of a turn, the mod runs `dotclaude-handoff newest`.
   When the newest file is the file of the skill, the mod runs `dotclaude-spec next`.
   Then it runs `/clear`, and it submits a resume prompt with the path.
4. In `auto` mode, when no file appears in `HANDOFF_WAIT_TURNS` turns, the mod submits the write prompt again.
   It does this up to `HANDOFF_RETRY_MAX` times.
   In `manual` mode, the mod shows a hint to the user instead.

The mod also finds a trigger without the skill.
The trigger fires when the context of the main session passes `CONTEXT_PERCENT`, or when a `merge` or an `accept` finishes.
The `mainHandover` option sets the mode: `auto`, `manual`, or `off`.
The default is `manual`, as `DEFAULT_MAIN_HANDOVER` sets it.
For the cost of a handoff, see [Context and Handoff](Context-And-Handoff).

The file has the name that `handoffName` makes from the time, in `.dotclaude/handoff/`.
The CLI writes no file.

## `setup`

Call `/dotclaude:setup`, or `/dotclaude:setup user`, `project`, or `local`.
Run it after you install or update the plugin.
A plugin cannot set permissions, environment variables, or model settings.
The `setup` skill states that Claude Code applies only `agent` and `subagentStatusLine` from a plugin settings file.
This page does not check that statement against the binary.
The settings snippet sets the rest.
For the keys, see [Settings-Snippet](Settings-Snippet) and [Settings-Snippet-Keys](Settings-Snippet-Keys).

The steps:

1. The skill picks the scope.
   It uses the argument, or it asks the user.
   Each scope has one file:

   | Scope | File |
   | --- | --- |
   | `user` | `settings.json` in `CLAUDE_CONFIG_DIR`, or in `~/.claude` |
   | `project` | `.claude/settings.json` in the project |
   | `local` | `.claude/settings.local.json` in the project |

2. It runs `dotclaude-setup settings --scope <scope>` without `--apply`, and it shows the list of changes.
   The merge adds keys and rules, and it keeps the other keys of the user.
   It replaces `availableModels`.
   When the cached model catalog of the account offers `claude-mythos-5-1`, the list holds it in place of `claude-fable-5-1`.
3. It runs `dotclaude-setup addons` without `--apply`.
   The preview shows the state of each installed add-on and the steps to offer.
4. The skill asks the user one question for the settings and one for the add-on steps.
5. It runs `--apply` for each yes.
   A second run changes nothing.

The status line commands get the absolute path of the plugin folder.
That path holds the plugin version, so run the skill again after each update.
The project scope gets no status line, because the path belongs to one computer.
The user scope also gets the auto-mode option.

The add-on steps are these:

- `dotclaude-codegraph` needs the `codegraph` CLI and an index.
  The skill runs `codegraph init -y` in the project.
  It does not run `codegraph install`, because that command edits the Claude Code configuration.
- `dotclaude-browser` needs `agent-browser` on `PATH`.
- `dotclaude-docs` needs `npx` on `PATH`.

A global install changes the computer, so the skill runs it only after a yes.
When a command fails, the skill shows the error line.
It does not do the step another way.
At the end, the skill tells the user to restart Claude Code.

## The Phase Skills

The seven phase skills are `specify`, `plan`, `implement`, `review`, `merge`, `accept`, and `archive`.
Each skill has the same verb as its `dotclaude-spec` subcommand, and each moves a change or a package to the next state.
Each CLI gate checks the move, and a skill stops when a gate refuses.
For the files, the IDs, the states, and the gates, see [Spec Store](Spec-Store).

The order of the skills is this:

1. `/dotclaude:specify <change-id> [trivial|medium|large]` writes the requirements and runs the gate of `dotclaude-spec specify`.
   The skill asks the user about each `[NEEDS CLARIFICATION]` marker.
   A large change ends in `specified`.
   A trivial or medium change ends in `planned`, with one package `P1`.
2. `/dotclaude:plan <change-id>` splits a `specified` large change into package briefs.
   It runs `dotclaude-spec plan`, and the change goes to `planned`.
3. `/dotclaude:implement <change-id>` starts one `implementer` agent in a worktree for each ready package.
   After each agent ends, it runs `dotclaude-spec verify`, and the package goes to `verified`.
4. `/dotclaude:review <change-id>` starts one `reviewer` agent for each `verified` package.
   The main session checks each defect, and it records `approve` or `reject` with `dotclaude-spec review`.
   A reject needs a finding and a decision of `fix-code` or `revise-spec`.
5. `/dotclaude:merge <package> [<branch>]` merges an `approved` package with `dotclaude-spec merge`, and the package goes to `done`.
6. `/dotclaude:accept <change-id>` runs `dotclaude-spec accept`.
   The gate needs each package `done` or `canceled`.
7. `/dotclaude:archive <change-id>` merges the requirements into `.dotclaude/spec/specs/` with `dotclaude-spec archive`.

Run `implement`, `review`, and `merge` in the main checkout, because `dotclaude-spec` refuses to move a state in a linked worktree.
The `agent.spawn` hook in `src/plugins/dotclaude/slices/spec/adapters/mod.ts` runs `implement <package>` when `implement` starts an `implementer`.
No `turn.complete` hook moves a package.
The skill `implement` runs `verify` after the agent ends.
The skills `implement` and `review` run `dotclaude-spec runs` first.
It prints how many agents may start now.
The count comes from the subagent cap and from the usage sample in `.dotclaude/rate-limits.jsonl`.
A sample older than `USAGE_SAMPLE_MAX_MS` allows one run.
The cap is `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` when it is a positive number.
Otherwise, the cap is `SUBAGENTS_DEFAULT`.
For the agents, see [Agents](Agents).

## `rules-creator`

Call `/dotclaude:rules-creator [topic]`.
The skill writes a rule file, which is a Markdown file in a `rules/` folder.
A rule is guidance, and Claude can still break it.
The skill says so.
It names a hook or a permission rule for a behavior that must never happen.

The four phases are capture, write, test, and improve.

1. Capture: the skill uses the topic, and it asks for one wrong and one right example.
2. Pick the tool: a hook, a skill, `CLAUDE.md`, or a rule.
3. Pick the scope: `~/.claude/rules/` for each project, or `.claude/rules/` for the team.
4. Write the file, with one topic and a short name.
   Add `paths` only when the rule applies to some files.
5. Test the globs with the script:

   ```bash
   bun ${CLAUDE_SKILL_DIR}/scripts/check-globs.ts <rules-dir> <project-dir>
   ```

   The script lists the files with `git ls-files`.
   It matches each glob with `Bun.Glob`.
   It exits with status `1` for a glob with no match, a front matter that does not parse, or a rule over `MAX_PATTERNS` expanded patterns.
   It exits with status `2` for a missing rules folder or a folder that is not a git repository.
   The script comment says that `Bun.Glob` can differ from the matcher of Claude Code.
   So a pass is a strong sign, and it is not a proof.
6. Improve: the user runs a task in a new session.
   The skill makes the text more specific, or it moves the guidance to a hook.

When the user asks to split a large `CLAUDE.md`, the skill shows a plan first.
It moves each topic to its own rule file.
It keeps the facts for the whole project in the old file.
The skill says that a rule with no `paths` loads in each session.
It also says that a rule with `paths` costs nothing until Claude reads a matching file.

## Bounds

The bounds that the skills use, with their file:

| Bound | Value | File |
| --- | --- | --- |
| `SKILL_META_LOW_BYTES` | 150 | `tools/limits.ts` |
| `SKILL_META_HIGH_BYTES` | 300 | `tools/limits.ts` |
| `SKILL_META_TOTAL_LOW_BYTES` | 5 KB | `tools/limits.ts` |
| `SKILL_META_TOTAL_HIGH_BYTES` | 8 KB | `tools/limits.ts` |
| `SKILL_META_TOTAL_MAX_BYTES` | 15 KB | `tools/limits.ts` |
| `SKILL_BODY_LOW_BYTES` | 2 KB | `tools/limits.ts` |
| `SKILL_BODY_HIGH_BYTES` | 8 KB | `tools/limits.ts` |
| `SHOW_EVENTS_MAX` | 5 | `slices/spec/limits.ts` |
| `DEFAULT_SIZE` | `medium` | `slices/spec/limits.ts` |
| `USAGE_SAMPLE_MAX_MS` | 10 minutes | `slices/spec/limits.ts` |
| `SUBAGENTS_DEFAULT` | 20 | `slices/spec/limits.ts` |
| `CONTEXT_PERCENT` | 60 | `slices/handoff/limits.ts` |
| `HANDOFF_WAIT_TURNS` | 2 | `slices/handoff/limits.ts` |
| `HANDOFF_RETRY_MAX` | 1 | `slices/handoff/limits.ts` |

The size bounds are checked by `tools/sizes.ts`.
The metadata bounds apply to the `name` and `description` of each skill.
The metadata and body of each skill fail above their high bound.
They are reported below their low bound.
The total metadata of all skills fails above `SKILL_META_TOTAL_MAX_BYTES`.
It is reported above `SKILL_META_TOTAL_HIGH_BYTES`.
The page [Bounds](Bounds) lists all the bounds of the repository.

## Related Pages

- [Spec Store](Spec-Store): the folder that the phase skills write.
- [Context and Handoff](Context-And-Handoff): the `handoff` slice and the context bound.
- [Agents](Agents): the agents that the phase skills start.
- [Architecture](Architecture): the slices and the path from `src/` to `plugins/`.
- [Decisions](Decisions): the decisions behind each skill.
