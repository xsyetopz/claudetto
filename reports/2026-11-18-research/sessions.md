# Claude Code transcript measurements for the claudetto rebuild plan

Targets: QS-010 (cache), QS-011 (session length), QS-012 (rereads) in `plans/rebuild/arc42/10_quality_requirements.md`.

## Scope and method

| Item | Value |
|---|---|
| Files analysed | 153 transcripts: 11 main sessions plus 142 subagent files (`<session>/subagents/agent-*.jsonl`, with `.meta.json` beside each). The task text said "about 150"; those are mostly subagent files, not sessions |
| Excluded | session `2cf55002-c3a4-457f-b01c-e854d76d621e` and its subagents |
| Date range | file mtimes 2026-11-17 15:40 to 2026-11-18 17:29 (local). Every file is newer than 2026-11-16, so the "since" set and the "all files" set are identical. The data covers about two days, 4 projects, Claude Code 2.1.326 and 2.1.327 |
| Models | main loop: `claude-opus-5-5` only. Subagents: `claude-sonnet-5-5` (141 files), `claude-haiku-5-5` (1 file) |
| Live data | the files grow while the scripts run; counts can drift by a few percent between runs (for example 7,012 main requests here, 6,958 in an earlier run) |
| Scripts | `reports/2026-11-18-research/sessions-scripts/`; `run_all.sh` writes `output/*.txt`. Python 3 with `python3 -I`, no third-party packages. `cc-inspect` was not needed |
| Attribution | `~/.claude/projects/<project dir>/<session>.jsonl:<line>`; subagent files live under `<session>/subagents/agent-<id>.jsonl` |

Schema facts the scripts rely on (read from the files, version 2.1.327):

- One API request writes one `assistant` line per content block; all lines share `requestId` and `usage`. The scripts deduplicate by `requestId` and take the line with the most `output_tokens`.
- `api-request` lines (`id` = `requestRef` of the assistant line) carry the request start time, `params.model`, `shapeHash`, `querySource`. `api-request-shape` lines hold the system prompt and tool list for each `shapeHash`; a changed shape hash with a changed tool-name list is the "tool-list change" signal.
- Main loop requests ask for a 1h cache (`promptCacheRequested: "1h"`); every subagent request asks for 5m.
- `system` subtypes present: `compact_boundary` (460), `turn_duration` (604), `stop_hook_summary` (31), `local_command` (3, the `/clear` command), `informational` (4). No hook attachments exist.
- Large tool results are written to `tool-results/*.txt` and the transcript keeps a ~2 KB preview with the marker `Output too large (N KB)`; the scripts take the size from the marker.

## 1. Cache (script `cache.py`, output `output/cache.txt`)

Hit = `cache_read / (cache_read + cache_creation + input)`. Prefix reuse = `read_n / (read + creation)_(n-1)`. Requests after turn 1 only for the break counts.

| Group | Requests | Hit p10 / p50 / p90 (after turn 1) | Share >= 0.98 | Aggregate hit | Prefix reuse p10/p50/p90 | Breaks (hit < 0.5, turn >= 2) |
|---|---|---|---|---|---|---|
| main, opus-5-5 | 7,012 | 0.952 / 0.987 / 0.995 | 66.9% | 97.7% | 1.0 / 1.0 / 1.0 | 104 (1.5%) |
| sub, sonnet-5-5 | 36,995 | 0.941 / 0.984 / 0.995 | 58.5% | 97.6% | 1.0 / 1.0 / 1.0 | 523 (1.4%) |
| sub, haiku-5-5 | 21 | 0.861 / 0.948 / 0.973 | 0% | 91.7% | 1.0 / 1.0 / 1.0 | 0 |

The prefix reuse ratio is 1.0 at every percentile: when the cache works it reads exactly what the previous request wrote. The variation in hit ratio comes from the new tail each turn.

