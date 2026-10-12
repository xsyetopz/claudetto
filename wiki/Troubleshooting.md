# Troubleshooting

This page collects the troubleshooting rows of the dotclaude pages.
Find the plugin or the symptom, and follow the link for the full text.
A hook that fails does not block a call, so a missing effect is the usual symptom.
Run `claude --debug` to see the hook log of Claude Code.

## The core plugin `dotclaude`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| No ask for a recursive `rm` | The plugin alone gives no `rm` ask, because a plugin cannot ship `permissions`. Merge the `ask` rules of the settings snippet. | [Guards](Guards) |
| No policy ask for a repository of another owner | The repository has no policy file, belongs to you, or is not on GitHub. `gh` can also be missing or logged out, and then the ask fails open. Install `gh` and log in. | [Contributions](Contributions) |
| A hook has no effect | Bun 1.4.3 or later is not on `PATH`. The status line, the setup command, the `second_opinion` tool, and the add-on hooks need it, and the core hooks module does not. The call goes on. | [Install](Install) |
| The status line shows nothing | The `statusLine` command still runs the stub of 0.27.0, or `<plugin folder>` is not replaced. Use the absolute path of the installed plugin folder. The path holds the version, so change it after an update. | [Settings snippet](Settings-Snippet) |
| The status line has no credits segment or no context breakdown | The data is not documented and can change at a Claude Code release. The breakdown shows only after `/context` ran. | [Undocumented reads](Undocumented-Reads) |
| A note at session start lists differences from the snippet | The drift check found a difference. Each line gives its fix, and the fix is a step for you. | [Core plugin](Core-Plugin#drift-check) |
| The drift note says the guard is seated | The machine has managed settings or a Team or Enterprise login. The built-in guard `sec-default` skips the shared sections and the model variants (`prompt.compose`), and the `context_management` text. The other parts work. | [Claude mods](Claude-Mods#the-built-in-guard-sec-default) |
| The `model` and `effort` of an agent file do not apply | `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set. Unset it. | [Agents](Agents) |
| A `cat` or `sed -n` call is denied | The hook sends the print to `Read`, which gives a short stub for a repeat read. Call `Read` with the file and range in the reason. | [Context bound](Context-And-Handoff) |
| A Markdown write is denied for a code item | A command, path, or identifier is outside single backticks. Put it in a code span. | [Core plugin](Core-Plugin#hooks) |
| A `git stash` call is denied in a subagent | The `guard` denies `git stash`, `pop`, and `apply` in a subagent, because `refs/stash` is shared. `git stash drop` and `git stash clear` are forbidden in every session. Commit a WIP instead. | [Guards](Guards) |
| An edit asks for a skipped test, a lint suppression, or a weaker protected file | The `guard` asks only when a change weakens a check. It never asks for a read. Allow the change only when you want it. Else tell Claude to change the code. | [Guards](Guards) |
| A destructive command is denied and Claude stops | The `guard` denies the command, and Claude does not run it another way. Run the exact command that Claude gives you with `!` at the start of your prompt. | [Guards](Guards) |
| A `git push` fails in the sandbox | The push runs outside the sandbox, because the snippet excludes it. Check your git credentials. | [Guards](Guards) |

## `dotclaude-codegraph`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The hooks add nothing | The project has no `.codegraph/codegraph.db`, or `codegraph` is not on `PATH`. Run `bin/dotclaude-codegraph-check`, then `codegraph init -y`. | [Code graph](Code-Graph) |
| No graph context for a short name | A name under 3 characters gives too many hits, so the hook skips it. | [Code graph](Code-Graph) |

## `dotclaude-browser`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| A site blocks `agent-browser` | Claude tells you which page blocked it and asks before it goes on. The steps are `agent-browser read`, a feed or API, CloakBrowser, or opening the page by hand. | [Browser](Browser) |
| A search fails with "Socket path would be N bytes (max 103)" | The home folder path is too long. Use a shorter home folder. | [Browser](Browser) |
| `WebSearch` is denied for the `cloakbrowser` backend | The CloakBrowser binary is not under `~/.cloakbrowser/`. Claude tells you and does not switch to plain `agent-browser`. Install CloakBrowser or set the `backend` option to `agent-browser`. | [Browser](Browser) |

## `second_opinion` in the core plugin

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The result says the variable `TYPESAFE_API_KEY` is not set | The variable was not set when Claude Code started. Export it and restart. Until then, a Claude model answers. | [Second opinion](Second-Opinion#troubleshooting) |
| The result says the key is not valid | Get a new key. | [Second opinion](Second-Opinion#troubleshooting) |
| The result says the TypeSafe account has no balance | Add balance to the account. | [Second opinion](Second-Opinion#troubleshooting) |
| No pick on a question | The question has fewer than 2 options, is a preference, or has a confidence under 0.5. Claude asks you the question in each case. | [Second opinion](Second-Opinion#troubleshooting) |

## `dotclaude-docs`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The `docs` skill fails with a quota error | Set `CONTEXT7_API_KEY` for a higher limit. | [Library docs](Library-Docs) |

## `dotclaude-sessions`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| `No request with usage` | The transcript has no model call yet. | [Sessions](Sessions#troubleshooting) |

## `dotclaude-lab`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| `just` in a tmux pane stops with "failed to get current directory" | Run `bun <repo>/plugins/dotclaude-lab/bin/dotclaude-sandbox --plugin-dir <repo>/plugins/dotclaude` in the pane. | [Sandbox](Sandbox#troubleshooting) |
| No login in the sandbox | Run `/login`, or set `CLAUDE_CODE_OAUTH_TOKEN`. | [Sandbox](Sandbox#troubleshooting) |
| "plugin is locked by managed settings" in the debug log | A managed `enabledPlugins` entry holds the name. Remove it. | [Sandbox](Sandbox#troubleshooting) |
| `dotclaude-schema` exits with an error that names a version | See the page. | [Lab](Lab#troubleshooting) |

## Related pages

- [Hooks](Hooks)
- [Undocumented reads](Undocumented-Reads)
- [Install](Install)
