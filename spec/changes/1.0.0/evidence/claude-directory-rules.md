# P28 Rules answers, agents answer, and open items

This part of the [P28 report](claude-directory.md) answers the questions of the brief.
The short names in the column "Source" are in the main file.
The answers in the tables came from the docs and the bundle, not from a live session.
The section "Live checks" holds the results of live sessions in the sandbox.
The verify line of P28 asks for one live session for each rules answer, so each open item has a "Live check".

## Rules answers

| Question | Answer | Source |
| - | - | - |
| Does `claudeMdExcludes` apply to rules? | Yes, for rules from the `User`, `Project`, and `Local` sources. It does not apply to `Managed` files. The setting merges across the user, project, local, and managed layers. For a rule that you reach through a symlink, a pattern that matches the link path or the target path excludes it. | `mem` "Exclude specific CLAUDE.md files", `bundle:262374`, `bundle:319438` (setting schema), `bundle:326917` (functions `LRt` and `QRt` return false unless the source is `User`, `Project`, or `Local`) |
| When does a rule load? | A rule with no `paths` loads at launch, with the priority of `.claude/CLAUDE.md`. A rule with `paths` loads when Claude uses `Read`, `Write`, or `Edit` on a matching file, or reads one file with a Bash command such as `cat` or `head`. | `mem` "Path-specific rules" |
| Which front matter keys does Claude Code read? | `paths` only. Other keys are ignored with no error. A `paths` value is a YAML list or a comma-separated string. Claude Code removes the front matter before it loads the rule. If the YAML does not parse, the rule loads as if it had no `paths`. | `mem` "Rule frontmatter reference" |
| Do limits apply to `paths`? | One rule shares a budget of 1,000 expanded patterns and 4 MiB for brace expansion. A pattern over the budget stays unexpanded and matches no file. A pattern with an unreadable `[` matches nothing, and the other patterns of the rule still work. | `mem` |
| What happens with a symlink to a folder outside the working directory? | It counts as an external import. Nothing from it loads until you approve external imports for the project. After approval, only rules with no `paths` load. A link to a network path never loads. The shared place for rules without approval is `~/.claude/rules/`. | `mem` "Share rules across projects with symlinks" |
| What does `--setting-sources` do? | Without `project`, no project rule loads. Before `2.1.211`, rules that load on demand still loaded. | `mem` |
| What is the order? | User rules (`~/.claude/rules/`) load before project rules. Neither overrides the other. | `mem` "User-level rules" |
| Does `managed-only` for **Project instructions** skip rules? | It skips the launch load of `.claude/rules/` files. Path-scoped rules and rules in a subdirectory still load on demand. | `mem` |
| Do rules count for the `AGENTS.md` check? | No. They keep loading next to `AGENTS.md`. | `mem` |
| Can a plugin ship rules? | No path exists in `2.1.296`. The plugin manifest schema lists the component keys `agents`, `commands`, `hooks`, `lspServers`, `mcpServers`, `monitors`, `outputStyles`, `skills`, `themes`, and `workflows`. It has no `rules` key. Live check 5 confirms it: a `rules/` folder at the plugin root does not load. | `bundle:319434` |
| How do rules show in the Mod API? | The event `prompt.context` has the input `instructionFiles`, a list of `{ path, kind, content }`, next to `blocks`. A block named `claudeMd` holds the instruction text. The event `prompt.compose` takes `sections`, `tools`, and `traits`. The trace found no instruction text in `prompt.compose`. Whether a rule is one entry of `instructionFiles` is open. | `bundle:320307`, `bundle:320310`, `bundle:322283`, `bundle:326668` |
| Is the cost of a rule known? | A rule with no `paths` costs its full text in every session, like `CLAUDE.md`. A rule with `paths` costs nothing until a matching file is read. The docs give no token numbers. The tool `dotclaude-sessions:start-cost` can measure it. | `mem` |

## Agents: symlinks and agents added in a session

Both answers come from code paths, not from a live session.

- A symlink in `.claude/agents/` that points into the same repository: the `.md` file finder follows links.
  Its walker resolves a symlink and keeps the target when it is a file that ends in `.md` or a folder (`bundle:326668`, function `CVn`).
  Its other path runs `rg --files --hidden --follow` with the glob `*.md`, which also follows links (`bundle:326668`, function `qH`).
  A link that cannot be resolved logs `Failed to follow symlink` and is skipped.
  The expected result is that a link into the same repository loads.
  It is not confirmed that these two functions serve the agents folder.
