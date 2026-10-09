# Off switches

This page lists what the dotclaude profile turns off in a vanilla Claude Code install, what it never sets, and what waits for an eval.
The research behind it is the off-switch survey of Claude Code 2.1.293 and 2.1.294.
The profile is `plugins/dotclaude/features/setup/profile.json`.
Each key and `env` entry has its reason on [Profile keys](Profile-Keys).

## Forced off, no quality cost

A scope of `user` means that Claude Code reads the key from user settings and local settings, and ignores it in project settings.
Setup sends such a key to local settings when you pick project scope, and tells you where it went.

| Part | Key or entry | Scope | Reason |
| --- | --- | --- | --- |
| Built-in plugins | `enabledPlugins` with `cc-plugin-<name>@builtin` set to false | Any | No use in dotclaude, or a panel or tip that adds noise. |
| Spinner tips | `spinnerTipsEnabled` | Any | No use. |
| Survey | `feedbackSurveyRate` | Any | No use. |
| Feedback tool | `feedbackDrafts` | Any | Removes the `SendFeedback` tool. |
| Fast mode | `fastMode` | Any | Costs more. |
| Agent view | `disableAgentView` | Any | Removes a daemon. |
| Remote Control | `disableRemoteControl` | Any | Removes a remote surface. |
| claude.ai skills | `syncClaudeAiSkills` | User | No `anthropic-skills:*` skill in the listing. |
| claude.ai plugins | `syncClaudeAiPlugins` | User | No synced plugin. |
| claude.ai connectors | `disableClaudeAiConnectors` | Any | No `claude.ai` MCP server. |
| `computer-use` server | `permissions.deny` entry `mcp__computer-use` | Any | See [Computer use](#computer-use). |
| Chrome prompt | `CLAUDE_CODE_DISABLE_CFC_PROMPT` | Any | Removes the Chrome part of the prompt. |
| Cron tools | `CLAUDE_CODE_DISABLE_CRON` | Any | Removes the tools and `/loop`. |
| Advisor tool | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` | Any | Removes the tool and its text. |
| Terminal title | `CLAUDE_CODE_DISABLE_TERMINAL_TITLE` | Any | Removes a small-model request. |
| Attribution header | `CLAUDE_CODE_ATTRIBUTION_HEADER` set to 0 | Any | Removes a block at the start of the prompt. |
| IDE auto-connect | `CLAUDE_CODE_AUTO_CONNECT_IDE` set to false | Any | The key is in the global config, so the profile uses the variable. |
| IDE extension install | `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL` | Any | The global config holds the key. |
| Task list reminder | `CLAUDE_CODE_TODO_REMINDER_MODE` set to `off` | Any | Removes a recurring reminder. |
| Built-in agents | `permissions.deny` entries `Agent(claude-code-guide)` and `Agent(statusline-setup)` | Any | Removes two agent lines from each request. |
| Plan mode tools | `permissions.deny` entries `EnterPlanMode` and `ExitPlanMode` | Any | Removes two tool lines. The eval of 2026-10-08 showed no loss, see [Eval-gated](#eval-gated). |
| Task tools | `permissions.deny` entries `TaskCreate`, `TaskGet`, `TaskList`, `TaskStop`, and `TaskUpdate` | Any | Saves about 30 tokens, and the model keeps no task list. The eval showed no loss. |
| Git instructions | `includeGitInstructions` set to false | Any | About 6.2k characters of git text and the git status snapshot leave the prompt. The eval showed no loss, and the prompt variants carry the attribution line. |

The built-in plugins that the profile turns off are `cc-plugin-agents-md`, `cc-plugin-claude-test`,
`cc-plugin-diff`, `cc-plugin-mermaid`, `cc-plugin-mods-guide`, `cc-plugin-responsive-mode`,
`cc-plugin-telemetry`, `cc-plugin-tips`, and `cc-plugin-you-should-know`.
The profile leaves `cc-plugin-plugin-authoring` on, because it teaches the plugin format.
It leaves `cc-plugin-sec-default` alone, because only a managed setting enables it.
A new built-in plugin stays as Claude Code sets it.

The `skillOverrides` entry `plugin-authoring` is `name-only`.
Claude Code skips `skillOverrides` for a skill from a plugin (task 2.12).
Whether it skips a skill of a built-in plugin is not verified.
Check it with `/context` in `just sandbox`.

## Built-in agents

The five dotclaude agents take the work of the built-in agents ([Agents](Agents)).
The profile turns off these built-in agents:

- `Explore` and `Plan`, with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`.
- `general-purpose`, `claude-code-guide`, and `statusline-setup`, with one `permissions.deny` entry `Agent(<name>)` each.

Each listed agent adds a line to each request, and `Explore` runs on the main model.
After setup, the agent listing holds only the five dotclaude agents.

## Computer use

The `computer-use` MCP server is opt-in.
Claude Code starts it only when the project config key `enabledMcpServers` holds `computer-use`.
In 7 sandbox runs on 2.1.293 the server was never in a request, so the default needs no switch.
The `mcp__computer-use` deny rule is a guard for the case that you enable it.
The deny rule on a running server is not tested, because the server needs the `cu-desktop` binary.

## Eval-gated

These items might cost quality, so they stay off until an eval shows no loss beyond the noise bound.
They are not in the profile.
Run setup with `--with <item>` to add one, and an eval arm uses the same switch.

| Item | `--with` | What it adds | Saving |
| --- | --- | --- | --- |
| Telemetry | `telemetry` | Sets `DISABLE_TELEMETRY` to 1, which also stops the GrowthBook fetch | No flag fetch, so flags use the code defaults. |
| Non-essential traffic | `nonessential-traffic` | Sets `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` to 1 | No auto-update, error report, release notes, or PR badge check. |
| Subagent cache of 1 hour | `subagent-cache-1h` | Sets `subagentPromptCacheTtl` to `1h` | See the reason below. |

Reason for `subagent-cache-1h`: the measure of 2026-10-05 (981 subagent runs in 7 days, see [Design](Design)) found that 1 hour costs $171 more than 5 minutes.
Of 21,807 gaps between two requests, 41 were 5 to 60 minutes long.
The item goes into the profile only if the cost for each resolved task falls with no loss beyond the noise bound.
Each item has one eval arm, named `gated-` and the item name (`tools/eval/arms.mjs`).

### Eval of 2026-10-08

The eval ran 12 cases with 3 runs per arm.
The rule: drop an item when the resolve rate, the over-claim rate, or the policy-violation rate gets worse beyond the noise bound.
When another measure gets worse with a shown interval, run the arm again.
Drop the item only when the loss shows again.
The reports are local and not in the repository, so this page gives the figures.

| Item | Result | Decision |
| --- | --- | --- |
| `plan-mode` | First run: `multiSentenceShare` 0.6 against 0.718, shown. Second run: 0.694 against 0.752, not shown. Cost was lower with the item (0.002, interval 0 to 0.003, shown). | In the profile. |
| `task-tools` | No measure was worse. | In the profile. |
| `git-instructions` | No measure was worse. A sandbox commit kept the `Co-Authored-By` trailer. | In the profile. |
| `telemetry` | Second run: `turns` 4.75 against 5.5, `seconds` 12.113 against 15.432, and `outputTokens` 655.861 against 799.917. All three were shown worse for the item. | Gated. |
| `nonessential-traffic` | Second run: `turns` 4.75 against 5.389 and `outputTokens` 655.861 against 762.472. Both were shown worse for the item. | Gated. |
| `subagent-cache-1h` | Cost for each resolved task 0.028 against 0.027. The mean difference was 0.002, interval -0.008 to 0.007. No saving was shown. | Gated. |

The likely cause of the `telemetry` loss is that `DISABLE_TELEMETRY` stops the GrowthBook flag fetch (see the table above).
This cause is not verified.

## Opt-in

An opt-in item is off until you say yes, and the reason is risk and not quality.
Run setup with `--with <item>` to add one, and no eval arm uses it.
The list is data in `plugins/dotclaude/features/setup/optin.mjs`.

| Item | `--with` | What it adds | Risk |
| --- | --- | --- | --- |
| Auto-fix | `autofix` | Sets `DOTCLAUDE_AUTOFIX` to 1, which turns on the hooks of [Auto-fix](Auto-Fix) | A hook runs outside the Bash sandbox, so a config that a prompt-injected model wrote could run with full network and file access. |

## Never set

The profile never sets a key that stops hooks or plugins, removes project instructions or attachments, or forces a model or effort.
The list is data in `plugins/dotclaude/lib/never-set.mjs`, and a test fails when the profile sets any entry.

| Entry | Reason |
| --- | --- |
| `disableAllHooks` | Stops all hooks. |
| `allowManagedHooksOnly` | Stops the hooks of plugins. |
| `strictPluginOnlyCustomization` | Stops customization by the user. |
| `disableSideloadFlags` | Stops the flags that load a plugin folder. |
| `alwaysThinkingEnabled` | Forces thinking on every model. |
| `allowAllClaudeAiMcps` | Turns on every claude.ai connector. |
| `claudeMd` | Replaces the project instructions. |
| `CLAUDE_CODE_SIMPLE` | Turns off hooks, plugins, skills, and memory. |
| `CLAUDE_CODE_SAFE_MODE` | Turns off hooks, plugins, skills, and memory. |
| `CLAUDE_CODE_ENABLE_TASKS` set to 0 | Removes the task tools that the model uses. |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | Removes the project instructions. |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | Removes the attachments. |
| `CLAUDE_CODE_EFFORT_LEVEL` | Forces one effort on every model. |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | Forces the model of a subagent. |
| `MAX_THINKING_TOKENS` | Forces a thinking budget. |
| `CLAUDE_CODE_REMOVE_PROMPT_STRINGS` | Removes text of the system prompt. |
| `CLAUDE_CODE_DISABLE_WEB_FETCH` | Removes the web fetch tool. |
| `CLAUDE_CODE_BASH_EDIT_DIFF` set to 0 | Removes the edit diff of Bash. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | Drops the MCP servers of plugins. |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | Removes beta features. |
| `DISABLE_INTERLEAVED_THINKING` | Removes thinking between tool calls. |

## Managed settings

dotclaude uses no managed settings.
Setup writes no `managed-settings.json` and no `managed-settings.d/` drop-in, runs no `sudo`, and writes nothing in the Claude Code install folder.
The 0.27.0 template `templates/managed-settings.json` is gone, and its five keys
(`autoCompactEnabled`, `autoMemoryEnabled`, `env`, `permissions`, and `sandbox`) are in the profile.
`sandbox.failIfUnavailable` was in the template only, so the profile does not hold it.

If setup finds an old dotclaude managed file, it asks whether to move the keys into user settings.
On yes (`--move-managed`, user scope), the keys merge into `settings.json` after the diff.
Setup then prints `sudo rm "<file>"` for you to run.
It never runs the command, and it never changes the managed file.

### Deny-override trade-off

With no managed settings, the guard `cc-plugin-sec-default` is not seated, and dotclaude runs at tier `user`.
An installed mod with a `tool.check` hook can then turn a content deny rule into an allow.
The probe turned `WebFetch(domain:example.com)` from deny into allow this way.
A path deny such as `Read(./secret.txt)` is enforced before `tool.check`, and a whole-tool deny removes the tool, so no mod can override those two.
You accept this trade-off when you install a mod.
The guard of dotclaude never weakens a deny.

### Organization case

On a machine with managed settings, or with a Team or Enterprise login, the guard is seated outermost.
It skips the `prompt.section` handlers of tier `user`, so the prompt text of dotclaude does not reach the request.
The `SessionStart` drift check reports that the guard is seated and which parts it skips.
dotclaude changes nothing else.
