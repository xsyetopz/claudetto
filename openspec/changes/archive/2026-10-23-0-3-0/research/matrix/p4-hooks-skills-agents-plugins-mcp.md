# Matrix P4: Hooks, Skills, Subagents, Plugins, and MCP

Target: Claude Code 2.1.306, claudetto 0.3.0-alpha.1.
Input: every row of `/tmp/claude-501/sweep/parts/p4-hooks-skills-agents-plugins-mcp.tsv` (911 rows).
Docs root: `/Users/krystian/.claude/plugins/marketplaces/claude-code-docs/docs/`.
A docs path in the Source column is relative to `docs/extend/`, unless it starts with `how-it-works/`, `configure/`, `reference/`, or `prompts/`.
`repo` means a path in `/Users/krystian/Downloads/CodeProjects/xsyetopz/claudetto/`.
`p1`, `p2`, `p3`, `p5a`, and `p5b` mean the files `p1-env-vars.md`, `p2-settings-perms-cli.md`, `p3-mod-api.md`, `p5a-tools.md`, and `p5b-internals.md` in this folder.
`A` means `openspec/changes/0-3-0/architecture.md`.
`D` is documented, `U` is undocumented, `X` is experimental, `G` is gated by a feature flag or a policy.
`Differs` means the docs and the program disagree.
Prices are in US dollars for each million tokens, from `configure/models-and-providers.md:139-148`.
Token counts come from `how-it-works/context-budget.md`, measured on 2.1.305.
A saving that has no source says "unmeasured".
No `claude` session and no model call was made for this matrix.

## Rules That Apply to Every Row

- A command hook costs 0 model tokens.
  A `prompt` hook and an `agent` hook cost one model call for each fire (`hooks/handlers.md:47-48`).
  So claudetto ships no `prompt` hook and no `agent` hook.
- A setting, a file in the plugin, or a frontmatter key comes before a hook.
  A hook comes before a tool.
- The `script` hook type was rejected in 2.1.305 and disables the whole settings file when it sits under `PreToolUse` (`hooks/handlers.md:50`).
  No claudetto file may use it.
- A command hook on a tool event carries an `if` filter, so Claude Code starts no process for the other tool calls (`hooks/configuration.md:81`).
- A command hook uses the exec form (`command` and `args`), because no shell starts (`hooks/handlers.md:74-75`).
  `${user_config.KEY}` works only in exec form (`hooks/configuration.md:118`).
- A plugin agent ignores `permissionMode`, `hooks`, and `mcpServers` (`subagents/frontmatter.md:36`, `:40-41`).
  So the cuts for a plugin agent are `tools`, `model`, `effort`, `maxTurns`, and `omitClaudeMd`.
- `CLAUDE_CODE_EFFORT_LEVEL` wins over each agent `effort` (`subagents/frontmatter.md:45`).
  The model choice order is the per-call `model`, the frontmatter `model`, `CLAUDE_CODE_SUBAGENT_MODEL`, then the main model (`subagents/frontmatter.md:35`).
  The `Agent` tool takes a per-call `model` and `effort` (`reference/tools/agents-and-tasks.md:52-53`).
  So the `claudetto:main` body must tell Claude to leave both unset.
- A change of the tool list or the agent list in a session breaks the cache (`A:117-118`).
  Every agent file and plugin file is fixed at the start.
- A mod hook needs the server flag `tengu_plugin_hooks_modules` (`p3-mod-api.md:11`).
  A hook in `hooks/hooks.json` under the key `hooks` does not need it.
  So a gate that must work with the flag off is a command hook or a static rule.
- Each row cites the docs line or the repo line that it rests on.
  Rows in the `n/a` table are grouped, and the Source cell gives the line range of every row in the group.

## Decisions Table

