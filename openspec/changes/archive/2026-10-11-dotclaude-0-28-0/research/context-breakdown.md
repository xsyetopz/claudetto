# Context breakdown of the first request, Claude Code 2.1.293

Labels: **confirmed** = read in the 2.1.293 bundle (`external/cc-2.1.293/strings.txt`, byte offset) or in a local transcript.
**inferred** = my reasoning.
**not sized** = I did not measure it.
Token estimate = characters / 4 (the real ratio may be nearer 3.2 for JSON and code).

## Answer in short

- Local transcripts do **not** show growth.
  The first request of 2.1.293 is 19,702 tokens (11,956 created + 7,744 read), session `157f1ff7`, cwd of this repo, dotclaude profile on (**confirmed**).
  The 2.1.292 session `087f5a37` is 23,340 tokens, of which about 3K is the user paste (**confirmed**).
  The bundle has the same section ids and the same attachment types in 2.1.292 and 2.1.293 (**confirmed**, diff of both `strings` outputs).
- A 30K+ start is reproduced only when the profile is not applied.
  Session `3dee021f` (2.1.292, before setup wrote the profile) started at 40,721 tokens (**confirmed**).
  Its skill listing was 15,935 chars (bundled skills) and the Artifact tools were loaded (**confirmed** from `deferred_tools_delta`).
  Candidate causes of 30K+ in the user's own session: a window where `settings.json` is not read (other `CLAUDE_CONFIG_DIR`, desktop app, IDE), a project with MCP servers, or a larger `CLAUDE.md` (**inferred**).
- New in 2.1.293 that can add text: the `heron_brook` section now can carry about 3.2K chars of "early stopping guidance", but only on Haiku 5.5 (**confirmed**, see below).
  It is not active on Opus 5.5.
  New env names: `CLAUDE_CODE_ARTIFACT_MCP`, `CLAUDE_CODE_COLD_COMPACT`, `CLAUDE_CODE_DESKTOP_SKILL_SWITCHES`, `CLAUDE_CODE_SYNC_PLUGINS`, `CLAUDE_CODE_EXPERIMENTAL_OBSERVER_AGENTS` (**confirmed**, diff of env names).
- claude.ai skill sync appeared on this machine on 2026-10-07 18:52 (mtime of `~/.claude/skills/synced/`), after the 2.1.292 measure and before 2.1.293 (**confirmed**).
  The 292 `/context` at 16:05 already listed 9 "claude.ai sync" skills, so the sync is not the 293 change.
- `/context` under-reports.
  It showed 10.7K total at 2.1.292 (system 1.9K, tools 4.4K, agents 486, memory 1.2K, skills 2.8K).
  The billed first request was 19.7K to 23.3K.
  Text I can size from the transcript is about 8.1K tokens (attachments 6.7K + system blocks 1.35K).
  Tools at about 4.4K leave 5K to 7K tokens unexplained (**inferred**: tokenizer ratio, tool JSON wrappers, billing header).
  I could not close this gap without a wire capture.

## Table: parts of the first request (this machine, 2.1.293, dotclaude profile)