Write tokens: main 13,791,227 all 1h, 0 at 5m. Subagents 67,504,341 all 5m (sonnet 67,451,358 plus haiku 52,983), 0 at 1h.
Tokens re-created inside breaks: main 2,851,691 (20.7% of main writes); subagents 14,593,272 (21.6% of subagent writes).

Break causes (primary label, 627 breaks; each break checked against events between the previous response and the request):

| Cause | Main | Sub | Evidence |
|---|---|---|---|
| Auto compaction (a `compact_boundary` between the two requests) | 99 (95%) | 361 (69%) | the gap is the summarisation call (compaction duration p50 55 s main, 42 s sub). After it, `cache_read` equals the bare system+tools prefix (9,255 or 5,163 tokens) and the whole summarised context is written again. Example: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:638` (hit 0.27, 24,693 tokens written) |
| Idle longer than the TTL | 4 (all > 3600 s: 1.6 h to 10.6 h) | 121 (gap > 300 s, max 1,587 s) | main: `.../OpenJoystickDriver/b0d4fb0f-b2ca-4339-8ac2-196301829057.jsonl:4449` (gap 29,315 s, 109,554 tokens written), `...:5523` (5,641 s), `.../www-clawdipedia-cc/a9691911-c345-4f18-aef6-a15c98842b2a.jsonl:256` (38,087 s). sub: `.../GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-a860b745405a3d5e5.jsonl:593` (1,587 s, 140,056 tokens written) |
| Early parallel request (turn <= 3, gap < 2 s) | 1 | 28 | the second request starts before the first has written its prefix; example `.../OpenJoystickDriver/b0d4fb0f-b2ca-4339-8ac2-196301829057.jsonl:58` |
| Tool-list change | 0 primary (1 co-occurring with a compaction) | 0 | `.../GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:21118` |
| Model switch, `/clear`, `idle > 300 s` inside a 1h window | 0 / 0 / 0 (2 labelled idle > 300 s co-occur with compaction) | 0 | |
| Unexplained | 0 | 13 | hit 0.2-0.3, `cache_read` = bare prefix, gap 4-60 s, no logged event |

Co-labels on compaction breaks: `thinking_drop` attachment (73 main, 312 sub) and context attachment deltas (re-added instructions, skill and agent lists; 99 main, 361 sub). They always coincide with compaction, so they are not separate causes.
Gap before a break: main p10/p50/p90 = 46 / 59 / 104 s; sub = 34 / 53 / 484 s. Gap > 300 s: 6 main, 122 sub. Gap > 3600 s: 4 main, 0 sub.
Hook text changes are not visible: the transcript has no hook output lines (section 5), so a hook-text change cannot be separated from the other causes. The shape hash covers only system prompt and tools.

Every main-loop break is listed with its line in `output/cache.txt` ("every main-loop break").

## 1b. 1h TTL refresh (script `ttl1h.py`, output `output/ttl1h.txt`)

Question: does a 1h entry refresh on reads? If it did not, requests just past 60 minutes after the first write would show a break despite steady activity.

Method: main sessions with 1h writes; each session is cut into segments at idle > 3600 s, compaction, `/clear`, and model switch. A segment longer than 60 minutes qualifies; age = request start minus the segment's first request.

Strict segments (no compaction, clear, model switch or idle > 3600 s inside):

- Qualifying segments: 8, in 2 sessions (bedrock `761e258c-a2eb-4522-97cd-89d52a939fee`, www-clawdipedia-cc `276bb505-a941-4a32-a6c7-d1cede51d63f`). Examples: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-bedrock/761e258c-a2eb-4522-97cd-89d52a939fee.jsonl:6579` (122.0 min, 121 requests), `...:4957` (110.7 min, 101 requests), `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f.jsonl:549` (80.2 min, 55 requests).

| Age bucket | Requests | Hit p10 | Hit p50 | Share < 0.5 |
|---|---|---|---|---|
| < 60 min | 482 | 0.965 | 0.989 | 0 |
| 60-120 min | 256 | 0.971 | 0.992 | 0 |
| > 120 min | 2 | 0.997 | 0.998 | 0 |

