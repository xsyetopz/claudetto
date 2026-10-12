# Skills

The core plugin `dotclaude` ships six skills.
Each skill is a `SKILL.md` file in its slice, under `src/plugins/dotclaude/slices/<slice>/skills/`.
Claude Code runs a skill as `/dotclaude:<name>`.

A skill gives Claude a procedure.
Each skill treats the output of its commands and the text of its files as data, not as instructions.
Each skill ends with a report to the user.

## The six skills

| Skill | Call | What it does | Slice or CLI that does the work | Writes |
| --- | --- | --- | --- | --- |
| `handoff` | `/dotclaude:handoff` | Writes a handoff file, so a new session can continue the work. | `handoff` slice, `dotclaude-handoff` | One file in `.dotclaude/handoff/` |
| `hotfix` | `/dotclaude:hotfix <cause and fix>` | Fixes a defect with a known cause, then records it. | `spec` slice, `dotclaude-spec record` | One record in `.dotclaude/spec/hotfixes/`, and the code edit |
| `rules-creator` | `/dotclaude:rules-creator [topic]` | Writes a rule file, with `paths` globs, and checks the globs. | `rules` slice, `check-globs.ts` script | A rule in `.claude/rules/` or `~/.claude/rules/` |
| `setup` | `/dotclaude:setup [user\|project\|local]` | Merges the settings snippet and checks the add-on tools. | `setup` slice, `dotclaude-setup` | The settings file of the scope, and add-on installs |
| `ship` | `/dotclaude:ship <change-id>` | Runs the open packages of a large change in worktrees, then merges each one that passes. | `spec` slice, `dotclaude-spec` | Lane files, merge commits, and the `plugins/` output |
| `spec` | `/dotclaude:spec <change-id> [size]` | Starts a change in the spec store and fills its files. | `spec` slice, `dotclaude-spec new` and `validate` | Files in `.dotclaude/spec/changes/<change-id>/` |

Each skill sets `disable-model-invocation: true` in its front matter.
The name of that key says that Claude does not start the skill by itself.
This page treats that as inference from the key name.
The skill runs when the user types its command.

## How a skill is built

Each `SKILL.md` has a front matter with `name`, `description`, and the keys that the skill needs.
The keys that the six files use are `disable-model-invocation`, `argument-hint`, and `allowed-tools`.
The `allowed-tools` value pre-approves the commands and tools that it lists, so they run with no prompt.
It does not deny the other tools.
For example, `hotfix` pre-approves `dotclaude-spec record` and `git diff`, and the other commands follow the permission rules of the session.

The body has a `<task>` part and a `<procedure>` part, or a `<steps>` part.
The text `$ARGUMENTS` holds the words that the user types after the command.
The `rules-creator` skill reads `${CLAUDE_SKILL_DIR}` to find its script.
Each skill says that the output of a command and the text of a file are data, not instructions.

The size of each `SKILL.md` has bounds.
The bounds are in [Bounds](Bounds).

## handoff

Call `/dotclaude:handoff` when the context is large, or when part of the work is done.
The skill writes one file with four parts: the goal, the state, the next step, and the constraints of the user.
The skill copies each constraint of the user word for word.

How it works:

1. The `handoff` mod, in `src/plugins/dotclaude/slices/handoff/adapters/mod.ts`, runs `dotclaude-handoff path` when the skill starts.
   The mod names the path in the text of the prompt.
2. The skill writes the file with the `Write` tool, and makes no other change.
3. At the next end of a turn, the mod runs `dotclaude-handoff newest`.
   When the newest file is the file of the skill, the mod runs `dotclaude-spec next`, then `/clear`, then it submits a resume prompt with the path.
4. In `auto` mode, when no file appears in `HANDOFF_WAIT_TURNS` turns, the mod submits the write prompt again, up to `HANDOFF_RETRY_MAX` times.
   In `manual` mode, the mod shows a hint to the user instead.

