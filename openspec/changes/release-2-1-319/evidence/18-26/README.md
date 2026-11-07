# 18.26 Cache advantage

Rows: 64 plugin sessions (33 from 18.20 round 7, `c3`-`c6`; 31 finished from the 18.6 rerun, called 18.23) and 30 base sessions (18.23). `c3` held no finished row. All on the paid subscription (`apiKeySource` none). Text is estimated at chars/4. `stdout.txt` `assistant` frames are deduped by `message.id`, last frame wins; a row is a `sessions.jsonl` row with a finished `stdout.txt`. The 18.23 rerun was still running, so later rows are not in these counts. Rerun: `bun analyze.ts /tmp/probe-18-20c3 ... /tmp/probe-18-23`. No paid call was made.

Scripts: `analyze.ts` (tables a, b, c and the break list), `frames.ts` (one run's frames), `probe.ts` (fake-API byte-diff of request bodies, `popup` runs it as the SDK host as 18.20 round 7 did, `--flag=value` adds a flag, `KEY=VALUE` adds an env var), `across.ts` (two sessions' first requests).

## (a) Cache write against the new tail, turns after the first

"Tail" = prior reply tokens (frame `output_tokens`, a lower bound) + new user-side text (tool result, denial, Stop feedback) at chars/4. chars/4 undercuts code and `xxxx` output by about 3x, so write above tail is expected on its own; the sure signal is `lost`: previous request's `read + write` minus this turn's `read`.

| arm | kind | turns | mean write | mean tail | turns with lost > 500 |
|---|---|---|---|---|---|
| base | tool result | 60 | 2441 | 770 | 0 |
| plugin | tool result | 205 | 1775 | 222 | 28 |
| plugin | Stop block | 35 | 466 | 332 | 0 |
| plugin | denial | 26 | 1296 | 75 | 5 |

Stop-block turns write 134 tokens above their tail on average and lose nothing: (a) holds for Stop blocks. The 33 turns with `lost > 500` are all turn 1 (the first request after the first tool call) of the 33 round 7 rows; none in the 31 plugin rows of 18.23, none in base. Each lost 3.9k tokens (3901 to 3929): `read` was 4471 on every one, where the previous request had totalled 8384.

## (b) First request, mean tokens

| arm | rows | write | read | total | read share |
|---|---|---|---|---|---|
| base | 30 | 5390 | 11160 | 16550 | 67.4% |
| plugin | 64 | 1803 | 6187 | 7990 | 77.4% |

Plugin first-request `read` values: 5624 x29 (18.23), 6782 x26, 7145-7173 x7 (round 7), 6407 x1, 0 x1 (the first 18.23 plugin session, which wrote the cache). Base: 11160 x30. In tokens the plugin reads fewer (6187 against 11160) because its whole first request is 8.0k against 16.5k; as a share of the request it reads more. Per-session values: the fake-API diff of two sessions' first requests in two folders (`across.ts`) shows `tools`, `system`, and `messages[0]` byte-identical; only `messages[1]`, the `# Environment` system message (working directory), differs, and it sits after the `system` markers. Nothing per-session is ahead of the breakpoint. The plugin's write at the first request (1.8k) is that message, the prompt, and the reminders.

## (c) Per-session cache-read share of input, read / (input + write + read)

| arm | Stop blocked | sessions | mean per-session | pooled | mean turns |
|---|---|---|---|---|---|
| base | no | 30 | 82.6% | 82.6% | 3.0 |
| plugin | no | 41 | 83.2% | 84.6% | 5.0 |
| plugin | yes | 23 | 85.0% | 85.6% | 5.4 |

Plugin is at or above base in each row of this first cut (18.23 rows then in); see "Later sets" for the complete 18.23 runs, where it is not.

## Break: turn 1 of the round 7 rows

