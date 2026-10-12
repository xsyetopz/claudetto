# Core plugin: `dotclaude`

The core plugin `dotclaude` is the base of the marketplace.
It uses only documented extension points of Claude Code: an output style, six agents, six skills, one hooks module, a few classic hooks, and a status line command.
It sets no Claude Code setting, because a plugin cannot set permissions, environment variables, or models.
The [settings snippet](Settings-Snippet) gives those keys, and you copy them.
This page is the reference.
The other plugins work without it.

## What it does

- Ships the output style `dotclaude:Concise`, which the settings snippet selects.
  The style sets no `force-for-plugin`, so your `outputStyle` setting stays in charge.
  The module replaces the long system prompt with the shared sections and a prompt variant for each model ([System prompt](System-Prompt)).
- Gives six agents with a model, an effort, and a turn limit each ([Agents](Agents)).
- Asks before the first contact with a repository of another owner that has an AI policy file ([Contributions](Contributions)).
- Checks work with hooks that use no model call: git asks and edit asks ([Hooks](Hooks)).
- Tells a subagent to report before its context or turn bound ([Context bound](Context-Bound)).
- Puts each sentence of Markdown and commit text on its own line ([Semantic line breaks](Semantic-Line-Breaks)).
- Shortens attachments, agent lines, and tool descriptions by exact id ([Prompt surface](Prompt-Surface)).
- Shows a status line and a subagent status line ([Status line](Status-Line)).
- Reports differences from the settings snippet at session start ([Drift check](#drift-check)).
- Keeps the state of a large change in `.dotclaude/spec/` with the `spec` skill and the `dotclaude-spec` command ([Spec store](Spec-Store)).

## Install

Add the marketplace, install the plugin, then copy the keys that you want from the settings snippet.

```text
/plugin marketplace add xsyetopz/dotclaude
/plugin install dotclaude@dotclaude
```

Claude Code 2.1.296 or later and `git` are needed.
Bun 1.4.3 or later is needed for the classic hooks, the status line, and the setup script.
`gh` is needed for the policy ask.
See [Install](Install) for the steps and the update path.

## Skills

The core plugin ships six skills.
Each one is user-invoked (`disable-model-invocation: true`).

| Entry | What it does |
| --- | --- |
| `/dotclaude:handoff` | Writes a handoff file with the goal, the state, the next step, and the constraints of the user, then starts a clean session that reads it. |
| `/dotclaude:hotfix` | Fixes a defect with a known cause, with no spec before the fix, then runs the check and writes a record with `dotclaude-spec record`. |
| `/dotclaude:rules-creator` | Creates and improves rule files in `.claude/rules/`, with `paths` globs, and splits a large `CLAUDE.md`. |
| `/dotclaude:setup` | Applies the dotclaude settings snippet and checks the tools of the installed add-ons. |
| `/dotclaude:ship` | Runs the open packages of a large change, with one implementer agent in a worktree for each package and one reviewer for each diff, then merges each package that passes. |
| `/dotclaude:spec` | Sizes a request, starts a change in the spec store with `dotclaude-spec new`, and fills its files. |

A user-invoked skill has no listing line, so it costs no tokens in a request.
The `name` and `description` of a model-invocable skill have 150 to 300 bytes together (`SKILL_META_LOW_BYTES` and `SKILL_META_HIGH_BYTES` in `tools/limits.ts`).
The 300 is a bound, and a skill above it fails the size check.
The 150 is a target, and a skill below it gives only an advisory.
In a measure on Claude Code 2.1.293, `skillOverrides` did not apply to a plugin skill, so a plugin skill keeps its full listing line until you turn off the whole plugin.
This is why `docs` is a separate add-on ([Library docs](Library-Docs)).
dotclaude ships no skill from another author.

## Agents

| Agent | Work |
| --- | --- |
| `investigator` | Read-only answers from files, logs, git history, or web pages. |
| `implementer` | One scoped slice of work. |
| `debugger` | A failure with an unknown cause. |
| `reviewer` | Read-only review. |
| `planner` | Plans a change across several files before any edit, and writes only the plan. |
| `researcher` | Answers from web pages, official docs, and specifications. |

The CLI `dotclaude-run-checks` replaces the `test-runner` agent.
It runs a batch of check commands with no model turn, and it prints the failures.

The frontmatter of `agents/*.md` is the only source of the model, effort, and `maxTurns` of each agent.
See [Agents](Agents) for the table with the values and the pin tests.

## Hooks

The module `hooks/register.ts` handles nine events: `tool.check`, `tool.call` (on `Write`, `Edit`, and `Bash`), `prompt.compose`, `agent.spawn`, `prompt.section`, `prompt.attachment`, `agent.offer`, `tool.describe`, and `session.start`.
Classic command hooks cover `Bash` prints, git asks, edit checks, and subagent bounds.
The page [Hooks](Hooks#dotclaude) lists each one with its matcher.

The checks in short:

| Check | Result | Code |
| --- | --- | --- |
| Policy ask | Ask, once for each session and repository | `slices/guard/domain/owners.ts` |
| File print | Deny, with the `Read` call to use | `slices/guard/domain/reads.ts` |
| Git move | Ask for `git stash`, `git reset`, and a `git checkout` or `git restore` of a path | `slices/asks/domain/git.ts` |
| Test or limits file | Ask before a changed or removed existing line | `slices/asks/domain/testdiff.ts` |
| Lint or type-check config, CI file, or hook file | Ask before an edit | `slices/asks/domain/lintdiff.ts`, `slices/asks/domain/kinds.ts` |
| Skipped or focused test, or inline lint suppression | Ask before an added one | `slices/asks/domain/kinds.ts`, `slices/asks/domain/comments.ts` |

A recursive `rm` is not in this list.
It is an `ask` rule of the settings snippet, and no hook parses it.
The module has no catch-all, so a hook that throws is skipped and the verdict of the engine stands.

## Settings and options

The plugin has one option, `mainHandover`, which Claude Code asks for at install.
It takes `auto`, `manual` (the default), or `off`.
The other settings are keys that you copy:

- [Settings snippet](Settings-Snippet) gives the JSON.
- [Settings snippet keys](Settings-Snippet-Keys) gives the reason and default of each key.
- [Off switches](Off-Switches) lists the built-in features that the snippet turns off.
- [Settings schema](Settings-Schema) tells how the schema is made.

The status line needs two keys with the absolute path of the plugin folder:

```text
bun --no-env-file <plugin folder>/bin/dotclaude-statusline
bun --no-env-file <plugin folder>/bin/dotclaude-statusline --subagent
```

## Drift check

The `session.start` handler of the module compares the active settings with the settings snippet.
It appends one note to the conversation only when it finds a difference, and the note asks Claude to tell you.
It changes no setting.

| Difference | Line of the note |
| --- | --- |
| A built-in plugin of the snippet is not `false` in `enabledPlugins` | Names each plugin and the setting that turns it off. |
| A skill of the listing has the source `syncedSkills` | Gives the count and names `syncClaudeAiSkills`. |
| The Claude Code version is not 2.1.296 | Gives the version and the tested version. |
| A section id of the system prompt is unknown and has no colon | Names the id. dotclaude keeps the section as Claude Code made it. |
| The policy source of the settings has a key | Reports that the guard is seated, and names the parts that it skips. |
| `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set | Reports that the `model` and `effort` of the agent files do not apply. |

A fact that cannot be read gives no line, so a failed read cannot make a false report.
The section ids, the plugin names, and the version are data that Claude Code does not document ([Undocumented reads](Undocumented-Reads#the-drift-section-ids)).

## Limits

Each bound is in one file, and tests pin the copies.
The shared bounds are in `src/kernel/budget.ts`.

| Bound | Value | File |
| --- | --- | --- |
| Context window | {{CONTEXT_WINDOW}} tokens | `src/kernel/budget.ts` (`CONTEXT_WINDOW`) |
| Status line colors | Yellow at {{USAGE_LEVEL_LOW}}% and red at {{USAGE_LEVEL_HIGH}}% of the window | `src/kernel/budget.ts` (`USAGE_LEVELS`) |
| `bashOutputMaxChars` | {{BASH_OUTPUT_MAX_CHARS}} characters | `src/kernel/budget.ts` (`BASH_OUTPUT_MAX_CHARS`) |
| Policy `gh` call | {{POLICY_TIMEOUT_MS}} ms | `src/kernel/budget.ts` (`POLICY_TIMEOUT_MS`) |
| Policy text in the ask | {{POLICY_FILE_MAX_CHARS}} characters | `src/kernel/budget.ts` (`POLICY_FILE_MAX_CHARS`) |
| Subagent context | {{SUBAGENT_CONTEXT_MAX}} tokens, and {{HAIKU_CONTEXT_MAX}} for Haiku 5.5 | `slices/handoff/limits.ts` |
| Subagent turns left at the note | {{TURNS_LEFT_AT}} | `slices/handoff/limits.ts` (`TURNS_LEFT_AT`) |
| Subagent report | {{REPORT_MAX_WORDS}} words | `slices/handoff/limits.ts` (`REPORT_MAX_WORDS`) |
| File lists of the asks for configs, CI files, skipped tests, and suppressions | Data in `slices/asks/limits.ts` | `slices/asks/limits.ts` |
| File size that the `asks` checks read | {{FILE_MAX_BYTES}} bytes | `slices/asks/limits.ts` |
| Rows of the status line | {{MAX_ROWS}} | `slices/statusline/limits.ts` |

The size of the first request is bound in `tools/limits.ts` (`FIRST_REQUEST_LOW_BYTES` to `FIRST_REQUEST_HIGH_BYTES`), and the [Plugin layout](Plugin-Layout#bound-tiers) page explains the tiers.

## Files

| Path under `plugins/dotclaude/` | Part |
| --- | --- |
| `hooks/register.ts`, `hooks/hooks.json` | The hooks module and the classic hooks. `just generate` builds both from the slices. |
| `output-styles/Concise.md` | The output style `dotclaude:Concise`. |
| `agents/*.md` | The six agents. |
| `skills/<name>/SKILL.md` | The six skills of [Skills](#skills). |
| `bin/` | The command scripts, such as `dotclaude-setup` and `dotclaude-spec`. |
| `kernel/` | The shared code of the slices, from `src/kernel/`, such as `budget.ts`, `policy/`, and `shell.ts`. |
| `slices/<s>/` | One folder for each slice. It holds `slice.ts`, and where present `domain/` (pure code), `adapters/` (the handlers), `limits.ts` (the bounds), and `lab/` (the hook lab tests, run with `just lab`). |

## Troubleshooting

See [Troubleshooting](Troubleshooting#the-core-plugin-dotclaude).

## Related pages

- [Hooks](Hooks)
- [Guards](Guards)
- [Settings snippet](Settings-Snippet)
- [Undocumented reads](Undocumented-Reads)
- [Plugin layout](Plugin-Layout)