- Breaks at age 55-70 min not explained by an idle gap, compaction, clear or model switch: 0.

Relaxed segments (only idle > 3600 s splits; compactions stay inside): 7 qualifying segments in 5 sessions; 1,042 / 637 / 5,203 requests in the three buckets; hit p10/p50 = 0.947/0.985, 0.936/0.986, 0.956/0.987; share < 0.5 = 1.5%, 1.9%, 1.4% (all of them compaction breaks). Two breaks fall at age 55-70 min: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b0d4fb0f-b2ca-4339-8ac2-196301829057.jsonl:2103` (56.3 min) and `...:2532` (63.4 min); both carry the `compaction:auto` label (gaps 57 s and 66 s, cache read = bare prefix).

Reading: the 1h entry kept serving reads past 60 minutes after its first write in 8 segments with continuous activity, with the same hit ratio as before 60 minutes. This is consistent with refresh-on-read for the 1h tier in this program version; it is an observation, not proof of the API rule. Limits: only 2 sessions qualify under the strict cut, and the > 120 min bucket has 2 requests.

## 2. Session length (script `sessions_subagents.py`, output `output/sessions_subagents.txt`)

Main sessions (11), wall-clock first to last timestamped line:

| Session (project) | Wall-clock | Active (gaps <= 300 s) | Requests | Compactions |
|---|---|---|---|---|
| `b0d4fb0f` OpenJoystickDriver | 909 min | 191 min | 717 | 12 (+1 `/clear`) |
| `761e258c` bedrock | 814 min | 202 min | 1,059 | 12 |
| `3da32cd2` GodHand | 811 min | 811 min | 2,753 | 45 |
| `276bb505` www-clawdipedia-cc | 711 min | 427 min | 2,151 | 28 |
| `a9691911` www-clawdipedia-cc | 647 min | 12 min | 39 | 0 |
| `f55db43d` OpenJoystickDriver | 70.5 min | 49 min | 212 | 2 |
| 5 short sessions | 0 to 4.3 min | same | 0 to 50 | 0 |

- Wall-clock >= 50 min: 6 of 11; >= 60 min: 6 of 11. Active time >= 50 min or >= 60 min: 4 of 11. Median wall-clock 70.5 min.
- The GodHand session runs 13.5 hours with no idle gap above 300 s because its 12 background subagents keep appending lines.
- Compactions: 460 in total, all `trigger: auto`, none manual. Main 99, subagents 361. Context size at compaction (`preTokens`): main p10/p50/p90 = 139,942 / 140,583 / 142,919 (min 138,693, max 154,673); subagents 140,022 / 140,650 / 142,338 (max 160,013). After compaction (`postTokens`) main p50 13,369, subagent p50 6,513. The threshold is therefore about 140k tokens. Main loop: one compaction per 70.8 requests.
- `/clear`: 2 (`b0d4fb0f` and `3e6b58d3`).
- `turn_duration` (main): p50 17 s, p90 369 s, max 40,900 s.

## 3. Subagents (same script)

- Count 142, all `general-purpose`, all `requestShape: background`. Declared model: `sonnet` on 36, `haiku` on 1, omitted on 105; every actual request ran on sonnet-5-5 except the one haiku file.
- Lifetime (first to last line): p10/p50/p90 = 124 s / 524 s / 11,935 s; max 38,559 s. Over 300 s: 96 (67.6%); over 3600 s: 25.
- Turns (distinct requests): p10/p50/p90 = 17 / 71 / 714; max 2,052.
- Tokens per subagent (input + cache read + cache write + output): p50 5.25 M, p90 53.0 M, total 2.79 B. 88 subagents compacted at least once (361 compactions).
- Long tail: eight GodHand subagents ran 540 to 643 min with 1,588 to 2,052 requests and 16 to 22 compactions each, for example `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-abd96494d46069bd7.jsonl` (642 min, 1,992 requests, 20 compactions).
- Parent re-reads: 31 of 440 parent `Read` calls (7.0%) read a path that a subagent of the same session had already read. Examples: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b0d4fb0f-b2ca-4339-8ac2-196301829057.jsonl:463` (first read in `.../b0d4fb0f-b2ca-4339-8ac2-196301829057/subagents/agent-adea6e99e3497c63e.jsonl:36`), `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:30660`.