| Name | Source | Decision | Reason and saving |
| --- | --- | --- | --- |
| `name` (agent) | `subagents/frontmatter.md:31` (D) | use | Short names: `scout`, `worker`, `reviewer`. The type is `claudetto:<name>` (`A:102`). A name that holds `:` or starts with `-` is refused. |
| `description` (agent) | `subagents/frontmatter.md:32` (D) | use | One line of 10 words or less on each agent. One custom agent adds 29 tokens to the first request and the agent list takes 19 (`how-it-works/context-budget.md:119`). Three agents cost about 90 tokens. |
| `tools` (agent) | `subagents/frontmatter.md:33` (D) | use | Every agent gets a small allowlist. `--tools "Read,Edit,Bash"` cut an empty session from 16,277 to 5,358 tokens (`context-budget.md:110`). A subagent that leaves `tools` out inherits all tools. The `Agent(a, b)` form for `main` is Open 2. |
| `disallowedTools` (agent) | `subagents/frontmatter.md:34` (D) | n/a | An allowlist already removes the tool. The static `deny` rules carry the patterns (`p2-settings-perms-cli.md:22`). One exception is Open 3 for `main`. |
| `model` (agent) | `subagents/frontmatter.md:35` (D) | use | Every agent sets its own alias: `haiku`, `sonnet`, `opus`, or `inherit`. Aliases resolve to `claude-haiku-5-5`, `claude-sonnet-5-5`, and `claude-opus-5-5` (`configure/models-and-providers.md:60-62`). Input prices are 0.1, 2, and 4 (`models-and-providers.md:139`, `:145`, `:148`). |
| `permissionMode` (agent) | `subagents/frontmatter.md:36` (D) | n/a | Ignored for plugin agents. The brief asks for it "where it helps", and it never helps in a plugin. `tools` and the static `deny` rules do the work. |
| `maxTurns` (agent) | `subagents/frontmatter.md:37` (D) | use | A hard bound on each agent: 12, 30, and 15 (proposed). At the limit the output returns marked partial and Claude can resume the agent, so a bound loses no work. Saves the tail of a runaway loop, unmeasured. |
| `autoCompactWindow` (agent) | `subagents/frontmatter.md:38` (D) | use | `100000` on `scout` and `worker`, as `p5b-internals.md:21` decides. Their tasks are short, so the window stays small. Needs 2.1.296 or later. Unmeasured. |
| `skills` (agent) | `subagents/frontmatter.md:39` (D) | n/a | The full skill text loads on each spawn. No roster agent exists for one skill. The fork route for `docs` and `browse` is Open 6. |
| `mcpServers` (agent), `hooks` (agent) | `subagents/frontmatter.md:40-41` (D) | n/a | Ignored for plugin agents. 0.3.0 also ships no MCP server. |
| `memory` (agent) | `subagents/frontmatter.md:42` (D) | n/a | Memory is off (`p1-env-vars.md:60`). |
| `background` (agent) | `subagents/frontmatter.md:43` (D) | n/a | The default stays. Fork mode is off (`CLAUDE_CODE_FORK_SUBAGENT=0`, `p1-env-vars.md:20`), so `Agent` keeps its own `run_in_background` (`reference/tools/agents-and-tasks.md:55`). |
| `omitClaudeMd` (agent) | `subagents/frontmatter.md:44` (D) | use | `true` on `scout`. A 60-line `CLAUDE.md` adds 1,450 tokens to each spawn (`context-budget.md:117`). `worker` and `reviewer` keep it, because they need the project rules. |
| `effort` (agent) | `subagents/frontmatter.md:45` (D) | use | Every agent sets an effort. The index for `haiku` is 0.38 at `low` against 0.52 at the default `medium` (`models-and-providers.md:171`). The 5.5 models keep the cache when effort changes (`p5b-internals.md:14`). The snippet must not set `CLAUDE_CODE_EFFORT_LEVEL`. |
| `isolation` (agent) | `subagents/frontmatter.md:46` (D) | n/a | Not a frontmatter key for the roster. The per-call `isolation: "worktree"` of `Agent` does the work (`reference/tools/agents-and-tasks.md:56`). See the `patch` row. |
| `color` (agent) | `subagents/frontmatter.md:47` (D) | n/a | Display only. |
| `initialPrompt` (agent) | `subagents/frontmatter.md:48` (D) | n/a | On `main` it would start a model turn at each session start. Never set. |
| `experimental.cacheTtl` (agent) | `subagents/frontmatter.md:49` (D, X) | n/a | `subagentPromptCacheTtl` decides for all agents (`p5b-internals.md:12`). The frontmatter key has the lowest rank. |
| `observer`, `observerMessage`, `observeSubagents` | `subagents/frontmatter.md:50-52` (U, G) | n/a | Need `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS`. An observer is a second agent that runs for each agent. |
| `Agent` tool | `subagents/index.md:46` (D) | keep | Decided in `p5a-tools.md`. It costs 1,320 tokens loaded (`context-budget.md:66`). The roster needs it. |
| `--agent` and the `agent` setting | `subagents/index.md:47` (D) | use | The plugin `settings.json` sets `agent: "claudetto:main"` (`plugins/manifest.md:39`, `p2-settings-perms-cli.md:25`). 0 tokens, and it works with no mod. |
| `permissions.deny` `Agent(name)` | `subagents/index.md:49` (D) | use | Deny `Agent(general-purpose)`, `Agent(Explore)`, `Agent(Plan)`, `Agent(claude)`, `Agent(statusline-setup)`, and `Agent(fork)`. It is the fallback when `agent.offer` does not run (`A:129`). 0 tokens. |
| `Explore` agent | `subagents/runtime.md:30` (D) | replace with `claudetto:scout` | The built-in runs on the main model. `scout` runs on `haiku`: 20 times cheaper per token than Sonnet 5.5 and 40 times cheaper than Opus 5.5 (`models-and-providers.md:139`, `:145`, `:148`). Hide it with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`, which saves 324 tokens (`context-budget.md:114`). |
| `Plan` agent | `subagents/runtime.md:31` (D) | drop | Plan mode is off, because the snippet denies `EnterPlanMode` and `ExitPlanMode` (`p1-env-vars.md:112`). The same env var hides it (the 324 tokens count once, with `Explore`). |
| `general-purpose` agent | `subagents/runtime.md:32` (D) | replace with `claudetto:worker` | The built-in has `tools:["*"]` and the main model. The size of its prompt is in `research/vanilla-inventory.md:177`, and the size of a plugin agent prompt is in `:180`. A short body keeps each spawn smaller. Unmeasured in tokens. |
| `claude` agent | `subagents/runtime.md:33` (D) | drop | A catch-all with every tool and no model of its own. Hidden by `agent.offer` and by the `deny` rule. |
| `statusline-setup` agent | `subagents/runtime.md:34` (D) | drop | It has the largest prompt of the built-in agents (`vanilla-inventory.md:181`). `claudetto-setup` writes `statusLine`, so the interactive agent has no use. Hidden by `agent.offer` and by the `deny` rule. |
| `claude-code-guide` agent | `subagents/runtime.md:35` (D) | keep | It already runs on `haiku` in `dontAsk` mode. No claudetto part does the same. It costs tokens only when called. |
| `fork` | `subagents/runtime.md:36`, `:63` (D) | drop | A fork copies the whole parent context (`p1-env-vars.md:20`). `CLAUDE_CODE_FORK_SUBAGENT=0` and `Agent(fork)` in `deny`. |
| `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` | `subagents/runtime.md:61` (D) | set `1` | As `p1-env-vars.md:18`. No nested trees. |
| `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` | `subagents/runtime.md:62` (D) | set from plan tier | As `p1-env-vars.md:17`. |
| `CLAUDE_CODE_FORK_SUBAGENT` | `subagents/runtime.md:63` (D) | set `0` | As `p1-env-vars.md:20`. |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` | `subagents/runtime.md:64` (D) | keep default | As `p1-env-vars.md:62`. |
| `CLAUDE_CODE_SUBAGENT_MODEL` | `subagents/runtime.md:67` (D) | drop | As `p1-env-vars.md:38`. Each agent file carries a `model`. |
| `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` | `subagents/runtime.md:68` (D) | n/a | Decided in `p5b-internals.md:12` (measure, then set). |
| `agent.spawn` | `subagents/runtime.md:84` (D) | keep | `p3-mod-api.md:49`. It maps a call with no `subagent_type` to `claudetto:worker`, and it clears a per-call `model` that Claude sets by mistake. Needs `.catch`. |
| Marketplace `name`, `owner`, `plugins` | `plugins/marketplace.md:20-22` (D) | keep | `.claude-plugin/marketplace.json` has all three (`repo .claude-plugin/marketplace.json:2-6`). Remove the `claudetto-codegraph` entry (`A:93`) and the `claudetto-sessions` entry (`A:55`). |
| Marketplace `$schema` and `metadata.version` | `plugins/marketplace.md:23` (D) | keep | `just bump` writes the version. |
| `forceRemoveDeletedPlugins` | `plugins/marketplace.md:25` (D) | set `true` | A user who installed `claudetto-codegraph` gets it uninstalled at the next refresh. Its skill listing line and its CLI grant stop loading. Unmeasured. |
| `renames` | `plugins/marketplace.md:27` (D) | set | `{"claudetto-codegraph": null, "claudetto-sessions": "claudetto-lab"}`. The map is append-only. The sessions replay moves into the lab (`A:55`). See Open 8. |
| Plugin entry `name` and `source` | `plugins/marketplace.md:35`, `:50-56` (D) | keep | Six entries with `./plugins/<name>`, five after the codegraph cut. A relative path needs no network. |
| Plugin entry `category`, `strict` | `plugins/marketplace.md:36-37` (D) | keep | `strict` stays `true`, because the entries carry no component keys. `false` with a `plugin.json` gives a `conflicting manifests` error. |
| `claude plugin details` | `plugins/cli.md:29` (D) | use | Shows the component list and the projected token cost of a plugin, with no model call. It replaces the `audit.ts` script of `claudetto-sessions` for plugin bytes. A lab test pins the cost of each plugin. |
| `claude plugin validate` | `plugins/cli.md:32` (D) | keep | `repo tools/validate.ts:32` and `:35` already run it with `--strict`. |
| `claude plugin tag` | `plugins/cli.md:33` (D) | keep | `repo tools/release.ts:28` runs `claude plugin tag --dry-run`. It makes the tag `<name>--v<version>`. |
| `claude plugin test` | `plugins/cli.md:34` (D) | use | Runs every `*.test.ts` of a mod with stubbed events. Pins the hook list of `p3-mod-api.md:148`. |
| `claude plugin eval` | `plugins/cli.md:35` (D) | keep | `repo justfile:112` runs it. `eval-compare` (`repo src/plugins/claudetto-lab/slices/eval-compare/compare.ts`) adds the two-arm table that the built-in does not give. |
| `claude plugin install` | `plugins/cli.md:22` (D) | use | `repo justfile:59` installs the checkout into a sandbox config as a user does. |
| `/reload-plugins` and `--plugin-dir` | `plugins/cli.md:57`, `:63` (D) | use | The sandbox and the lab load the checkout with no install. `/reload-plugins` refuses a change to MCP tools that would break the cache, unless `--force`. |
| `CLAUDE_CODE_PLUGIN_DIRS` | `plugins/loading.md:52` (D) | use | The env form of `--plugin-dir` for the sandbox. |
| Manifest `$schema`, `name`, `version`, `description`, `author` | `plugins/manifest.md:29-34` (D) | keep | `version` is a string. Users stay on the version until it changes, so `just bump` is the only update route. |
| Manifest `settings` and the file `settings.json` | `plugins/manifest.md:39` (D) | use | A `settings.json` in the plugin root wins over the manifest key. Only `agent` and `subagentStatusLine` take effect. One file, no manifest copy. 0.2.0 ships neither (`repo plugins/claudetto/` has no `settings.json`). |
| Manifest `userConfig` | `plugins/manifest.md:40` (D) | replace | Core: drop `advisor`, `advisorModel`, and `advisorEffort` (advisor is off, `A:42`), drop `decide` (the key `TYPESAFE_API_KEY` is the switch), and drop `compaction` after the handoff comparison (`repo plugins/claudetto/.claude-plugin/plugin.json:11-44`). Browser: keep `backend`. |
| `userConfig` option keys `type`, `title`, `options` | `plugins/manifest.md:65-66`, `:70` (D) | keep | Only for the browser `backend` (`repo plugins/claudetto-browser/.claude-plugin/plugin.json:12`). `options` needs 2.1.271. |
| Default folders `skills/`, `agents/`, `output-styles/` | `plugins/manifest.md:98-99` (D) | use | The manifest keys `skills`, `agents`, and `outputStyles` are not needed. Fewer lines in `plugin.json`. |
| `hooks/hooks.json` key `modules` and `description` | `plugins/manifest.md:99` (D) | keep | One module path per plugin. The core file also holds the `PreModelSwitch` hook, which goes (see the row of the 0.2.0 hook). |
| `bin/` | `plugins/manifest.md:101` (D) | keep | Five programs in 0.2.0 (`repo plugins/claudetto/bin/`). `claudetto-patch` goes with `patch`. `claudetto-setup`, `claudetto-statusline`, `claudetto-decide`, and `jscpd-config` stay. 0 tokens until called. |
| `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PROJECT_DIR}` | `plugins/loading.md:34`, `:36` (D) | use | Replaced in hook `command` and `args`. The root changes on update, so no state lives there. |
| `${CLAUDE_PLUGIN_DATA}` | `plugins/loading.md:35` (D) | use | The folder for any file that must survive an update. Prefer `$.store` (`p3-mod-api.md:118`). |
| `${user_config.KEY}` | `plugins/loading.md:37` (D) | use | Fills the browser `backend` into the skill text with no code. Allowed in skill and agent text, not in shell-form hooks. |
| `enabledMcpServers`, `disabledMcpServers` | `mcp/settings.md:33-34` (D) | n/a | Per-project user choices. claudetto ships no MCP server, so it has nothing to list. |
| `claudetto` MCP server | `mcp/settings.md:41` (D) | drop | 0.2.0 ships no `.mcp.json`. The `mcp__claudetto__advise` tool came from the mod call `$.tool.register`, which goes (`p3-mod-api.md:92`). The MCP instructions block for it goes with it. |
| `/mcp` panel | `mcp/cli.md:51-54` (D) | use | Shows status and tool count of each server. A user checks the cost of a server there. |
| `alwaysLoad` | `mcp/config.md:43` (D) | n/a | `true` loads every tool upfront and delays start by up to 5 seconds. The default deferral stays. One filesystem server of 14 tools costs 190 tokens deferred (`context-budget.md:120`). |
| `ENABLE_CLAUDEAI_MCP_SERVERS`, `disableClaudeAiConnectors` | `mcp/auth.md:70-71` (D) | set | As `p2-settings-perms-cli.md:36`. No connector fetch at start. |
| `ToolSearch` | `mcp/runtime.md:27` (D) | keep | A deny costs 15,898 tokens (`context-budget.md:74`). `ENABLE_TOOL_SEARCH=false` costs 15,327 (`context-budget.md:112`). |
| `MAX_MCP_OUTPUT_TOKENS`, `ENABLE_MCP_LARGE_OUTPUT_FILES` | `mcp/runtime.md:65`, `:67` (D, U) | keep default | Decision A8 and `p1-env-vars.md:55`. No lower bound without a paired measurement. |
| `/compact` | `skills-and-commands/slash-commands.md:40` (D) | use | The built-in manual compaction. The `session.compact` hook aims it (`p3-mod-api.md:54`). |
| `/context` | `skills-and-commands/slash-commands.md:42` (D) | use | Counts what loads at the start, with a count-tokens call and no model turn (`context-budget.md:30`). Replaces the start-up bytes of the `audit.ts` script. |
| `/goal` | `skills-and-commands/slash-commands.md:50` (D) | drop | Off. One `Stop` command hook does the check (`A:43`, `p3-mod-api.md:72`). `modelProposedGoals: "disabled"` stops proposals (`p2-settings-perms-cli.md:33`). |
| `/fast` | `skills-and-commands/slash-commands.md:65` (D, G) | drop | Off by `CLAUDE_CODE_DISABLE_FAST_MODE=1` (`p1-env-vars.md:16`). Fast mode bills at a premium. |
| `/advisor` | `skills-and-commands/slash-commands.md:66` (D, G, X) | drop | Off by `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` (`p1-env-vars.md:14`). |
| `/permissions`, `/hooks`, `/mcp`, `/plugin`, `/skills` | `skills-and-commands/slash-commands.md:74-78`, `:80` (D) | use | Built-in views of rules, hooks, servers, plugins, and skills. They replace the listings of `claudetto-sessions` (`A:55`). `/skills` cycles `skillOverrides`. 0 tokens. |
| `/skill-doctor` | `skills-and-commands/slash-commands.md:81` (D) | use | Shows which loaded skills are unused and cost context. Replaces an audit script. Needs feature-flag fetching, so it may be absent. |
| `/status` | `skills-and-commands/slash-commands.md:95` (D) | use | Lists skills whose `allowed-tools` were ignored. A check for the `browse` and `docs` grants. |
| `/usage` | `skills-and-commands/slash-commands.md:96` (D) | use | Gives session cost and plan use. It is the source for the weekly share that the project rule asks for before each paid run. |
| `/auto-mode-setup` | `skills-and-commands/slash-commands.md:92` (D, G) | drop | Auto mode is off, and the classifier costs 19k to 35k tokens for each review (`A:126`). |
| `/statusline` | `skills-and-commands/slash-commands.md:98` (D) | replace | `claudetto-statusline` and the `statusLine` setting do the work with no agent run. The built-in starts `statusline-setup`, which has the largest built-in prompt (`vanilla-inventory.md:181`). |
| `/chrome` | `skills-and-commands/slash-commands.md:100` (D, G) | drop | `agent-browser` through the `browse` skill replaces Claude in Chrome (`p1-env-vars.md:36`, `A:58`). |
| `/workflows` | `skills-and-commands/slash-commands.md:134` (D, G) | drop | `Workflow` is off. It saves 1,969 tokens (`context-budget.md:64`). |
| `/doctor` | `skills-and-commands/bundled-skills.md:32` (D) | use | Checks the install, unused extensions, `CLAUDE.md`, hooks, and permissions. Replaces the `audit.ts` script (`A:55`, `p2-settings-perms-cli.md:88`). Stays on when `disableBundledSkills` is `true`. |
| Bundled skills `claude-api`, `debug`, `batch`, `run`, `run-skill-generator`, `verify`, `code-review`, `update-config`, `fewer-permission-prompts`, `security-review`, `schedule`, `keybindings-help`, `claude-in-chrome`, `design-sync`, `artifact-components` | `skills-and-commands/bundled-skills.md:33-49` (D, U, G) | drop | `disableBundledSkills: true` removes the listing (`p2-settings-perms-cli.md:40`). The built-in listing is 2,210 tokens in each session: `dataviz` 482, `claude-api` 361, `code-review` 331, `update-config` 236, `schedule` 127, `run` 123, `loop` 115, `workflow-authoring` 84, `keybindings-help` 83, `fewer-permission-prompts` 64, `simplify` 63, `security-review` 30, `init` 22 (`context-budget.md:84-100`). `/batch` also starts 5 to 30 worktree agents, and that conflicts with the subagent cap. |
| Bundled skill `plugin-authoring` | `skills-and-commands/bundled-skills.md:41` (D) | set `name-only` | `skillOverrides` as `p2-settings-perms-cli.md:48`. 89 tokens shrink to the name. The built-in mod `cc-plugin-plugin-authoring` adds it even when bundled skills are off (`p3-mod-api.md:147`). |
| `skillOverrides` | `skills-and-commands/index.md:81` (D) | keep | Plugin skills are not affected by it (`index.md:81`). So it cuts only the built-in names. |
| `--disable-slash-commands` | `skills-and-commands/index.md:80` (D) | n/a | It makes the request larger, not smaller: about 2,300 tokens more, because `Workflow` grows when `Skill` goes (`context-budget.md:125`). Never set. |
| Skill `name` | `skills-and-commands/frontmatter.md:46` (D) | use | The folder name. Not needed in the file. 0.2.0 writes it (`repo plugins/claudetto/skills/dry/SKILL.md:3`). |
| Skill `description` | `skills-and-commands/frontmatter.md:47` (D) | use | One sentence, cut at 1,536 characters. The listing takes 1 percent of the window (`skills-and-commands/index.md:79`). The `dry` entry is about 43 tokens (proposed estimate). |
| Skill `argument-hint` | `skills-and-commands/frontmatter.md:49` (D) | keep | `setup` and `spec` use it. Autocomplete only. 0 tokens in the request. |
| Skill `disable-model-invocation` | `skills-and-commands/frontmatter.md:51` (D) | use | The description of such a skill is not in context (`skills-and-commands/substitutions.md:62`). Already on `setup`, `spec`, `eval-compare`, and `sessions`. Candidate: `dry` (Open 5). |
| Skill `allowed-tools` | `skills-and-commands/frontmatter.md:53` (D) | keep | The `browse` list names each safe `agent-browser` subcommand (`repo plugins/claudetto-browser/skills/browse/SKILL.md:5`). It leaves out `eval`-type commands on purpose. Remove `Bash(codegraph install --target claude --location global)` from `setup` (`repo plugins/claudetto/skills/setup/SKILL.md:7`, decision A6). |
| Skill `paths` | `skills-and-commands/frontmatter.md:61` (D) | n/a | A glob limit for automatic loading. No claudetto skill ties to a file type. |
| Skill `context` and `agent` | `skills-and-commands/frontmatter.md:57-59` (D) | n/a | A fork of `docs` or `browse` into a `haiku` agent could keep page output out of the main context. It adds a request and the A8 precedent warns about extra turns. Open 6. |
| `.claude/commands/` | `skills-and-commands/index.md:71` (D) | n/a | The old form of a skill. 0.2.0 has none. |
| `$ARGUMENTS` | `skills-and-commands/substitutions.md:35` (D) | use | `setup` and `spec` take one argument. No placeholder means Claude Code appends `ARGUMENTS: <value>`. |
| `${CLAUDE_SKILL_DIR}` | `skills-and-commands/substitutions.md:41`, `:44` (D) | use | `sessions` uses it for `replay.ts`. It works in `allowed-tools` Bash rules. |
| `Skill(name)` rule | `skills-and-commands/substitutions.md:65` (D) | n/a | `skillOverrides` and `disableBundledSkills` do the same with less text. A deny of `Skill` costs 5,599 tokens (`context-budget.md:73`). |
| Hook input `session_id`, `cwd`, `agent_id` | `hooks/input-and-output.md:43`, `:45`, `:51` (D) | use | The `Stop` check reads these three. `agent_id` is absent on the main thread, so the check can skip a subagent. |
| Hook output `decision` and `reason` | `hooks/input-and-output.md:66-67` (D, Differs) | use | Only `block` with a `reason`. The program also accepts `approve`, which is deprecated. |
| `permissionDecision` for `PreModelSwitch` | `hooks/input-and-output.md:114` (D) | use | `allow`, `deny`, or `ask`. No `defer`. See the `PreModelSwitch` row. |
| Hook `if` filter | `hooks/configuration.md:81` (D) | use | Only the five tool events read it. No process starts for a call that does not match. The saving is one process for each skipped call, unmeasured. |
| `PreModelSwitch` timeout | `hooks/configuration.md:95` (D) | use | A hook that times out blocks the switch. So the hook has a short `timeout` and a test of the timeout path. |
| Hook `onFailure: "continue"` | `hooks/configuration.md:105` (D) | keep | The default. A broken goal check must not trap the session. `block` is not used. |
| `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | `hooks/configuration.md:126` (D) | keep default | The default is 8 continuations. Each one is a model turn. See Open 4 and `p1-env-vars.md:63`. |
| `CLAUDE_PROJECT_DIR`, `CLAUDE_PLUGIN_ROOT` in hooks | `hooks/configuration.md:116-117` (D) | use | Both are replaced in `command` and `args`. |
| `/hooks` | `hooks/configuration.md:144` (D) | use | A read-only browser that shows where each hook comes from. |
| Handler `command` | `hooks/handlers.md:44` (D) | use | The only handler type that claudetto ships. It works on all 33 events and costs 0 model tokens. |
| Handler `http` | `hooks/handlers.md:45` (D) | n/a | No network need. It needs `allowedHttpHookUrls` rules. |
| Handler `mcp_tool` | `hooks/handlers.md:46` (D) | n/a | No MCP server in claudetto. |
| Handler `prompt` | `hooks/handlers.md:47`, `:109-114` (D) | drop | One model call for each fire. Its fields `prompt`, `model`, `continueOnBlock`, `ok`, `reason`, and `impossible` go with it. A command hook does the same check for 0 tokens. |
| Handler `agent` | `hooks/handlers.md:48` (D, X) | drop | A subagent of up to 50 turns for each fire, and the docs say it may change. |
| Handler `script` | `hooks/handlers.md:50` (D, Differs) | drop | Rejected in 2.1.305. It disables the whole settings file under `PreToolUse`. |
| Handler `args` | `hooks/handlers.md:75` (D) | replace | The 0.2.0 hook uses the shell form: `bun --no-env-file "${CLAUDE_PLUGIN_ROOT}/slices/handoff/adapters/switch.ts"` (`repo plugins/claudetto/hooks/hooks.json:9`). The exec form starts no `sh`. Saves one shell process for each fire, unmeasured. |
| Handler `timeout` | `hooks/handlers.md:66` (D) | use | A short value on each command hook. A hook that hangs adds wait time to the turn. |
| Event `Stop` | `hooks/events.md:59` (D) | use | The goal check as a command hook in `hooks/hooks.json` under `hooks.Stop`. Works with the mod flag off (`p3-mod-api.md:72`). 0 model tokens. One process for each stop. |
| `Stop` input `stop_hook_active`, `last_assistant_message` | `hooks/events.md:423-424` (D) | use | `stop_hook_active` stops a loop. `last_assistant_message` saves a read of the transcript, which lags (`hooks/input-and-output.md:44`). |
| `Stop` output `decision: "block"` with `reason` | `hooks/events.md:427` (D) | use | `reason` becomes the next instruction. Each block is one more model turn, so the check blocks only on a real miss. |
| Event `PreModelSwitch` (0.2.0 hook) | `hooks/events.md:68` (D) | replace | The 0.2.0 command hook serves `handoff` (`repo plugins/claudetto/hooks/hooks.json:4-13`). It goes unless the handoff comparison keeps `handoff` (`A:45`). In its place goes a cost gate (next row). |
| `PreModelSwitch` input `context_tokens`, `estimated_cache_write_usd`, `pricing` and output `ask` | `hooks/events.md:553-557` (D) | use | A model switch is a cache miss (`how-it-works/models.md:25`). The hook asks the person when `estimated_cache_write_usd` is $0.10 or more (proposed threshold). 0 model tokens. Unmeasured in a run. |
| Stream-json `result` and `system` start message | `headless/stream-json.md:26-27` (D) | use | The lab reads cost and the tool list of a sandbox run there. The run is a paid call, so the user approves it first (`CLAUDE.md`, rules). |
| 0.2.0 skill `patch` | `repo plugins/claudetto/skills/patch/SKILL.md` | drop | The skill, the `claudetto-patch` bin, and a hook. The per-call `isolation: "worktree"` and `ExitWorktree` with `keep` or `remove` do the same (`reference/tools/agents-and-tasks.md:56`, `A:47`). |
| 0.2.0 skill `sessions` | `repo plugins/claudetto-sessions/skills/sessions/SKILL.md` | replace | `audit.ts` gives way to `/doctor`, `/context`, `/hooks`, `/skill-doctor`, and `claude plugin details`. `replay.ts` moves to `claudetto-lab` (`A:55`). No built-in replays a hook on past tool calls. |
| 0.2.0 skill `codegraph` | `repo plugins/claudetto-codegraph/skills/codegraph/SKILL.md` | drop | Decision A10. `forceRemoveDeletedPlugins` removes it from users. |
| 0.2.0 skills `dry`, `spec`, `setup`, `docs`, `browse`, `eval-compare` | `repo plugins/*/skills/*/SKILL.md` | keep | Verdicts `keep` or `rebuild` in `A:51-58`. Each body loads only on a call. |
| 0.2.0 hook module of `claudetto-browser` | `repo plugins/claudetto-browser/hooks/hooks.json:2-3` | keep | One `modules` entry. The `WebSearch` answer in the browser costs 0 tokens. |

## n/a Rows (Grouped)

| Name | Source | Decision | Reason |
| --- | --- | --- | --- |
| Subagent entry points `@`, `Task`, `/subtask` | `subagents/index.md:48`, `:50-51` (D) | n/a | `@` is interactive. `Task` is the old name of `Agent`. `/subtask` starts a fork, and fork mode is off. |
| Internal agents `workflow-subagent`, `comment-thread-analyst`, `web-fetch` | `subagents/runtime.md:37-39` (U, G) | n/a | Workflows and artifacts are off. `web-fetch` exists only behind `CLAUDE_CODE_WEB_FETCH_AGENT`, and `p5a-tools.md` decides `WebFetch`. |
| Subagent env `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`, `CLAUDE_CODE_FORWARD_SUBAGENT_TEXT`, `CLAUDE_CODE_ENABLE_APPEND_SUBAGENT_PROMPT`, `CLAUDE_CODE_TEAM_TEARDOWN_PARK_TIMEOUT_MS` | `subagents/runtime.md:65-66`, `:69`, `:85` (D, U) | n/a | Stall timer, print-mode output, a hidden print-mode flag, and team teardown. No token effect. |
| Team hooks `TeammateIdle`, `TaskCreated` | `subagents/runtime.md:82-83` (D) | n/a | Teams are off (`p1-env-vars.md:70`). |
| Marketplace keys `allowCrossMarketplaceDependenciesOn`, `metadata.pluginRoot`, `headers`, `defaultEnabled`, `relevance`, `experimental` | `plugins/marketplace.md:24`, `:26`, `:38-41` (D, X) | n/a | Add-ons stand alone, so there is no dependency. `defaultEnabled` and `relevance` save no tokens, because a skill listing line exists only after an install. |
| Marketplace source forms `github`, `url`, `git-subdir`, `npm`, `archive`, `command`, `unsupported`, `git`, `file`, `settings`, `skills-dir` | `plugins/marketplace.md:50-56`, `:64-70` (D, U) | n/a | The repository uses relative paths. These forms are for other catalogs and policy lists. |
| Plugin CLI `init`, `install --registry`, `uninstall`, `enable`, `disable`, `update`, `list`, `configure`, `prune`, `eval init`, and `marketplace add`, `list`, `remove`, `update` | `plugins/cli.md:21`, `:23-28`, `:30-31`, `:36`, `:47-50` (D) | n/a | User actions. They cost no model tokens and claudetto adds no code for them. `uninstall` on the last scope deletes options and data. |
| `/plugin` panel, `--plugin-url`, `--plugin-dir-no-mcp` | `plugins/cli.md:56`, `:64-65` (D, U) | n/a | User actions or hidden flags. |
| Manifest keys `displayName`, `metadata`, `icon`, `defaultEnabled`, `dependencies`, `channels`, `types`, `commands`, `mcpServers`, `lspServers`, `workflows` | `plugins/manifest.md:31`, `:35-38`, `:41-42`, `:44`, `:47-48`, `:50` (D) | n/a | Not needed. Default folders carry the files. 0.2.0 ships no MCP server and no LSP server. Decision A6 offers no code-intelligence tool. |
| Manifest keys `skills`, `agents`, `hooks`, `outputStyles` | `plugins/manifest.md:43`, `:45-46`, `:49` (D) | n/a | The default folders and `hooks/hooks.json` do the same. A key replaces a folder and adds lines. |
| Manifest `experimental.*` and `binaries` | `plugins/manifest.md:51-55` (D, U, X) | n/a | Themes, monitors, highlight languages, and fetched binaries. No token effect. `experimental.evals` is the default folder `evals/`. |
| `userConfig` option keys `required`, `multiple`, `min` | `plugins/manifest.md:67-69` (D) | n/a | The one browser option needs none of them. |
| `.mcp.json` | `plugins/manifest.md:100` (D) | n/a | Nothing to ship. |
| Plugin sources `inline`, `builtin`, `skills-dir`, `synced` | `plugins/index.md:49-52` (D) | n/a | `syncClaudeAiPlugins: false` is set in `p2-settings-perms-cli.md:38`. |
| Plugin folders and records | `plugins/loading.md:19-26` (D, U) | n/a | Read-only facts about the cache layout. |
| `CLAUDE_PLUGIN_OPTION_<KEY>` and plugin env `CLAUDE_CODE_PLUGIN_GIT_TIMEOUT_MS`, `_KEEP_MARKETPLACE_ON_FAILURE`, `_PREFER_HTTPS`, `_SEED_DIR`, `_DIR_WATCH`, `FORCE_AUTOUPDATE_PLUGINS`, `CLAUDE_CODE_SYNC_PLUGINS`, `_PLUGIN_USE_ZIP_CACHE`, `_SKIP_PLUGIN_MCP_SERVERS` | `plugins/loading.md:38`, `:53-61` (D, U) | n/a | Install plumbing. `p1-env-vars.md:71` decides the same. |
| MCP settings and flags `hasTrustDialogAccepted`, `~/.claude.json`, `managed-mcp.json`, `--mcp-config`, `--strict-mcp-config`, `--plugin-dir-no-mcp`, `--channels`, `--dangerously-load-development-channels`, `--setting-sources` | `mcp/settings.md:35`, `:42-49` (D, U) | n/a | User or managed setup. claudetto reads no MCP config. |
| `claude mcp` subcommands and flags | `mcp/cli.md:19-30`, `:36-45` (D, G) | n/a | User commands. `remove` deletes stored OAuth tokens. `xaa` is gated. |
| `/mcp reconnect all`, `/mcp enable`, `/mcp__<server>__<prompt>` | `mcp/cli.md:52-54` (D) | n/a | Panel actions. |
| MCP config keys `type`, `command`, `args`, `env`, `url`, `headers`, `headersHelper`, `oauth`, `timeout`, `role`, `tools`, `name`, `id`, `bareElicitationCapability`, `discoveryCache`, `request_timeout_ms`, `toolPermissions`, `disableAutoBackground`, `ideName`, `cachedInitResponse`, `${VAR}`, `${VAR:-default}`, `anthropic-skills` | `mcp/config.md:34-54`, `:62-67`, `:77` (D, U) | n/a | claudetto ships no MCP server. These keys serve a server author. |
| MCP transports `stdio`, `http`, `sse`, `ws`, `sdk`, `sse-ide`, `ws-ide`, `claudeai-proxy` and scopes `local`, `project`, `user`, `managed`, `dynamic`, `enterprise`, `agent` | `mcp/index.md:29-36`, `:44-52` (D, U) | n/a | Same reason. |
| MCP auth `oauth.*`, `--client-id`, `MCP_CLIENT_SECRET`, `MCP_OAUTH_CLIENT_METADATA_URL`, `CLAUDE_CODE_MCP_SERVER_NAME`, `CLAUDE_PLUGIN_ROOT` (helper), `${user_config.*}` in a helper | `mcp/auth.md:21-28`, `:42-43`, `:47` (D, U, G) | n/a | No remote server in claudetto. |
| MCP tool names `mcp__<server>__<tool>`, `mcp__plugin_<plugin>_<server>__<tool>`, `mcp__github`, `mcp_server`, `mcp_tool`, `updatedMCPToolOutput` | `mcp/runtime.md:20-26` (D) | n/a | claudetto has no MCP tool to match. A hook matcher on the bare server key never fires for a plugin server, which matters only for a user rule. |
| MCP `SearchMcpRegistry`, `ListConnectors`, resource tools, `@server:protocol://path`, `/server:prompt`, `CLAUDE_CODE_MCP_APPS_HOST`, `Elicitation`, `ElicitationResult`, channels | `mcp/runtime.md:29`, `:35-38`, `:40`, `:42`, `:52-56` (D, U) | n/a | Connector tools are cut by `disableClaudeAiConnectors`. Resource tools are decided in `p5a-tools.md`. The rest needs a server. |
| MCP `_meta` keys, `list_changed`, `roots/list` | `mcp/runtime.md:67-70`, `:83`, `:85` (D) | n/a | Server-author side. |
| Slash commands for session, UI, and account: `/add-dir`, `/cd`, `/clear`, `/autocompact`, `/resume`, `/rename`, `/branch`, `/fork`, `/subtask`, `/background`, `/stop`, `/plan`, `/recap`, `/btw`, `/export`, `/copy`, `/exit`, `/restart`, `/rewind`, `/tasks`, `/list-agents`, `/focus`, `/diff`, `/model`, `/effort`, `/config`, `/memory`, `/reload-skills`, `/output-style`, `/theme`, `/tui`, `/color`, `/brief`, `/scroll-speed`, `/terminal-setup`, `/keybindings`, `/ide`, `/init`, `/import`, `/help`, `/release-notes`, `/sandbox`, `/insights` | `skills-and-commands/slash-commands.md:37-39`, `:41`, `:43-49`, `:51-64`, `:72-73`, `:79`, `:82-91`, `:93-94`, `:97`, `:99`, `:101` (D, G) | n/a | User commands with no cost until typed. `/autocompact` is decided in `p5b-internals.md:21`. Plan mode is off. `/effort` is Open 1. `/fork` and `/subtask` need fork mode. The sandbox stays off (`A:120`). |
| Slash commands for billing, cloud, and fun: `/privacy-settings`, `/login`, `/logout`, `/install`, `/usage-credits`, `/upgrade`, `/pro-trial-expired`, `/rate-limit-options`, `/passes`, `/feedback`, `/bug`, `/install-github-app`, `/install-slack-app`, `/setup-bedrock`, `/setup-vertex`, `/web-setup`, `/cloud-plugins`, `/remote-env`, `/teleport`, `/session`, `/desktop`, `/mobile`, `/remote-control`, `/ultraplan`, `/ultrareview`, `/autofix-pr`, `/daemon`, `/artifacts`, `/design-consent`, `/design-login`, `/voice`, `/powerup`, `/stickers`, `/radio`, `/team-onboarding`, `/heapdump`, `/mcp__<server>__<prompt>` | `skills-and-commands/slash-commands.md:92`, `:102-133`, `:135-144` (D, U, G) | n/a | Account, cloud, and display commands. The plan targets the first-party API (`p1-env-vars.md:78`). Paid cloud commands run only when the user types them. Artifacts are off (`p1-env-vars.md:75`). |
| Skill keys `when_to_use`, `arguments`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `hooks`, `shell`, `metadata`, `license`, `compatibility`, `version`, `fallback`, `created_by`, `experimental` | `skills-and-commands/frontmatter.md:48`, `:50`, `:52`, `:54-56`, `:60`, `:62-69` (D, U, X) | n/a | A skill `model` or `effort` switches the model for the turn and breaks the cache. `when_to_use` adds text to the listing. The rest have no effect or no use. |
| Skill sources `--add-dir`, `<name>@skills-dir`, `CLAUDE_CODE_DISABLE_POLICY_SKILLS`, `CLAUDE_CODE_DISABLE_CLAUDE_API_SKILL` | `skills-and-commands/index.md:50`, `:54`, `:84` (D) | n/a | `p1-env-vars.md:60` decides the env vars. `disableBundledSkills` already removes `claude-api`. |
| Substitutions `$ARGUMENTS[N]`, `$name`, `\$1`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `disableSkillShellExecution`, `user-invocable: false`, `context: fork` | `skills-and-commands/substitutions.md:36-40`, `:42-43`, `:54`, `:63`, `:67` (D) | n/a | No claudetto skill needs them. `p2-settings-perms-cli.md:83` keeps `disableSkillShellExecution` at the default. |
| Hook input `transcript_path`, `prompt_id`, `scratchpad_dir`, `permission_mode`, `effort`, `hook_event_name`, `agent_type`, `mcp_server` | `hooks/input-and-output.md:44`, `:46-50`, `:52-53` (D, Differs) | n/a | The `Stop` check does not read them. `last_assistant_message` replaces the transcript read. |
| Hook output `continue`, `stopReason`, `systemMessage`, `terminalSequence`, `hookSpecificOutput`, `{"async":true}` | `hooks/input-and-output.md:62-65`, `:68-69` (D, U) | n/a | A visible `systemMessage` is a transcript line. `$.ui.log` does it in process (`p3-mod-api.md:85`). |
| Per-event effect tables of `continue: false` and of the non-honored output | `hooks/input-and-output.md:78-87`, `:93-105`, `:115-116` (D) | n/a | Reference tables. They list no lever. |
| Hook locations and matchers: `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, `--settings`, `"*"`, `FileChanged` matcher | `hooks/index.md:77-79`, `:81`, `hooks/configuration.md:46`, `:49` (D) | n/a | claudetto ships hooks in the plugin, not in a settings file. A `"*"` matcher runs on every occurrence. |
| Hook timeouts and failure fields: `SessionEnd`, `PreToolUse` timeout, `asyncTimeout`, `onFailure: "block"`, `onFailure` (U), `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` | `hooks/configuration.md:94`, `:96-97`, `:106-107`, `:110` (D, U) | n/a | `block` would make a broken check stop the turn. `SessionEnd` has a short budget. |
| Hook env `CLAUDE_PLUGIN_OPTION_<KEY>`, `CLAUDE_ENV_FILE`, `CLAUDE_EFFORT`, `CLAUDE_CODE_REMOTE`, `CLAUDE_CODE_BRIDGE_SESSION_ID`, `CLAUDE_MODEL`, `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`, `CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS`, `CLAUDE_CODE_DISABLE_FILE_MENTIONS`, `CLAUDE_CODE_GIT_BASH_PATH`, `MCP_TIMEOUT`, `CLAUDE_CODE_HOOKS_SAME_THREAD`, `CLAUDE_CODE_DISABLE_HOOK_FORWARDING`, `DISABLE_BRIEF_MODE_STOP_HOOK`, `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS` | `hooks/configuration.md:118-125`, `:127-134` (D, U) | n/a | No claudetto hook needs them. |
| Settings `hooks`, `allowedHttpHookUrls`, `httpHookAllowedEnvVars` | `hooks/configuration.md:140-142` (D) | n/a | `p2-settings-perms-cli.md:83` keeps them at the default. |
| Handler fields `statusMessage`, `once`, `shell`, `async`, `asyncRewake`, `rewakeMessage`, `rewakeSummary`, `cloud`, `onFailure`, `url`, `headers`, `allowedEnvVars`, `server`, `tool`, `input`, `type`, `if`, `callback` | `hooks/handlers.md:49`, `:64-65`, `:67-68`, `:76-82`, `:88-91`, `:97-99` (D, U) | n/a | `async` hooks cannot block. `once` works only in skill frontmatter. The rest serve `http`, `mcp_tool`, or an SDK host. `type` and `if` are covered by the rows above. |
| Events with no claudetto hook: `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch` | `hooks/events.md:41-46` (D) | n/a | `tool.check` and the static `deny` rules gate tools (`p3-mod-api.md:73`, `:77`). `updatedToolOutput` is a compressor, and A8 forbids it. |
| Events `SessionStart`, `Setup`, `SessionEnd`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `DirectoryAdded`, `UserPromptSubmit`, `UserPromptExpansion`, `MessageDisplay`, `Notification`, `StopFailure`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `PreCompact`, `PostCompact`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove` | `hooks/events.md:47-58`, `:60-67`, `:69-73` (D, G) | n/a | Their `additionalContext` adds tokens at each fire. `session.compact` replaces the compact events (`p3-mod-api.md:75`). The worktree events stay with the built-in worktree. |
| `PreToolUse` and `PermissionRequest` fields, `PermissionDenied` fields, permission update types | `hooks/events.md:90-99`, `:132-138`, `:146-149`, `:161-163` (D, U, Differs) | n/a | No hook on these events. |
| `PostToolUse`, `PostToolUseFailure`, and `PostToolBatch` fields, `SubagentHandback` matcher, tool output shapes | `hooks/events.md:178-189`, `:199-203`, `:212-214`, `:607-615` (D, U) | n/a | No hook on these events. `SubagentHandback` is for auto mode, which is off. |
| `SessionStart`, `Setup`, `SessionEnd`, `InstructionsLoaded`, `ConfigChange`, `CwdChanged`, `FileChanged`, `DirectoryAdded` fields | `hooks/events.md:229-238`, `:248-251`, `:261`, `:271-274`, `:285-287`, `:298-299`, `:311-313`, `:324-325` (D, Differs, G) | n/a | No hook on these events. `Setup` drops all JSON fields. |
| `UserPromptSubmit`, `UserPromptExpansion`, `MessageDisplay`, `Notification` fields and types | `hooks/events.md:341-347`, `:359-363`, `:375-379`, `:390-401` (D, U, G) | n/a | No hook on these events. A desktop alert on `permission_prompt` is no saving. |
| `Stop` fields `background_tasks`, `session_crons`, `additionalContext`, and `StopFailure` fields | `hooks/events.md:425-426`, `:428`, `:439-441` (D) | n/a | The goal check needs neither. `decision: "block"` already keeps the turn going. |
| `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle` fields | `hooks/events.md:457-458`, `:469-472`, `:484-487`, `:499-500`, `:511-512` (D) | n/a | No hook on these events. |
| `PreCompact`, `PostCompact`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`, `WorktreeCreate`, `WorktreeRemove` fields | `hooks/events.md:531-533`, `:558`, `:572-577`, `:596-599` (D) | n/a | No hook on these events. |
| `PreModelSwitch` fields `from_model`, `source` | `hooks/events.md:553-554` (D) | n/a | The cost gate needs the target model and `context_tokens` only. |
| Control-protocol requests and replies (`initialize` to `error`) | `headless/control-protocol.md:20-112` (U) | n/a | The wire format between an SDK host and the worker. `get_context_usage`, `get_session_cost`, `get_usage`, and `get_status` repeat `/context`, `/usage`, and `/status`. The `ui_*` requests serve remote screens. |
| Stream-json message types other than `result` and the start message | `headless/stream-json.md:23-25`, `:28-36`, `:42-107` (D, U) | n/a | Output of `-p` runs. The lab needs only the final result and the start message. |

## Proposed Agent Roster

The roster replaces `general-purpose`, `Explore`, and `Plan` (`p3-mod-api.md:48`).
Agent files live in `src/plugins/claudetto/slices/agents/agents/` and ship in `plugins/claudetto/agents/` (`A:102`).
Decision A14 may change those paths.
A plugin agent ignores `permissionMode`, `hooks`, and `mcpServers`, so those keys are absent.
The prices are input and output for each million tokens: `haiku` 0.1 and 0.5, `sonnet` 2 and 10, `opus` 4 and 20 (`configure/models-and-providers.md:139`, `:145`, `:148`).
The cost of the agent list comes from `how-it-works/context-budget.md:119`.

| Name | Model | Effort | Tools | maxTurns | Other keys | Reason |
| --- | --- | --- | --- | --- | --- | --- |
| `claudetto:main` | `inherit` | `medium` | all (no `tools` key) | none | `description`. No `initialPrompt`. No `omitClaudeMd`. | The main-thread agent (`A:76`). `inherit` leaves the model to the user. `medium` is the default of the 5.5 models, so the pin only stops a later default change from raising cost (`models-and-providers.md:165`). A `maxTurns` here would stop the whole session. An `initialPrompt` would start a model turn at each launch. Open 1 and Open 2 test `effort` and `Agent(...)`. |
| `claudetto:scout` | `haiku` | `low` | `Read`, `Grep`, `Glob`, `Bash` | 12 (proposed) | `omitClaudeMd: true`, `autoCompactWindow: 100000`, `description` | Replaces `Explore`, which uses the main model (`subagents/runtime.md:30`). 20 times cheaper per token than Sonnet 5.5. Skips `CLAUDE.md`, which saves 1,450 tokens for a 60-line file (`context-budget.md:117`). No `Edit`, `Write`, or `Agent` in the allowlist. The effort index at `low` is 0.38 (`models-and-providers.md:171`). |
| `claudetto:worker` | `sonnet` | `medium` | `Read`, `Edit`, `Write`, `Bash`, `Grep`, `Glob` | 30 (proposed) | `autoCompactWindow: 100000`, `description` | Replaces `general-purpose`, which uses the main model and `tools:["*"]`. Half the Opus 5.5 price (2 against 4 input). Keeps `CLAUDE.md`, because it edits code under the project rules. A per-call `isolation: "worktree"` gives the isolated edit that `patch` gave. The body stays short, since the fixed prompt of a plugin agent already has a base size (`vanilla-inventory.md:180`). |
| `claudetto:reviewer` | `sonnet` | `high` | `Read`, `Grep`, `Glob`, `Bash` | 15 (proposed) | `description` | On trial. A fresh context that checks a diff against the rules, with no edit tool. `high` effort costs more than `medium` on Sonnet 5.5 (`models-and-providers.md:178`), so only a review pays it. Drop the agent if no eval case uses it, since it adds about 29 tokens to every session (`context-budget.md:119`). |

Not in the roster:

- A `planner`.
  Plan mode is off (`p1-env-vars.md:112`).
- A `docs` agent and a `browser` agent.
  A fork of those skills is Open 6.
- A `disallowedTools` list on `claudetto:main`.
  It is Open 3.

## Open

1. Whether the `effort` of `claudetto:main` beats the `/effort` command of the user.
   If it does, a pinned `medium` removes the user's control, and the key must go.
   Also test whether `model: inherit` follows `/model`.
   A sandbox session decides it (`--debug-file`), and it is a paid run.
   Ask the user first and give the expected cost and the weekly share (`/usage`).
2. Whether `tools: Agent(claudetto:scout, claudetto:worker, claudetto:reviewer)` in `main` limits the types that the main thread can start (`subagents/frontmatter.md:33`).
   The `tools` key is an allowlist, so the file must then name every other tool, deferred ones included.
   A mistake would remove tools or change the tool list.
   If it works, it replaces the `Agent(name)` deny rules for built-ins and `agent.offer`.
   The docs name no probe.
3. Whether `disallowedTools` in the `main` agent removes tool schemas.
   `Workflow`, `ScheduleWakeup`, and `ReportFindings` are the targets (`context-budget.md:64-65`, `:67`).
   If it works, the core plugin cuts them with no `claudetto-setup` run.
   The static `deny` rules stay as the fallback (`p5a-tools.md`).
4. `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` is 8 by default.
   Each block of the goal check is one more model turn.
   A cap of 3 would bound the cost of a wrong check.
   `p1-env-vars.md:63` keeps the default, so the owner of that file decides.
5. `dry` with `disable-model-invocation: true` saves its listing line, near 43 tokens in each session (estimate).
   It also stops Claude from calling the skill by itself.
   The user decides.
6. A fork of `docs` and `browse` into a `haiku` or `sonnet` agent (`context: fork`, `agent:`, `background: false`) keeps page and doc output out of the main context.
   It adds a request with a cold cache, and A8 shows that extra turns can cancel a saving.
   Whether `allowed-tools` of the skill applies inside the fork is not in the docs.
   A paired eval decides it, and it is a paid run.
7. `PreModelSwitch` as a cost gate: the threshold of $0.10 is a guess.
   Check that `estimated_cache_write_usd` is present for every provider (`hooks/events.md:556`).
   A timeout blocks the switch (`hooks/configuration.md:95`), so the test must cover a slow hook.
   If `handoff` stays after the comparison, its `PreModelSwitch` hook may need to stay too, in the exec form.
8. `renames` for `claudetto-sessions`: the entry `"claudetto-lab"` installs the lab for users of the sessions plugin.
   The value `null` only removes it.
   The user picks one.
9. `/skill-doctor` needs feature-flag fetching (`skills-and-commands/slash-commands.md:81`).
   It may be absent when the traffic switches are set.
   `p1-env-vars.md:93` covers the same probe.
10. Whether `claude plugin details` counts the agent list and the skill listing the same way as `/context`.
    A lab test should compare the two on the checkout, with no model call.