| Part | Chars | Est. tokens | Gate | Cheapest switch | Evidence |
| --- | ---: | ---: | --- | --- | --- |
| Loaded tool definitions (Read, Edit, Write, Glob, Grep, Bash, Agent, Skill, AskUserQuestion, ToolSearch, Task*) | not sized per tool | 4.4K by `/context` (**confirmed**) | `shouldDefer` not set; deferral by ToolSearch | `permissions.deny` of a bare tool name removes it (prior **capture**); `ENABLE_TOOL_SEARCH`; `tool.describe` mod | `xHe` at offset 20544270; transcript `/context` |
| `sandbox_instructions` attachment | 6,118 | 1,530 | `sandbox.enabled` true; text includes the filesystem and network lists of the settings | `sandbox.enabled:false` (loses the sandbox); shorter deny and allow lists; `prompt.attachment` mod returns `{text:null}` | builder near offset 24363031; transcript |
| `skill_listing` | 8,299 | 2,075 | cap `skillListingBudgetFraction` x window x 4 = 12,000 chars at 300K; per skill `skillListingMaxDescChars` 1536 | `syncClaudeAiSkills:false` (removes 9 synced skills, 5.7K chars); `skillOverrides` `name-only`; lower `skillListingBudgetFraction`; `disableBundledSkills` (already set) | offsets 13557252, 22852491; transcript |
| `output_style_instructions` (dotclaude style) | 4,317 | 1,080 | `force-for-plugin` style | Own text; shrink the style file (bound `STYLE_MAX_BYTES`) | transcript |
| System prompt blocks (`lean_body`, pronouns, action_caution, session_guidance, env, context_management, act_dont_rederive, endconv hint, total_tokens, WebSearch note) | 5,406 | 1,350 | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` already on | `prompt.section` per id (blocked by `sec-default`) | snapshot in transcript; section list at offset 22843580 |
| `agent_listing_delta` | 2,880 | 720 | listing of built-in and plugin agents | `permissions.deny` `Agent(name)`; `agent.offer` mod; `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` already on | transcript |
| `instructions` (CLAUDE.md) | 3,049 | 760 | project file | `CLAUDE_CODE_DISABLE_CLAUDE_MDS` or shorten the file | transcript |
| `session_context` (email, git status, 5 commits) | 988 | 250 | always | no switch found for the git status block (`includeGitInstructions` / `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` is read at offset 21535917 and governs the git section of the Bash prompt, not this block); `prompt.attachment` mod on `session_context` (**inferred**) | transcript |
| `deferred_tools_delta` (17 names) | 204 | 51 | ToolSearch on | `ENABLE_TOOL_SEARCH` | transcript |
| `environment`, `model`, `auto_mode`, `total_tokens_reminder`, `date`, `credential_org`, `remote_session_change` | 1,000 | 250 | always | `prompt.attachment` mod; `CLAUDE_CODE_DISABLE_ATTACHMENTS` (also drops others, **inferred**) | transcript |
| `mcp_instructions_delta`, `mcp_dropped_tools_delta`, `proactivity`, `attention_budget`, `language` | 0 here | 0 | MCP servers, `language`, proactivity flag | `ENABLE_CLAUDEAI_MCP_SERVERS=false`; do not set `language` | type set at offset 21038896; not present in transcript |
| Unexplained residual | - | 5K to 7K | - | not sized | inferred |

## Section ids of the system prompt (2.1.293, same list in 2.1.292)

Confirmed at offset 22843580.
Shared block, full prompt only: `intro`, `system`, `doing_tasks`, `actions`, `tools`, `tone`.
Simple prompt replaces them with `lean_body`.
Rough full-prompt sizes from line lengths (**inferred**): `doing_tasks` 4K chars, `actions` 5.5K, `tools` about 4K, `tone` 0.6K, `intro` 0.9K.
That is about 4K tokens, which `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1` removes.

Session block, in order, with gate (**confirmed** unless marked):

| Id | Gate |
| --- | --- |
| `communication` | model and `turn_updates`; full text about 4K chars, one line in simple mode |
| `pronouns`, `action_caution`, `task_continuity` | model checks (`YOn`) |
| `fable_identity` | only model `claude-fable-5-1` or Fable 5 |
| `tool_param_json` | flag `tengu_silent_harbor` |
| `session_guidance` | always |
| `memory` | auto memory on (user: off) |
| `env_info_simple` | always |
| `bg-session`, `brief`, `focus_mode` | feature checks; not seen in the snapshot |
| `context_management` | always (dotclaude replaces it, but `sec-default` skips the hook) |
| `act_dont_rederive` | flag `tengu_cedar_lantern` default true, env `CLAUDE_CODE_ACT_DONT_REDERIVE` |
| `delivering_work_max`, `overcorrection`, `subagent_steer_delegation` | model and flag checks; not seen |
| `opus5_reduced_delegation` | Opus 5, flag `tengu_slate_bittern` |
| `heron_brook` | text of GrowthBook string `tengu_heron_brook` if set, else Haiku 5.5 guidance (flag `tengu_idempotent_wolf`, new in 2.1.293), about 3.2K chars |
| `brook_heron`, `willow_tern`, `autonomy_append`, `endconv_deferred_hint` | effort, model, autonomy, EndConversation tool |
| `total_tokens`, `user_pays`, `repl_working`, `bash_call_cost` | `total_tokens` null when `CLAUDE_CODE_DISABLE_ATTACHMENTS` or `CLAUDE_CODE_SIMPLE` |

## claude.ai synced skills (this machine)

Nine skills in `~/.claude/skills/synced/<org>_<id>/`.
Listing entries are 21 to 1,027 chars (`docs` 1,027, `computer-use` 965, `docx` 957, `built-in-browser` 852).
Total about 5.7K chars (1.4K tokens) in the listing.
Switch: setting `syncClaudeAiSkills: false` in user or managed settings (**confirmed**, offset 13555300).
It also hides existing synced skills at the next session and moves them to `~/.claude/skills/.trash`.
`syncClaudeAiPlugins: false` does the same for plugins (no synced plugin on this machine).
Env `CLAUDE_CODE_SYNC_SKILLS` exists (offset 6922679), and its semantics are not sized.

## Tool deferral (confirmed, offset 20544270 and 17131903)

- `ENABLE_TOOL_SEARCH` values: `true`/`force`, `false`, `auto`, `auto:N` (N in 0..100).
  Default mode is deferred ("tst") on first-party hosts.
  A non-first-party `ANTHROPIC_BASE_URL` disables it unless the variable is set.
- A tool is deferred when `shouldDefer` is true, when it is an MCP tool, or when a GrowthBook list (`tengu_quirky_kazoo`) names it.
  `alwaysLoad:true` and the list `tengu_non_deferrable_builtins` keep a tool loaded.
- Deferred on this machine: CronCreate/Delete/List, DesignSync, EndConversation, EnterPlanMode, EnterWorktree, ExitPlanMode, ExitWorktree, Monitor, NotebookEdit, PushNotification, RemoteTrigger, SendMessage, TaskStop, WebFetch, WebSearch (17 names, 204 chars).
  `/context` counts them at 16.9K tokens, but only the names are sent (prior **capture**).
- Largest loaded descriptions when not removed (prior **capture**, bytes): Artifact 34,037, SendFeedback 5,508, Workflow 5,355, AskUserQuestion 4,897, ScheduleWakeup 4,631, Agent 3,049, Bash 2,237, ReportFindings 2,177.
  The profile already removes Artifact, Workflow, ScheduleWakeup, ReportFindings.
  SendFeedback: not sized in this profile (`DISABLE_FEEDBACK_COMMAND` is set, effect on the tool not checked).
- Task tools (TaskCreate, TaskUpdate, TaskList, TaskGet): bundle strings of about 2.1K, 2.2K, 0.9K, 0.7K chars (offsets 29034364 to 29047175, **inferred** that they are loaded).
  Switch: deny each by name.

## Built-in parts

- Built-in plugins in the bundle (`cc-plugin-*`, same list in 292 and 293): `agents-md`, `claude-test`, `diff`, `mermaid`, `mods-guide`, `plugin-authoring`, `responsive-mode`, `sec-default`, `telemetry`, `tips`, `you-should-know`.
  Only `plugin-authoring` (one skill, 247 chars) shows in the listing here.
  Switch: `enabledPlugins["cc-plugin-<name>@builtin"]: false` (design D2; not tested by me).
- Built-in agents listed: `claude` (132 chars), `claude-code-guide` (1,066 chars, the largest agent line), `statusline-setup` (111).
  Switch: `Agent(claude-code-guide)` in `permissions.deny` or an `agent.offer` handler (**inferred**, not tested).
- Built-in MCP servers (computer-use, Chrome, built-in browser): no tool or instruction appears in this session.
  Only the synced skills about them appear.

## What dotclaude can remove (this profile, estimated)

| Cut | Tokens | Risk |
| --- | ---: | --- |
| `sandbox_instructions` via `prompt.attachment` (keeps sandbox itself) | 1,530 | Claude loses sandbox hints |
| `syncClaudeAiSkills:false` | 1,400 | loses claude.ai skills |
| Trim `claude-code-guide` listing (`agent.offer` or deny) | 270 | none |
| Deny Task* tools | about 1,500 (**inferred**) | loses task list |
| Shrink output style | up to 1,000 | rules lost |
| `skillOverrides` `name-only`, `user-invocable-only` (hides from the model) or `off` per skill (**confirmed**, offset 13567091) | about 800 | model sees less |
| Lower `skillListingBudgetFraction` | cap only | none |

Total removable by dotclaude: about 5K to 6.5K tokens out of 19.7K, without the unexplained residual.