- Agents added in a session: the agent list is not only a launch scan.
  A refresh call exists (`refreshAgents`, `bundle:348515`, `bundle:351625`).
  A session subscribes to a change signal that reloads commands and agents together (`reloadCommandsAndAgents`, `bundle:348515`).
  The file watcher that feeds the change signal covers the skill and command folders, with `.md` files and a depth of 2 (`bundle:335831`).
  The trace found no watcher on `.claude/agents/`.
  The expected result is that a new project agent does not appear until a refresh, such as a change in a skill or command file, or a new session.

## Live checks

Claude Code `2.1.296`, model `haiku`, date 2026-10-12.
Each check is one headless session in a scratch project in the temp folder, with the command `bun plugins/dotclaude-lab/bin/dotclaude-sandbox --dir <scratch> --model haiku -p "<prompt>"` and the token in `CLAUDE_CODE_OAUTH_TOKEN`.
The scratch project holds the rule `.claude/rules/plain.md` (`CANARY-RULE-7Q3`, no `paths`), the rule `.claude/rules/scoped.md` (`CANARY-PATH-4K8`, `paths: src/**/*.ts`), and a `CLAUDE.md` (`CANARY-CLAUDEMD-2Z9`).
Each prompt asks Claude to print each unique word that starts with `CANARY-`.
The sandbox was started with `dotclaude-sandbox`, not `just sandbox`, so none of the plugins of this repository were loaded.

| # | Check | Result | Relevant output |
| - | - | - | - |
| 1 | A rule with no `paths` in the main session | Loads. | With no tool use, the reply was `CANARY-CLAUDEMD-2Z9` and `CANARY-RULE-7Q3`. The `paths` rule did not show. |
| 2 | A rule with `paths` | Loads only after `Read` of a matching file. | After `Read src/a.ts` (`--allowedTools Read`), the reply added `CANARY-PATH-4K8`. |
| 3 | A `general-purpose` subagent | Sees the no-`paths` rule and the project `CLAUDE.md`. | Prompt: `Agent` with `subagent_type general-purpose`, prompt to print the words. The subagent reply was `CANARY-CLAUDEMD-2Z9` and `CANARY-RULE-7Q3`. The agent `Explore` with `omitClaudeMd` was not run. |
| 4 | A worktree of the project (`--worktree wt1`) | Loads the rules and the `CLAUDE.md` of the worktree. | The reply showed `pwd` `/private/tmp/<scratch>/project/.claude/worktrees/wt1` and `CANARY-RULE-7Q3`. The main folder had an uncommitted `plain.md` with `CANARY-MAINONLY-9X1`, and that word did not show. A `paths` rule in a worktree was not run. |
| 5 | A plugin with `rules/pr.md` (`CANARY-PLUGRULE-5W1`) at its root, loaded with `--plugin-dir` | Does not load. | The reply had `CANARY-CLAUDEMD-2Z9` and `CANARY-MAINONLY-9X1`, and no `CANARY-PLUGRULE-5W1`. The plugin itself loaded: the agent `rp:pa` from the same plugin was in the agent list. |
| 6 | A symlink `.claude/agents/linked-helper.md` to `../../real/helper.md` in the same project | Loads, and the `Agent` tool runs it. | `Agent` with `subagent_type linked-helper` returned `hi! What can I help you with in the project at /private/tmp/<scratch>/project?`. `/agents` was not run, because it needs a TTY. |

- Check 6 first failed with `Agent type 'linked-helper' not found`, because the first link had a wrong relative target (`../real/helper.md`).
  That was an error in the test, not in Claude Code.
  A plain copy of the file in the same folder was listed in the same session.
- Check 7 did not run.
  The `capture` slice of `dotclaude-lab` records the requests to the API, and no mod on `prompt.context` is ready.
  The item stays open.
- Agents added in a session and the checks of the other open items did not run in this pass.

## Open items

| Item | What is known | Live check in `just sandbox` |
| - | - | - |
| Do rules appear in `instructionFiles` of `prompt.context`, and as what `kind`? | The field exists with `path`, `kind`, and `content`. The values of `kind` were not traced. Live check 7 did not run: no capture of `prompt.context` is ready. | Register a mod on `prompt.context` that logs `instructionFiles`. Start with one rule that has `paths` and one that has none. |
| Do agents added in a session load? | No watcher on the agents folder was found. A refresh exists. | Add an agent file in a running session. Run `/agents`. Then change a skill file and run `/agents` again. |
| Where do `routines/`, `themes/`, `launch.json`, and `scheduled_tasks.json` read from, and what is `worktrees/` policy for git? | Only the names appear in the sandbox and permission code. | Read the pages `routines`, `terminal-config`, and `worktrees`. |
| Does `~/.claude/rules/` load when `user` is not in `--setting-sources`? | Not traced. | Start with `--setting-sources project`. Ask for the marker of a user rule. |