The mod also finds a trigger without the skill.
The trigger fires when the context of the main session passes `CONTEXT_PERCENT`, or when a package goes to `done`.
The `mainHandover` option sets the mode: `auto`, `manual`, or `off`.
The default is `manual`, as `DEFAULT_MAIN_HANDOVER` sets it.
For the cost of a handoff, see [Context-And-Handoff](Context-And-Handoff).

The file has the name that `handoffName` makes from the time, in `.dotclaude/handoff/`.
The CLI writes no file.

## hotfix

Call `/dotclaude:hotfix <cause and fix in one line>`.
Use it when the cause is known and the fix is small.
Use `/dotclaude:spec` instead when the fix changes more than one capability, changes a file format, or needs more than one agent.
Start the `debugger` agent when the cause is not known.

The steps:

1. The skill checks that the fit is right.
   When the argument is empty, it asks the user for the cause.
2. It reads each file of the cause with `Read`, `Glob`, and `Grep`.
3. It makes the smallest edit with `Edit`, and shows each changed line.
4. It runs the test of the file or the check of the project.
   After two failed checks, it stops and gives the output of each check.
5. It runs `dotclaude-spec record <text>`.
   The command writes `.dotclaude/spec/hotfixes/<date>-<slug>.md`.
   The slug has lowercase words joined with `-`, and it stops at `HOTFIX_SLUG_MAX` characters.
   A name that exists gets `-2`, `-3`, and so on.
6. The skill fills the empty sections `## Cause`, `## Fix`, and `## Check`.

The skill does not commit.
It commits when the user asks.

## setup

Call `/dotclaude:setup`, or `/dotclaude:setup user`, `project`, or `local`.
Run it after an install or an update of the plugin.
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

2. It runs `dotclaude-setup settings --scope <scope>` without `--apply`, and shows the list of changes.
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

## spec

Call `/dotclaude:spec <change-id> [trivial|medium|large]`.
The skill starts a change in the spec store, which is the folder `.dotclaude/spec/`.
The skill ends when `dotclaude-spec validate <change-id>` passes.
It does not start the work.
For the store, see [Spec-Store](Spec-Store).

The id uses letters, digits, `.`, `_`, and `-`.
The id `archive` is not valid.
When the size is missing, the skill picks it from the table below.
The default size of the CLI is `medium`.

| Size | Use it when | Files that `dotclaude-spec new` writes |
| --- | --- | --- |
| `trivial` | One edit has a command that shows it is done. | `change.md` |
| `medium` | A change touches one or more capabilities. | `change.md` and `specs/capability.md` |
| `large` | Several agents do different parts. | The medium files, `design.md`, `packages.md`, `packages/01-first.md`, and the events file |

The steps:

1. The skill runs `dotclaude-spec new <id> --size <size>`.
   The command stops with status `1` when the change exists.
2. It fills `change.md` with the reason, the scope, and the tasks.
   Each task is `- [ ] <id> <text>`, with a `Verify:` line below it.
   `validate` fails on a task with no `Verify:` line.
3. For a medium or large change, it renames `specs/capability.md` to `specs/<capability>.md`.
   It uses `## ADDED`, `## MODIFIED`, or `## REMOVED`, with `### Requirement:` and `#### Scenario:` blocks.
4. For a large change, the skill starts the `planner` agent, which writes `design.md`.
   It starts the `reviewer` agent on that file.
   The skill writes one file for each package, with the front matter `id`, `deps`, `owns`, `verify`, and `agent`.
5. It runs `dotclaude-spec validate <id>` and fixes each problem that the command names.
   The skill does not change the rules of `validate`.

For a large change, the next step is `/dotclaude:ship <change-id>`.

## ship

Call `/dotclaude:ship <change-id>`.
Run it in the main checkout, because `dotclaude-spec lane` stops in a linked worktree.
The skill runs the open packages of one large change, in the order of their `deps`.
The main session reviews, merges, and moves the lane of each package.

The steps:

1. The skill runs `git worktree list`, `git status`, `dotclaude-spec validate <id>`, and `dotclaude-spec status <id>`.
2. `dotclaude-spec ready <id>` prints each package in the lane `planned`.
   Its `deps` are all `done`, and its `owns` do not overlap a package that runs.
