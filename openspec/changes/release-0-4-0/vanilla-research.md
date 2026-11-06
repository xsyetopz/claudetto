# How much of Claude Code 2.1.318 stays vanilla

Items 1 to 12 answer the 12 research questions for 0.4.0, and item 13 holds the requirements the user set. Each item gives what Claude Code already does, what claudetto adds, and a recommendation. Labels: **observed** means a run in this repo, **cited** means a source named beside the claim, and **inferred** means not yet checked. Docs pages were read through `clawdipedia-docs`: the auto-mode, override, context-budget, sandbox (`configure/permissions/sandbox`), and mod gates (`extend/mod-api/nouns-and-gates`) pages are indexed for `2.1.316`, and the settings pages (`configure/settings`, `configure/settings/mcp-and-channels`) for `2.1.314`. The program facts come from `2.1.318` through `cc-inspect`. Probe details are in `ISSUES-2026-11-04-1500.md`, "Probe: main request and auto-mode classifier request".

## Short answer

Most of Claude Code can stay vanilla. claudetto 0.4.0 needs only these parts:

- Text that is shorter than stock: the tool texts, the plan-mode reminder, and the root prompt.
- Rules that native permissions cannot express: the gate.
- Run limits and the Stop check.
- The handoff writer.
- Setup that writes the user's `~/.claude/settings.json`.

The goal loop, the task list, the sandbox, the classifier model, and the plan mode are native features that claudetto configures and does not rebuild.

## 1. Is OpenSpec too much, and which task tools replace the checkboxes?

- Cost, observed (task 1.4): the 7 upstream skills hold 116,067 bytes. At most 3,280 bytes of frontmatter load at session start, and each run adds one body of 11 to 23.5 KB. `@fission-ai/openspec` is a dev dependency, so a user of the plugin installs nothing from it.
- The `spec-driven` file format (proposal, specs, design, `tasks.md`) is plain Markdown. The lean route of `specs/lean-openspec/spec.md` keeps the format and drops the CLI only after the ported upstream cases pass (tasks 4.1 to 4.3). A proposal needs no OpenSpec install today: it is a Markdown file, and only `validate` and `archive` need the CLI.
- Task tools, cited from the program: `TaskCreate`, `TaskGet`, `TaskList`, and `TaskUpdate` need `CLAUDE_CODE_ENABLE_TODO_TOOLS` on `claude-opus-5-5`. Observed: none of them is in the `-p` request or in this session's tool list. They keep a list for the session's own work. They are not a plan that lives in git.
- Recommendation: keep `tasks.md` checkboxes as the record, because they live in git, survive `/clear` and handoffs, and the apply step parses them. Keep the native task tools off, the stock state on this model. Turning them on would add tool text to every request (task 2.13 measures that cost) and a second task list that can drift from `tasks.md`. OpenSpec is not too much as a file format. Its skill bytes are the part to trim, and task 4.3 measures that.

## 2. Which schema file format?

- Observed in `/tmp/swift-schema/probe.swift` with Swift 6.4 and Foundation only: `JSONDecoder` and `PropertyListDecoder` decode one `Codable` change and task model. A missing field fails with `DecodingError.keyNotFound` and a path (`tasks[0]`). `plutil -lint` accepts the XML plist, and `plutil -convert json` turns it into JSON with no extra tool.
- Observed with Swift 6.4 and the Xcode macOS SDK: Foundation has no YAML decoder, so Swift cannot read the current `schema.yaml` files without a library. `swiftc -typecheck` on `import Foundation; let d = YAMLDecoder()` fails with `cannot find 'YAMLDecoder' in scope`. In the SDK's Swift interfaces and framework headers, the only top-level decoder classes are `JSONDecoder` and `PropertyListDecoder`, plus the distributed-actor `LocalTestingInvocationDecoder`. YAML appears only as a file type, `UTTypeYAML` in `UniformTypeIdentifiers/UTCoreTypes.h:272`, which names files and parses nothing. Apple's docs were not read, because the `apple-docs` MCP server failed to connect. The SDK is the shipped API, so it settles the point.
- Constraint: upstream OpenSpec reads `openspec/schemas/<name>/schema.yaml`. While the CLI stays (item 1), the schema files stay YAML.
- Recommendation: a standard JSON Schema document fits editors and CI, while Swift reads data, not schemas. If Swift must read the change data, export JSON from the Markdown, and decode it with `Codable` structs that mirror one JSON Schema. Plist adds nothing over JSON here: both decode through `Codable`, and JSON is the format the rest of the toolchain reads. Do not move the schema files themselves off YAML while upstream OpenSpec still reads them.

