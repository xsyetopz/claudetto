# Setup Requirements

## Tool Deferral

- [ ] **REQ-SETUP-001** claudetto shall defer Read, Write, and Skill by `tool.describe` `isDeferred`, keep Agent and Bash sent, and not defer Edit or ListAgents.
  Acceptance: each deferred tool is called by name and the engine runs it; the verdict per tool matches the paid runs (sonnet-5-5). Verification: probe.
  Basis: measured, claude 2.1.318, paid, 7 runs $0.5911 (total $11.59). Defer with no loss and fewer tokens: Read, Write, Skill (saving is schema bytes). Defer costs more: Edit (+2 turns, +31K tokens: 83,356 against 51,884) and ListAgents (+514 tokens). Must stay sent: Agent (task lost, "the Agent tool wasn't loaded") and Bash (a subagent detour first). A Mod-deferred tool is absent from the deferred list, so only a model that knows the name finds it. Status: partial at 088a227c (`DEFERRED_TOOLS = ["Skill"]`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2850; plugins/claudetto/hooks/features/surface/surface.ts:10@088a227c.
  Conflict: Tool Text Keeps the Shorter Text.

## Prompt Commands And Local Commands

- [ ] **REQ-SETUP-002** claudetto shall remove the 18 prompt skills (`OFF_SKILLS`) from the listing through a `settings.read` hook that sets `skillOverrides[name]="off"` when no source is given, unless one of `.claude/skills`, `.claude/commands`, `<config>/skills`, `<config>/commands` holds the name (config = `CLAUDE_CONFIG_DIR` or `$HOME/.claude`); the user's own `/name`, own entry, and a skill the user or project holds stay. The hook runs 4 `$fs.list` calls in parallel, treats an unlistable folder as empty, uses no `$.session.cwd()` and no process, and stays fast because the engine does not wait for `settings.read` before request 1. It ships only together with the Workflow deny.
  Acceptance: the listing holds 2 entries (loop 345, init 148), 493 bytes against stock 13 entries 6,183 bytes; a user `/name` prints 'Skill "<name>" is disabled via skillOverrides'; a call to an off skill is refused with 0 requests; with `workflow-authoring` off the Workflow tool inlines the skill's reference (3,503); hooks of 38.7 ms or less won 47/47, 66.7-90.6 ms lost 10/11. Verification: probe.
  Basis: measured, claude 2.1.318. A Mod `command.run { text }` blocks the user's `/name` (0 requests) but does not see the model's Skill call; a `tool.call` Skill guard returning `{ deny }` blocks that. The `settings.read` hook returns `{ ...r, value: {...s, skillOverrides} }` (`next(e)` resolves to `{ value: settings }`). `OFF_SKILLS` duplicates `disableBundledSkills`. Status: have at 088a227c (`withSkillOverrides`, plugins/claudetto/hooks/features/surface/surface.ts:44-58; `surface.ts:19`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2906; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3372; openspec/changes/archive/2026-11-09-release-2-1-319/builtins-inventory.md:20; openspec/changes/archive/2026-11-09-release-2-1-319/specs/surface-trim/spec.md:43; openspec/specs/surface-trim/spec.md:280; plugins/claudetto/hooks/features/surface/surface.ts:44@088a227c; plugins/claudetto/hooks/features/surface/surface.ts:19@088a227c.

- [ ] **REQ-SETUP-003** claudetto shall answer each of 27 local commands with `/<name> is off in claudetto.` through `command.run` (0 requests) and hide it with `command.describe` `isHidden: true`; `/restart` and `/loop` are not claudetto's and `/loop` stays off.
  Acceptance: each blocked command makes 0 requests; `/help` Commands tab shows 60 names against stock 80 (20 gone; 7 others are absent from stock `/help`; a count of 80-27=53 does not match, the figure counts differently); `/stick` typeahead matches nothing, but an exact full name still shows its row (26 of 27). The saving is UI rows, not tokens. Verification: probe.
  Basis: measured, claude 2.1.318. Status: have at 088a227c (`OFF_COMMANDS` with `command.run` and `command.describe` hooks, plugins/claudetto/hooks/features/surface/surface.ts:113-120, `isHidden: true` at :119; the count 27 was not re-checked; `isHidden` appears in setup.mock.ts and surface.test.ts). In 2.1.326 the hook names `command.run` and `command.describe` exist (chunk-dafpvz32.js@4169 (2.1.327)); `$.command.run` is verified on 2.1.327 (claude-code.d.ts@156319; the `command.run` event @229024 fires for a slash command or a plugin call to `$.command.run`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2938; openspec/specs/surface-trim/spec.md:183; plugins/claudetto/hooks/features/surface/surface.ts:113@088a227c; plugins/claudetto/hooks/features/surface/surface.ts:119@088a227c.

- [ ] **REQ-SETUP-004** claudetto shall answer a bare `/statusline` from a Mod `skill.prompt` text of 323 chars, so no subagent run starts.
  Acceptance: bare `/statusline` takes 32 ms and 0 tokens (file route 3.99 s and 55,376 tokens); no `statusline-setup` Agent call is made, since with `amod` withholding `statusline-setup` the baseline pass-through gives "Agent type 'statusline-setup' not found". Verification: probe.
  Basis: measured, claude 2.1.318. The stock text is 90 chars and its first subagent request alone is 20,234 bytes. Status: partial at 088a227c (`STATUSLINE_DESCRIPTION` and `statuslineEdit` in the setup feature; no `/statusline` override found in the surface feature). The hook name `skill.prompt` exists in 2.1.326 (chunk-dafpvz32.js@4253 (2.1.327)).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2966; plugins/claudetto/hooks/features/setup/setup.ts:38@088a227c.

- [ ] **REQ-SETUP-005** claudetto shall replace the `/init` text with a shorter Mod `skill.prompt` that names `mcp__claudetto__ask`.
  Acceptance: text 1,592 to 1,144 chars (-448); request 51,039 to 50,571 bytes; `INTERVIEW_TEXT` names `mcp__claudetto__ask`, because the AskUserQuestion guard denies the stock name. Verification: probe.
  Basis: measured, claude 2.1.318; paid total $11.63. Status: partial at 088a227c (`INTERVIEW_TEXT` replaces `init` in `surface.ts:98-101`; whether it names the `ask` tool was not re-checked).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:2996; plugins/claudetto/hooks/features/surface/surface.ts:98@088a227c.

## Settings Values

- [ ] **REQ-SETUP-006** claudetto shall set `maxEffortLevel` "high" and model settings of opus-5-5 `effortLevel` high, sonnet-5-5 medium, haiku-5-5 medium with `maxEffortLevel` medium.
  Acceptance: the written settings hold those values; the lowest cap across files wins. Verification: inspection.
  Basis: cited. `effortLevel` accepts low, medium, high, xhigh; `maxEffortLevel` also max. The source gives this as a proposal; no user decision on the values is stated. Status: partial at 088a227c (`settings.ts:111-115` sets `maxEffortLevel` high for opus, medium for sonnet, high for haiku; `effortLevel: "medium"`; no top-level cap).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:778; plugins/claudetto/hooks/features/setup/settings.ts:111@088a227c.
  Conflict: Setup Groups, "Models and windows" group.

- [ ] **REQ-SETUP-007** claudetto shall leave `totalTokensReminder`, `totalTokensReminderBudget`, `breakReminder`, `quietHours`, and `policyHelpers` unset, and shall write `totalTokensReminder` "off" if it writes the reminder at all.
  Acceptance: no such key in the written settings, or `totalTokensReminder` "off". Verification: inspection.
  Basis: cited. `totalTokensReminder` takes off, infinite, fixed, countdown, padded-countdown (default padded-countdown with the capability, else off); `totalTokensReminderBudget` is an integer, unset; `totalTokensReminderAfterUserTurn` false is valid; `breakReminder` is opt-in, unset or `{"enabled": false}`. Status: missing at 088a227c (no match for these keys under plugins).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:793.

- [ ] **REQ-SETUP-008** claudetto shall set `showClearContextOnPlanAccept` true and leave `plansDirectory`, `bashEditDiffEnabled`, `respondToBashCommands`, `askUserQuestionTimeout`, and `dialogExpiry` unset.
  Acceptance: the written settings hold `showClearContextOnPlanAccept: true` and none of the five other keys. Verification: inspection.
  Basis: cited, by the user's rule that a default-off feature stays unset; the defaults are in section 3. Status: partial at 088a227c (`settings.ts:172` sets `showClearContextOnPlanAccept: true`; the five keys appear nowhere in plugins).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:732; plugins/claudetto/hooks/features/setup/settings.ts:172@088a227c.

## Subagent Cap

- [ ] **REQ-SETUP-009** claudetto shall set the subagent cap by tier, read from `oauthAccount`: Pro 3, Max 4, Ultra none, unknown tier none.
  Acceptance: `hooks/setup/settings.test.ts`: a login of {"organizationRateLimitTier":"default_claude_max_5x"} caps subagents at 4; no login record writes no cap. The baseline rows were 3, 4, 5. Verification: test.
  Basis: read. Status: missing at 088a227c (git grep subagentCap: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:402.

## Builtin Disable

- [ ] **REQ-SETUP-010** claudetto shall keep the builtin ids that the supported Claude Code build registers in one constant (13 on 2.1.327; 14 on 2.1.325 and 2.1.326, which also registered `cc-plugin-claude-test`), and diff it against the registration list on each Claude Code release.
  Acceptance: one constant holds the ids; a release check fails when the registration list differs from it. Verification: test.
  Basis: cited. Status: partial at 088a227c (one constant of 11 ids, `plugins/claudetto/hooks/features/setup/settings.ts:64`).
  Source: plugins/claudetto/hooks/features/setup/settings.ts:64@088a227c; chunk-dafpvz32.js@80491 (2.1.327; first read in claude 2.1.326 binary: the builtin registry `builtinPlugins`, ids `<name>@builtin`, enabled from settings `enabledPlugins`; the 2.1.325 citation was chunk-yjs2ay06.js@72522, `yY()` registers 14); chunk-syz79m2z.js@450-1844 (2.1.327: 13 registrations, no `cc-plugin-claude-test`; see CTX-440).

- [ ] **REQ-SETUP-011** claudetto shall, at session start, read user settings and write `false` for any id in the REQ-SETUP-010 constant that is not `false`, then tell the user to run `/reload-plugins` (interactive) or restart (headless).
  Acceptance: after a drift, user settings hold `false` for every id in the constant and the user sees the notice; a launch after the write loads no builtin. The ids include `cc-plugin-privacy@builtin`. Verification: probe.
  Basis: user decision, 2026-11-16; measured. Status: partial at 088a227c (settings.ts:63-77 `BUILTIN_PLUGINS_OFF` lists 11 ids and no `cc-plugin-privacy@builtin`; no session-start drift repair; `git grep -n privacy 088a227c -- plugins` finds no privacy id)
  Source: user decision, 2026-11-16; probe: cc-inspect `cli`, claude 2.1.325, a `tool.call` hook writes `<config-dir>/settings.json` before a `Skill plugin-authoring` call, 2026-11-16 (old plan); see [ADR-0057](../adr/0057-builtin-disable-in-user-settings.md); user answer through AskUserQuestion, 2026-11-16 18:04 UTC, all 14 builtins off, perl allowed with a diff hook, settings rewritten (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5034); probe, `claude` 2.1.325, 2026-11-16, cc-inspect `cli` `--settings` with all 14 ids `false` gave `[]` (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5290); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352).

- [ ] **REQ-SETUP-012** claudetto shall write the version floor with `requiredMinimumVersion`, not `minimumVersion`.
  Acceptance: an older Claude Code exits at startup with the floor set. Verification: probe.
  Basis: measured. Status: missing at 088a227c (`git grep -n requiredMinimumVersion 088a227c -- plugins` finds none; settings.ts:146 writes `minimumVersion: MINIMUM_VERSION`)
  Source: observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807), `chunk-gywtf5sd.js:281772` (claude 2.1.325 binary; the module is gone from 2.1.327). Corrected on 2.1.327: `requiredMinimumVersion` is in the settings schema (chunk-ja5z738t.js@285180: "Minimum Claude Code version required to start ... exits at startup ... Only enforced from managed (policy) settings") and the startup check reads it from `policySettings` only (chunk-4dxjsc3b.js@565 and @1300, VERSION 2.1.327), so a floor in user or project settings does not stop an older Claude Code; `minimumVersion` is a separate key that only prevents downgrades when switching to the stable channel (chunk-ja5z738t.js@285180).

## Tool Notices

- [ ] **REQ-SETUP-013** claudetto shall log startup notices with `$.ui.log` only, never to the model: a `claude update` line when the base version is below `minimumVersion` (numeric compare); one line per missing tool with its install command and `/claudetto:setup` (required tool: every start until installed; optional tool: once, then quiet); a disk line when the project volume is over 80% (81 logs, 80 does not) with free GiB and `! mo clean --dry-run`, `! mo purge --dry-run`. A missing required tool stops setup with an error naming the install step; `betterleaks` is required (`brew install betterleaks`). A No for an optional tool is recorded; a No for a required tool records nothing and names the command to run.
  Acceptance: a start with a required tool missing shows its notice each time; a start after an optional tool's notice shows none; a volume at 81% logs the line and one at 80% does not. Verification: test.
  Basis: measured; cited. Status: partial at 088a227c (hooks/features/setup/tools.ts; a missing required tool stops setup with an error; the once-only rule and the No records are not in the baseline; the disk line was not re-read).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/setup/spec.md:101; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/setup/spec.md:128; openspec/specs/setup/spec.md:124; openspec/specs/setup/spec.md:92; openspec/specs/secret-matcher/spec.md:33.

## Setup Advice

- [ ] **REQ-SETUP-014** claudetto shall ask the setup questions as one question at a time (one popup each), each with a recommended answer, look up what the environment can answer, tell the model the user's own context and ask what matters for them, give its own view of what matters and what is marketing, say when it is unsure, stop on confirmed shared understanding, end a rough task with "ask me any questions you need", and add no up-front question round.
  Acceptance: the setup advice prompt names the four parts (one question, a recommendation, an environment lookup, a stop on shared understanding) and the three asks (own view of what matters, what is marketing, say when unsure); no round of questions comes before the first question; each popup shows one question and one recommendation. Untested against live Haiku; style of `grill-me`. Verification: inspection; demonstration.
  Basis: reported, community. Status: partial at 088a227c (SETUP_ADVICE exists in plugins/claudetto/hooks/features/setup/text.ts:4; its four-part shape and the text of the three asks were not compared word by word; the popup behavior is missing).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:143 (a community tip: asked "which is better, A or B" a model gives a generic answer; given the user's own context and asked what matters, what is marketing, and to say when unsure, it gives a useful one); openspec/changes/archive/2026-11-10-release-2-1-319-1/design.md:144 (source thread r/ClaudeAI 1xrtmvs; Matt Pocock's grill-me skill, github.com/mattpocock/skills and re-cinq.com/blog/grill-me-skill; the blog was fetched, the skill text is not quoted); plugins/claudetto/hooks/features/setup/text.ts:4@088a227c.
  Conflict: Setup Speed.

## Config Sync

- [ ] **REQ-SETUP-015** claudetto shall, when it syncs a config pin, write into an isolated `CLAUDE_CONFIG_DIR` by default and write in place only on an explicit opt-in, and shall report plugin version changes after an update, with plugins pinned by version and reinstalled through `claude plugin install`.
  Acceptance: a default sync leaves the existing config dir unchanged; an update that moves a plugin version is listed as "plugin X old to new". Verification: test.
  Basis: reported (design of another tool, hlock). Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:46; external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:47; external/2026-10-22/reddit.com-r-claudecode-comments-1xbrfzp-i-got-tired-of-syncing-up-my-c-20261022T005207Z.md:48 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xbrfzp/i_got_tired_of_syncing_up_my_custom_claude_code/>).

## Features-Off Settings

- [ ] **REQ-SETUP-016** claudetto shall write `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` so that text between tool calls holds a finding, result, or error, because the server text asks the model to say in a few words what it is doing, which draws narration; claudetto's text asks one sentence about a finding or result and "Say nothing about your next call"; the output style drops "the next action".
  Acceptance: the setup features-off group writes the key to that custom text; which of `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"` (a disabling group) and the text wins is checked; the effect is claimed as none. Verification: inspection; probe.
  Basis: measured. The effect is not significant: 24/204 vs 31/204 announced, p=0.385; an earlier run 13/136 vs 23/136, p=0.106; keep it as a cheap setting. The harness reads the reminder from env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, then server flag `tengu_hushed_lark_text`, then the default text; a settings `env` value replaces the text on the tool result (probe-130). Claude 2.1.327 registers four env names: `CLAUDE_CODE_SILENT_TURN_REMINDER` (tri-state), `_SECONDS` (int, min 1), `_TEXT` (string) and `_TURNS` (int, min 1) (chunk-2ew0jg68.js@18065, @18105, @18153, @18198; cc-inspect `surface env`, 2026-11-18); the gates `tengu_hushed_lark` and `tengu_hushed_lark_text` and the turns gate are verified on 2.1.327: chunk-m14bt1pz.js@3985607 reads env `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, then `tengu_hushed_lark_text`, then the default; @3986208 reads env `CLAUDE_CODE_SILENT_TURN_REMINDER_TURNS`, then `tengu_hushed_lark`. Status: have at 088a227c (`settings.ts:188`, `settings.ts:202`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/design.md:388; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:285; openspec/specs/surface-trim/spec.md:337; plugins/claudetto/hooks/features/setup/settings.ts:202@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:188@088a227c.
  Conflict: Setup Contract.

## Tool Texts

- [ ] **REQ-SETUP-017** claudetto shall name six file-reading commands in the Bash description and hand off a ready `Read` call on denial.
  Acceptance: the Bash description names `cat`, `head`, `tail`, `sed`, `awk`, and `echo` in backticks and says files go through Read, Edit, Write, and the search tools unless the user asks for shell, so the gate need not refuse; a denial carries a ready `Read` call with offset and limit. Agents repeated `sed -n`, `cat`, `head`, and `tail` about 360 times a day after a denial, one model call each. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/command-rules.ts`).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:115; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:562.

