# Built-in inventory, Claude Code 2.1.318

Every mark below is the user's decision (2026-11-05). The route column holds the route found so far. A route marked untested has no run yet. Run names point to `settings-review.txt` L14, L16, and L17. All runs used the fake API ($0) unless the row says paid.

Decided by the user (2026-11-05):

- Route: the Mod way (A, D4). claudetto ships each built-in replacement inside the plugin as a Mod, not as same-named files written by `claudetto:setup` (B). This closes the A/B choice in task 5.18.
- Route priority: a Mod first, then a classic hook, then a skill, then `settings.json`. A row whose only working route is a setting says so, with the run that proves no Mod route exists.
- Agents: `Explore` becomes `Artemis`, `Plan` becomes `Metis`, and `general-purpose` becomes `Heracles`.
- `keybindings-map` is dropped from the list: no such command exists.
- Acceptance: a route is canonical when it works with no compromise and costs fewer tokens or characters than stock. A built-in that a Mod, a hook, or another engine route can fully recreate is rebuilt cheaper, not only trimmed.

Sources: `vanilla` is the stock program; `Mod` is a hooks-module event; `file` is a same-named user or project `.claude` file; `setting` is a settings key.

## Replace and remove routes

| Surface | Replace | Remove from the model | Remove for the user |
| --- | --- | --- | --- |
| Agent | Mod `tool.call` / `agent.spawn` map (m-b0, i1, B3); file `agents/<Name>.md` (o4, o13) | Mod `agent.offer` `{isOffered:false}` (m-b0, rm2); setting `permissions.deny: ["Agent(<type>)"]` drops the list entry, and the `Agent` tool stays (rm4) | same as model |
| Prompt command or skill | Mod `skill.prompt` (o7; L17 item 9 sl2, i1) or `command.run` (t3, 0 requests); file `commands/<name>.md` or `skills/<name>/SKILL.md` (o2, o3, t2) | Mod `settings.read` adding `skillOverrides` `"off"` to the engine's merged read (L17 item 7, st1, st2: listing 6,183 to 493 bytes); setting `skillOverrides: {"<name>": "user-invocable-only"}` (rm10, rm11); `"name-only"` keeps a name-only line; `disableBundledSkills` removes all bundled skills (rm1). `command.describe` removed no listing entry (rm6, rm8) | the same `skillOverrides` `"off"` refuses the user's run at 0 requests (L17 item 7, c9); Mod `command.run` `{text}` blocks the user's run at 0 requests (c1, c2, c5) but not the model's `Skill` call (c3, c4) |
| Skill description | Mod `command.describe` `{description}` (rm6: `claude-api` 1,083 to 24 bytes) | — | — |
| Local command | Mod `command.run` `{text}` (rm5: `/stickers` printed `STICKERS-BLOCKED`, 0 requests) | not sent to the model | Mod `command.run` blocks the run; `command.describe` `isHidden` drops the name from `/help` and from prefix typeahead, and an exact typed name still shows its row (L17 item 8, hq-mod, lc-*) |
| Tool | Mod `tool.describe` text (feature-map, probe 2.7; L17 item 3, tx1); Mod `tool.register` (a1) | Mod `tool.describe` `isDeferred: true` (task 2.13, a1; L17 item 5) moves a tool behind `ToolSearch` but does not remove it (L17 item 2, dis1); setting `permissions.deny: ["<Tool>"]` in a settings file removes it (m5; L17 item 2, dis2; tq1 in the TUI), and the same deny added by a Mod `settings.read` does not (st1, st4, st6) | same |

Routes that failed: plugin-shipped same-named files never replace (o5, o5c, o5d, o11). `agent.register` cannot take a built-in name (o8). `command.describe` `isHidden` (rm6) or `disableModelInvocation` (rm8), `permissions.deny: ["Skill(dataviz)"]` (rm7), and a project `skills/dataviz/SKILL.md` with `disable-model-invocation: true` (rm9) all left `dataviz` in the listing.

## Agents (stock TUI list, t1)