## 3. What moves from `goals/` into `openspec/`?

- Observed: `ISSUES-2026-11-04-1500.md`, "Goals gap comparison", maps each goal item to a task, a feature-map row, or a verdict. Each gap it found became a task (1.10, 2.13, 3.5, 3.6, 3.6a, 5.12, 7.6).
- Not yet in `openspec/` before this edit: the engineering constraints of `goals/ARCHITECTURE.md`, which are literal `on(...)` calls for the Mod validator, strict TypeScript flags, `claude plugin test` and `claude plugin validate` as the checks, and Greek agent names. `design.md` now holds them under "Engineering constraints from the goals".
- Recommendation: after that, `GOAL.md` and `goals/` hold nothing that `openspec/` lacks. They are untracked, so deleting them cannot be undone. The user decides whether to delete them (task 3.7).

## 4. What does each scope hold, and what does claudetto put in the user's `.claude/`?

Cited from the settings page: the precedence is managed, then `--settings`, then project local, then shared project, then user. Lists such as `permissions.allow` merge across scopes. Environment variables are not a level: each pair of key and variable decides alone. From `2.1.314`, `--setting-sources` without `user` also drops the user scope's auto-mode rules, so a run started that way loses claudetto's `autoMode` lists.

| Scope | Holds for claudetto |
| --- | --- |
| User `~/.claude/settings.json` | `autoMode` rules and `env` such as `CLAUDE_CODE_AUTO_MODE_MODEL`. Auto mode reads its rules only from the user, `--settings`, and managed scopes (cited, auto-mode page). Also `permissions`, `modelPicker`, and the sandbox keys that count only from user, managed, or `--settings`: `allowAppleEvents`, `allowNestedUserNamespaces`, `network.strictAllowlist`, and the `excludedCommands` entries (cited, sandbox page) |
| Global config `~/.claude.json` | Nothing. Claude Code writes it, and it holds sign-in data, MCP servers, and per-project state (cited, settings page) |
| User `~/.claude/rules/*.md` | The code rules, one file each under `rules/claudetto/`, which load by `paths` (observed: `claudetto-code.md` loaded in an earlier session as one file; a fake-API probe showed subfolders read recursively and a `paths: "**/*"` rule loading after a project file `Read`) |
| User `~/.claude/CLAUDE.md` | Nothing new. 0.4.0 removes the `general-rules` section (feature map) |
| Plugin root `settings.json` | Only `agent` and `subagentStatusLine` apply (cited in `design.md`, Context) |
| Plugin `userConfig` | claudetto's own switches, shown in `/config` as `claudetto.<field>` (item 6) |
| Project `.claude/settings.json` | Team rules, not written by claudetto. `autoMode` here is ignored (cited) |
| Project local | The user's own overrides, not written by claudetto |

Recommendation: setup writes the user scope only, as task 5.2 already says. Everything else stays where Claude Code reads it.

## 5. What can be disabled or removed?

Cited from the program and docs. Each route below is supported. None patches the binary.