## Permission Prompts

- [ ] **REQ-SETUP-018** claudetto shall split permission prompts by what can be undone.
  Acceptance: free: edits inside the repo on a branch or worktree, with reads auto-approved; ask only for irreversible or outside-repo actions; hard deny for secrets and writes outside the project; an ask budget bounds the prompts. Other setups the source names: separate OS user, VM or VPS, devcontainer, no remote write credentials. Without the split, users get approval fatigue (prompts stop protecting after about 1 hour of clicking) or auto mode fails closed. Verification: inspection.
  Basis: reported (one user built about 20 PreToolUse checks behind a single bash shim; convergent). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/auto-mode.ts`, `command-rules.ts`).
  Source: external/2026-09-29_p2/export-Recent rampant classification failiures.jsonl:16; openspec/specs/agent-conduct/spec.md:105.

## Tool Text Keeps The Shorter Text

- [ ] **REQ-SETUP-019** claudetto shall ship its `tool.describe` text for each `TOOL_TEXTS` and `DEFERRED_TOOLS` entry only while it is shorter than the stock text (Agent is the exception: it names claudetto agents), and shall keep `ListAgents`, Read, and Write undeferred. Rarely used tools load through ToolSearch only when ToolSearch is listed.
  Acceptance: a check holds the stock length per overridden tool and fails when ours is not shorter; with `ListAgents` deferred the model said it had no tool (reach 0/8 against 8/8, p=0.0002); 8/8 after the fix. Verification: test.
  Basis: measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/surface/surface.ts`, `surface/texts.ts`).
  Source: openspec/specs/surface-trim/spec.md:99; openspec/specs/surface-trim/spec.md:103; openspec/specs/surface-trim/spec.md:271; plugins/claudetto/hooks/features/surface/surface.ts@088a227c.
  Conflict: Tool Deferral.