| Agent | Mark | Route | Evidence |
| --- | --- | --- | --- |
| `Explore` | replace with `Artemis` | Mod map (D4, D5); `run_in_background: false` unless the caller sets it (L17 item 3, Agent-mod2) | m-b0, i1, B3, p1; L17 item 1, ag1 and tag1; task 5.18 |
| `Plan` | replace with `Metis` | Mod map (D5); `run_in_background: false` as for `Artemis` | m-b0, i1; L17 item 1, ag1; task 5.18 |
| `general-purpose` | replace with `Heracles`; untyped calls map to it | Mod map | m-b0; `/batch` names it (cb-batch2); L17 item 1, ag1 (untyped, `general-purpose`, `claude` ran `Heracles`); task 5.18 |
| `claude` | remove | Mod `agent.offer`; calls map to `Heracles` | m-b0; L17 item 1, ag1; task 5.18 |
| `statusline-setup` | remove; claudetto's `/statusline` writes the line with no model call | Mod `agent.offer` | feature-map `/statusline` row; t3; L17 item 1, ag1 "not found"; item 9, sl1; tasks 5.18 and 5.26 |
| `claude-code-guide` | remove | Mod `agent.offer` | t1; absent from the `-p` list (rm0); L17 item 1, tag1: absent from the TUI listing, a call answers "not found"; task 5.18 |

A rewritten `Agent` call, and every later call of the same response, goes to the 63.7K-char local classifier in auto mode (L17 item 10 (g)), so 5.18's `Agent` text names the agents and `run_in_background: false` and the model's own call needs no rewrite.

## Commands that send a prompt (22 of 88 TUI-listed; type from `cc-inspect surface slash-command`)

Spawns an agent: what the body asks for (cb-* runs, grep of the captured body).

| Command | Spawns an agent | Mark | Route | Note |
| --- | --- | --- | --- | --- |
| `statusline` | `statusline-setup` (t1) | replace | bare: Mod `command.run`; with text: Mod `skill.prompt` (the main model edits `statusLine`) | 0 requests (t3; L17 item 9, sl3, 32 ms); with text, one request with a 323-char text and no subagent (sl2); a file still sends one ~57 KB request (t2) and costs 55,376 tokens (sl-file, paid); task 5.26 |
| `init` | no | replace with proper `CLAUDE.md` / `AGENTS.md` conventions | Mod `skill.prompt` | feature-map `/init` interview; L17 item 9, i1: 1,592 to 1,144 chars; the text names `mcp__claudetto__ask-user-question` (task 5.26) |
| `batch` | yes: research subagents, then one `general-purpose` worktree agent per unit | remove | Mod `settings.read` adding `skillOverrides` `"off"` (L17 item 7, st1, st2), which removes the listing entry and refuses the user's run and the model's call | c8, c9; task 5.24 |
| `simplify` | yes: 4 review agents | remove | same | — |
| `security-review` | yes: sub-tasks, parallel false-positive filters | remove | same | needs `origin/HEAD` (cb-security-review) |
| `code-review` | no; "do NOT spawn subagents" except at `max` level | remove | same | — |
| `deep-research` | yes, through `Workflow` | remove | same | removing it frees `Workflow` to be disabled |
| `debug` | optional `claude-code-guide` | remove | same | — |
| `run`, `verify`, `insights`, `team-onboarding`, `fewer-permission-prompts`, `run-skill-generator` | no | remove | same | `team-onboarding` hits were probe transcripts, not body text |
| `doctor`, `loop` | no | keep | — | not in the user's list |
| `dataviz` | no | remove | same (rm10, rm11) | 1,448 bytes per request (rm6) |
| `claude-api` | no | remove | same | 1,083 bytes stock (rm10) |
| `update-config` | no | remove | same | 708 bytes stock (rm10) |
| `workflow-authoring` | no | remove | same, shipped only with `Workflow` denied | 253 bytes; with it off, `Workflow` inlines the skill, 5,355 to 22,310 bytes (L17 item 7, st1); st5 |
| `keybindings-help` | no | remove | same | 249 bytes; model-only skill, `/keybindings-help` refuses a user call (cb-keybindings-help) |
| `plugin-authoring` | no | remove | same (it survives `disableBundledSkills`, rm1) | L17 item 7, c8: the model's `Skill plugin-authoring` call is refused |

The user's list also named `keybindings-map`. No such command exists, and the user dropped it (2026-11-05).

The model's skill listing: 13 entries, 6,183 bytes stock (rm0); 2,471 bytes with the rm10 overrides; 2 entries (`loop`, `init`), 493 bytes, with all 18 removals off (L17 item 7, c8, st1).