| What | Route |
| --- | --- |
| Any built-in tool | `permissions.deny: ["<Tool>"]`, or `--tools` and `--disallowedTools` for one run. Denying `Skill` or `ToolSearch` makes the request larger (cited, context-budget page) |
| `WebFetch` | `CLAUDE_CODE_DISABLE_WEB_FETCH` |
| Task tools, `TodoWrite` | `CLAUDE_CODE_ENABLE_TASKS=false`, `CLAUDE_CODE_ENABLE_TODO_TOOLS` (cited from the program, ISSUES probe) |
| Built-in agents | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS`. A same-named agent file replaces one (cited, override page) |
| Bundled skills, such as `goal`, `loop`, `simplify` | `disableBundledSkills`, `skillOverrides`, or a same-named skill file (cited, override page) |
| Slash commands | `--disable-slash-commands`. It grows the `Workflow` text to 22,511 bytes (cited, context-budget page) |
| Git instructions, auto memory | `includeGitInstructions: false`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY` (cited, override page) |
| Auto mode | `permissions.disableAutoMode: "disable"` (cited, auto-mode page) |
| Plugins, MCP servers, connectors | `enabledPlugins`, the MCP settings, `disableClaudeAiConnectors` (cited, settings page) |
| Mods | A mod is a plugin with `modules` in `hooks/hooks.json`. Disabling the plugin disables it (cited in `design.md`, Context) |

### Inventory

Sources:

- Tools: `cc-inspect` `surface tool-gates` on `2.1.318`. The tool table is in `chunk-2m0ep63r.js`, and each gate below is the `isEnabled` or `when` code it returned.
- Slash commands: `surface slash-command`, 142 entries.
- Built-in plugins: `chunk-1sm82jjh.js`, function `Twe`.
- Built-in MCP names: `chunk-h21zbzen.js` about offset 200,915, and `chunk-pbhb4gc5.js` about offset 1,297.

A route marked "unread" names a gate function whose body was not read. `permissions.deny: ["<Tool>"]` removes any tool by name (cited, override page), so each tool below has at least that route.

Observed in use:

- The `-p` request sends 12 tools and defers 10 (ISSUES probe).
- This interactive session defers `Agent`, `AskUserQuestion`, `EndConversation`, `EnterPlanMode`, `EnterWorktree`, `ExitPlanMode`, `ExitWorktree`, `ListAgents`, `Monitor`, `PushNotification`, `RemoteTrigger`, `SendMessage`, `Skill`, `WebFetch`, and `WebSearch`. It loads `Bash`, `Edit`, `Read`, `ToolSearch`, and `Write`, and no `Glob` or `Grep`.

**Tools: 94 entries.** One entry is unresolved: `r`, an eval-only tool that loads only when an eval seam is accepted.