## Worktree Base And Sharing

- [ ] **REQ-SETUP-020** claudetto shall write `worktree.baseRef: "head"` when unset, so EnterWorktree and `isolation: worktree` start at the current branch tip (the default `fresh` branches from origin/<default>, so an agent worktree lacks branch-only work), and shall offer `worktree.symlinkDirectories` for git-ignored dependency folders at the project root with names WITHOUT a trailing slash in the `.gitignore` block, because `node_modules/` misses a symlink and `git add -A` stages it.
  Acceptance: a setup write holds `worktree.baseRef: "head"`; the ignore block holds `node_modules` and no `node_modules/`. Guards: explicit paths never `-A`, `git ls-files | grep -E '^(node_modules|data)$'` empty, a pre-commit abort on mode 120000, `git check-ignore -v`. Verification: test.
  Basis: reported (a loss of a real 10 GB folder on merge). Status: have at 088a227c (`baseRef`, `symlinkDirectories`); the symlink-staging guard is missing.
  Source: openspec/specs/setup/spec.md:274; external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:8; external/2026-10-23/reddit.com-r-claudecode-comments-1xcenuk-psa-if-your-worktrees-symlink-20261022T122613Z.md:59 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xcenuk/psa_if_your_worktrees_symlink_node_modules_the/>); plugins/claudetto/hooks/features/setup/settings.ts:130@088a227c; plugins/claudetto/hooks/features/setup/changes.ts:13@088a227c.

## Cross-Session Messaging

- [ ] **REQ-SETUP-021** claudetto shall set `crossSessionInbound` and teach one session as authoritative and others as workers with distinct roles; the default `hold` parks a peer message as untrusted (a worker task is rejected like a prompt injection), `accept` delivers; a safer pattern routes replies through the user.
  Acceptance: a setup write holds the `crossSessionInbound` value the user chose. Verification: test.
  Basis: reported. Status: have at 088a227c.
  Source: external/2026-10-03/export-Anyone else’s Claude Code agents fight each other-.jsonl:4 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wwqhy1/anyone_elses_claude_code_agents_fight_each_other/>); plugins/claudetto/hooks/features/setup/settings.ts:174@088a227c.

## Settings Never Written

- [ ] **REQ-SETUP-022** claudetto shall never write `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, `disableCommandPluginSources` (a key that stops its own hooks, skills, or sideloaded folder), nor any key that removes /login, /logout, /doctor, or the updater, and shall never `permissions.deny` a tool whose removal raises the request: removing ToolSearch adds 37,936 chars, Skill 8,720, and Bash saves 407 but takes the shell away. A shortened prompt piece that changes behavior on the task set is reverted and the run recorded.
  Acceptance: a setup test asserts none of these keys is written and fails when ToolSearch is in `permissions.deny`, naming +37,936. Verification: test.
  Basis: measured (claude 2.1.317); corrected on 2.1.327 by a fake-API request probe (`-p` mode, temp project, bytes; baseline 47,323): deny ToolSearch +28,025 (was +37,936), deny Skill +8,855 (was +8,720), deny Bash -594 (was -407), deny Workflow, ScheduleWakeup and ReportFindings -12,823; `disableSideloadFlags` is present (chunk-ja5z738t.js@263136). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`); missing as a test at 088a227c; no git grep for `disableSideloadFlags` or the +37,936 figure was run in plugins/.
  Source: openspec/specs/surface-trim/spec.md:51; openspec/specs/surface-trim/spec.md:8; openspec/specs/surface-trim/spec.md:31; openspec/specs/surface-trim/spec.md:80; openspec/changes/archive/2026-11-09-release-2-1-319/specs/surface-trim/spec.md:9.

## Setup Contract

- [ ] **REQ-SETUP-023** claudetto shall run setup inside Claude Code with no checkout, bun, or just; ask per group (Smaller prompt, Auto mode, Models and windows, Worktrees, Features off, Status line); write no key of a discarded group; leave existing user values (value shown beside the existing one, replaced only on "Replace mine too"); write nothing when the dialog is dismissed or under `claude -p`, and say so in the report; return `text` and not `context`; carry no value that states a fact of this repo; and make no percentage-of-plan-limit claim without a measurement. "Features off" writes `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` (the built-in advisor sends the whole transcript uncached) and `env.CLAUDE_CODE_SILENT_TURN_REMINDER=0`, removes an earlier-written `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT`, and keeps a person-written text, in fill and replace modes.
  Acceptance: a dismissed dialog writes nothing; returning `context` adds 48 chars to the first request (31,909 against 31,861) and `text` adds none. Verification: test.
  Basis: measured and reported. Status: have at 088a227c (`settings.ts:178` advisor, `settings.ts:188` silent turn reminder, `commands/setup.md`).
  Source: openspec/specs/setup/spec.md:161; openspec/specs/setup/spec.md:168; plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:188@088a227c.
  Conflict: Features-Off Settings.

## Sandbox Settles Shell Commands

