# P28 The `.claude/` directory and the files around it

This report lists each file and folder of a project `.claude/`, of `~/.claude/`, and the files next to them, in Claude Code `2.1.296`.
It is evidence for P29 (`rules` slice) and P30 (`/rules-creator`).
It does not decide what dotclaude does with each entry.

## Parts

- This file: the sources, the columns, the root files, and the project `.claude/`.
- [Home folder](claude-directory-home.md): `~/.claude.json`, the authored files of `~/.claude/`, and the data that Claude Code writes there.
- [Rules answers](claude-directory-rules.md): the answers about `.claude/rules/`, the answer about agent symlinks, and the open items.

## Sources

| Short name | Source |
| - | - |
| `cd` | The docs page `claude-directory` ("Explore the .claude directory"), fetched 2026-10-12. |
| `mem` | The docs page `memory`, fetched 2026-10-12. |
| `bundle:N` | Line `N` of `external/cc-2.1.296/strings.txt` in the main checkout. |

The explorer widget of `cd` has no text in the fetched page.
When a cell says "not in the fetched pages", the two docs pages do not give the fact, and no live check ran.
The docs pages `settings`, `skills`, `sub-agents`, `mcp`, and `worktrees` were not fetched.
No cell copies a built-in prompt.

## Columns

- Writes: who creates the file. "You" means a person or a dotclaude setup. "Claude Code" means the tool writes it on its own.
- Read: when Claude Code reads the file.
- Git: whether git should track it.
- Control: the settings, env vars, and flags that change how the file loads.

## Files at the project root

| Entry | What it does | Writes | Read | Git | Control | Source |
| - | - | - | - | - | - | - |
| `CLAUDE.md` | Project instructions. | You | At launch, from the working directory and each directory above it. A file in a subdirectory loads when Claude reads, writes, or edits a file there. It is concatenated, root first. A file of 4 MiB or less loads in full. | Track | `claudeMdExcludes`, `--setting-sources`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`, `CLAUDE_CODE_ADDITIONAL_DIRECTORIES_CLAUDE_MD` for `--add-dir` | `mem`, `cd` |
| `.claude/CLAUDE.md` | The same as `CLAUDE.md`, in the `.claude/` folder. | You | The same as `CLAUDE.md`. | Track | The same as `CLAUDE.md`. | `mem` |
| `CLAUDE.local.md` | Private instructions for this project. It is appended after `CLAUDE.md` in the same directory. | You | The same as `CLAUDE.md`. | Do not track. Add it to `.gitignore`. | `claudeMdExcludes`, and `local` in `--setting-sources`. | `mem`, `cd` |
| `AGENTS.md` | Project instructions that other coding agents also read. | You | At launch, only when no `CLAUDE.md`, `.claude/CLAUDE.md`, or `CLAUDE.local.md` exists in the working directory or above it. A subdirectory file loads when Claude reads a file there. Claude Code `2.1.277` or later. | Track | **Project instructions** in `/config`, set in `pluginConfigs` under `cc-plugin-agents-md@builtin`. Values: `claude-md-or-agents-md` (default), `claude-md-and-agents-md`, `claude-md`, `managed-only`. `claudeMdExcludes` applies. `InstructionsLoaded` hooks do not fire for it. | `mem` |
| `.claude/AGENTS.md` | The same as `AGENTS.md`. | You | The same as `AGENTS.md`. | Track | The same as `AGENTS.md`. | `mem` |
| `.mcp.json` | MCP servers that the team shares. | You, or `claude mcp add --scope project` (the command is not in the fetched pages) | At launch. A project server needs approval (the approval flow is not in the fetched pages). | Track | `enableAllProjectMcpServers`, `enabledMcpjsonServers` (both in the list of settings that a launch folder cannot set, `bundle:319442`). | `cd` |
| `.worktreeinclude` | Lists gitignored files that Claude Code copies into a new worktree. | You | When Claude Code creates a worktree. | Track | Not in the fetched pages. | `cd` |

## Project `.claude/`

| Entry | What it does | Writes | Read | Git | Control | Source |
| - | - | - | - | - | - | - |
| `settings.json` | Permissions, hooks, env vars, and model defaults for the team. | You | At launch. | Track | `--settings`, `--setting-sources`. Managed settings win over it. | `cd` |
| `settings.local.json` | Personal overrides for this project. | You, or Claude Code when it saves a setting. | At launch. | Do not track. Claude Code adds it to the gitignore when it saves a setting there. | The same as `settings.json`. | `cd` |
| `rules/*.md` | Instructions for one topic. A rule can have `paths:` to load only for matching files. | You | A rule with no `paths` loads at launch. A rule with `paths` loads when Claude reads, writes, or edits a matching file. | Track | `claudeMdExcludes`, `--setting-sources` (without `project`, no project rule loads). See the [rules answers](claude-directory-rules.md). | `mem`, `cd` |
| `skills/<name>/SKILL.md` | A prompt that you start with `/name`, or that Claude starts. | You | The name and description at launch. The body when the skill runs. A watcher reloads the folder in a session (`bundle:335831`). | Track | `disableBundledSkills` is for bundled skills only. Per skill: front matter. | `cd` |
| `commands/*.md` | A single-file prompt. The mechanism is the same as a skill. | You | The same as `skills/`. | Track | The same as `skills/`. | `cd` |
| `agents/*.md` | A subagent with its own prompt and tools. | You | The list loads at start. See the [agents answer](claude-directory-rules.md#agents-symlinks-and-agents-added-in-a-session). | Track | Front matter fields in `cd`, among them `omitClaudeMd`. | `cd` |
| `agent-memory/<name>/` | Persistent memory of a subagent. | Claude Code, for a subagent with the `memory` field. | When that subagent runs. | Track (the `cd` table marks it as tracked) | The `memory` field of the agent: `user`, `project`, or `local`. | `cd` |
| `output-styles/*.md` | A custom instruction set that changes how Claude works. | You | When you pick the style. | Track | Front matter: `keep-coding-instructions`, `force-for-plugin`. | `cd` |
| `workflows/*.js` | A saved dynamic workflow. Each file becomes a `/<name>` command. | Claude Code, saved from `/workflows`. | At launch. | Track | `CLAUDE_CODE_DISABLE_WORKFLOWS`, `disableWorkflows`. | `cd`, [inventory](inventory.md) |
| `worktrees/` | The place for worktrees that Claude Code makes for subagents and sessions. | Claude Code | When a worktree starts. | Do not track. | Not in the fetched pages. | `mem` |
| `hooks/` | Hook scripts. Hooks run from `settings.json`, not from this folder. | You | The fetched pages do not say that Claude Code reads this folder. | Track | `hooks` in `settings.json`. | `bundle:351849` |
| `routines/`, `themes/`, `launch.json`, `scheduled_tasks.json` | Names that the sandbox and permission code treat as config. | Not in the fetched pages. | Not in the fetched pages. | Not in the fetched pages. | Not in the fetched pages. | `bundle:351849`, `bundle:323584` |

The `Edit` deny list of the bundle names `agents`, `skills`, `hooks`, `rules`, `output-styles`, `workflows`, and `routines` under `.claude/` (`bundle:351849`).
That list shows which project folders count as config.