## Commands with no model call (66 of 88)

These send nothing to the model, so removing one saves no tokens. A removal is a Mod `command.run` block that returns text, with `command.describe` `isHidden: true` (L17 item 8: all 27 below blocked at 0 requests; `/help` Commands 80 names stock, 60 under the Mod; an exact typed name still shows its row; task 5.25).

Remove: `add-dir`, `agents` (hidden, "removed"), `autocompact`, `background`, `branch`, `bug`, `cd`, `compact`, `fast`, `feedback`, `focus`, `ide`, `memory`, `mobile`, `passes` (hidden), `plan`, `powerup` (the user wrote `power`), `pro-trial-expired` (hidden), `radio`, `recap`, `release-notes`, `setup-bedrock` (hidden), `setup-vertex` (hidden), `stickers`, `workflows`, `__remote-workflow` (hidden), `workflow-launch-exec` (hidden).

Keep: `auto-mode-setup`, `btw`, `clear`, `color`, `config`, `context`, `copy`, `effort`, `exit`, `export`, `fork`, `goal`, `heapdump` (hidden), `help`, `hooks`, `keybindings`, `list-agents`, `login`, `logout`, `mcp`, `model`, `output-style`, `permissions`, `plugin`, `reload-plugins`, `reload-skills`, `rename`, `resume`, `rewind`, `sandbox`, `scroll-speed`, `skills`, `status`, `subtask`, `tasks`, `terminal-setup`, `theme`, `tui`, `usage`.

`diff` is described (describe.json) and has a gate (`!aur()`), but it is not in the dumped list.

## Tools (stock TUI request t1: 12 sent, 33,041 bytes; 13 deferred)

| Tool | Bytes | Mark | Route | Evidence |
| --- | --- | --- | --- | --- |
| `Workflow` | 5,255 | disable | setting `permissions.deny`, written by setup; no Mod route (L17 item 2, dis1; st1) | `deep-research` loads it, and it is marked remove; dis2, st5; task 5.20 |
| `AskUserQuestion` | 5,106 | replace | Mod v2: `tool.describe` `isDeferred: true` on the stock tool, a `tool.call` guard that passes it only while `ask-user-question` runs, and `tool.register` `ask-user-question` on `$.ui.ask`; no `permissions.deny`, because `$.ui.ask` calls the stock tool (L17 item 6, tq3) | a1: `ask` 256 bytes (now `ask-user-question`), answer "ANSWER Alpha"; L17 item 6, tq5 and tq6: 5,196 sent bytes to 332 deferred; task 5.23 |
| `ScheduleWakeup` | 4,788 | disable | setting `permissions.deny`, written by setup; no Mod route (L17 item 2, dis1: a null `tool.describe` answer was skipped) | dis2; task 5.20 |
| `Agent` | 4,649 | trim heavily | Mod `tool.describe` | m-b0 residue: "(general-purpose by default)", dropped; L17 item 1: 5,246 to 2,498 bytes in `-p` (ag1), 4,725 to 2,156 in the TUI (tag1); item 3 paid Agent-mod2 task matched stock; must stay sent (item 5, df-Agent); task 5.18 |
| `Bash`, `Read`, `Edit`, `Write` | 3,451 / 1,861 / 912 / 588 | trim | Mod `tool.describe`; `isDeferred: true` for `Read` and `Write` | probe 2.7; L17 item 3, tx1: 3,715 to 2,657, 1,919 to 1,409, 964 to 845, 639 to 594 bytes, paid tasks matched stock; item 5: `Read` and `Write` defer with no loss, `Bash` and `Edit` stay sent; task 5.21 |
| `ToolSearch` | 1,359 | modify (custom `ask-user-question` handling) or replace | Mod `tool.call` rewrite of a query that names `AskUserQuestion` | a3 shows it loads the stock `AskUserQuestion`; L17 item 6, q1-q3 and tq2: the rewritten query returns `mcp__claudetto__ask-user-question`; the rewrite sends later calls of its response to the local classifier (item 10 (g)); task 5.23 |
| `ReportFindings` | 2,119 | disable | setting `permissions.deny`, written by setup; no Mod route (L17 item 2, dis1) | dis2; task 5.20 |
| `Skill` | 1,744 | trim | Mod `tool.describe`; `isDeferred: true` | L17 item 3, tx1: 1,803 to 622 bytes, paid task matched; item 5: defers with no loss; task 5.21 |
| `ListAgents` | 1,093 | replace, or trim heavily | Mod `tool.describe` (trim); a `tool.register` rebuild on `$.agent.list` loses the local, cloud, and Remote Control rows | L17 item 4b, la1: 1,151 to 674 bytes, stock rows kept; stays sent (item 5); task 5.22 |
| `Monitor` (deferred) | — | remove; replace with `mcp__claudetto__monitor` | Mod: `tool.register` a deferred `monitor` that wraps the stock tool by `$.tool.call` `Monitor`; a `Monitor` `tool.call` guard denies the model's own call; `tool.describe` `isDeferred: true` on stock; a `ToolSearch` result rewrite maps `Monitor` to the wrapper. No `permissions.deny`. Stock code delivers each event with its own frame, in a running turn and while idle, takes the ws source, and applies its rate stop, so losses (1)-(3) are closed. 866 bytes when loaded, against 7,586 stock. The earlier polling route (mon12-mon20) is superseded | L17 item 4a, mon21-mon29 (fake API), mon30 and mon31 (paid, auto mode: nested call skips the classifier; the result rewrite keeps the server route); task 5.17 |
| `CronCreate`, `CronDelete`, `CronList`, `EnterPlanMode`, `ExitPlanMode` (deferred) | name only | disable | setting `permissions.deny`, written by setup; no Mod route (L17 item 2, dis1) | dis2; tq1 in the TUI; task 5.20 |
| `EnterWorktree`, `ExitWorktree`, `SendMessage`, `TaskStop`, `WebFetch`, `WebSearch` (deferred) | name only | trim | Mod `tool.describe` | L17 item 3, tx1: `ToolSearch` loads the Mod text; paid tasks matched stock; task 5.21 |
| `NotebookEdit` (deferred) | name only | keep deferred, trim | Mod `tool.describe` | L17 item 3, tx1: 1,644 to 1,306 bytes, paid task matched; task 5.21 |