- [ ] **REQ-SETUP-024** claudetto shall enable the built-in sandbox and write `sandbox.autoAllowBashIfSandboxed: true`, which approves sandboxed commands with no prompt and no classifier call, set `allowUnsandboxedCommands` true so a blocked command retries outside under the permission flow, and list no domains by hand. Setup text for sandbox refusals is dropped.
  Acceptance: a setup write holds `sandbox.enabled`, `autoAllowBashIfSandboxed: true`, and no hand-listed `allowedDomains`. Verification: test.
  The key is written because its default is not fixed: when unset it is the inverse of the server gate `bot_protected_tengu_compiled_pudding` (`autoAllowBashIfSandboxed ?? !gate`, chunk-1yrzf3wn.js@1116482), and the settings schema documents it as false. Unset, an account with the gate on gets a permission prompt for every sandboxed command.
  Basis: reported; default measured by code read of 2.1.327 (2026-11-18). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`).
  Source: openspec/specs/sandbox/spec.md:8; openspec/specs/sandbox/spec.md:80; openspec/specs/setup/spec.md:283; chunk-1yrzf3wn.js@1116482 and chunk-ja5z738t.js@138689 (claude 2.1.327); ADR-0188.

## Setup Groups

- [ ] **REQ-SETUP-025** claudetto shall write one setup group per setting a plugin cannot write (Smaller prompt `enabledPlugins` false list, `autoMode` `$defaults`-preserving lists, `sandbox.enabled`, `defaultMode` when missing, `promptCacheTtl`), ask once per missing env key (`CONTEXT7_API_KEY`, `TYPESAFE_API_KEY`), keep every user scalar through `fill`, and show each group's reason.
  Acceptance: a setup run on an empty and on a populated settings file writes each group, keeps each user scalar, and shows each group's `why`. Verification: test.
  Basis: read. Status: have at 088a227c (`settings.ts:93` `enabledPlugins`, `:101-102` `defaultMode` and `autoMode` with a `why`, `:117` `promptCacheTtl: "1h"`; `key.ts:24-25` the two env keys). Claude 2.1.327: the `promptCacheTtl` setting is present (chunk-ja5z738t.js@277237); `autoMode` is verified on 2.1.327 (chunk-ja5z738t.js@184717).
  Source: openspec/specs/setup/spec.md:207 ("Smaller prompt" group); plugins/claudetto/hooks/features/setup/settings.ts:93-117@088a227c; plugins/claudetto/hooks/features/setup/key.ts:24-25@088a227c. Not located: the setup decisions 8-9 text itself.
  Conflict: Auto Mode.

- [ ] **REQ-SETUP-026** claudetto shall write these setup groups: a starter memory file for a repo with none (kept if the file exists at write time); a bounded-command starter AGENTS.md; one marked ignore block, stable on rerun; Mole project paths; a Context7 key only in user-settings `env.CONTEXT7_API_KEY` (skip when present; write nothing for an empty answer, Skip or "I have no key"; the report never repeats the key); a TypeSafe key `env.TYPESAFE_API_KEY` offered after Context7 (the Decider reads only the environment). Settings groups keep the user's permission rules; Haiku explains each popup and recommends an answer; `/statusline` is described as making no model call.
  Acceptance: each group writes what it names and nothing else; a rerun leaves the files unchanged. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/setup/key.ts, hooks/features/setup/starter.ts).
  Source: openspec/specs/setup/spec.md:147; openspec/specs/decide/spec.md:10.

- [ ] **REQ-SETUP-027** claudetto shall write the env group: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`="1" (a depth-1 subagent loses `Agent`; no mod counts spawns); `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by plan (3 on Pro, 4 on Max, none on Ultra); `CLAUDE_CODE_DISABLE_CRON=1` (keeps `/loop` off because each fire resends the whole context, `/goal` on, polling through Monitor); `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`; `worktree.baseRef` head.
  Acceptance: each key is in the written settings for its plan. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/setup/settings.ts, hooks/features/setup/changes.ts).
  Source: openspec/specs/setup/spec.md:303; openspec/specs/setup/spec.md:276.

- [ ] **REQ-SETUP-028** claudetto shall never set `autoMode.classifyAllShell` true (it suspends every Bash allow rule and sends each command to the classifier) and keep calls off the classifier through narrow allow rules: refuse `Bash(*)` and `Bash(python*)`; ship `Bash(git status *)`, `Bash(git diff)`, `Bash(git log)`, `Bash(git show)`; keep the user's own list whole. Do not claim auto mode drops broad rules on entry (the permission-modes page does not state it). Lists replace the built-ins with no `$defaults` only on recorded approval (classifier request 140,281 to 63,413 chars). The "Auto mode" group has one hard rule (Data Exfiltration), 11 soft rules each with a `must name` slot, 7 allow and 4 trust entries; soft rules end with `Any Other Danger`, because the client names a blocked rule only when the server cites a `soft_deny` entry.
  Acceptance: `git diff --output=F HEAD~1`, `git log -1 --output=F` and `git show --output=F HEAD` exit 0 and write F, and `git status --output=F` exits 129; one classifier request carries `system[1]` of 140,015 chars on 2.1.314 and 141,962 on 2.1.317, against 46,084 for each of the first three requests. Verification: test.
  Basis: measured. Status: have at 088a227c (plugins/claudetto/hooks/features/setup/settings.test.ts asserts `classifyAllShell`).
  Source: openspec/specs/low-hitl/spec.md:69; openspec/specs/setup/spec.md:243.

- [ ] **REQ-SETUP-029** claudetto shall write a "Models and windows" group: `model` Opus 5.5 at `effortLevel` medium, `fallbackModel` Sonnet 5.5, `modelSettings` with a `maxEffortLevel` per model, `idleCompaction` false, the default-model env vars, and `autoCompactWindow` for Haiku 5.5 only; no top-level `autoCompactWindow` and no `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
  Acceptance: `modelSettings["claude-haiku-5-5"].autoCompactWindow` is 100000 and no other model has a window. Verification: test.
  Basis: measured. Status: have at 088a227c (hooks/features/setup/settings.ts; groups.test.ts:92).
  Source: openspec/specs/setup/spec.md:267; openspec/specs/setup/spec.md:272; openspec/specs/tier-profiles/spec.md:32.
  Conflict: Settings Values (first item).

## Shorter Tool Texts

- [ ] **REQ-SETUP-030** claudetto shall shorten the descriptions of Workflow (3,496 chars stock on 2.1.327), DesignSync, ScheduleWakeup, ReportFindings, Agent, Bash, and AskUserQuestion through `tool.describe`, and consider `skill.prompt` shortening of bundled skills (none built; each cut ships only on a measured check, ADR-0177).
  Acceptance: each listed tool carries a description of 200 chars or fewer in the first request. Verification: probe (`just prompt-bytes`).
  Basis: measured (12,823 bytes removed from a `-p` request, 2.1.327, cc-inspect `code cli`); the 200-char target is this plan's own design choice, inferred from that saving. Status: partial at 088a227c (`trim.ts:3-7` lists Workflow, ScheduleWakeup, DesignSync; the other texts are not cut there). In 2.1.327 the DesignSync tool is present (chunk-k1sz9xwz.js@1089); on 2.1.327 Workflow, ScheduleWakeup, ReportFindings, and DesignSync are in the tool list (chunk-1vttvse2.js), and denying Workflow, ScheduleWakeup and ReportFindings removes 12,823 bytes from a `-p` request.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:412 (Workflow, ScheduleWakeup, ReportFindings manuals); plugins/claudetto/hooks/features/surface/trim.ts:3-7@088a227c. History: the 22,331-char figure is the Workflow text after the 2.1.321 plugin grew it from 5,355 stock (CTX-060); the 2.1.327 stock description measures 3,496 characters (probe L, reports/2026-11-18-research/handover-probes/probe-l/workflow-description-2.1.327.txt).

## Setup-Written Permission Rules

- [ ] **REQ-SETUP-031** claudetto shall write `permissions.ask` for `Bash(git reset *)`, `Bash(git update-ref *)`, `Bash(git branch -f *)`, `Bash(git worktree remove *)`, and branch delete; `permissions.deny` for `Bash(pkill *)` and `Bash(killall *)`; `permissions.allow` for read-only commands (`git status`); keep each user rule (`Bash(ls)`); no mod judges a Bash command; read and write advice stays in Bash tool text.
  Acceptance: A setup run on a settings file holding `Bash(ls)` adds the rules and keeps `Bash(ls)`. Verification: test.
  Basis: reported (ADR-0125 records the replacement; the old gate is not in the baseline tree, so no gap against it can be measured). Status: have at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/command-rules.test.ts:6@088a227c; plugins/claudetto/hooks/features/setup/command-rules.ts@088a227c; [ADR-0125](../adr/0125-bash-gate-replaced-by-permission-rules.md).

## Setup Fallback When Hooks Do Not Run

- [ ] **REQ-SETUP-032** claudetto shall keep `/claudetto:setup` as a description-only command file plus an inline `UserPromptSubmit` hook in `hooks.json` that blocks it with "Setup did not run: claudetto plugin code is not running in this session. Restart Claude Code; if it still fails, reinstall claudetto."; a manifest test pins this. `$.command.register({name})` lists `/name` with no plugin prefix (name `^[a-zA-Z0-9_-]{1,64}$`; an unmatched `session.start` needs a matcher such as `{ isInteractive: [true, false] }`).
  Acceptance: With the module not serving, `/claudetto:setup` is blocked with the stated text. Verification: test.
  Basis: measured. Status: partial at 088a227c.
  Source: plugins/claudetto/hooks/hooks.json@088a227c (`UserPromptSubmit`); chunk-dafpvz32.js@3130 (claude 2.1.327: `command.register` present). Not located: the old-plan lines.