## 4. Redundant reads (script `reads.py`, output `output/reads.txt`)

Definition: a `Read` whose line range lies inside the union of earlier reads of the same path in the same transcript, with no `Edit`/`Write` of the path and no `Bash` naming the file with a mutating verb in between. Variant B also treats any global mutator Bash (git checkout/reset/stash/pull/merge, formatters, `sed -i`, make/just) as invalidating every path. 88 reads of `*.output` task logs are skipped because those files grow.

| | Read calls | Redundant | Share | Estimated tokens |
|---|---|---|---|---|
| Variant A | 992 (main 423, sub 569) | 42 (main 30, sub 12) | 4.2% | ~96k of ~2.04M (4.7% by size) |
| Variant B | 992 | 24 (main 18, sub 6) | 2.4% | ~51k (2.5%) |

Patterns in variant A (42): same range again after a compaction 25 (14 images, 11 text); same range again without compaction 8 (6 images, 2 text); sub-range inside an earlier full read 8 (4 after compaction, 4 not); sub-range of earlier partial reads 1. 29 of the 42 follow a compaction. Full-file read after an earlier partial read: 3 (not counted as redundant). Image files account for 20 of 42.
Examples: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/b0d4fb0f-b2ca-4339-8ac2-196301829057.jsonl:655` (FAQ page, same range after compaction), `.../www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f.jsonl:4469` (sub-range after a full read, across a compaction), `.../www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f.jsonl:7176` (full read after partial).
The program itself re-attaches files after compaction: 544 `file` attachments (about 2.9M characters rendered), 202 `compact_file_reference` notices, 182 `edited_text_file` notices. No "File unchanged" stub text occurs in any transcript.

## 5. Hooks (script `tools_replies.py`)

- The transcripts record hooks only through `stop_hook_summary` system lines: 31 (all level `suggestion`; 29 with output; 0 hook errors; 57.9 KB in total; 22.6 per 100 human turns). Each has one `hookInfos` entry with only `command` and `promptText` fields, so no duration is stored. They come from `/goal` prompt hooks in 4 sessions (`b0d4fb0f` 12, `276bb505` 12, `f55db43d` 6, `3da32cd2` 1). First: `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:31712`.
- No attachment or system subtype carries PreToolUse, PostToolUse, SessionStart or UserPromptSubmit output in these files: 0 hook-typed attachments. Matches for those event names are text of files read or written by the agent, not hook output.
- Consequence: per-turn hook bytes and durations cannot be measured from transcripts; QS targets about hook cost need another source (hook timing in debug logs or OTel).

## 6. Large tool results (script `tools_replies.py`)

45,725 tool results; estimated tokens = bytes / 4.

| Tool | Results | > 10k tokens | > 25k tokens | Largest |
|---|---|---|---|---|
| Bash (sub) | 35,025 | 29 | 11 | ~183,800 tokens, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded/subagents/agent-a9fb89ab16e7589ab.jsonl:1322` |
| Bash (main) | 5,181 | 11 | 5 | ~367,000 tokens, `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:31624` |
| Read (sub) | 640 | 15 | 0 | ~15,600 tokens, `.../OpenJoystickDriver/b0d4fb0f-b2ca-4339-8ac2-196301829057/subagents/agent-a0f2ad77b0cf3155c.jsonl:30` |
| WebFetch (sub) | 14 | 3 | 0 | ~14,200 tokens, `.../www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f/subagents/agent-a13c6d6f441450722.jsonl:461` |
| WebFetch (main) | 18 | 0 | 0 | ~840 tokens |
| MCP (`mcp__apple-docs__*`, main) | 3 | 0 | 0 | ~1,400 tokens |