Hypothesis H1: the `tools` array of the second request differs from the first, because `read` stops at 4471 and the previous total was 8384 (tools come first in the prefix).
Prediction: on the fake API with the round 7 tool set, request 2 and request 3 differ in `tools`.
Command: `bun probe.ts /tmp/probe-18-26c plugin popup --tools=Read,Write,Edit,Glob,Grep,AskUserQuestion`.
Result: 10 tools in both (the 9 of the round 7 init, plus the engine's `DeferredToolPlaceholder`). `tools` differ at byte 4498, the end of `AskUserQuestion`: request 2 sends it in full (4498 bytes), request 3 sends it with `"defer_loading":true` (4519 bytes) and a new system message "The following tools just became available" with a `tool_addition`. `AskUserQuestion` is the first tool, so every later tool, `system`, and `messages` miss. Confirmed H1.

Hypothesis H2: the cause is the `tool.describe` hook in `hooks/delegation.ts` that returns `isDeferred: true` for `AskUserQuestion`.
Prediction: with that hook removed, `tools` are byte-identical in requests 2 and 3.
Result (hook removed in the tree, then restored with `git checkout`): `tools: kept`, `AskUserQuestion` 4498 bytes in both. Confirmed H2.

Hypothesis H3: the flip happens only when `ToolSearch` is not in the tool set. Round 7 passed a `--tools` list without it; the 18.23 rows (no `--tools`, 26 tools) have no turn-1 loss, and have no `AskUserQuestion` (print mode drops it).
Prediction: with `ToolSearch`, `Bash` and `Monitor` added to `--tools`, `tools` stay identical with the hook in place.
Command: `bun probe.ts /tmp/probe-18-26g plugin popup --tools=Read,Write,Edit,Glob,Grep,AskUserQuestion,Monitor,Bash,ToolSearch`.
Result: `tools: kept`; `AskUserQuestion` and `Monitor` are left out from request 1 (deferred) and a "deferred tools are now available" system message is appended after the first tool result. Confirmed H3. The shipped settings do not deny `ToolSearch`.

So the break is a property of the `--tools` list, and any user who passes one without `ToolSearch` hits it. Fixed in round 3 (see "Round 3"): the plugin defers a tool only when `ToolSearch` is in the session's tools. Round 8 used the same `--tools` list, so it did not test the fix; a paid rerun must.

Not a break: the fake API byte-diff shows `messages[1]`, the `# Environment` system message, changing from block form (with `cache_control`) to string form between requests 1 and 2. The spec leaves that form out; the real rows (18.23, no loss at turn 1) show the API reads through it.

## Later sets (18.23 complete, 18.20 round 8)

Same script, one set at a time: `bun analyze.ts /tmp/probe-18-23`, `/tmp/probe-18-23b`, `/tmp/probe-18-20c8`, `/tmp/probe-18-20c4 c5 c6`. Each 18.23 set has 30 base and 30 plugin rows, plus one earlier plugin warm-up row in the first (31); counts below are as the script finds them.

(a) turns after the first, mean write / mean tail (tokens), and turns with lost > 500:

| set | arm | kind | turns | write | tail | lost > 500 |
|---|---|---|---|---|---|---|
| 18.23 | base | result | 60 | 2441 | 770 | 0 |
| 18.23 | plugin | result | 74 | 2208 | 446 | 0 |
| 18.23 | plugin | Stop block | 14 | 150 | 134 | 0 |
| 18.23 | plugin | denial | 5 | 203 | 32 | 0 |
| 18.23b | base | result | 61 | 2405 | 757 | 0 |
| 18.23b | base | denial | 3 | 193 | 60 | 0 |
| 18.23b | plugin | result | 62 | 2473 | 772 | 0 |
| 18.23b | plugin | Stop block | 10 | 150 | 134 | 0 |
| 18.23b | plugin | denial | 1 | 192 | 67 | 0 |
| 20c4-c6 | plugin | result | 131 | 1531 | 96 | turn 1 of all 33 rows |
| 20c4-c6 | plugin | Stop block | 21 | 677 | 464 | |
| 20c4-c6 | plugin | denial | 21 | 1556 | 86 | |
| 20c8 | plugin | result | 119 | 1552 | 85 | 33 turns, all turn 1, 3883 to 3923 lost |
| 20c8 | plugin | Stop block | 22 | 704 | 484 | |
| 20c8 | plugin | denial | 14 | 1382 | 64 | |

18.23 Stop-block turns write 16 tokens above their tail on average (150 against 134), so (a) holds there: a Stop block costs what it says. Round 8 (20c8) used the round 7 `--tools` list and has the same break on every row (read 4471, 3.9k lost); that confirms H3 on a second set, so round 8 did not test the fix.

(b) first request, mean tokens:

| set | arm | rows | write | read | read share |
|---|---|---|---|---|---|
| 18.23 | base | 30 | 5391 | 11160 | 67.4% |
| 18.23 | plugin | 31 | 2100 | 5468 | 72.2% |
| 18.23b | base | 30 | 5397 | 11160 | 67.4% |
| 18.23b | plugin | 30 | 1919 | 5650 | 74.6% |
| 20c4-c6 | plugin | 33 | 1524 | 6862 | 81.8% |
| 20c8 | plugin | 33 | 1579 | 6793 | 81.1% |

(c) per-session read share (mean per session / pooled):

| set | arm | Stop blocked | sessions | mean | pooled | mean turns |
|---|---|---|---|---|---|---|
| 18.23 | base | no | 30 | 82.6% | 82.6% | 3.0 |
| 18.23 | plugin | no | 17 | 81.7% | 82.7% | 3.7 |
| 18.23 | plugin | yes | 14 | 84.2% | 84.5% | 4.4 |
| 18.23b | base | no | 30 | 83.1% | 83.3% | 3.1 |
| 18.23b | plugin | no | 20 | 78.2% | 78.2% | 3.0 |
| 18.23b | plugin | yes | 10 | 85.1% | 85.4% | 4.3 |
| 20c4-c6 | plugin | no | 24 | 84.2% | 85.5% | 5.9 |
| 20c4-c6 | plugin | yes | 9 | 86.3% | 86.6% | 7.1 |
| 20c8 | plugin | no | 20 | 82.7% | 84.6% | 5.3 |
| 20c8 | plugin | yes | 13 | 85.5% | 86.3% | 6.3 |

Read plainly: on 18.23, plugin sessions that no Stop hook blocked read less of their input than base (81.7% and 78.2% against 82.6% and 83.1%, means), and sessions with a block read more (84.2%, 85.1%). The unblocked plugin sessions are short (3.0 to 3.7 turns) and their first request writes 1.9k to 2.1k that a short session does not amortise; base writes 5.4k at its first request but reads 11.2k of it. So the earlier claim "plugin at or above base in each row" holds only for the pooled blocked rows and the round 7 and 8 rows (which carry the 3.9k break and still pass because they run 5 to 7 turns); it does not hold for the short unblocked 18.23 sessions. Every first request of 18.23 plugin sessions reads 5624 (29 of 30 per set), so the write at turn 0 is the plugin's own text, not a break.

## Subagent TTL, `experimental.cacheTtl: 1h`

Spelling: cc-inspect `code search cacheTtl` (module `chunk-24jdhyyr.js`): the agent schema is `experimental: { cacheTtl: "5m"|"1h" }` ("Prompt cache TTL for this agent's requests when no `subagentPromptCacheTtl` setting or env var is set. 1h is ignored while a Claude subscription is in overage"); the frontmatter loader copies it to `cacheTtl` on the agent. In a file it is two lines: `experimental:` then `  cacheTtl: 1h`.

Hypothesis H4: with the key in the frontmatter of `claudetto:Artemis`, the subagent request carries `ttl: 1h` on its 3 markers; without it, 5m (no `ttl`).
Prediction: request for the subagent shows 3 markers, 0 with 1h before the edit and 3 with 1h after; the main-loop requests stay 3 and 0.
Command (the plan's Agent step needed `match: {hasTools: true}`, because the haiku title request took the first step otherwise and the run ended with 0 subagent requests): `bun probe.ts /tmp/probe-18-26i plugin agent` before the edit, `/tmp/probe-18-26j` after. The reply is scripted: one `Agent` tool_use for `claudetto:Artemis`, foreground.
Result: before, `#3 claude-sonnet-5-5 3 tools (Read,Grep,Glob) markers 3, 1h 0`; after, `#3 ... markers 3, 1h 3`. Main requests `#2` and `#4`: markers 3, 1h 0 both times. Confirmed H4. (The fake key hides the subscription's own 1h on the main loop, so main shows 0 here; the paid rows show 1h writes.)

The line went into `agents/Artemis.md`, `Metis.md` and `Heracles.md` (Metis and Heracles share the loader, but only Artemis was run through a subagent request). Fits Pro and Max (flat plan, reads at 5m or 1h cost the same to the user; 18.25 makes the plugin subscriber-only); an API key would pay 2x on each 1h write, and this is ignored while the subscription is in overage.

Test: `tools/manifest.test.ts`, "the <name> agent asks for a one hour prompt cache" for each of the three agents, which reads the file and expects `experimental:\n  cacheTtl: 1h` in the frontmatter. It is a `bun test` file, not a lab test, because the lab cannot read the agent files: I tried `node:fs` in `hooks/delegation.test.ts` (load error "a hooks module imports its own files by relative path and claude-code, nothing else"), a `with { type: "text" }` import of the `.md` ("is not named like code and was not loaded"), and a stubbed `$.fs.read` (the lab answers `fs.read` only from a test's own stub). `tools/manifest.test.ts` already holds the checks of plugin files the lab cannot read. Mutant: Metis `cacheTtl: 5m` fails that agent's test (`Expected to contain "\nexperimental:\n  cacheTtl: 1h"`), the other 5 pass; restored, 6 pass. `claude plugin validate --strict plugins/claudetto` passes with the key. The full lab ran before the test moved (1199 pass, 2 fail: the `node:fs` load error above, and one `setup` test at 5.8 s, a load timeout that passes alone); `delegation.test.ts` and `setup.test.ts` pass on their own after the move. `biome` could not run in the worktree (no `node_modules`).

## (d) Settings, env vars and flags that change cache TTL or breakpoints

Sources: the page `how-it-works/request-and-cache` (clawdipedia docs, 2.1.316) and cc-inspect `surface env CACHE` on the installed 2.1.319.

| Name | Effect | Source |
|---|---|---|
| `promptCacheTtl`, `CLAUDE_CODE_PROMPT_CACHE_TTL` | `5m` or `1h` for the main conversation; unset is 1h on a subscription within plan usage, 5m on an API key | docs, cc-inspect |
| `subagentPromptCacheTtl`, `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` | `5m` or `1h` for subagents, workflows, forks, compaction, titles; unset is 5m | docs, cc-inspect |
| `ENABLE_PROMPT_CACHING_1H` | asks for 1h in both groups; lower priority than the two above | docs |
| `FORCE_PROMPT_CACHING_5M` | forces 5m, beats the others | docs |
| `DISABLE_PROMPT_CACHING` (+ `_HAIKU`, `_SONNET`, `_OPUS`, `_FABLE`, `_MYTHOS`) | turns caching off | docs |
| agent frontmatter `experimental.cacheTtl` | `5m` or `1h` for that agent's requests when no subagent setting or variable is set; ignored for 1h in overage | docs (undocumented upstream) |
| `CLAUDE_CODE_MESSAGES_PROMPT_CACHE_TTL` (enum `5m`) | in the env schema, no source says what it does | cc-inspect |
| `CLAUDE_CODE_NORMALIZE_PREFIX_CACHE`, `_VERIFY` | in the binary; no page; not tested | cc-inspect |
| `CLAUDE_CODE_SUBAGENT_CACHE_EVICT`, `CLAUDE_CODE_RESUME_CACHE_WARM` | in the binary; no page on their effect | cc-inspect |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | removes the mid-conversation marker | docs |
| `--exclude-dynamic-system-prompt-sections` | moves working folder, env, memory paths, git status from `system` into the first user message | docs |
| `cache-keepalive-2026-09-03` beta, `/v1/messages/cache_touch` | subscriber login only; touches the cache every 30 s | docs |

Probe on the fake API with a fake key (main markers have no `ttl` then): `ENABLE_PROMPT_CACHING_1H=1` and `CLAUDE_CODE_PROMPT_CACHE_TTL=1h` each change the 3 markers of the main request from 0 to 3 with `"ttl":"1h"` (`probe.ts`, requests 2 and 3). The `1h` writes in the paid rows (`ephemeral_1h_input_tokens`) show the main conversation already gets 1h on the subscription, so the main-session variable adds nothing for Pro and Max. The open candidate is the subagent TTL (5m unset): the plugin ships three subagents (`Artemis`, `Metis`, `Heracles`), so `experimental.cacheTtl: 1h` in their frontmatter, or `ENABLE_PROMPT_CACHING_1H`, would keep their prefixes for an hour. My first fake-API run of the `Agent` call did not reach a subagent request (the title request took the plan's step); with `match: {hasTools: true}` it does, and the section above measures the effect. For an API-key user 1h costs 2x on each write, so it fits Pro and Max (flat plan). Applied to the three agents; reads on a real subagent request are not measured.

## Round 3: deferral guard, cost-weighted input, exact tail

### Deferral only with ToolSearch
Change: `deferral($)` in `hooks/surface.ts` (a function declaration; the loader follows `$` across an import only into one) returns `{ isDeferred: true }` when `$.tool.list()` names `ToolSearch`, else `{}`. `surface.ts` (Skill, Workflow, ScheduleWakeup, ReportFindings) and `delegation.ts` (AskUserQuestion, Monitor; one hook replaces two) use it. The cc-inspect source showed `$.tool.list()` as the way a hook learns the session's tools.
Hypothesis: with the round 7 `--tools Read,Write,Edit,Glob,Grep,AskUserQuestion`, `tools` are byte-identical across requests. Command: `bun probe.ts /tmp/probe-18-26o plugin popup --tools=Read,Write,Edit,Glob,Grep,AskUserQuestion`. Result: `AskUserQuestion` full in both main requests, `tools: kept` (before the fix: differ at byte 4498, `/tmp/probe-18-26c`). Control with `ToolSearch` and `Monitor` added (`/tmp/probe-18-26p`): `AskUserQuestion` left out of request 1, `tools: kept`. A first attempt with an arrow function failed to load the hooks module, so it proved nothing; the declaration form loads.
Tests: `delegation.test.ts` (deferred with ToolSearch; in the list without) and `surface.test.ts` (same, for each DEFERRED_TOOLS entry). Mutant `|| true` in `deferral` (always defer) fails the no-ToolSearch delegation test ("Expected: undefined, Received: true"); restored.

### Clauses (b) and (c): the first request
Claim: the plugin's first request is about half of base's, so the absolute read and the share both drop. Checked on the rows: first request total is 7.57k against 16.55k (46%), and the absolute read is 5.6k against 11.2k, so the absolute read drops. The share does not drop in (b): 72.2% and 74.6% against 67.4%. In (c) the per-session share is lower only for unblocked plugin sessions (81.7%, 78.2% against 82.6%, 83.1%), which run 3.0 to 3.7 turns, so the first request's 1.9k write weighs more. The claim is half right: the absolute read is lower, the share is not (b) and is a little lower in (c).

Cost-weighted input per session (`analyze.ts` section (e)): read x0.1 + 1h write x2 + 5m write x1.25 + input; mean [95% percentile bootstrap, 10000 resamples, seed 1].

| set | arm | sessions | session cost | first-request cost |
|---|---|---|---|---|
| 18.23 | base | 30 | 25415 [25127, 25649] | 11899 [11897, 11901] |
| 18.23 | plugin | 31 | 18760 [17801, 19931] | 4748 [4307, 5486] |
| 18.23b | base | 30 | 25773 [25295, 26316] | 11912 [11910, 11914] |
| 18.23b | plugin | 30 | 17270 [16805, 17772] | 4405 [4305, 4456] |
| 20c4-c6 | plugin | 33 | 23555 [21914, 25270] | 3736 [3627, 3827] |
| 20c8 | plugin | 33 | 21277 [19768, 22900] | 3840 [3794, 3866] |

On 18.23 and 18.23b the plugin costs 26% and 33% less input per session than base, with intervals that do not overlap. The 20c sets have no base arm and carry the 3.9k turn-1 break, so they cost 1.2k to 6k more than the clean plugin sets.

### Is the static prefix read on the first request of later sessions?
Plugin first-request `read`, 18.23 + 18.23b (61 plugin rows): 5624 x58, 6406 x1, 6407 x1, 0 x1. Write is 1940 to 1948 on those rows (1160 on the two with read 6406/6407, which cached more of the messages); read + write is 7566 to 7574. So in 59 of 60 sessions after the first, the whole 5624-token prefix (tools and system, up to the last static marker) is read and the write is the messages and env message. The one 0 is the first session of the set, which wrote everything (7569). The 5624 is the read the API reports at the marker; I did not tokenize tools and system separately, so "every token" is shown by the read being the same value in 58 rows and the write being the same small value, not by a token count of the prefix.

### (a) Stop block tail, exact
The fake API cannot count tokens: it returns the usage the plan scripts, with no tokenizer, and `count_tokens` is a real API route (needs a key; no paid run). The closest exact measure is the API's own accounting: a request's total (input + write + read) minus the previous request's total is the previous reply plus the new user text, in the API's tokens. `analyze.ts` section (g), turns with `lost <= 500`:

| set | block turns | mean write | mean exact tail | mean chars/4 tail |
|---|---|---|---|---|
| 18.23 | 14 | 149.6 | 151.6 | 133.6 |
| 18.23b | 10 | 150.2 | 152.2 | 134.2 |

Three blocks of 18.23 (write / exact / chars/4): 146/148/130, 142/144/126, 155/157/139. The estimate undercounts by 18 tokens a turn, and the write is 2 below the exact tail (the uncached `input` tokens). So a Stop block writes 150 against an exact tail of 152: (a) holds, and the 16-token gap was the chars/4 estimate. In 20c8 the tails are larger (write 648, exact 650, chars/4 503).

Files: `plugins/claudetto/hooks/surface.ts`, `delegation.ts`, `surface.test.ts`, `delegation.test.ts`, `evidence/18-26/analyze.ts`.

## Paid rerun with the fix

Hypothesis (written before the run): commit 55ba1d49 (`deferral` in `hooks/surface.ts`) stops the turn-1 cache loss, because with no `ToolSearch` in the session's tools the plugin defers nothing, so `tools` stay byte-identical between requests 1 and 2.
Prediction: with the round 7 `--tools` list (`Read,Write,Edit,Glob,Grep,AskUserQuestion`, no `ToolSearch`), turn-1 lost is at most 500 tokens on every plugin row (round 7 lost 3901 to 3929 on all 33). Plan: 6 plugin sessions (prompts p17, p16, p03, p06, p04, p20 of `../18-20/prompts-round10.json`, the cheapest in round 10), subscription, `apiKeySource` must be "none" in each stdout.txt, stop if total tokens near 300k. Approved by the user in the popup on 2026-11-07 (6 sessions, under 300k tokens).
Harness note: `../18-8/probe.ts` hard-codes `ToolSearch` into `--tools` since round 9, so the run uses a copy of it in `/tmp/probe-18-26r` with only the `--tools` string and one import path changed. The round 7 seed is gone from `/tmp`, so the sandboxes are empty.
Run (two batches, the second after the first showed 158,264 tokens for 3): `bun --env-file=.env /tmp/probe-18-26r/probe-r.ts --run --popup --plugin-only --mode acceptEdits --root /tmp/probe-18-26r --out /tmp/probe-18-26r/out --plugin plugins/claudetto --prompts openspec/changes/release-2-1-319/evidence/18-20/prompts-round10.json --only p17,p16,p03` and the same with `--out .../out2 --only p06,p04`. Analysis: `bun 18-26/analyze.ts /tmp/probe-18-26r`.
Deviation: 5 sessions ran, not 6. The sixth (p20, about 55k tokens) would have taken the total past the 300k bound (5 sessions: 273,110 tokens, $0.145 at list price, subscription). Prompts run: p17, p16, p03, p06, p04.
Result: `apiKeySource` is "none" in 5/5 stdout.txt. The break list is empty. Turn 1 per row (request 2 after the first tool call; read / write / lost = previous read + write minus this read): 8422 / 271 / 0, 8434 / 333 / 0, 8441 / 204 / 0, 8444 / 448 / 0, 8435 / 426 / 0. First-request read 6782 x5. Stop-block turns write 351 against a 325 tail (3 turns), none lost.
Verdict: prediction held (lost 0, at most 500 on 5/5 plugin rows; round 7 lost 3901 to 3929 on 33/33 with the same `--tools` list). H3 and the round 3 fix are confirmed on the paid API for a `--tools` list without `ToolSearch`. Limits: 5 rows, empty sandboxes (the round 7 seed is gone), so sessions are shorter than round 7.

## Process check (18.17)

Hypothesis: `probe.ts` stops its fake API in `finally`, so no process outlives it. Prediction: `ps` lists nothing naming the run folder or the script after a run.
Command: `bun probe.ts /tmp/probe-18-26z plugin popup --tools=Read,Write,Edit,Glob,Grep,AskUserQuestion`, then `ps -axo pid,command | grep -E 'probe-18-26z|18-26/probe'`.
Result (2026-11-07): exit 0, 0 processes.