## Deny A Tool Name As A Size Lever

- [ ] **REQ-SETUP-033** claudetto shall deny eight tools by name in `permissions.deny`, which removes each definition from the request: Workflow, ScheduleWakeup, ReportFindings, CronCreate, CronDelete, CronList, EnterPlanMode, ExitPlanMode (on 2.1.311 denying the first three took the first request from 42,676 to 30,510 chars, 12,166 = three definitions; on 2.1.312 from 42,879 to 30,713). A deny of an absent tool is dropped unless the real login shows it; no mod answer removes a built-in tool and `settings.read` does not reach permission rules. The surface-trim purpose is CLI and TUI only: turn off claude.ai, web, mobile, cloud, and onboarding surfaces by setting, env, or deny by name. Built-in agents go off with `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`; the old `permissions.deny Agent(<name>)` is dropped by the 2.1.323 change.
  Acceptance: The first request lacks the eight tool definitions. Verification: probe.
  Basis: measured. Status: have at 088a227c. Claude 2.1.327: `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` is present (chunk-2ew0jg68.js@10909); on 2.1.327 the eight-tool deny removes 12,857 bytes from a `-p` request (fake-API probe); EnterPlanMode and ExitPlanMode are already absent in `-p` mode, so six of the eight were confirmed removed.
  Source: openspec/specs/surface-trim/spec.md:48; openspec/specs/surface-trim/spec.md:147; plugins/claudetto/hooks/features/surface/trim.ts:3-7@088a227c.

## Temp Folder Rule

- [ ] **REQ-SETUP-034** claudetto shall allow writes under `/private/var/folders` (per-user temp and cache, `getconf DARWIN_USER_TEMP_DIR`; tools ignore `$TMPDIR`; 85 refusals recorded) and deny `xcrun_db*` there; globs work in `denyWrite`, not `allowWrite`. Absolute scratch paths are identical in sandboxed and unsandboxed modes (`$TMPDIR` is `/tmp/claude-501` inside and `/var/folders/...` outside: `cp` failed and chained edits were skipped).
  Acceptance: The written `sandbox` group holds `/private/var/folders` in `allowWrite` and `xcrun_db*` in `denyWrite`. Verification: inspection.
  Basis: measured. Status: missing at 088a227c.
  Source: plugins/claudetto/hooks/features/setup/settings.ts:211@088a227c (no `var/folders` in plugins/); openspec/specs/sandbox/spec.md:164.

## Setup Rules To Keep

- [ ] **REQ-SETUP-035** claudetto shall have setup write what plugins cannot: trimmed `autoMode` lists keeping `$defaults` first (extension lists read only from user, `--settings`, managed), `sandbox.enabled`, worktree settings, `promptCacheTtl` 1h, and only a MISSING `permissions.defaultMode: auto` (user settings only; without it 1-3 denials per 5-call probe and workers leave fixes uncommitted); `fill` keeps user scalars, only merged lists bypass fill. Setup installs missing tools: ast-grep (optional), betterleaks (required), mo of Mole (required): with brew it shows the exact install command and runs it only on Yes, reports exit code and stderr; with no brew it runs nothing and names the releases page; a No on an optional tool is recorded, a No on a required tool records nothing; it adds the project git root to `~/.config/mole/purge_paths`. Haiku explains each setup question (question, betterleaks-redacted, plus options give `{"pick","why"}`); a valid pick ends with `Recommended: <pick>. <why>` and moves first.
  Acceptance: Setup writes the listed settings and offers each tool install as stated. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/specs/setup/spec.md:92; openspec/specs/setup/spec.md:115; plugins/claudetto/hooks/features/setup@088a227c. The input text was cut after "invalid/empty/no answer/scan fa"; the fallback rule is not recorded here.
  Conflict: Auto Mode.

## Statusline Edit Text

- [ ] **REQ-SETUP-036** claudetto shall name the settings file in the `/statusline` edit text under `CLAUDE_CONFIG_DIR` when it is set, and under HOME otherwise, so the model edits the file that bare `/statusline` writes.
  Acceptance: the lab case "the /statusline edit text names settings.json under CLAUDE_CONFIG_DIR, else under HOME" passes; a paid TUI run on `claude-haiku-5-5` with `CLAUDE_CONFIG_DIR=evidence/tmp/probe-sl/cfg` read `evidence/tmp/probe-sl/cfg/settings.json` (about 21k tokens, $0.0044). Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:145; plugins/claudetto/hooks/features/setup/setup.ts:243@088a227c; plugins/claudetto/hooks/features/setup/text.ts:25@088a227c.

## Setup Speed

- [ ] **REQ-SETUP-037** claudetto shall run setup with one model call that asks all setup questions in a single AskUserQuestion dialog.
  Acceptance: a setup run makes one dialog with several questions and takes fewer model calls than the one-question-per-call run; a probe first shows that one dialog takes several questions. Verification: probe.
  Basis: reported, user. Status: missing at 088a227c (git grep finds no AskUserQuestion in plugins/claudetto/features/setup or commands).
  Source: reported, user, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:35737; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, latest user message after `/claudetto:setup`; Done).
  Conflict: Setup Advice.

- [ ] **REQ-SETUP-038** claudetto shall let setup write the Auto mode group (`permissions.defaultMode: "auto"` plus `autoMode`) to the user settings when the user chooses it, and keep retired settings entries.
  Acceptance: after the choice, `~/.claude/settings.json` holds `defaultMode: "auto"` and `autoMode`; retired entries stay. Verification: demonstration.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (groups.test.ts:83 writes `permissions: { defaultMode: "auto" }`; settings.test.ts:260-273 keep a held `defaultMode`; keeping retired entries is not checked)
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, State and User's words: "Write the group", "Keep it").

## Sandbox Proxy

- [ ] **REQ-SETUP-039** claudetto shall set up the sandbox so that every tool that needs the network proxy reaches it, with one general setting and no per-tool variable such as one for Java.
  Acceptance: after setup, Gradle, gh, and a second non-Java tool pass through the sandbox proxy with no tool-specific option. Verification: test.
  Basis: reported, user. Status: missing at 088a227c (`git grep -n -i "proxy" 088a227c -- plugins` finds no sandbox proxy setting)
  Source: reported, user, 2026-11-13; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14535.

## Surface Trim

- [ ] **REQ-SETUP-040** claudetto shall drop unused tools at `tool.list` (Workflow, ScheduleWakeup, ReportFindings, NotebookEdit, DesignSync, RemoteTrigger, EnterPlanMode, ExitPlanMode, cron, TodoWrite) and set `disableWorkflows`, `disableBundledSkills`, `disableClaudeAiConnectors` and `skillListingMaxDescChars` 60 at `settings.read` (a user-set value wins); the `keptTools` userConfig returns any tool. A `settings.read` deny does NOT remove a tool, and no mod answer removes a built-in tool, so setup also denies Workflow, ScheduleWakeup, ReportFindings, CronCreate/Delete/List, EnterPlanMode, ExitPlanMode through `permissions.deny`.
  Acceptance: Measured: tools array 28,455 -> 8,123 chars (12 -> 8 tools), messages 8,595 -> 3,027; denying Workflow+ScheduleWakeup+ReportFindings cut the first request 42,676 -> 30,510 chars on 2.1.311 (42,879 -> 30,713 on 2.1.312); connectors off verified live; `enableWorkflows:false` and `disableWorkflows:true` give byte-identical requests (37,066 chars). Verification: test.
  Basis: measured. Status: have at 088a227c (surface.ts keptTools, trim.ts:19-24). Claude 2.1.327: the settings `disableClaudeAiConnectors` (chunk-ja5z738t.js@161646) and `skillListingMaxDescChars` (chunk-ja5z738t.js@230906) and the hooks `tool.list` and `settings.read` (chunk-dafpvz32.js@3087, @3643) are present; on 2.1.327 `disableWorkflows` (chunk-ja5z738t.js@247628), `enableWorkflows` (@248694), and `disableBundledSkills` (@242447) are present, and the tool names are in the tool list (chunk-1vttvse2.js).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:15; openspec/specs/surface-trim/spec.md:48; openspec/specs/surface-trim/spec.md:253; openspec/specs/surface-trim/spec.md:60; plugins/claudetto/hooks/features/surface/trim.ts:24@088a227c.

## Tool Text Shortening