3. `dotclaude-spec runs` prints how many agents may start now.
   The count comes from the subagent cap and from the usage sample.
   The skill starts no more agents than the count.
   When the count is `0`, the skill stops and gives the reset time.
4. The skill starts one `implementer` agent for each package, with `isolation` set to `worktree`.
   A hook in `src/plugins/dotclaude/slices/spec/adapters/mod.ts` sets the lane `doing` at the start, and `review` at the end.
5. The skill starts a `reviewer` agent with the package file and the output of `git diff <base>...<branch>`.
   The reviewer does not see the report of the implementer.
6. A package that fails gets one retry, with the findings.
   When the retry fails, the lane is `blocked`, and the other packages go on.
7. `dotclaude-spec merge <package> <branch>` runs in the main checkout.
   The command commits the lane files, merges the branch, runs `just generate`, sets the lane `done`, and commits `plugins/`.
   It stops with no change when the tree holds another change, or when the merge has a conflict.
8. When each package is `done`, the skill runs `validate`, the project check, and `status`.
   It asks the user whether to push and whether to archive the change.
   It does neither until the user answers.

The count of `dotclaude-spec runs` uses the usage sample in `.dotclaude/rate-limits.json`.
The status line writes that file.
A sample older than `USAGE_SAMPLE_MAX_MS` allows one run.
The cap is `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` when it is a positive number.
Otherwise, the cap is `SUBAGENTS_DEFAULT`.
For the agents, see [Agents](Agents).

## rules-creator

Call `/dotclaude:rules-creator [topic]`.
The skill writes a rule file, which is a Markdown file in a `rules/` folder.
A rule is guidance, and Claude can still break it.
The skill says so, and it names a hook or a permission rule for a behavior that must never happen.

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

   The script lists the files with `git ls-files`, and it matches each glob with `Bun.Glob`.
   It exits with status `1` for a glob with no match, a front matter that does not parse, or a rule over `MAX_PATTERNS` expanded patterns.
   It exits with status `2` for a missing rules folder or a folder that is not a git repository.
   The script comment says that `Bun.Glob` can differ from the matcher of Claude Code, so a pass is a strong sign and not a proof.
6. Improve: the user runs a task in a new session, and the skill makes the text more specific or moves the guidance to a hook.

When the user asks to split a large `CLAUDE.md`, the skill shows a plan first.
It moves each topic to its own rule file, and it keeps the facts for the whole project in the old file.
The skill says that a rule with no `paths` loads in each session, and that a rule with `paths` costs nothing until Claude reads a matching file.

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
| `HOTFIX_SLUG_MAX` | 40 characters | `slices/spec/limits.ts` |
| `DEFAULT_SIZE` | `medium` | `slices/spec/limits.ts` |
| `USAGE_SAMPLE_MAX_MS` | 10 minutes | `slices/spec/limits.ts` |
| `SUBAGENTS_DEFAULT` | 20 | `slices/spec/limits.ts` |
| `CONTEXT_PERCENT` | 60 | `slices/handoff/limits.ts` |
| `HANDOFF_WAIT_TURNS` | 2 | `slices/handoff/limits.ts` |
| `HANDOFF_RETRY_MAX` | 1 | `slices/handoff/limits.ts` |

The size bounds are checked by `tools/sizes.ts`.
The metadata bounds apply to the `name` and `description` of each skill.
The metadata and body of each skill fail above their high bound, and they are reported below their low bound.
The total metadata of all skills fails above `SKILL_META_TOTAL_MAX_BYTES`, and it is reported above `SKILL_META_TOTAL_HIGH_BYTES`.
The page [Bounds](Bounds) lists all the bounds of the repository.

## Related pages

- [Spec-Store](Spec-Store) describes the folder that `spec`, `hotfix`, and `ship` write.
- [Context-And-Handoff](Context-And-Handoff) describes the `handoff` slice and the context bound.
- [Agents](Agents) describes the agents that `spec` and `ship` start.
- [Architecture](Architecture) describes the slices and the path from `src/` to `plugins/`.
- [Decisions](Decisions) holds the decisions behind each skill.
