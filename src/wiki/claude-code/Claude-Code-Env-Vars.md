# Claude Code Environment Variables

An environment variable is a named setting that a program reads when it starts.
Claude Code `2.1.303` reads 1,578 of them, and this page links the pages that list each one.
You can change how Claude Code works with a short line, and you do not need a command flag for it.

## How to Set One

There are two common ways.
In the shell, write `export CLAUDE_CODE_EFFORT_LEVEL=high` and then start `claude`.
Or put the name in the `env` key of `~/.claude/settings.json`, and Claude Code sets it for each session:

```json
{ "env": { "CLAUDE_CODE_EFFORT_LEVEL": "high" } }
```

To remove a setting, delete the line.
To find a name, pick a topic in [Parts](#parts) and search the page.

## Marks

Each row in a table has one or more marks, such as ✅🧪.

| Mark | Meaning |
| --- | --- |
| ✅ | A page of the [official docs](https://code.claude.com/docs/en/env-vars) names the item |
| 🔍 | No docs page names the item, and it is found only in the program |
| ⚠️ | The docs and the program differ, and the row says how |
| 🧪 | The item works only behind a flag or a gate |
| ❌ | The item is removed or does nothing in `2.1.303` |

The program is the JavaScript code inside the `claude` binary.
Anthropic can change a 🔍 item without notice.
Some rows say what a [Probes](Claude-Code-Probes) run saw.
A run with no visible effect does not prove that the variable does nothing.

## Parts

| Page | Topic | Rows |
| --- | --- | --- |
| [Auth](Claude-Code-Env-Vars-Auth) | API keys, login tokens, and credential helpers. | 77 |
| [Cloud Providers](Claude-Code-Env-Vars-Cloud-Providers) | Amazon Bedrock, Google Vertex AI, Microsoft Foundry, and gateway settings. | 80 |
| [Models and Effort](Claude-Code-Env-Vars-Models-And-Effort) | The model, how hard it thinks, fast mode, and output size. | 91 |
| [Context and Compaction](Claude-Code-Env-Vars-Context-And-Compaction) | The context window, compaction, memory, and the prompt cache. | 57 |
| [Tools and Bash](Claude-Code-Env-Vars-Tools-And-Bash) | The `Bash` tool, file tools, search, permissions, and the sandbox. | 109 |
| [Telemetry and Debug](Claude-Code-Env-Vars-Telemetry-And-Debug) | Usage data, OpenTelemetry, debug logs, and error reports. | 78 |
| [Telemetry and Debug (Part 2)](Claude-Code-Env-Vars-Telemetry-And-Debug-2) | More usage data, OpenTelemetry, debug log, and error report names. | 78 |
| [Network and Proxy](Claude-Code-Env-Vars-Network-And-Proxy) | API addresses, proxies, TLS, time limits, and retries. | 72 |
| [Sessions and Storage](Claude-Code-Env-Vars-Sessions-And-Storage) | Folders, session files, resume, install, and updates. | 82 |
| [Agents and Teams](Claude-Code-Env-Vars-Agents-And-Teams) | Subagents, teams, background tasks, and workers. | 88 |
| [UI and Terminal](Claude-Code-Env-Vars-UI-And-Terminal) | The terminal screen, colors, voice, keys, and notifications. | 95 |
| [Plugins and MCP](Claude-Code-Env-Vars-Plugins-And-MCP) | Plugins, MCP servers, skills, hooks, and marketplaces. | 97 |
| [Features and Gates](Claude-Code-Env-Vars-Features-And-Gates) | Switches that turn a feature on or off. | 82 |
| [Cloud and Remote](Claude-Code-Env-Vars-Cloud-And-Remote) | Cloud sessions, the bridge, the desktop app, Chrome, Cowork, and Slack. | 80 |
| [Cloud and Remote (Part 2)](Claude-Code-Env-Vars-Cloud-And-Remote-2) | More cloud, bridge, desktop app, Chrome, Cowork, and Slack names. | 79 |
| [Internal and SDK](Claude-Code-Env-Vars-Internal-And-SDK) | Names for tests, evals, Anthropic staff, and programs that host Claude Code. | 67 |
| [Third-Party and System](Claude-Code-Env-Vars-Third-Party-And-System) | Names that the system or another project owns, such as `HOME` and `ALL_PROXY`. | 68 |
| [Third-Party and System (Part 2)](Claude-Code-Env-Vars-Third-Party-And-System-2) | More names that the system or another project owns. | 68 |
| [Third-Party and System (Part 3)](Claude-Code-Env-Vars-Third-Party-And-System-3) | Names that only bundled libraries read. | 65 |
| [Third-Party and System (Part 4)](Claude-Code-Env-Vars-Third-Party-And-System-4) | More names that only bundled libraries read. | 65 |

## Limits

- Most 🔍 rows rest on a few places in the program code, and a deeper trace was not done for each name.
- Many rows say only what the code around the name suggests, because the code gives no more detail.
- The scan can miss names that the code builds at run time.
- Libraries inside the program read 130 of the names.
  [Third-Party and System](Claude-Code-Env-Vars-Third-Party-And-System-3#read-by-bundled-libraries) lists them apart, and they were found by a scan of strings.
- The docs use `NPM_TOKEN`, `DB_PASSWORD`, `PIP_INDEX_URL`, and `GIT_CONFIG_KEY_<n>` only as examples, so they have no rows.

## See Also

- [Claude Code](Claude-Code)
- [Settings](Claude-Code-Settings)
- [CLI](Claude-Code-CLI)
- [Models and API](Claude-Code-Models-And-API)
- [Probes](Claude-Code-Probes)
- [Environment Variables](https://code.claude.com/docs/en/env-vars) in the official docs