- [ ] **REQ-SETUP-041** claudetto shall shorten `tool.describe` texts to at most 200 chars for Monitor, ToolSearch, EnterPlanMode and ExitPlanMode (stock 953-6,354) and TaskCreate/Get/List/Update from 6,119 to 1,597 chars, keeping the listed semantics; the schema stays untouched. The Monitor text says a notice is not the user's reply; the command prints only lines to act on, failures included; one notice = `Bash` with `run_in_background`; run the writer in the command since `tail -F` never ends after its writer exits. claudetto defers none of these (the engine defers Monitor and the plan-mode tools; ToolSearch stays loaded). The `Agent` description tells the model to set `isolation: "worktree"` for an agent that commits; no agent definition sets `isolation`.
  Acceptance: Each shortened text keeps status values, blocks/blockedBy, null-delete of a metadata key, deleted-as-removal, read-before-update and complete-only-when-done. Verification: test.
  Basis: measured. Status: have at 088a227c (surface/texts.ts, `TOOL_TEXTS`, holds a Monitor text). Claude 2.1.327: the hook `tool.describe` is present (chunk-ecn8g7cy.js@2524) and Monitor ships as `MonitorTool` (chunk-1vttvse2.js@204447: the name differs); on 2.1.327 `tool.describe` is present (claude-code.d.ts@228286), the model-facing name in a live request is `Monitor` (internal `MonitorTool`), and the other tools are in the tool list (chunk-1vttvse2.js).
  Source: openspec/specs/surface-trim/spec.md:353; openspec/specs/surface-trim/spec.md:369; openspec/specs/surface-trim/spec.md:379; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:856; plugins/claudetto/hooks/features/surface/texts.ts:20@088a227c.

## Plan-Mode Reminder

- [ ] **REQ-SETUP-042** claudetto shall replace the full plan-mode reminder with `planModeText` when it is shorter than the engine's; it names the plan file; `hasPlan` true -> read then edit step by step, else build with Write and Edit.
  Acceptance: A sparse reminder, a row without facts, or a shorter engine text passes unchanged. Verification: test.
  Basis: measured. Status: missing at 088a227c (git grep planModeText finds no hit; no features/plan dir). There is no Claude Code side: a search of 2.1.327 for `planModeText` finds no hit, so it is claudetto's own name (the EnterPlanMode and ExitPlanMode tools are in the tool list, chunk-1vttvse2.js).
  Source: openspec/specs/surface-trim/spec.md:307.

## Setup Env Flags

- [ ] **REQ-SETUP-043** claudetto shall have setup write 16 approved env flags plus `CLAUDE_CODE_THRIFTY_SONIC=0` (flagged unofficial, with its source in code) and `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` in Features off, so the advisor stays disabled.
  Acceptance: An empty settings file ends with all 17 env names. Claude 2.1.327: `CLAUDE_CODE_THRIFTY_SONIC` (chunk-2ew0jg68.js@19283) and `CLAUDE_CODE_DISABLE_ADVISOR_TOOL` (chunk-2ew0jg68.js@9810) are present. `OFF_SKILLS` duplicates `disableBundledSkills`. Verification: test.
  Basis: measured. Status: have at 088a227c (settings.ts:178,197).
  Source: openspec/specs/surface-trim/spec.md:280; openspec/specs/decide/spec.md:227; plugins/claudetto/hooks/features/setup/settings.ts:178@088a227c; plugins/claudetto/hooks/features/setup/settings.ts:197@088a227c; user decision, 2026-11-14 02:35 UTC, the Advisor tool goes if it cannot be cache-aligned (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:30659).

## Version Floor

