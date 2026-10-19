# Troubleshooting

This page is for users who see a symptom in `claudetto`.
It lists each symptom with its cause and fix.
Find the plugin, then find the symptom.
The debug log of Claude Code (`--debug-file <path>`) shows what a hook or a plugin did.

## The Core Plugin

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The permission rules, the sandbox, and the model settings are not set | A plugin cannot set them. Run `/claudetto:setup` to merge the settings snippet. | [Setup](Setup) |
| The status line shows nothing, or it fails after an update | The status line command holds the path of the plugin version. Run `/claudetto:setup` again after each update. | [Status Line](Status-Line) |
| The setup preview says it kept your status line | The setup does not replace a status line of another tool. Remove that key and run the setup again to use the `claudetto` one. | [Setup](Setup) |
| The project scope sets no status line | The command holds an absolute path of one computer. Use the `user` or `local` scope. | [Setup](Setup) |
| `claudetto-setup` says a settings file is not a JSON object, and changes nothing | Fix the JSON of that file, then run the setup again. | [Setup](Setup) |
| `Glob` and `Grep` are missing | The native build of Claude Code hides them unless the tool list names them. Add the `alias` line from the setup skill to your shell file. | [Setup](Setup) |
| A `cat` or `sed -n` call is denied | The `guard` denies a print of a file in `Bash`. Use `Read` with an `offset` and a `limit`. | [Guard](Guard) |
| A print command is denied with "The print guard failed" | The guard fails closed, so a crash or a timeout denies the command. Use `Read` for the file. | [Guard](Guard) |
| A `Write` or `Edit` of a plan file is denied | The text has a claim with no source. Name the source, mark the claim `(proposed)`, or ask the user. | [Ground](Ground) |
| A Markdown file has one sentence on each line | The `sembr` slice rewrites the file. This is the intended result. | [Sembr](Sembr) |
| The compaction is not a handoff | The option `compaction` is `built-in`. Set it to `handoff`. | [Handoff](Handoff) |
| `ProposeGoal` is denied | The `goal` slice turns it off. Use `/goal` with a condition or a plan file. | [Goal](Goal) |
| The tool `advise` is missing | The option `advisor` is `builtin`, so the slice registers no tool. Set it to `claudetto`, and run the setup again. | [Advise](Advise) |

## The Jev Pick

The option `decide` is `off` by default.

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| A question has no pick of Jev | The option `decide` is `off`, or `TYPESAFE_API_KEY` was not set when Claude Code started. Set the option, export the variable, and start Claude Code again. | [Decide](Decide) |
| A question has no pick, and the key is set | The key is not valid, the account has no balance, or Jev was not sure. The hook leaves the question as Claude asked it. | [Decide](Decide) |

## The Code Graph

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The check says `codegraph` is not on `PATH` | Run `bun i -g @colbymchenry/codegraph`. The add-on never installs it. | [Code Graph](Code-Graph) |
| The check says the project has no index | Run `codegraph init -y` in the project. | [Code Graph](Code-Graph) |

## The Browser

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The skill says `agent-browser` is not installed | Run `npm install -g agent-browser`. | [Browser](Browser) |
| The skill says the guide is missing | The command `agent-browser skills get core` gave no guide. Run it by hand to see its output. | [Browser](Browser) |
| A `WebSearch` call is denied with the CloakBrowser message | The `backend` option is `cloakbrowser`, and no CloakBrowser binary is under `~/.cloakbrowser/`. Install CloakBrowser, or set `backend` to `agent-browser`. | [Browser](Browser) |
| The result says the built-in `WebSearch` answered | CloakBrowser gave no result. The result states the reason. | [Browser](Browser) |

## Library Docs

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The `docs` skill reports a quota error | Set `CONTEXT7_API_KEY`, which raises the limit. | [Library Docs](Library-Docs) |
| A `ctx7` call is denied | The skill allows only the forms `library` and `docs`. Ask the user, and do not change the form. | [Library Docs](Library-Docs) |
| `bunx` is not found | Install Bun, and check that `bunx` is on `PATH`. | [Library Docs](Library-Docs) |

## The Lab

| Symptom | Cause and fix | Page |
| --- | --- | --- |
| The sandbox says `claude` is not on `PATH` | The sandbox finds `claude` on `PATH` only. A shell function or an alias does not work. | [Sandbox](Sandbox) |
| No login in the sandbox | Run `/login` inside the sandbox, or set `CLAUDE_CODE_OAUTH_TOKEN`. | [Sandbox](Sandbox) |
| The sandbox warns about a `--model` | The model is not in `availableModels` of the sandbox, so Claude Code runs another model. Pass a model from that list. | [Lab Sandbox](Lab-Sandbox) |
| The debug log says the plugin is locked | A managed setting locks the plugin name, so Claude Code ignores the `--plugin-dir` copy. Remove the managed `enabledPlugins` entry. | [Sandbox](Sandbox) |
| `claude` finds no prompt in a headless run | Put the prompt before variadic flags such as `--allowedTools`. | [Sandbox](Sandbox) |
| `claudetto-schema` exits with 2 | The command needs `--out DIR`. | [Lab](Lab) |
| `claudetto-capture` says the upstream is the address of the proxy | Pass `--upstream URL`, or unset `ANTHROPIC_BASE_URL`. | [Lab Capture](Lab-Capture) |
| `claudetto-eval-compare` stops at a cost bound | The command adds `--max-cost-usd 5` to each run when the options set no bound. Pass `--max-cost-usd` with another value. | [Lab](Lab) |

## Related Pages

- [Install](Install): install `claudetto` again, if a part is missing.
- [Off Switches](Off-Switches): turn a part off.
- [Settings Snippet](Settings-Snippet): the settings that the setup writes.