Deferral (L17 item 5): `Read`, `Write`, and `Skill` defer with no loss, because the model calls each by name and the engine runs it (df-Read3). `Edit` and `ListAgents` defer at a cost, and `Agent` and `Bash` must stay sent. A Mod-deferred tool is absent from the engine's deferred list, so only a model that already knows the name finds it.

## Auto-mode classifier (L16)

Mark: keep trimming; if the fixed text cannot be trimmed, replace the classifier with a custom Mod hook (untested).

On the first-party API the server judges each call: the main request carries a 6,227-char `safeguards` block, and no classifier request is sent (L17 item 10 (f)). The local classifier runs only where the server gives no result (a gateway, the fake API), or for a call whose input a hook rewrote and every later call of that response (item 10 (g), paid-rw). Its system part is 140,281 chars with the stock rules (cl1). That splits into SOFT BLOCK 66,280 (72 rules), Evaluation Rules 14,682, User Intent Rule 14,288, Input 9,780, ALLOW 9,436 (16 rules), Definitions 9,168, HARD BLOCK 5,607, and Environment 4,659. Your own `autoMode` lists replace the defaults unless they hold `"$defaults"` (schema `chunk-h21zbzen.js:205542`). Under your user lists (7 allow, 9 soft_deny, 1 hard_deny, 2 environment), the system part is 63,413 chars (cl3). The other ~59K is fixed text, and no `autoMode` key trims it. The keys are `allow`, `soft_deny`, `hard_deny`, `environment`, and `classifyAllShell`.

Trim and replace results (L17 item 10): no env var of 38, hidden flag, Mod event, or `CLAUDE_INTERNAL_FC_OVERRIDES` gate trims the fixed text (cx-base, cx-fc, cx-fc2: 63,413 chars each). The custom Mod hook the mark names was built as a probe (`tool.check` judge on the user's `autoMode` lists, about 5,000 chars a call): it agreed with stock on 10 of 14 paid calls, 3 replies were unclear and fall back to stock, and 1 was stricter. On the first-party API it adds 1,725 billed tokens and 3.5 s to each ask against stock's no request and no charge, so it is cheaper only where the local fallback runs. By the goal's item 10 rule ("Adopt the Mod if it matches and costs less"), it is not adopted: the route is the stock server classifier with your `autoMode` lists, and claudetto ships no judge (task 5.28).