- [ ] **REQ-SETUP-044** claudetto shall carry one version constant: each `plugin.json` `engines["claude-code"]` = `">=2.1.323"` and setup writes `minimumVersion: "2.1.323"` in Features off, equal to the engines bound (`MINIMUM_VERSION` in hooks/command.run/useSetup/settings.ts); no hook or mod checks the running version; claudetto runs `claude plugin validate` for the type check of a TypeScript hooks module.
  Acceptance: Fill mode keeps a user value (even higher); replace mode overwrites. Claude Code refuses git/remote install below the floor with `claude update` advice; local or `--plugin-dir` installs load with a note (`>=9.0.0` still loaded under `--plugin-dir`, prediction failed). On 2.1.327 a probe confirms the local case: `plugin install q@mk` with engines `>=9.0.0` loaded with the note "needs Claude Code >=9.0.0, this is 2.1.327, but loads anyway because it's read from a local folder". The refusal for git or remote sources is verified in code only (message chunk-dfwkett1.js@7698; checks chunk-m14bt1pz.js@949377, @950266) and was not run. Verification: test; probe.
  Basis: reported; measured. `minimumVersion` gives no warning and only guards updates (probe 2.2); the setting `requiredMinimumVersion` exits at startup when older, which `minimumVersion` is not (present in 2.1.326: chunk-ja5z738t.js@285180 (2.1.327); `minimumVersion` is present on 2.1.327 at chunk-ja5z738t.js@285052, `requiredMinimumVersion` at @285180). Replaces the earlier floor 2.1.316-2.1.318 with a SessionStart `source=startup` `$.ui.log` warning when running below the floor (none on resume; removed as "Warn Once at Start"). A spec Purpose still says 2.1.316 while requirements say 2.1.323: stale prose. Status: have at 088a227c (settings.ts:19 MINIMUM_VERSION, :146; plugins/*/.claude-plugin/plugin.json hold engines >=2.1.323 in all 3).
  Source: openspec/specs/version-floor/spec.md:8; openspec/specs/version-floor/spec.md:27; openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1454; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:768; plugins/claudetto/hooks/features/setup/settings.ts:19@088a227c; external/2026-11-16/reddit.com-r-claudecode-comments-1xvw576-claude-code-21323-experimental-20261114T144303Z.md:23 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xvw576/claude_code_21323_experimental_code_mode_claude/>); openspec/changes/archive/2026-11-16-2-1-323/design.md:30.

## Ignore Blocks

- [ ] **REQ-SETUP-045** claudetto shall write one marked block `# >>> claudetto: generated by /claudetto:setup, edit outside this block` ... `# <<< claudetto` into `.gitignore` and `.ignore` of a git work tree only, touching no line outside it; `.rgignore` is never made.
  Acceptance: Rerun leaves the files byte-identical; paths the user's lines already name (with or without slash or `!`) stay out of the block; CRLF kept; an unclosed block left as is. `.gitignore` fixed lines: `.DS_Store`, `Thumbs.db`, `*.swp`, `.claude/settings.local.json`, `.claude/worktrees/`, `.claude/claudetto/`, `CLAUDE.local.md` plus untracked heavy paths of detected families; `.ignore` gets tracked heavy paths and bulky listed paths, not made when empty (hides tracked heavy paths from rg without altering git). The dialog shows a diff and says the block narrows Grep with no glob, not Glob. Verification: test.
  Basis: cited. Status: have at 088a227c (setup/ignore.ts:12; partial for docs: setup README/commands mention it).
  Source: openspec/specs/setup/spec.md:40; openspec/specs/setup/spec.md:49; openspec/specs/setup/spec.md:58; openspec/specs/setup/spec.md:67; openspec/specs/setup/spec.md:81; plugins/claudetto/hooks/features/setup/ignore.ts:12@088a227c.

## Starter Files

- [ ] **REQ-SETUP-046** claudetto shall plan starter files from git-listed marker files at the project root with no model call: AGENTS.md of bounded commands (cut at 600 chars) plus CLAUDE.md = title, blank line, `@AGENTS.md`, only when neither exists.
  Acceptance: Nothing is written for an unknown family; a file appearing between question and write is left alone and reported. Markers are git-listed at the project root (tracked, or untracked and not ignored; root name/glob, exact path, `dir/` prefix; a below-root marker does not count); AGENTS.md holds one line per test/build/lint/typecheck command per detected family, a family label when more than one, in table order. Verification: test.
  Basis: cited. Status: have at 088a227c (setup/starter-families.ts, commands/setup.md, README.md).
  Source: openspec/specs/setup/spec.md:31; openspec/specs/setup/spec.md:8; openspec/specs/setup/spec.md:22; plugins/claudetto/hooks/features/setup/starter-families.ts:67@088a227c.

## Pinned Tool Versions

- [ ] **REQ-SETUP-047** claudetto shall not hard-code tool versions in setup's list (`Tool.version`, `SCANNER_VERSION`); only the Claude Code floor stays pinned.
  Acceptance: git grep SCANNER_VERSION finds no hit. Verification: inspection.
  Basis: cited. Status: have at 088a227c (git grep SCANNER_VERSION finds no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:382@088a227c9^ (task 18.39, the cleanup tool `mo` pinned at 1.68.0 in the tool list).

## Rule Files

- [ ] **REQ-SETUP-048** claudetto shall ship one-file rules under plugins/claudetto/rules/, with no frontmatter (they load at session start in message 0), 1-4 non-empty lines each, each with "because"; an eval checks that a function whose type excludes null gets no null check. The 2.1.323 change adds `useHeadlineseNames` (8 offered; each in its own dialog showing the whole text, SHA-256 stored, written only on acceptance; identifiers in headlinese, comments keep articles, Title Case for MD headings and Apple UI). `paths:` frontmatter rules load only after a matching read mid-turn in a tool-result message (measured, 2.1.321 change).
  Acceptance: the shipped set equals the specified set. Verification: inspection.
  Basis: measured. Status: partial at 088a227c (plugins/claudetto/rules/ holds 11).
  Source: the count conflict is recorded in openspec/specs/setup/spec.md:161@088a227c9^ (7 rules: `useLeastCode`, `noUnrequestedEdits`, ...) and openspec/changes/archive/2026-11-16-2-1-323/design.md:164@088a227c9^ (8 offered); the repo ships 11 (adds `commentOnlyWhy`, `guardOnlyTrustBoundaries`, `scopeEditsToGoal`, `useEdgeCaseReport`, `useTestPatterns`; names differ from the specs). The shipped set is the one to specify at implementation.

- [ ] **REQ-SETUP-049** claudetto shall offer each shipped rule as a copy at `<config>/rules/claudetto/<name>.md`, one dialog each; skip one the user holds byte for byte; store the SHA-256 of each written copy (also of each file setup copies out of the plugin); a dismissal stops the rest. At startup it logs one line per installed copy whose hash differs from the shipped one, once per hash pair: `updated` (installed hash equals stored) or `modified` otherwise, with file, hashes cut to 8 chars, and dates, recommending `/claudetto:setup`; nothing for an identical, skipped or already-reported pair; no settings key is written.
  Acceptance: the saved hash decides, not dates (plugin install stamps files with install time); the hooks runtime has `crypto.subtle.digest`, no `Buffer`. Verification: test.
  Basis: measured; cited. Status: have at 088a227c (hooks/features/setup/rules.ts:34-35 hashes with SHA-256). Verified on 2.1.327 by probe: a plugin source file with mtime 2001-01-01 installed to cache/mk/p/1.0.0/rules/a.md with the install-time mtime (Nov 18 2026).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:153; openspec/specs/setup/spec.md:161; openspec/specs/setup/spec.md:178; openspec/specs/setup/spec.md:159; openspec/specs/mod-architecture/spec.md:47; plugins/claudetto/hooks/features/setup/rules.ts:34@088a227c.

## Hygiene

- [ ] **REQ-SETUP-050** claudetto shall append the SessionStart env lines only if the `renice` line is absent.
  Acceptance: one copy, not 12; 11.8 ms against 58.6 ms. Verification: test.
  Basis: measured. Status: have at 088a227c (plugins/claudetto/hooks/hooks.json:10 tests for the line with `grep -qsF 'renice 10 -p $$'`).
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:15; openspec/changes/archive/2026-11-13-feat-2-1-321/tasks.md:16.

- [ ] **REQ-SETUP-051** claudetto shall remove stale generated files under `~/.claude` by listed paths and age limits, and never settings, credentials, CLAUDE.md, a skill, an agent, a plugin install or a newer transcript. `--dry-run` removes nothing; an automatic run never blocks SessionStart (startup, resume, clear, compact); `hygieneEnabled` false starts nothing. Keys: `sessionTempCleanupPeriodDays`, `probeCleanupPeriodMinutes` (60; 0 off); an unset day key follows `cleanupPeriodDays`. The temp root `claude-<uid>` under `CLAUDE_CODE_TMPDIR`, tmp or the system temp is swept once per real path if the user owns it; roots inside `~/.claude/projects`, `~/.claude/plugins` and home are refused; heartbeat files under `.claude/claudetto/heartbeat/` go after one day; CC entries (`-Users-me-project`, `bash-edit-diff`, `plugin-tool-staging`, `cc-socks`, nested `claude-<uid>`) stay by an allowlist; one failing rm is logged and the others go; a vanished entry is tolerated. Probes write to `$TMPDIR/<project>/<session_id>/`, removed on `session.end`; at session start only per-session folders that no running session's `~/.claude/sessions/<pid>.json` names, and whose pid and procStart no longer match, are removed; setup adds `Edit(//tmp/claude-<uid>/**)` and `Edit(//private/tmp/claude-<uid>/**)` to `permissions.allow`.
  Acceptance: a dry run removes nothing; a held file (lsof error) removes nothing. Verification: test.
  Basis: measured. Status: partial at 088a227c (hygiene.ts, setup/changes.ts:155 have the keys and the Edit allow; the `<session_id>` probe folders were not found).
  Source: openspec/specs/session-hygiene/spec.md:33; openspec/specs/session-hygiene/spec.md:174; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:64; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:75.

- [ ] **REQ-SETUP-052** claudetto shall sweep trash by rules: `hygiene/trash.toml` (gitleaks format) names folders (node_modules and the like), a `gcroot` rule for symlinks into `/nix/store/`, and `temp` rules; a project `.claude/claudetto/trash.toml` replaces the plugin's, or adds with `[extend] useDefault = true` (`disabledRules` by id). It walks the project, the `.claude.json` lists and Mole `~/.config/mole/purge_paths`; skips `.git`, follows no link, never enters `~/.claude/projects` or plugins; age 7 days (`--trash-days`, 0 off). A folder goes only if it is in a git checkout, is not the session's own, has no process or open file (lsof; error means nothing), is git-ignored, and index and files stayed unchanged within the age. After the sweep `mo clean` runs with no terminal on stdin (`--dry-run` gives `mo clean --dry-run`), with the exit code, or `brew install mole` when missing. A worktree goes only when git lists it unlocked, it has no uncommitted change and `git cherry` finds its commits in the checkout branch, else it is named with its size; the first sweep of another project is a dry run plus an ask. A local branch goes when no worktree has it, it is not the default, its newest commit is older than `trashCleanupPeriodDays` (7), and `git cherry` finds every commit in the default branch (`origin/HEAD`, else main or master); a remote branch goes only with `--remote`, never automatically, with no open PR head, and `git ls-remote` over 60 s is stopped.
  Acceptance: the temp rule needed a marker that 0 of 9,567 temp folders held; 48 agent worktrees held 95.1 GiB with the disk 70% full; a dry run with `--remote` found 26 temp entries (790,704 B), 28 worktrees (51.4 GB) and 10 branches; a real run deleted 5 remote branches after approval. Verification: test.
  Basis: measured. Status: have at 088a227c (hygiene/trash.toml, hygiene/trash.ts).
  Source: openspec/specs/session-hygiene/spec.md:79; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-hygiene/spec.md:5; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:619.

## Alias Pinning

- [ ] **REQ-SETUP-053** claudetto shall write `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL` as full 5.5 IDs, so default, opus, sonnet, haiku, opusplan, and an agent's `model:` alias never resolve to an older model.
  Acceptance: the written settings hold all four keys with 5.5 IDs. Without the pin the picker showed "Default (recommended) Opus 5" and `opusplan` named claude-opus-5. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/specs/tier-profiles/spec.md:159; plugins/claudetto/hooks/features/setup/settings.ts:120@088a227c.

## Classifier Model

- [ ] **REQ-SETUP-054** claudetto shall ship the built-in classifier with trimmed `autoMode` lists, set no `CLAUDE_CODE_AUTO_MODE_MODEL`, and fail closed when the classifier is down; a plugin `tool.check` only tightens a verdict or turns a bare ask on a read-only command into allow, and never asks a model to judge permission. Deny rules and `hard_deny` stay in every tier.
  Acceptance: settings hold `autoMode` and no `CLAUDE_CODE_AUTO_MODE_MODEL`. Measured 2026-11-06: a plugin route (Jev first, fallback claude-haiku-5-5) scored 29/30 against the built-in 30/30 on 30 cases, with a stable miss on `push-unnamed-branch`. Verification: inspection.
  Basis: measured (the env is present in 2.1.325 but ineffective: the server-configured model wins; verified on 2.1.327: chunk-m14bt1pz.js@3534099 and @3534272 warn "ignoring CLAUDE_CODE_AUTO_MODE_MODEL ... because a server-configured classifier model takes priority"; the env is read at @3534449). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/low-hitl/spec.md:37; plugins/claudetto/hooks/features/setup/settings.ts:102@088a227c.

## Output Limits

- [ ] **REQ-SETUP-055** claudetto shall write `bashOutputMaxChars: 8000` and `env.MAX_MCP_OUTPUT_TOKENS: "10000"`, so Claude Code truncates and the plugin cuts nothing. A tool result bound of 12,000 chars keeps whole lines to the limit and ends with a count of lines not shown.
  Acceptance: both keys are written; `MAX_MCP_OUTPUT_TOKENS` sits in `env` because it is read from process env. Measured: a 20,000-char Bash print gives a 2,258-char preview plus a path to saved output; `MAX_MCP_OUTPUT_TOKENS=2000` cut a 40,000-char MCP result. At a 10,000 cap on 2.1.327 (fake API, reports/2026-11-18-research/handover-probes/mcp-spill/): 20,000 chars entered whole, 60,000 chars sent a token-count request first, and 200,000 chars became a file notice that asks the model to read the whole file. Verification: test.
  Basis: measured (2.1.323 research probes); cited (Claude Code warns on an MCP result past 10,000 tokens). Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/inventory.md:57; plugins/claudetto/hooks/features/setup/settings.ts:137@088a227c.

## Env Keys

- [ ] **REQ-SETUP-056** claudetto shall write `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` "900000" (it counts silence, not run time) and no `CLAUDE_CODE_SCRIPT_CAPS` (it counts substrings of Bash commands and acts only with `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB`, which forces default permission mode).
  Acceptance: the written env holds the stall timeout and no script caps key. Verification: test.
  Basis: measured. Status: have at 088a227c.
  Source: openspec/changes/archive/2026-11-13-feat-2-1-321/specs/setup/spec.md:25; plugins/claudetto/hooks/features/setup/settings.ts:183@088a227c.

## Surface Control

- [ ] **REQ-SETUP-057** claudetto shall override, trim, or disable what it can, such as built-in skills and claude.ai connectors, while keeping capabilities and user control.
  Acceptance: each surface left on shows a measured value. Verification: inspection.
  Basis: user decision, 2026-11-14. Status: partial at 088a227c (features/setup, the `@builtin` disable).
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

- [ ] **REQ-SETUP-058** claudetto shall remove the permission nagging that the Claude Code sandbox brings, through supported configuration and carefully scoped human approval, and shall keep its own settings in the style of Claude's settings.json key-value conventions.
  Acceptance: a normal run raises no avoidable permission prompt. Verification: demonstration.
  Basis: user decision, 2026-11-14. Status: partial at 088a227c.
  Source: user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); user decision, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:459).

## Auto Mode

- [ ] **REQ-SETUP-059** claudetto shall write `autoMode` with one line each, replacing the built-in lists: allow "Local Work" (reading, editing, building, testing, and formatting in the working tree and its temp output), soft_deny "Destroy Work" (deleting or overwriting what the repo cannot restore: force-push, history rewrite, remote branches, tags, uncommitted work, or an unresolved target), hard_deny "Data Exfiltration" (secrets landing outside the trusted repo, its remotes, and Environment hosts), and environment "Trusted repo".
  Acceptance: the written `autoMode` holds these four entries and no `"$defaults"`. Verification: test.
  Basis: cited (a design draft, never run). Status: partial at 088a227c (`plugins/claudetto/hooks/features/setup/auto-mode.ts` writes "Everything Else", "Destroy Work", "Wipe a Disk" plus `$defaults`, and "Trusted repo" with "Source control").
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/scripts/planned-settings.json:109-121.
  Conflict: Setup Groups (first item, `$defaults`-preserving lists).
  Conflict: Setup Rules To Keep.

## Package Managers

- [ ] **REQ-SETUP-060** claudetto shall have setup write `permissions.deny` `Bash(npm *)` plus one rule line per detected package manager, not a fixed Bun list.
  Acceptance: in a repo with a `pnpm-lock.yaml`, setup writes the matching deny rules and no Bun-only rule. Verification: test.
  Basis: read, inferred cure. Status: missing at 088a227c (`git grep BUN_FOR_NPM 088a227c -- plugins` finds nothing).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/surface-trim.md:144 (`packages.ts:4-30` hard-codes `BUN_FOR_NPM`, `BUN_LOCKS`, and xmake).

## Conflicts With Settled Decisions

- [ ] **REQ-SETUP-061** claudetto shall disable eleven built-in plugins as `cc-plugin-<name>@builtin` and shall leave the twelfth, `telemetry`, to `DISABLE_TELEMETRY` alone.
  Acceptance: `hooks/setup/settings.test.ts`: eleven built-in plugins are off as cc-plugin-<name>@builtin; telemetry is off through DISABLE_TELEMETRY alone. Verification: test.
  Basis: read. Status: partial at 088a227c (plugins/claudetto/hooks/features/setup/settings.test.ts:51 holds the telemetry test).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:405.
  Conflicts with: all 14 builtins disabled, `privacy` included, enforced by rewriting user settings at session start (user decision, 2026-11-16).

- [ ] **REQ-SETUP-062** claudetto shall write in the "Smaller prompt" group `disableBundledSkills: true`; `outputStyle: claudetto:Concise`; `enabledPlugins` false for ten `cc-plugin-<name>@builtin` (agents-md, plugin-authoring, mods-guide, tips, mermaid, responsive-mode, diff, you-should-know, easel, claude-test); `permissions.deny` of eight tools; and `permissions.allow` of four read-only git rules. It shall not write `cc-plugin-claude-platform@builtin`, but claude 2.1.327 does ship that plugin: it is registered as `claude-platform` without the `cc-plugin-` prefix, gated by a condition, a feature flag, and login (chunk-syz79m2z.js@800-1844; chunk-5hejrm7d.js@22716; chunk-g8aab327.js@582); a search finds no `cc-plugin-claude-platform`. The "no longer ships" claim is false; the requirement to not write it stays, under the id `claude-platform`. Each `@builtin` gets a disable enforced at runtime, because a `settings.read` `enabledPlugins` false did not stop the built-ins and only `--settings` did.
  Acceptance: an empty settings file after the group holds the ten ids, eight denies, four allows; a session with `claude plugin list` shows no built-in loaded. Verification: test.
  Basis: reported and measured. Status: have at 088a227c (`plugins/claudetto/hooks/features/setup/settings.ts`).
  Source: openspec/specs/setup/spec.md:205; openspec/specs/setup/spec.md:207; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:102; openspec/changes/2-1-325-rearchitecture/design.md:81.
  Conflicts with: all 14 builtins disabled, `privacy` included, enforced by rewriting user settings at session start (user decision, 2026-11-16).

## Silent-Turn Reminder

- [ ] **REQ-SETUP-063** claudetto shall write `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"` in the Features-off env, write no `_TEXT` key, and unset a retired `_TEXT` value that setup wrote earlier, in fill mode too, keeping a text the user wrote.
  Acceptance: a rerun removes each old reminder text and keeps a user text. Verification: test.
  Basis: user decision. Status: have at 088a227c (groups.test.ts:126 expects `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"`, :128 expects no `_TEXT` key)
  Source: user decision, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).

## Sandbox

- [ ] **REQ-SETUP-064** claudetto shall write the sandbox block of REQ-GUARDS (deny-list) in setup, with `withCacheDirs` and `cacheDirs` removed.
  Acceptance: see the guards item. Verification: inspection.
  Basis: user decision. Status: have at 088a227c (groups.test.ts:158 sandbox group writes `sandbox: { enabled: true }`; `git grep -n withCacheDirs 088a227c -- plugins` finds none)
  Source: user decision, 2026-11-13 22:08 UTC, sandbox trimmed to unrecoverable destructive commands (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:14708); user decision, 2026-11-14 14:21 UTC, sandbox as minimal as possible (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:36547).

- [ ] **REQ-SETUP-065** claudetto shall ask the user once whether to turn auto memory off, state the measured saving of 755 tokens per first request, and write `autoMemoryEnabled: false` only on a yes.
  Acceptance: a setup run with a no answer or no reply leaves `autoMemoryEnabled` unset; a yes writes the key; the question text holds the 755-token figure from CTX-671. Verification: test.
  Basis: reported (one user says memory files duplicate docs and can contradict the project; five comments describe agents hoarding self-written memories, one repo with 89, misattributed to the user and followed rigidly; three comments call memory files an anti-pattern for code; no measurement of harm). Status: missing at 088a227c.
  Source: external/2026-11-18/reddit.com-r-claudecode-comments-1xywg7f-memories-and-rules-20261117T224544Z.md:27,39-54 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xywg7f/memories_and_rules/>); reports/2026-11-18-research/dossier.md:173,174,185. Consent rule: REQ-GUARDS-048.
