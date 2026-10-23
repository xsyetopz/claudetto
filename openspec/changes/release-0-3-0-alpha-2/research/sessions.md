# Session Research for 0.3.0-alpha.2

Method: a `claudetto:worker` subagent ran `jq` and `grep` over `~/.claude/projects/*/*.jsonl` on 2026-10-23.
Its scratch outputs were `/tmp/_facts.md` (counts) and `/tmp/_den.txt` (denied results, made with the filter `/tmp/_den.jq`).
The main session read both files and the report of the subagent, and it checked the deny rules and `enabledPlugins` of `~/.claude/settings.json` with `python3`.
The `version` field of a transcript is the Claude Code version, not the claudetto version.

## Scope

- 292 session files, from 2026-10-18 to 2026-10-22.
- Sessions with claudetto 0.2.0: `a3686f55`, `b92de5a9`, `ac5bebba`, `44160c2d`.
- Sessions with claudetto 0.3.0-alpha.1: `0242e06c`, `48365a4f`.

## F1: Temp Deletes Denied by the Snippet

- 17 results "Permission to use Bash with command ... has been denied", all in the main thread: `ac5bebba` 6, `44160c2d` 5, `a3686f55` 5, `b92de5a9` 1.
- 16 of them hold an `rm -rf` of a temp path, such as `rm -rf /tmp/ccd` and `rm -rf /tmp/pin-explore/v020`.
- Cause: the snippet deny rules `Bash(rm -rf /*)` and `Bash(rm -rf ~/*)` (`plugins/claudetto/slices/setup/prompts.ts:113` and `:115`).
  In the rule syntax, `*` with no space before it matches each command with that prefix (docs `prompts/skill-doctor`), so `rm -rf /*` matches `rm -rf /tmp/ccd`.
  The user settings hold the same rules.
- Result: the user typed `! rm -rf /tmp/...` 20 times by hand (`44160c2d` 8, `a3686f55` 8, `ac5bebba` 3, `9072f19c` 1), and the assistant told the user to run a command about 7 times after a deny.

## F2: Engine Prompts on Temp Reads and MCP Calls

- The gate log of alpha.1 (`$TMPDIR/claudetto/gate/`) holds 6 `ask` entries, all `Bash` and decided by `person`, and 5 of them are test probes.
  So the prompts `Read(//private/tmp/**)` for `Monitor` and the prompt for `cc-inspect` `search_binary` come from Claude Code, not from the gate.
- The gate matcher is `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write` (`plugins/claudetto/hooks/register.ts`), so it never sees `Monitor` or an MCP tool.
- The user `permissions.allow` has no entry for a temp read, `Monitor`, or the `cc-*` MCP tools.

## F3: Auto Mode Classifier Denials

- 30 denials of the built-in auto mode classifier, mostly in 0.2.0 sessions: Self-Modification 4, Irreversible Local Destruction 4, Real-World Transactions 3, Git Destructive 3.
- A paid eval was stopped as a "real-world transaction" in `42b48e25`.
- 0.3.0 sets `permissions.disableAutoMode`, so this class must not come back.

## F4: Little Delegation

- `ac5bebba` made 2010 main-thread tool calls and 33 `Agent` calls, and `44160c2d` made 1340 and 20.
- 195 of 292 sessions use `Agent`, with 1022 calls.
  The types: `implementer` 492, `reviewer` 289, `claude` 149, `writer` 45, `general-purpose` 28, `scout` 12.
- `claudetto:worker` ran once, and the other agents of the claudetto roster never ran.
- The `/context` tip "Give "claude" subagents a cheaper model" comes from the 149 `claude` calls.
- The body of `claudetto:main` says "Delegate a read only when it is larger than the start cost of a subagent" and names no agent of the roster (`plugins/claudetto/agents/main.md:95`).

## F5: Check Loops and Temp Logs

- `just check` and similar recipes ran 88 times in `ac5bebba`, 73 in `a3686f55`, and 29 in `44160c2d`.
- The pattern `just docker check > /tmp/... 2>&1` makes temp logs, and each read of such a log by `Monitor` asks (F2).

## F6: Start Size

- First-turn input tokens: `2c164b38` 45819, `0242e06c` 27435, `b92de5a9` 26559, `ac5bebba` 26050, `48365a4f` 19811, `a3686f55` 15340.
- The `/context` of the user shows 15k tokens: system prompt 4.5k, tools 4.8k, skills 3.2k, memory 1.6k, MCP instructions 731.
- 8 `anthropic-skills:*` skills of the claude.ai sync are in 4 skill listings, although `disableClaudeAiConnectors` and `disableBundledSkills` are `true`.
  The setting that stops them is `syncClaudeAiSkills: false` (docs `configure/settings/hooks-and-plugins`), and neither the snippet nor the user settings set it.
- The `find-docs` skill is in 288 of 325 skill listings, next to `claudetto-docs:find-docs`.
- The `apple-docs` MCP server gives 19 of 36 MCP tools, about 9.5k tokens when loaded.

## F7: Plan Not Known

- In `b92de5a9` the subagent cap was set to 2, although the login has the Max 20x tier.
- The eval recipe passes `--max-cost-usd`, which frames a subscription run as an API cost.
- `~/.claude.json` `oauthAccount` holds `billingType` and `organizationRateLimitTier` (here `stripe_subscription` and `default_claude_max_20x`).

## F8: Noisy Notices

- 50 `claudetto:` notices in 9 sessions: 35 "The handoff is in <path>" (14 in `ac5bebba`), 9 `advise` token notices with 0 cache reads, and 5 "cleanup kept 27 entries".
- 251 `mcp__handoff__handoff` calls in 0.2.0 sessions.

## F9: `you-should-know` On

- `~/.claude/settings.json` has `"cc-plugin-you-should-know@builtin": true`.
- The mod runs `$.model.fork` for each check (binary 2.1.309, module `chunk-82wcyxds.js`).

## F10: Smaller Items

- The change name rule of `minispec` rejects dots, so a version name needs a manual rewrite (4 mentions).
- `read_page` of `cc-docs` failed 4 times with a `section_heading`, and in this session it returned no text for three pages.
- A worktree notice with 66 paths in `0020641a`.
- A `PreModelSwitch` hook can return `ask`, which adds a dialog to a model switch.
- The `ground` check of claudetto stopped the `Write` of this file by the subagent three times, because it did not count the output of the `Bash` calls of the subagent as the source of its numbers.