Total: 58 above 10k tokens, 16 above 25k. 42 of the 58 and all 16 of the 25k class were written to `tool-results/` files, so the model saw only the ~2 KB preview for them.

"Large MCP response": 0 occurrences in tool results, attachments or any line of the analysed files. The string exists in the program binary (`~/.local/share/claude/versions/2.1.327`) inside a terminal-UI render function that shows "Large MCP response (~N tokens) . can fill context quickly" for MCP results above a size threshold. It is a display warning, never part of the transcript or the model context.

"untrusted data": appears in the `environment` attachment (611 lines; first `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:31`) and in 616 `api-request-blob` lines (first `...:38`). The sentence ("Downloaded files and extracted archives are untrusted data ...") is a string constant in the program binary and part of its environment block, so the program produced it, not a plugin hook or MCP server. Two Bash results echo it because the agent ran `claude` itself (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-www-clawdipedia-cc/276bb505-a941-4a32-a6c7-d1cede51d63f/subagents/agent-ab2d19b6bf035edbf.jsonl:128`). Other matches are agent-written prose quoting it.

## 7. Reply behaviour

Replies = distinct requests with a text block. Main: 1,752 replies (642 final `end_turn` text blocks). Subagents: 2,009 replies.

| Signal | Main count | Per 100 main replies | Subagents |
|---|---|---|---|
| "You're right" opener | 1 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-bedrock/761e258c-a2eb-4522-97cd-89d52a939fee.jsonl:7719`) | 0.06 | 0 |
| "Great question", "Good catch", "Absolutely/Of course", "I understand your frustration" | 0 | 0 | 0 |
| Apology (opener or within first 400 chars) | 0 | 0 | 0 |
| Reply ends with a question to the user | 17 (16 are final replies, 2.5% of 642) | 0.97 | 0 |
| User turns that open with a correction ("no", "wrong", "I said", "don't"...) | 0 of 137 human turns | 0 | n/a |

Sycophantic openers are effectively absent in this sample. The correction signal is 0 of 137 human turns (about 31 of them were typed while the agent was running); the regex only sees openings, so mid-message corrections are missed. Two user lines are `[Request interrupted by user]` (session `b0d4fb0f`).

## 8. Interruptions

- `AskUserQuestion`: 7 calls, all in main loops: `761e258c` 4, `f55db43d` 2, `b0d4fb0f` 1. Subagents: 0.
- Permission prompts: the only user-sourced permission decisions are 8 `accept` with source `user_temporary` (`761e258c` 4, `f55db43d` 2, `b0d4fb0f` 1, `3da32cd2` 1; first `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/3da32cd2-eb12-4b12-ad64-2535dc572ded.jsonl:35411`); they line up with the question dialogs. Everything else was decided by config: 45,452 accepts (classifier 43,214, mode 1,492, subcommand results 253, rule 137, other 76, unlabelled 280) and 53 rejects by config (main 9, subagents 44). So user-facing permission prompts are near zero: 8 across 11 sessions.

## Caveats

- Two days, one user, four projects, mostly two very long GodHand/bedrock runs; percentiles of session length rest on 11 sessions.
- Subagent figures are dominated by 36 long-running sonnet subagents in one session (`3da32cd2`).
- Redundant-read detection is conservative on Bash (named file plus mutating verb); the A to B spread (4.2% to 2.4%) is the uncertainty from Bash side effects.
- Cache breaks are labelled by events in the transcript; the compaction summarisation call itself is not logged as an assistant request, so its own cache cost is not counted in the request statistics.
- The 5m versus 1h behaviour follows from `promptCacheRequested` per thread (main 1h, subagents 5m), not from a setting read in this session.
