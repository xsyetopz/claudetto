# Troubleshooting

This page is for users who see a symptom in dotclaude.
It lists each symptom with its cause and fix.
Find the plugin, then find the symptom.
Each row names the page with the full description.

The debug log of Claude Code shows what a hook or a plugin did.

## The Core Plugin `dotclaude`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| No ask for a recursive `rm` | The plugin cannot set `permissions`, so the `ask` rules of the snippet do not load from the plugin. Run `/dotclaude:setup` to apply the snippet. | [Guards](Guards) |
| No policy ask for a repository of another owner | The repository has no `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md`, or it belongs to you. The check also reads nothing when `gh` is missing or not authenticated, so no ask is shown. Install `gh`, then authenticate it with GitHub. | [Contributions](Contributions) |
| The status line shows nothing | The snippet still has the `<plugin folder>` placeholder, or the status line runs a dotclaude folder that is not the installed plugin. Run `/dotclaude:setup`. | [Settings-Snippet](Settings-Snippet) |
| The status line has no credits segment or no context breakdown | dotclaude reads these values from Claude Code data that is not documented. A Claude Code release can change that data. | [Undocumented-Reads](Undocumented-Reads) |
| A note at session start lists differences from the snippet | The drift check found a difference. The note names each fix, and the user applies it. dotclaude changes no setting. | [Architecture](https://github.com/xsyetopz/claudetto/blob/dotclaude--v1.0.0/wiki/dotclaude/Architecture.md#drift-check) |
| The drift note says the guard is seated | Managed settings exist on this machine. The built-in guard `sec-default` skips the shared sections and the model variants of the system prompt, and the `context_management` text. The other parts of dotclaude still work. | [Request-Build](Request-Build#the-built-in-guard-sec-default) |
| The drift note says the `model` and `effort` of the agent files do not apply | `CLAUDE_CODE_EFFORT_LEVEL` or `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` is set. Unset it. | [Agents](Agents) |
| The drift note says a built-in plugin is on | The snippet sets the entry to `false` in `enabledPlugins`. Set that entry to `false` in the user settings. | [Settings-Snippet](Settings-Snippet) |
| The drift note says the skill listing has synced claude.ai skills | Set `syncClaudeAiSkills` to `false` in the user settings. | [Settings-Snippet](Settings-Snippet) |
| The drift note says Claude Code is not the tested version | A mod event can differ on this version. The note names the tested version. | [Hook-Events](Hook-Events) |
| The drift note says a rule file has a `paths` problem | The `paths` front matter does not parse, or its braces expand to more than 1000 patterns, or its glob matches no tracked file. Fix the `paths` of that rule file. | [Architecture](https://github.com/xsyetopz/claudetto/blob/dotclaude--v1.0.0/wiki/dotclaude/Architecture.md#drift-check) |
| A `cat` or `sed -n` call is denied | The `guard` denies a print of a file in `Bash`. Use `Read` for the file. `Read` sends a short stub when the same range is read again. | [Context-And-Handoff](Context-And-Handoff) |
| A `git stash` call is denied in a subagent | The shared checkout and `refs/stash` belong to the main session, so the `guard` denies `git stash` in a subagent. Commit the work in progress instead. | [Guards](Guards) |
| `git stash drop` or `git stash clear` is denied | The `guard` denies these calls in every session. Keep the stash. | [Guards](Guards) |
| An edit asks before it goes on | The `asks` slice asks before a call that discards work, adds a skipped test or a lint suppression, or changes a protected file. It never asks for a read. Allow the change only if you want it. Otherwise, tell Claude to change the code. | [Guards](Guards) |
| A destructive command is denied | The `guard` denies the command. Claude asks you to run the exact command as a `!` command at the start of your prompt. | [Guards](Guards) |

## The Code Graph `dotclaude-codegraph`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The hooks add nothing | `codegraph` is not on `PATH`, or the project has no `.codegraph/codegraph.db`. Install `codegraph` with `bun i -g @colbymchenry/codegraph`, run `dotclaude-codegraph-check`, and run `codegraph init -y` in the project. | [Code-Graph](Code-Graph) |
| The index is out of date | The sync runs after an edit and after a `git` command that changes the tree. A change made outside Claude Code does not sync. Run `codegraph sync -q` by hand. | [Code-Graph](Code-Graph) |

## The Browser `dotclaude-browser`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The skill says `agent-browser` is not installed | Run `npm install -g agent-browser`. | [Browser](Browser) |
| The skill says the guide is missing | The command `agent-browser skills get core` returned no guide. It can time out, or the version can be too old. Run that command by hand to see its output. | [Browser](Browser) |
| A site blocks `agent-browser` | Claude tells you which page blocked it, and it asks before it continues. The steps are `agent-browser read` for the page, a feed, a sitemap, or an API, then CloakBrowser, then opening the page by hand. | [Browser](Browser) |
| A `WebSearch` call is denied with the CloakBrowser message | The `backend` option is `cloakbrowser`, and no CloakBrowser binary is under `~/.cloakbrowser/`. Install CloakBrowser, or set `backend` to `agent-browser`. | [Browser](Browser) |
| The search says the built-in `WebSearch` answered | The browser gave no result, because of a bot check, a failed step, or a page with no text. With the `cloakbrowser` backend, the result says so. | [Browser](Browser) |
| A search fails with a socket path error | The home folder path is too long, and macOS refuses a socket path over 103 bytes. Use a shorter home folder path. | [Browser](Browser) |

## The Second Opinion of the Core Plugin

The full list of causes is on [Second-Opinion](Second-Opinion#troubleshooting).

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The result says `TYPESAFE_API_KEY` is not set | The variable was not set when Claude Code started, so Jev was not tried. Export the variable and start Claude Code again. A small Claude model answers until then, and the result says so. | [Second-Opinion](Second-Opinion#troubleshooting) |
| The result says the key is not valid | Get a new key, and set it in `TYPESAFE_API_KEY`. | [Second-Opinion](Second-Opinion#troubleshooting) |
| The result says the TypeSafe account has no balance | Add balance to the account. | [Second-Opinion](Second-Opinion#troubleshooting) |
| The question gets no pick | The tool does not pick for a question with fewer than 2 options. It does not pick for a preference, an approval, or a choice that reasonable engineers make either way. Claude asks you. | [Second-Opinion](Second-Opinion#troubleshooting) |

## The Library Docs `dotclaude-docs`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The `docs` skill reports a quota error | Set `CONTEXT7_API_KEY`, which raises the limit. | [Library-Docs](Library-Docs) |
| A `ctx7` call is denied | The skill allows only one form of the call, in its `allowed-tools` entry. Ask the user, and do not change the form. | [Library-Docs](Library-Docs) |
| `bunx` is not found | Install Bun, and check that `bunx` is on `PATH`. | [Library-Docs](Library-Docs) |

## The Sessions `dotclaude-sessions`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| `No request with usage` | The transcript has no model call yet. Send one prompt, then run the command again. | [Sessions](Sessions) |
| The usage report covers too short a period | The default period is 7 days. Pass `--days N` to `dotclaude-usage`. | [Sessions](Sessions) |
| The usage report reads the wrong transcripts | Pass `--root DIR` to `dotclaude-usage` to read another transcripts folder. | [Sessions](Sessions) |
| `dotclaude-start` measures the wrong session | Pass the path of the `.jsonl` file of the session to `dotclaude-start`. | [Sessions](Sessions) |

## The Sandbox and the Lab `dotclaude-lab`

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| `claude` is not found, or the sandbox runs a shell function | The sandbox finds `claude` on `PATH` only. Put the `claude` executable on `PATH`, because a shell function or an alias does not work. | [Sandbox](Sandbox) |
| No login in the sandbox | Run `/login` inside the sandbox, or set `CLAUDE_CODE_OAUTH_TOKEN`. | [Sandbox](Sandbox) |
| `claude` finds no prompt in a headless run | Put the prompt before variadic flags such as `--allowedTools`. | [Sandbox](Sandbox) |
| A headless tool call is denied with "you haven't granted it yet" | List the tool in `--allowedTools`. | [Sandbox](Sandbox) |
| A `gh api` call fails in the sandbox | `gh` reads its token with the real `HOME`. Use a test that does not need it. | [Sandbox](Sandbox) |
| The sandbox warns about a `--model` | The model is not in `availableModels` of the sandbox, so Claude Code runs another model. Pass a model from that list. | [Lab](Lab) |
| The debug log says the plugin is locked | A managed setting locks the plugin name, so Claude Code ignores the `--plugin-dir` copy. Remove the managed `enabledPlugins` entry. | [Sandbox](Sandbox) |
| `dotclaude-schema` exits with 2 | The command needs `--out DIR`. Pass it. | [Lab](Lab) |
| `dotclaude-schema` says `claude is not on PATH.` or `--version exited with N` | The command finds no bundle to read the version from. Pass `--bundle FILE` and `--version X.Y.Z`. | [Lab](Lab) |
| `dotclaude-capture` says the upstream is the address of the proxy | The upstream points to the port of the proxy, so requests would loop. Pass `--upstream URL`, or unset `ANTHROPIC_BASE_URL`. | [Lab](Lab) |
| `dotclaude-eval-compare` stops at a cost bound | The command adds `--max-cost-usd 5` to each run when the options set no bound. Pass `--max-cost-usd` with a value of your choice. | [Lab](Lab) |

## Related Pages

- [Hook-Events](Hook-Events): see the events that Claude Code sends, and the map to the dotclaude events.
- [Undocumented-Reads](Undocumented-Reads): see the settings and env vars that the binary reads and the docs do not name.
- [Install](Install): install dotclaude again, if a part is missing.