| Tools | Gate in the program | Route besides `permissions.deny` |
| --- | --- | --- |
| `Agent`, `Read`, `Edit`, `Write`, `NotebookEdit`, `ReportFindings`, `TaskStop`, `SendMessage`, `ScheduleWakeup`, `EnterWorktree`, `ExitWorktree`, `MonitorTool` (named `Monitor` in requests), `ListMcpResourcesTool`, `ReadMcpResourceTool`, `ReadMcpResourceDirTool`, `SearchPlugins`, `SearchSkills`, `ListPlugins`, `ListSkills`, `ArtifactComments`, `ArtifactData`, `ArtifactCheck`, `request_computer`, `enable__mcp__claude-in-chrome`, `enable__mcp__remote-devices__Claude_Browser`, `enable__mcp__remote-devices__computer` | none, or always true | deny rule only |
| `Bash` | `Ol()`: always on, except on Windows without Git Bash | deny rule only |
| `Glob`, `Grep` | left out when `ale()` names them, which happens when an embedded search build is on (`ZR()`) | none needed: absent in both observed tool lists |
| `WebFetch` | `!CLAUDE_CODE_DISABLE_WEB_FETCH` and org policy | `CLAUDE_CODE_DISABLE_WEB_FETCH=1` |
| `WebSearch` | provider: first party, Foundry, some Vertex models; off behind a gateway | provider choice |
| `TaskCreate`, `TaskGet`, `TaskUpdate`, `TaskList` | `WD() && _8()` | `CLAUDE_CODE_ENABLE_TASKS=false` removes them; off on `claude-opus-5-5` unless `CLAUDE_CODE_ENABLE_TODO_TOOLS` |
| `TodoWrite` | `!WD() && _8()` | on only when `CLAUDE_CODE_ENABLE_TASKS=false` and `_8()` |
| `Skill` | `!disableSlashCommands` | `--disable-slash-commands`, which grows `Workflow` (cited, context-budget page) |
| `ToolSearch`, `WaitForMcpServers` | `th()`: tool-search mode is not `standard` | `ENABLE_TOOL_SEARCH` set to a false value or 100 makes it `standard`. Then every deferred tool's full text is sent, so the request grows |
| `Workflow` | `qf()` | `disableWorkflows` in user settings, or `CLAUDE_CODE_DISABLE_WORKFLOWS` |
| `CronCreate`, `CronDelete`, `CronList` | `NM()` (`CronDelete` and `CronList` also stay on while a task file holds tasks) | `CLAUDE_CODE_DISABLE_CRON`, which also removes `/loop` |
| `ListAgents`, `SendFile` | `Ja()` and a server flag | `CLAUDE_CODE_HARBOR_KITE=0` |
| `SendFeedback` | first party, `CLAUDE_CODE_SEND_FEEDBACK`, a server flag, and the `feedbackDrafts` setting | `CLAUDE_CODE_SEND_FEEDBACK=false`, or `feedbackDrafts: "off"` |
| `ProposeGoal` | interactive, a server flag, and the `modelProposedGoals` setting | `modelProposedGoals: "disabled"` |
| `RefreshMcpTools` | `CLAUDE_CODE_ENABLE_REFRESH_MCP_TOOLS` | off unless that env is set |
| `AskUserQuestion`, `ExitPlanMode` | off in `-p` without a permission-prompt tool | deny rule |
| `EnterPlanMode`, `memory_list`, `memory_read`, `memory_write`, `LSP` | `vJ.isEnabled()`, memory mode `tools`, `z4e()`: unread | deny rule |
| `PowerShell` | Windows only (`ro()`) | none needed on macOS |
| `SendUserMessage`, `SendUserFile` | brief mode (`CLAUDE_CODE_BRIEF`), `CLAUDE_CODE_PEWTER_OWL_TOOL`, a bridge session, `CLAUDE_CODE_ATTACHMENTS_BY_PATH` | off unless those are set |
| `PushNotification` | server flag `tengu_kairos_push_notifications` | deny rule |
| `DesignSync`, `ClaudeDesign` | org policy `allow_design_sync` and first party | deny rule |
| `RemoteTrigger` | first party, OAuth, org policy `allow_remote_sessions` | deny rule |
| `EndConversation` | main model and entry point, server config | deny rule |
| `Projects`, `SendToProject`, `SendToProjectContext`, `Artifact`, `AppifactRepl`, `ShareOnboardingGuide`, `Poll`, `SearchMcpRegistry`, `SuggestConnectors`, `ListConnectors`, `ShowOnboardingRolePicker`, `OfferChromeSetup`, `WrapUp`, `ReadNotifications`, `ReadWidgetContext`, `SuggestPluginInstall`, `SuggestSkills`, `propose_skills`, `PublishPlugin`, `FetchInboxMessage`, `self_hosted_runner_*` (9 tools) | remote, cowork, bridge, wizard, project UUID, or server-flag surfaces | off in a local CLI session, inferred from the gates. None was in either observed list |
| `GetTask` | `return false` | always off |

**Bundled prompt commands, 35.** These are the `prompt`-type entries among the 142 slash commands, the kind that bundled skills are. That they all count as bundled skills is inferred: `artifact-capabilities`, `artifact-design`, `artifact-diagramming`, `batch`, `claude-api`, `claude-code-docs`, `claude-in-chrome`, `code-review`, `commit`, `commit-push-pr`, `cowork-plugin`, `dataviz`, `debug`, `design`, `design-sync`, `doctor`, `explain-usage`, `fewer-permission-prompts`, `init`, `insights`, `keybindings-help`, `loop`, `memory-types`, `pr`, `run`, `run-skill-generator`, `security-review`, `send-to-project`, `setup-claude`, `simplify`, `statusline`, `team-onboarding`, `update-config`, `verify`, `workflow-authoring`. Routes: `disableBundledSkills`, `skillOverrides`, or a same-named skill file (cited, override page). Many carry their own gate, such as `loop` behind `NM()` and `commit` and `pr` behind `l_o()`.

