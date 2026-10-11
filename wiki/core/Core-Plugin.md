# Core plugin: `dotclaude`

The core plugin `dotclaude` is the base of the marketplace.
It uses only documented extension points of Claude Code: a forced output style, five agents, one skill, one hooks module, a few classic hooks, and a status line command.
It sets no Claude Code setting, because a plugin cannot set permissions, environment variables, or models.
The [settings snippet](Settings-Snippet) gives those keys, and you copy them.
This page is the reference.
The other plugins work without it.

## What it does

- Forces the output style `dotclaude` (`force-for-plugin: true`), which holds the role, the tone, and the format.
  The module replaces the long system prompt with the shared sections and a prompt variant for each model ([System prompt](System-Prompt)).
- Gives five agents with a model, an effort, and a turn limit each ([Agents](Agents)).
- Asks before the first contact with a repository of another owner that has an AI policy file ([Contributions](Contributions)).
- Checks work with hooks that use no model call: git asks and edit asks ([Hooks](Hooks)).
- Tells a subagent to report before its context or turn bound ([Context bound](Context-Bound)).
- Puts each sentence of Markdown and commit text on its own line ([Semantic line breaks](Semantic-Line-Breaks)).
- Shortens attachments, agent lines, and tool descriptions by exact id ([Prompt surface](Prompt-Surface)).
- Shows a status line and a subagent status line ([Status line](Status-Line)).
- Reports differences from the settings snippet at session start ([Drift check](#drift-check)).
- Sets up OpenSpec with the `setup` skill ([OpenSpec](OpenSpec)).

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

| Entry | Invoked by | What it does |
| --- | --- | --- |
| `/dotclaude:setup` | The user only (`disable-model-invocation: true`) | Sets up OpenSpec in the current project. It shows each step and asks before it runs one. It changes no Claude Code setting. The script is `skills/setup/scripts/openspec.mjs`. |

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
| `test-runner` | Runs checks and returns the exact failures. |

The frontmatter of `agents/*.md` is the only source of the model, effort, and `maxTurns` of each agent.
See [Agents](Agents) for the table with the values and the pin tests.

## Hooks

The module `hooks/register.ts` handles nine events: `tool.check`, `tool.call` (on `Write`, `Edit`, and `Bash`), `prompt.compose`, `agent.spawn`, `prompt.section`, `prompt.attachment`, `agent.offer`, `tool.describe`, and `session.start`.
Classic command hooks cover `Bash` prints, git asks, edit checks, and subagent bounds, and a prompt hook on the model `claude-sonnet-5-5` covers `Stop`.
The page [Hooks](Hooks#dotclaude) lists each one with its matcher.

The checks in short:

| Check | Result | Code |
| --- | --- | --- |
| Policy ask | Ask, once for each session and repository | `features/guard/rules.ts` |
| File print | Deny, with the `Read` call to use | `features/reads/` |
| Git move | Ask for `git stash`, `git reset`, and a `git checkout` or `git restore` of a path | `features/adherence/git.ts` |
| Test or limits file | Ask before a changed or removed existing line | `features/adherence/rules.ts` |
| Lint or type-check config, CI file, or hook file | Ask before an edit | `features/adherence/kinds.ts` |
| Skipped or focused test, or inline lint suppression | Ask before an added one | `features/adherence/kinds.ts` |
| Stop rules | Block once, on `Stop`, a message that breaks one of three rules: a done claim with no passing check, an opener of agreement, praise, thanks, or an apology in place of the state, or a weakened check, test, bound, config, or hook | `src/plugins/dotclaude/hooks/Stop.prompt.txt` |

A recursive `rm` is not in this list.
It is an `ask` rule of the settings snippet, and no hook parses it.
The module has no catch-all, so a hook that throws is skipped and the verdict of the engine stands.

## Settings and options

The plugin has no option, and `plugins/dotclaude/settings.json` is an empty object.
The settings are keys that you copy:

- [Settings snippet](Settings-Snippet) gives the JSON.
- [Settings snippet keys](Settings-Snippet-Keys) gives the reason and default of each key.
- [Off switches](Off-Switches) lists the built-in features that the snippet turns off.
- [Settings schema](Settings-Schema) tells how the schema is made.

The status line needs two keys with the absolute path of the plugin folder:

```text
bun --no-env-file <plugin folder>/features/statusline/cli.ts
bun --no-env-file <plugin folder>/features/statusline/subagent-cli.ts
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

| Bound | Value | File |
| --- | --- | --- |
| Context window | 300,000 tokens | `lib/budget.ts` (`CONTEXT_WINDOW`) |
| Status line colors | Yellow at 75% and red at 90% of the window | `lib/budget.ts` (`USAGE_LEVELS`) |
| `bashOutputMaxChars` | 4,000 characters | `lib/budget.ts` |
| Policy `gh` call | 5,000 ms | `lib/budget.ts` (`POLICY_TIMEOUT_MS`) |
| Policy text in the ask | 2,000 characters | `lib/budget.ts` (`POLICY_FILE_MAX_CHARS`) |
| Subagent context | 100,000 tokens, and 85,000 for Haiku 5.5 | `features/context/limits.ts` |
| Subagent turns left at the note | 2 | `features/context/limits.ts` (`TURNS_LEFT_AT`) |
| Subagent report | 400 words | `features/context/limits.ts` (`REPORT_MAX_WORDS`) |
| File lists of the asks for configs, CI files, skipped tests, and suppressions | Data in `features/adherence/limits.ts` | `features/adherence/limits.ts` |
| File size that `adherence` reads | 1,000,000 bytes | `features/adherence/limits.ts` |
| Rows of the status line | 3 | `features/statusline/limits.ts` |

The size of the first request is bound in `tools/limits.ts` (`FIRST_REQUEST_LOW_BYTES` to `FIRST_REQUEST_HIGH_BYTES`), and the [Plugin layout](Plugin-Layout#bound-tiers) page explains the tiers.

## Files

| Path under `plugins/dotclaude/` | Part |
| --- | --- |
| `hooks/register.ts`, `hooks/hooks.json` | The hooks module and the classic hooks. |
| `src/plugins/dotclaude/hooks/Stop.prompt.txt`, `src/plugins/dotclaude/hooks/description.txt` | The text of the `Stop` prompt hook and the hook description. `just generate` (`tools/generate.ts`) builds `hooks.json` from them, and the plugin does not ship them. |
| `output-styles/dotclaude.md` | The forced style: role, tone, and format. |
| `features/prompt/shared.ts`, `features/prompt/variants.ts` | The shared rules and the model variants of the system prompt. |
| `agents/*.md` | The five agents. |
| `skills/setup/` | The setup skill and its script. |
| `features/<name>/` | One folder for each concern: `adherence`, `context`, `drift`, `guard`, `prompt`, `reads`, `sembr`, `setup`, `statusline`, and `surface`. |
| `lib/` | Pure shared code. |
| `tests/*.test.ts` | The hook lab, run with `just lab`. |

## Troubleshooting

See [Troubleshooting](Troubleshooting#the-core-plugin-dotclaude).

## Related pages

- [Hooks](Hooks)
- [Guards](Guards)
- [Settings snippet](Settings-Snippet)
- [Undocumented reads](Undocumented-Reads)
- [Plugin layout](Plugin-Layout)