**Local commands, the other 107 entries.** They add no model text. The `local` and `local-jsx` ones run in the program, such as `/goal`, `/config`, and `/compact`. Env switches seen in their gates: `DISABLE_COMPACT`, `DISABLE_DOCTOR_COMMAND`, `DISABLE_LOGIN_COMMAND`, `DISABLE_LOGOUT_COMMAND`, `DISABLE_INSTALL_GITHUB_APP_COMMAND`, `CLAUDE_CODE_DISABLE_CRON`, and `CLAUDE_CODE_DISABLE_PLUGIN_FORWARDING`. Others are fixed off in `2.1.318` (`/loops`, `/pause-memory`, `/version`, `/wellbeing`).

**Built-in agents.** Observed in `-p`: `claude`, `general-purpose`, and `statusline-setup`. Routes: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` (print mode only), or a same-named agent file (cited, built-in agents page).

**Built-in plugins, 14.** Each id is `cc-plugin-<name>@builtin`, and each is a mod. The settings that stop installed mods do not stop them. Except for `sec-default`, `enabledPlugins` turns one off or on (cited, mods page "Built-in Mods" and "Enable Test", `2.1.316`; the list is from `Twe` on `2.1.318`):

| Plugin | Default | Off route |
| --- | --- | --- |
| `sec-default` | on, policy only | cannot be turned off by the user |
| `agents-md` | on | `enabledPlugins` false. It loads `AGENTS.md`, which this repo's `CLAUDE.md` imports, so leave it on |
| `telemetry` | on. It gives plugins `$.telemetry.log` and `$.telemetry.mark`, sent to Anthropic as first-party rows | `enabledPlugins` false from any scope. It is also unavailable whenever `DISABLE_TELEMETRY`, a truthy `DO_NOT_TRACK`, or `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` is set (read: `isAvailable` is `!d_()`, and `d_()` holds `TU()`). Item 13 uses this |
| `privacy` | on (`defaultEnabled: true`), new in `2.1.318`, not in the `2.1.316` docs | Read in `chunk-x2x0e2v0.js`: a `tool.check` hook on `WebBrowser`, `WebFetch`, `WebSearch`, `Bash`, `Monitor`, `PowerShell`, and `Tmux` answers `ask` when the input holds the signed-in account's email, for a web tool or a network command such as `curl` or `ssh`. A server flag (`tengu_wise_newt`, default true) gates it. It sets `enabledFromTrustedSettingsOnly: true`, so `xK()` reads its switch through `gTr`, which takes `enabledPlugins` only from user, `--settings`, and managed settings, the last one winning (read). `enabledPlugins` false in the user's settings turns it off, and a project file cannot. Recommendation: leave it on. It costs no prompt bytes, it asks only when the email is in the call, and it serves the least-tracking requirement (item 13) |
| `plugin-authoring`, `mods-guide`, `tips`, `mermaid`, `diff`, `easel`, `claude-platform`, `claude-test` | on | `enabledPlugins` false |
| `responsive-mode` | off, and behind a server gate | leave unset |
| `you-should-know` | off | leave unset while `claudetto-you-should-know` is used (item 6) |

**MCP servers and connectors.** The program names these built-in servers: `claude-in-chrome`, `remote-devices` (`Claude_Browser`, `computer`), `computer-use`, `claude-artifacts`, `Claude_Pages`, and `Claude_Docs`. None is in this session's tool list (observed). Routes:

- `enableArtifact: false` or `disableArtifact: true`, which any scope may set (cited, settings page).
- `disableClaudeAiConnectors: true` for claude.ai connectors (cited, settings page).
- The org policy key `allow_claude_browser_extension` for Chrome (program).
- For servers the user adds: `/mcp`, `deniedMcpServers` (by name, command, or URL, merged from all scopes), and `disabledMcpjsonServers` for a project's `.mcp.json`. Any settings file may set these. The allow lists bind users only from a managed source (cited, MCP and channels settings page).

**Installed plugins and mods.** `enabledPlugins` and `/plugin` turn a plugin off, and a mod is a plugin with `modules`. Cited, mod gates page "Gates That Stop Mods": `disableAllHooks`, `--safe-mode`, and `--bare` stop every installed mod and hook, while built-in mods still load. `disableAllHooks` would therefore also stop claudetto itself. `allowManagedHooksOnly` and `allowManagedModsOnly` are managed only.

Task 2.13 measured it offline. `Workflow`, `ScheduleWakeup`, `ReportFindings`, and `ListAgents` hold 13,646 of the 28,358 tool bytes in a stock `-p` request and have 5 calls among them in the saved transcripts. Recommendation: defer them through `tool.describe`, which keeps them reachable through `ToolSearch`, and remove none. The first request fell 31%, from 43,834 to 30,184 bytes (`ISSUES-2026-11-04-1500.md`, "Task 2.13").

## 6. Which tool texts can be trimmed, and which tools can be replaced?

- Trim: `tool.describe` replaces any tool's description and can mark the tool deferred (cited, mod types `claude-code.d.ts`, about lines 4340-4530). Probe 2.7 measured the baseline texts as shorter for `Bash`, `Edit`, `Read`, `ToolSearch`, and `Write`. The largest stock texts not yet trimmed are `Workflow` 3,502 bytes, `ScheduleWakeup` 3,433, and `ReportFindings` 574 (observed, ISSUES probe). Docs: no official override exists for tool texts, so `tool.describe` is the only route (cited, override page). Whether a shorter text changes behavior is measured, not assumed: task 2.13 and the 3.4 harness.
- Replace a whole tool: `tool.call` can answer a call in place of the built-in (cited, mod types, about lines 4134-4160, and `goals/ARCHITECTURE.md`). Inferred, not probed: a claudetto version of a built-in would then own that tool's errors and permission checks. That cost is real, so the recommendation is to replace no built-in tool unless a measured defect calls for it.
- Toggle: a plugin `userConfig` field appears in `/config` as the row `claudetto.<field>`, and `/config claudetto.<field>=value` sets it, even when the row is hidden (cited, mod types, about lines 1950-2110). Each replacement text can check one such switch, so the user can return to the stock text without uninstalling.
- Replace a built-in plugin: `cc-plugin-you-should-know@builtin` is off by default (`defaultEnabled: false`), and `enabledPlugins` toggles it (cited, mods page "Enable Test"). `claudetto-you-should-know` replaces it as a separate plugin, so `enabledPlugins` or `/plugin` toggles it too. Its own options are `userConfig` rows of the form `claudetto-you-should-know.<field>` in `/config`. Setup leaves the built-in unset, and the docs state that both must not run at once.

## 7. How much can the DDD and SDD hybrid reuse?

- Plan mode: `EnterPlanMode` and `ExitPlanMode` are native, and claudetto already shortens the plan-mode reminder from 3,796 to 1,179 bytes (probe 2.7). Reuse it as the place a change is designed. `--plan-mode-instructions` is hidden and not relied on.
- Task list: keep `tasks.md` (item 1). The native task tools are off on this model.
- Finish loop: the built-in `/goal` (item 11), with `tasks.md` as its condition source.
- Subagents: native agent files with the four Greek names.
- Specs: OpenSpec's `spec-driven` layout is the SDD part. The domain model (the DDD part) lives in the specs' requirement names. No native feature holds it, and none is needed.

So the hybrid needs no new engine noun. It needs the lean skills of task 4.3 and the native features above.

## 8. Sandbox: tone it down, or turn it off and use other rules?

- Cited, sandbox page: the native sandbox is off by default (`sandbox.enabled`), and it limits writes and network for `Bash` only. When it is on, `autoAllowBashIfSandboxed` skips the prompt for sandboxed commands. The page takes its `true` default from a schema text, not from a stated default. `allowUnsandboxedCommands` defaults to `true`, so the model may retry a blocked command with `dangerouslyDisableSandbox: true`. Setting it to `false` closes that route. Turning the sandbox on also adds a sandbox section to the `Bash` prompt.
- Cited, sandbox page: `sandbox.filesystem.disabled: true` drops the file wall and keeps network isolation and seccomp. This is the "toned down" form. Whether it still conflicts with `confine` on macOS is inferred, not probed: the network wall may still need Seatbelt.
- Observed in probe 2.5: the baseline's `confine` and the native sandbox block different paths. Seatbelt does not nest, so the native sandbox cannot run inside `confine`.
- The user's decision: the sandbox does not return in 0.4.0, and setup writes no `sandbox` key (ISSUES, probe 2.5). The repo's `.claude/settings.json` sets `sandbox.enabled: false`.
- Recommendation: leave the native sandbox off by default, and leave the choice to the user. The other rules are `permissions.deny`, the gate's `tool.check` rules (2.8), and the auto-mode classifier.

## 9. Trim the classifier, and bind it to one model with Jev in front

- Model, cited from the program: only `CLAUDE_CODE_AUTO_MODE_MODEL` pins it, and a server config wins over the env. Sonnet 5.5 and Opus 5.5 are refused, so `claude-haiku-5-5` is the only one of this account's three models that the classifier accepts. Without a pin, it runs on `claude-sonnet-5[1m]` and falls back to the main model (observed, ISSUES probe). So the fallback the user named, from Jev to Haiku or Sonnet, maps to Haiku 5.5 when pinned, or to the default Sonnet 5 when not.
- Trim, cited (auto-mode and override pages) and observed: `autoMode.allow`, `soft_deny`, and `hard_deny` without `"$defaults"` replace the defaults. The SOFT BLOCK section is about 64 KB of the 139,286-byte prompt. Writing `soft_deny` without `$defaults` removes that text and its 72 default rules. Each removed rule is a block the classifier no longer makes, so this trades safety for bytes. The prompt is cached (ephemeral mark), so its repeat cost is a cache read, not a full input price. The token count per call was not measured.
- Jev cannot be the native classifier, because the program sends the classifier request to the Anthropic API. Jev can sit in a `tool.check` hook. That hook fires before the permission mode settles an ask, so it runs before the classifier (cited, mod types). The hook asks Jev, and on an error or a missed deadline it calls `next(e)`, which hands the call to the native classifier.
- Conflict with the recorded Jev route: Jev is not hardened against injection, and jevwire never lets it answer `allow` (`design.md`, "Features the user decides"). A Jev hook that answers `allow` in place of the classifier goes against that. Recommendation: Jev may deny or ask, never allow. Every other call goes to the native classifier, pinned to `claude-haiku-5-5`. Whether Haiku classifies well enough is what the 3.1a eval measures. Task 3.1 now carries this choice.

## 10. Where will Jev be used?

As `design.md` records: in the `decide` tool, where the model asks for a decision, if task 3.2 keeps it. Optionally also in the item 9 hook, with deny or ask only, if task 3.1 keeps it. Both share one client, and whichever survives owns it. Jev gets no model seat, because typesafe.ai's docs place it in code that asks for a decision.

## 11. `/goal` and `/loop`

- Cited (skill pages): `/goal [<condition> | clear]` sets a session Stop hook that a model judges against the condition text. It clears itself when the condition is met. `/loop [interval] <prompt>` uses `CronCreate` for a fixed interval (recurring, 7-day expiry), or `ScheduleWakeup` and `Monitor` without one.
- `openspec/changes/remove-goal` removes claudetto's `/goal`, because its contract turned the condition into a shell command, which exited 127.
- Syntax: the built-in already takes the rest of the line as the condition and one reserved word, `clear`. A quoted `/goal set "<condition>"` adds a parser and an escaping rule, and it gains nothing over rest-of-line. Explicit commands such as `/goal-set` double the command list.
- Modes, read from the program and not run: `/goal` has an interactive `local-jsx` form and a non-interactive `local` form with `supportsNonInteractive: true`. The second form is on in `-p` or a remote workspace (`chunk-z8vwgww0.js`).
- Stop cap, read: Claude Code ends a turn after `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` consecutive Stop blocks, 8 by default. An active goal only tags the telemetry event and does not change the cap, so the goal's Stop hook and claudetto's Stop check share the 8. The run-limits check blocks at most once per stop chain (`design.md`), so it takes one of them.
- Recommendation: keep both built-ins. If a replacement is ever needed, a same-named skill or a `command.run` handler can take over, with the same rest-of-line syntax and reserved words.

## 12. How much can claudetto do while staying small?

| Goal | Target | Check | Task |
| --- | --- | --- | --- |
| Small | Non-test source lines and prompt bytes do not grow over the baseline. The root prompt stays at or under 5,218 bytes | Baseline commands, and the byte script from 1.3 | 7.2, 5.9 |
| Small | Tool definitions with no call in 1.8's transcripts leave the request | Table of tool, bytes, calls, and setting | 2.13 |
| Small | Skills only for the workflows in use | Byte counts against 1.4 | 4.3 |
| Quality | Strict TypeScript, one hooks module with literal `on(...)` calls, and pure policy functions with tests | `claude plugin test` and `claude plugin validate` (`design.md`, "Engineering constraints from the goals") | none |
| Quality | Pure policy modules survive mutation testing | A score per module, with each surviving mutant killed or recorded as equivalent | 7.6 |
| Extensible | Native extension points only: `userConfig` switches, same-named skills and agents, `autoMode` lists, and permission rules. No plugin system of claudetto's own | Design review. No measured check | none |
| Maintainable | Each feature in `feature-map.md` has one owner, native first | Feature-map review. No measured check | none |

The limit is the Mod API itself. It is early-access and changes across releases (`goals/ARCHITECTURE.md`), so each hook the plugin keeps is a dependency on that API. Each feature that moves to a native setting removes one such hook.

## 13. Requirements the user set

The user set these on 2026-11-04. Each bullet names how 0.4.0 meets the requirement. Code reads are in `ISSUES-2026-11-04-1500.md`, "Code reads: built-in plugin switches, the Stop cap, `/goal`, and telemetry".

- The user makes the final decisions. This doc and `design.md` give recommendations with their evidence, and the tasks in `tasks.md` section 3 record the decisions.
- Telemetry is off, with the least tracking. baseline setup writes `DISABLE_ERROR_REPORTING=1` and `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY=1`, but not `DISABLE_TELEMETRY`. Recommendation (task 5.14):
  - Setup adds `DISABLE_TELEMETRY=1` to the user scope's `env`. That opts out of telemetry, and it makes `cc-plugin-telemetry` unavailable, so setup needs no `enabledPlugins` entry (read).
  - Setup leaves `cc-plugin-privacy` on.
  - Setup does not write `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, because that switch also stops updates and refuses every `$.http.fetch` that sets `auth` (cited, env and session pages). That is more than tracking.
  - Known side effect: with telemetry off, the GrowthBook disk cache is off (cited). How that changes server-gated features at startup is not measured.
- claudetto may read `.env` files, but must not look at their values. The baseline gate is stricter: it denied a names-only `grep -oE '^[A-Za-z_][A-Za-z0-9_]*=' .env` in this session (observed). Recommendation (tasks 2.14 and 5.13):
  - A `tool.call` hook answers a `Read` of an env file with its key names and `[REDACTED]` values. A hook may return its own `{ result }`, which core checks against the tool's output schema (cited, mod types page).
  - The gate allows shell forms that print only names, and keeps denying forms that print values.
  - Reading a file into a process's environment, such as Bun loading `.env`, stays allowed, because no value reaches the model.
- Probes run against a vanilla install. Reading taken: a probe session loads no claudetto plugin, no user settings, and no user `CLAUDE.md`, through a temporary `CLAUDE_CONFIG_DIR`. It signs in with `CLAUDE_CODE_OAUTH_TOKEN`, an env name the program reads (`surface env` on `2.1.318`). The launcher inherits the token from `.env`, through Bun's own `.env` loading, and never prints, copies, or logs its value. Task 2 states this rule.
  - Probe 2.14 (observed, offline): both hook forms keep every value out of the request, and `Edit` by key name works after both. Task 5.13 takes the rewrite form.
- The model writes files with `Write` and reads them with `Read`, not through `Bash` (the user, 2026-11-04). The baseline `Bash` text says so, and this session still wrote with a heredoc and read with `cat`. Recommendation: a gate rule on the parsed shell (task 5.15).
- Quality and token efficiency come before speed: item 12's targets apply, and a paid run waits for the user's approval.
