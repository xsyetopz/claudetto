# ISSUES.md

Problems found while working in this repository. An open entry moves to "Fixed" with the commit that fixes it.

## Open

### The classifier does not take an approval from the plan or an `AskUserQuestion` answer

The user picked "Approve the allowance" in `AskUserQuestion` for the `silent.spec.ts` change, and later "Gated tasks, no paid runs", and the classifier blocked the named edits each time. Setting `DEFAULT_MAIN_BODY_CHARS` to the 6,000 cap that the change's proposal records as the user's value was blocked three times as "Weaken a Guard". Writing a spec delta that describes these fixes was blocked as "Rewire the Agent".

### `AGENTS.md` asks before a paid run, against task 4.4

Task 4.4 of `release-0-3-0` removed the approval gate on paid runs and reports the cost after the run. `AGENTS.md:8` still says "Run a paid model call or eval by asking first". The line is the user's own, so it stays, and each paid run of this change was asked first.

### Two tasks of `release-0-3-0` no longer match their verify text

- 5.3 is ticked, but no cut landed: `output-styles/Concise.md` and the agent bodies grew instead, under raised caps.
- 4.5 states the size of `output-styles/Concise.md`, which grew to 1,958 characters after the task.

### A helper that takes `$` cannot leave its hook file

The engine follows `$` past an import only into a `function` declaration, and the project's `biome` config forbids `function` declarations. So `noteOffRow` stays in `plugins/claudetto/src/blocks/window/hooks.ts`, which a review asked to split. Moving it as an arrow failed the plugin load with `HooksError: $ is passed to "noteOffRow" … outside the hook's own file`.

### The built-in classifier denies with no reason

Twice on 2026-11-02 a `Bash` call was denied with "The server-side auto mode classifier judged this action dangerous (it gave no explanation)". The repeat-denial guard then refused the same call, so the work stopped with no fact to act on.

### The agent does not catch a wording defect in its own prompts

The user had to point out the "correction" wording above on 2026-11-02, after the agent had drafted, trimmed, and costed the same text over several sessions, and built a Stop-time judge to hold the rule that the wording undermines. The agent reads a rule's wording for length and tag shape, but not for what the words prime.

### The weekly limit ran out in five days

The transcripts under `~/.claude/projects/` hold 34,674 API calls from 2026-10-27 to 2026-10-31 and none on 2026-11-01. Priced with `claudekit/price/table.ts`, the `claude-opus-5` calls at the `claude-opus-5-5` row, they come to about $1,131: 46% cache reads, 30% output, 23% cache writes. The scripts are `/tmp/usage/sum.ts`, `/tmp/usage/daily.ts`, and `/tmp/usage/sessions.ts`.

The limit is spent in tokens, and the price is not what drives it. By amount, from 2026-10-27 to 2026-11-02 (35,491 calls, 3.20B tokens, `bun /tmp/usage/sum.ts`): cache reads 3.10B (96.8%), cache writes 78.9M (2.5%), output 23.5M (0.7%), uncached input 74k. Anthropic does not publish how the weekly limit weighs each type, so which of the areas below drains it most is unknown. By raw amount, the re-read of the whole context on every call is nearly all of it.

- Main sessions in this repository are 57% of it, and `claude-opus-5` main calls alone are 42%.
- Each call re-reads the whole context: about 130k tokens per call before 2026-10-30 15:00, with peaks of 225k at the auto-compact point, and about 82k after.
- The calls are many and small: 48 to 96 API calls per user message in the long sessions, such as 3,099 calls for 65 messages in `5007385e`, and 90% of those calls carry exactly one tool call. Session `65cef165` made 2,511 `Bash` calls.
- Output is mostly thinking and tool input: `5007385e` wrote 2.0M output tokens and 184k characters of visible text.
- Compaction ran 7 to 39 times per long session, and each one reads the full context.
- Stop hook feedback and classifier denials each cost a turn at full context: 118 feedbacks and 164 denials in `15437c12`, and 130 denials in `65cef165`.
- `/tmp` probe and eval runs are 5.6%.

Not in the transcripts, so unmeasured: the built-in auto mode classifier's requests, and the `claudetto-you-should-know` side agent. Fixes, in order of weight: batch independent tool calls into one turn, keep the working context small, and stop a Stop hook or classifier loop before it repeats. A Stop hook that blocks three times with no file written now shows a line naming `/goal clear`, and at a seven-day share of 90% the prompt hook tells the session to start no fan-out and no paid run.

Measured on 2026-11-02 with `just window-report`: the `classify` block made 240 calls of 656,084 tokens, 0.1% of the week's 557,907,721 tokens in the stores. So the `classify` block is not where the week went. The built-in classifier stays unmeasured.

The two classifiers never both judge a call: a probe on the fake Messages API showed that a `PreToolUse` hook verdict of `allow` leaves Claude Code sending no classifier request, where the same `Bash` call without the hook sent 10. The built-in classifier's frame is about 58,000 characters per call, against 5,572 for the `classify` block's rules, which are trimmed to that length under the `CLASSIFIER_RULES_CAP` test of 5,600. The A/B of `just eval --classifier --run` on the trimmed rules scored the `haiku` arm 120 of 120 at $0.0145, against 120 of 120 at $1.0528 for the `suite` arm, where the built-in classifier reads claudetto's lists. The user chose `haiku` as the default of the `classifier` option on 2026-11-02, and the option still ships `off`: its `allow` skips the permission prompt in every permission mode, because the `classic.PreToolUse` envelope carries no permission mode, and so a `haiku` default would also allow calls in `default` and `acceptEdits` mode without the user's prompt.

### Auto-compaction costs a full-context call on the session's model

Checked on 2026-11-02 with Claude Code 2.1.316 against `claudekit/api/fake.ts`, with `ANTHROPIC_DEFAULT_HAIKU_MODEL` and `ANTHROPIC_DEFAULT_OPUS_MODEL` set to marker names (`/tmp/probe-compact/`):

- A manual `/compact` in an Opus session sent 2 requests to `claude-opus-5-5`, with `max_tokens: 128000`, all 12 tools, and a last message that opens "CRITICAL: Respond with TEXT ONLY."
- An automatic compaction in a `--model claude-sonnet-5-5` session, set off by a fake `input_tokens: 990000`, sent 2 requests to `claude-sonnet-5-5`. Its boundary records `trigger: "auto"`, `preTokens: 990004`.
- No request went to a marker model. Compaction runs on the session's own model, never on Haiku. Issue `anthropics/claude-code#29550`, which asked about Haiku calls, was closed with no answer.
- The second request is a retry. The fake reply `ok` had no `<summary>` tags, and the retry appends "For this reply only: write what the instructions above ask for, with the summary inside <summary> tags." With a fake reply that has the tags, `/compact` sent 1 request (`/tmp/probe-cache/bodies.jsonl`, body 5). A real model that drops the tags pays for the full context twice.
- The compaction request repeats the last main request's `model`, `system`, `tools`, `thinking`, `context_management`, `output_config`, `max_tokens`, and `metadata`, and its messages 0 to 4 match byte for byte apart from `cache_control`. Its breakpoints are `system.1`, `system.2`, and the last assistant reply. The prefix is cache-eligible. A real hit needs a real API run.
- The CLI picks the cache TTL in `MTe()`: the env overrides, then `1h` for a subscriber only when the `querySource` is on `["repl_main_thread*","sdk","auto_mode","memdir_relevance"]`, which the server flag `tengu_prompt_cache_1h_config` can replace. Compaction's `querySource` is `"compact"`, so it writes at `5m`.

Amounts from 2026-10-27 to 2026-11-02, from the `compact_boundary` records under `~/.claude/projects/`: 434 compactions, 342 automatic, at a median of 183k and a peak of 440k tokens of context, 91.0M tokens in all. The first request after a compaction writes a mean 23.2k tokens to cache (median 8.5k, n=383, all transcripts), against 2.5k (median 2.0k, n=1,135) for the first request of a fresh session. So per compaction: about 183k read, or written on a miss; the summary, a mean 5.5k tokens, plus analysis and thinking, unmeasured; and about 21k more written afterwards than a fresh start writes. That is about 91M of the week's 3.20B tokens, 2.8%, plus about 10M of the 78.9M cache writes. Whether compaction calls are among the 35,491 calls that the transcripts count is unknown.

Two compactions in `15437c12` left 679 and 983 tokens (2026-10-31 13:14 and 2026-11-02 07:05). They came from this plugin's own summarizer, `plugins/claudetto/src/blocks/compaction/summary.ts` (`claude-haiku-5-5`, `SUMMARY_MAX_CHARS=4000`), and are terse "State of work" notes of 2,714 and 3,930 characters. Nothing was lost to a failure, but no user message is kept word for word.

Measured on 2026-11-02 against the real API, `claude-sonnet-5-5`, through a logging proxy (`/tmp/probe-real/`). A 286k-token session was built on the fake API and resumed with `--setting-sources project`, so no plugin ran:

| Request | Uncached input | Cache write | Cache read | Output |
| --- | --- | --- | --- | --- |
| A1, warm turn | 2 | 285,906 (`1h`) | 0 | 5 |
| A2, `/compact` | 2,461 | 273,210 (`5m`) | 12,230 | 1,692 |
| A3, first turn after | 2 | 17,129 (`1h`) | 0 | 5 |
| B2, handoff turn | 2 | 273,716 (`1h`) | 12,230 | 1,073 |
| B3, fresh session with the handoff | 2 | 4,266 (`1h`) | 12,105 | 4 |

- The compaction was one request. Its reply held the `<summary>` tags, so no retry ran. Thinking was 0 characters at effort `medium`, and the reply was 4,305 characters.
- One compaction and one handoff take about the same tokens. Each re-sends the whole context once, then starts a new context of about 17k tokens (A3 17.1k, B3 16.4k). The handoff wrote 619 fewer output tokens. What the handoff saves is the point where it runs, not the method: it can run at a smaller context.
- Both big calls missed the cache, because of how the run was set up. B2 was a forked resume that changed message 14, while A1's only message breakpoint was at message 15. A2's breakpoint sits on the last assistant reply, where the single warm turn A1 wrote no entry.

A second run settled the cache question: a 149k-token session, two warm turns, then `/compact` and one more turn, all on one session with no fork (`/tmp/probe-real/arms2.sh`, `usage2.jsonl`). It was first replayed free on the fake API, where `/tmp/probe-real/prefix.ts` showed the compaction request carrying the second warm turn's cache entry as an exact prefix, one block back from its own breakpoint.

| Request | Uncached input | Cache write | Cache read | Output |
| --- | --- | --- | --- | --- |
| W1, warm turn | 2 | 138,634 (`1h`) | 10,406 | 5 |
| W2, warm turn | 4 | 291 (`1h`) | 148,762 | 5 |
| `/compact` | 2,006 | 282 (`5m`) | 148,762 | 1,521 |
| First turn after | 2 | 6,596 (`1h`) | 10,281 | 5 |

- Compaction hits the cache when it follows a main turn in the same session. The API's lookback finds the entry the previous main request left one message before the compaction breakpoint. Only the compaction instructions (2,006 tokens) are new input.
- The billing header in system block 0 changes after a compaction (`cc_version=2.1.316.699` became `2.1.316.82d` on the fake API). On a first-party login it also carries per-request fields such as `cc_prev_req` and `cc_prompt_id`. The system prompt still came from cache (10,281 read), so the header does not enter the cache key. This is inferred from the hit, not read in a source.
- A handoff is no cheaper than a compaction that hits. Each is one full read of the context (148.8k) plus about 1.1k to 1.7k output, followed by a new context of 7k to 17k. A handoff made through a tool call costs one more full read, because the tool result needs another request before the turn ends. The handoff has to be the last reply's text, or a tool call that ends the turn, or it costs more than compaction. What a handoff buys is control of the content and the point at which it runs.
- This run used 467,596 tokens, about $0.63 at API prices: 0.015% of last week's 3.20B tokens, and 0.056% of the $1,131 week.

If the handoff takes fewer tokens, auto-compaction goes off (`autoCompactEnabled: false`), with no safety net kept.

### Every call re-reads the whole context

This is the main drain on the limit: 3.10B of the week's 3.20B tokens were cache reads (see "The weekly limit ran out in five days"). The tokens read are the number of calls times the context per call. Sources are under `www.clawdipedia.cc/docs/` and `external/`.

What the re-read is made of, over 30,999 main-thread calls since 2026-10-27 that read 3.351B prompt tokens (`/tmp/usage/reread.ts`, `reread-split.ts`). Each call's context growth is split across what it added, and it is re-read by every later call until the next compaction. Paid probe sessions under `/tmp` (the `claudetto-probe-*` eval rounds) are split from the user's projects, because they read 0.859B of the 3.351B (see "Paid probe rounds took a quarter of the week"):

| Part | Projects, 2.494B | Share | Probes under `/tmp`, 0.859B | Share |
| --- | --- | --- | --- | --- |
| Fixed prefix, the smallest prompt of each segment | 0.645B | 25.9% | 0.111B | 12.9% |
| Assistant output with thinking | 0.606B | 24.3% | 0.013B | 1.5% |
| `Bash` results | 0.462B | 18.5% | 0.005B | 0.6% |
| `Read` results | 0.291B | 11.7% | 0.690B | 80.4% |
| Assistant output without thinking | 0.178B | 7.1% | 0.019B | 2.2% |
| `queued_command` attachments | 0.072B | 2.9% | | |
| `mcp__plugin_cc-inspect` results | 0.049B | 2.0% | | |
| `output_style` attachments | 0.035B | 1.4% | | |
| `clawdipedia-docs` results | 0.028B | 1.1% | | |
| Every other part | | 0.9% or less each | | 0.4% or less each |

- In the projects, the fixed prefix of a session start is 17.0k tokens at the median. After a compaction it is 32.2k, so the summary adds about 15k (`/tmp/usage/base.ts`). Segments after a compaction carry 0.581B of the 0.645B, because they are long: 18,687 calls in 183 segments, about 102 calls each. A summary 10k tokens shorter would save about 0.19B, 7.5% of the projects' prompt tokens. A `-p` request in this repository with the user's settings carries about 26.7k characters of system prompt, tools, and reminders.
- Thinking stays in the context. The CLI sends `context_management` `{"type":"clear_thinking_20251015","keep":"all"}` whenever thinking is on, and no setting changes it. The context grows by a median 1.12 times the previous call's output. Clearing old thinking would rewrite earlier messages, which misses the cache, so the lever is less thinking: a lower effort, which keeps the cache on the 5.5 models (`how-it-works/request-and-cache.md`).
- Re-reads of an unchanged file are not a lever. The CLI already answers them with a stub ("file unchanged since your last Read"), and only 70 real repeats with full content occurred. An earlier count of 21.3% was wrong: it counted 2,780 duplicate `tool_result` lines in the transcripts.
- The `prompt_snapshot` attachment (79.1M characters) is a stored copy of the system prompt in the transcript. It is not sent.
- `Bash` is mostly reading files. By first word of the command, as a share of the `Bash` re-read (`/tmp/usage/bashcmd.ts`): `grep` 27.2% (2,855 runs), `sed` 9.4%, `cat` 7.0%, `ls` 5.5%, `python3` 4.6%, `echo` 4.1%, `just check` 3.5%, `for` 2.9%, `git diff` 2.9%, `git status` 2.3%, `wc` 2.2%. `grep`, `sed`, `cat`, `ls` and `wc` together are 51.3%, about 9.5% of the projects' prompt tokens. The built-in `Read` and `Grep` return the same text, so this is a matter of output size per call, not of the tool.
- The post-compaction prefix, by part, in characters per boundary over 183 automatic compactions (`/tmp/usage/postc.ts`): the summary 16,089, restored files (`file` attachments) 12,799, `invoked_skills` 4,003, user text 2,387, `instructions` 1,675, `output_style_instructions` 1,528, `plan_file_reference` 1,445, `skill_listing` 1,028, `agent_listing_delta` 911, `context_sections` 845, `deferred_tools_delta` 735. Summaries over 129 boundaries run p10 14,770, median 23,258, p90 30,652 characters. The summary and the restored files are 66% of the parts listed.
- The `output_style` reminder rides every attachment pass. `{"type":"output_style","style":"claudetto:Concise"}` appears 20,518 times with one value. The CLI (`lPr`) attaches it whenever `outputStyle` is not `default`, with the text `${name} output style is active. ${turnReminder ?? "Remember to follow the specific guidelines for this style."}`. A plugin's style cannot set `turnReminder`: only the built-in styles have it. The 1.4% is its re-read share, and no setting removes it short of the default style.

Result caps sized against the projects' transcripts (`/tmp/usage/levers.ts`). Each figure is the result tokens removed times the later calls that re-read them, at 2.4 characters per token, as a share of the projects' 2.495B. It does not count the extra calls the model makes to read the rest. Over all sessions, probes included, a `Read` cap at 4,000 characters gave 17.9%, which the probes' synthetic notes files inflate:

| Cap at | `Read` saves | `Bash` saves |
| --- | --- | --- |
| 4,000 characters | 4.4% | 4.2% |
| 8,000 characters | 2.5% | 1.8% |
| 15,000 characters | 1.2% | 0.4% |

Merging each single read-only call into the call before it saves 1.0%. Only 231 calls are a second read-only call in a row.

Each result cap works and keeps the cache, tested free on the fake API (`/tmp/probe-levers/run.sh`, a `Read` of a 59,893-character file and a `Bash` run with 18.9k characters of output). Every block of the previous request came back unchanged in each arm:

| Arm | `Read` result | `Bash` result |
| --- | --- | --- |
| Default | 63,791 characters | 18,892 characters |
| `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS=4000` | 14,311 characters (lines 1 to 227), plus a note with the next `offset` | 18,892 characters |
| `bashOutputMaxChars: 4000` | 63,791 characters | 2,241 characters: a preview and the path of the full output |
| `PostToolUse` hook returning a trimmed `updatedToolOutput` | 4,257 characters | 18,892 characters |

A paid A/B on 2026-11-02 measured the extra calls (`/tmp/ab/run.sh`, `gate.ts`, `report.ts`). Sonnet, `--setting-sources project`, one read-only task in a copy of this repository (find each `CLAUDE_CODE_*` variable that `plugins/` reads, and say what it changes), 3 runs per arm, interleaved. The cap arm set `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS=1100` (about 3.8k characters, checked on the fake API) and `bashOutputMaxChars: 4000`:

| Arm | Calls | Tool calls | Cache reads | Cache writes | Output | Total tokens |
| --- | --- | --- | --- | --- | --- | --- |
| Default, mean of 3 | 3 | 2 | 43,486 | 12,916 | 2,105 | 58,513 |
| Caps, mean of 3 | 5 | 7 | 80,809 | 8,626 | 2,750 | 92,195 |

- The caps cost 58% more tokens on this task. The model split its reads into ranged reads (5 to 9 tool calls against 2), and each extra call re-read the whole context. The tool results it took in were about the same: 12.1k to 15.4k characters per run in both arms.
- Both arms gave the same answer: `CLAUDE_CODE_TMPDIR` read at runtime, the other names only written into a settings snippet.
- The task is short, with a context of 15k to 30k tokens. In a long segment a trimmed result is re-read by more later calls, but each extra call also re-reads a larger context. This A/B does not settle that case. On the evidence here, a cap is not a lever.
- Cost: 452,124 tokens, 0.014% of last week's 3.20B, about $0.44. The estimate was 2.5M tokens. No request was refused.

- Fewer calls. 72% of calls carry exactly one tool call, at 48 to 96 calls per user message. Each independent tool call batched into one turn saves one full read. `CLAUDE_CODE_MAX_TOOL_USE_CONCURRENCY` (`configure/env-vars/tools-and-bash.md:82`, default `10`) only caps a batch the model already made. What the model batches is up to the prompt, which no setting controls.
- A smaller context per call. Compact or hand off earlier: `CLAUDE_CODE_AUTO_COMPACT_WINDOW` or `autoCompactWindow` (`how-it-works/context-and-compaction.md:60-61`). This user already sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=50`. A user report says compacting at 200K halved re-reading (`external/export-Follow-up on the 56% re-reading post…jsonl`). `claudekit/compaction-cost` replays a 120k threshold at −17.2% billed, with the post-compaction write counted (see "`compaction-cost` leaves tokens out of a compaction").
- Smaller tool results. `bashOutputMaxChars` (default `30000`), `BASH_MAX_OUTPUT_LENGTH` (`tools-and-bash.md:35`), `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` (`:74`), `MAX_MCP_OUTPUT_TOKENS` (`context-and-compaction.md:78`, default `25000`), and a `PostToolUse` hook that returns a trimmed `updatedToolOutput` (`extend/hooks/tool-events.md:115`). Each result stays in the context and is re-read on every later call.
- Cache safety. Each lever must keep the prefix: no change of model, tools, system prompt, or effort mid-session, and no rewrite of an earlier message (`how-it-works/request-and-cache.md`, "What Breaks the Cache"). Trimming a tool result as it arrives is safe. Editing an old one is a miss.

Built: a compaction that a hook answers with a handover, which removes the summarizer call and the restored files (see "The handover must hit the cache", "Built into the plugin"). Next: measure it on a long real session against core compaction.

### The handover must hit the cache

A cache miss on a full context re-writes all of it: 273k tokens in each big call of the run above. The handover may not miss.

What hits, from this repository's transcripts (`bun claudekit/usage/main.ts hit --since 2026-10-27 --until 2026-11-02T10:58`, 27,180 main-thread requests, the first request after a compaction left out): 89.83% read at least 95% of the prompt from cache, and 99.68% read at least half. The 87 misses wrote 5.0M tokens, 11.7% of all cache writes. 35 of them are a session's first request, with no earlier request in its file, and 14 came after a gap of more than an hour, the main thread's `1h` TTL. The earlier figure of 51 after an hour came from `/tmp/usage/hit.ts`, which measured a first request's gap from the epoch. A request hits when it extends the previous request's prefix byte for byte, within the TTL.

So the handover runs as a tool call inside the live session, in the turn that finished the work:

- No fork, `--resume`, subagent, or side query. Each of those rebuilds the prefix, and the run above lost 273k tokens to a forked resume that changed one message.
- Nothing before the call changes the model, system prompt, tool list, thinking, or effort, or rewrites an earlier message. Each starts a new cache.
- It runs within the hour after the last request.
- After `/clear`, the new session's system prompt and tools come back from cache (B3 read 12,105), so only the handoff text is written (4,266 tokens with the system note).

Compaction meets this when it follows a main turn in the same session. The second paid run read 148,762 tokens from cache and wrote 282. Its `5m` TTL applies only to those few new tokens.

A `session.compact` hook that answers `{ messages }` itself replaces the compaction with no model call (`extend/mod-api/calls/session.md:55`, `types/session/compact-measure-messages.md`). In the CLI a hook answer of kind `replaced` goes to `tWo`, which builds `{summaryMessages:[], messagesToKeep:[], attachments:[]}`, so no files are restored. The `post_compact` and `session_start` (`compact`) hooks still run. The claudetto `cheapSummary` path already answers this way, after its own Haiku call.

Checked free on 2026-11-02 with Claude Code 2.1.316 on the fake API (`/tmp/probe-handover/run.sh`, `check.ts`). One session ran three `-p` calls: a turn that reads a 13,893-character file and ends on a reply, then `/compact`, then "Go on.". The `mod` arm loads a mod whose hook answers with the last assistant reply as one user message:

| Arm | Requests | Summarizer requests | First request after |
| --- | --- | --- | --- |
| Core compaction, no mod | 5 | 2, each with the whole context | The summary (1,067 characters), and the read file restored (35,751 characters) |
| Hook answers with the last reply | 3 | 0 | The handover (82 characters) and the `/compact` record, nothing restored |

- Tools were identical in all requests of both arms. The system prompt differed only in the billing header suffix (`cc_version=2.1.316.606` became `48b`). The CLI derives that suffix from characters of the first non-meta user message (`nF`, salt `59cf53e54c78`), so it changes on every compaction and `/clear` alike.
- The header does not break the cache. The request's breakpoints are `system.1` and `system.2`, after the header. Across 184 real compactions, the first call after read a median 9,432 tokens from cache (p10 7,930), and session first calls read the same 7,930 from 44 different first messages (`/tmp/probe-handover/postcache.ts`, `firstcache.ts`). 7,930 tokens matches the tools and system prompt, about 33.7k characters. A read there means a hit at a system breakpoint despite a different header.
- So a handover written as the last reply, then compacted by a hook that answers with it, costs the cache-hit turn that writes it, and then a new context of the system prompt, tools, reminders and the handover. It makes no full-context summarizer call and restores no files. Per compaction that saves one full read of the context (a median 183k tokens) and about 12.8k characters of restored files that every later call re-reads.
Checked free on 2026-11-02 in interactive sessions on the fake API, driven through `claudekit/summary-cost/pty.py` (`/tmp/probe-idle/run3.sh`, plugins `trigger`, `answer`, `shrink`). `trigger` calls `$.session.compact({})` from `turn.complete` inside `$.clock.after(0, …)`, then `$.prompt.submit` with the next prompt:

- A plugin's own `$.session.compact` does not reach its own `session.compact` hook. With one plugin doing both, core compacted: a summarizer request and the read file restored.
- Another plugin's hook does answer it, in both `--plugin-dir` orders. The call resolves with no `usage` and the handover as the first message. Requests: 3 in all, no summarizer request, no restored file, the next prompt right after the handover. The hook answers only `trigger` `plugin`, so `/compact` and automatic compactions keep the normal path.
- Defect of that path: the first-turn context does not come back. Before, message 1 is an 8,913-character block with the environment, the model line, the deferred-tool list, and the skill list. After, only "Today's date is 2026-11-02." returns, and a later turn does not bring the rest back either (request 4). Core compaction sends them again. The hook's `e.messages` holds only the 4 conversation messages, so no `handle` can keep that block.
- Handing core a short transcript, `next({ ...e, messages: [handover, a short assistant reply] })`, gets the block's lists back. A single message is refused ("Not enough messages to compact."). Core then makes one summarizer request over 6,873 characters of messages behind the cached system prompt and tools, rewrites the handover as its summary, and still restores the read file (36,833 characters). That trades the full-context read for a small one, but the handover is no longer the agent's own text, and the restored files stay.

- Keeping the engine's own first user message by its `handle` fixes the defect (`/tmp/probe-idle/keep`): the hook answers `{ messages: [e.messages[0], handover] }`. The 8,913-character first-turn block comes back with the deferred-tool and skill lists, and stays on the next turn. There is still no summarizer request and no restored file. The request after holds 9,612 characters of messages against 43,220 before.
- That request's system prompt, tools, and first-turn block are byte-identical to the session's first request, apart from `cache_control`. The billing header keeps its suffix (`cc_version=2.1.316.606`), because the first user message is unchanged. Only message 0 differs: the engine joins the first prompt, the handover, and the next prompt into one user message. So the cache hits through `system.2`, and only the messages are written.
- The guard holds. With the same plugin loaded, a typed `/compact` reached the hook as `trigger=manual` and went to core, which sent its summarizer requests (`/tmp/probe-handover/guard.sh`).

- One plugin can do both through the command instead of the call (`/tmp/probe-idle/solo`). `$.command.run({ command: "compact" })` reaches the plugin's own `session.compact` hook, as `trigger` `manual`, and a flag the plugin sets just before the call tells it apart from a typed `/compact`. 3 requests in all, no summarizer request, no restored file, the first-turn block kept, and the header suffix unchanged. The flag has to be cleared in a `finally` as well, or a failed call leaves it set for the next typed `/compact`.

So the handover path is: the agent writes the handover as its last reply, and at idle the claudetto plugin sets its flag, runs `$.command.run({ command: "compact" })`, and its own hook answers with the first user message by `handle` plus the handover, then `$.prompt.submit` sends the next prompt. The cost is the cache-hit turn that writes the handover, then a new context of the cached system prompt and tools plus a few thousand tokens of messages.

Measured on 2026-11-02 against the real API, `claude-sonnet-5-5`, in an interactive session through the budget proxy `/tmp/ab/gate.ts` (`/tmp/probe-paid/run.sh real`, replayed first with `run.sh fake`). The `solo` plugin, with its flag cleared in a `finally`, handed over after a turn that read a 13,893-character file:

| Request | Uncached input | Cache write | Cache read | Output |
| --- | --- | --- | --- | --- |
| Preflight, 1 message | 0 | 0 | 0 | 0 |
| Turn 1, the `Read` call | 2 | 17,751 | 0 | 67 |
| Turn 1, the handover reply | 2 | 16,077 | 17,751 | 85 |
| First request after the handover | 2 | 4,176 | 13,881 | 4 |

- No summarizer request ran. The request after the handover read the system prompt and tools from cache (13,881) and wrote only the first-turn block and the messages (4,176). The file read before was not restored.
- Core compaction of the same session would have read the whole 33.8k context once more for its summary, written the summary, and then written the first-turn block, the summary, and the restored file again.
- Cost: 69,798 tokens, 0.0022% of last week's 3.20B, about $0.24 at API prices. The estimate was 100k. No request was refused.

#### Built into the plugin

`plugins/claudetto/src/blocks/compaction/handover.ts` holds the path above, wired in `compaction/block.ts`.

- The trigger is a main-loop reply that starts with `# Handoff` and a newline. A trigger on a file write was dropped, because the `Write` call adds one more full read of the context before the turn ends. The reply is saved to `.claude/claudetto/handoffs/handoff-YYYY-MM-DDTHH-MM-SS.md`.
- The hook is on `turn.complete` with the matcher `{ isAborted: [false] }`, because `window` already owns the unmatched `turn.complete` hook, and a plugin may register one per event. A `{ reason: ["answer"] }` matcher narrows the input so that `HookFor<"turn.complete">` no longer type-checks, so the hook checks `reason` itself.
- The hook is passed straight to `on(...)`. The host refuses `$` passed into an imported arrow function, and `biome` refuses a `function` declaration.
- A subagent's reply, an interrupted turn, a reply without the title, and a `precompute` compaction start nothing. A typed `/compact` after a handover goes to the engine. A failed or unanswered `/compact` sends no next prompt and logs one line. A refused next prompt logs that the conversation was compacted.
- The context-management block tells the model the reply layout and what follows it: 943 characters, 977 in the request JSON, up from 810 and 842 (`docs/prompt/footprint.md`).
- Checks on 2026-11-02: `just lint`, `just typecheck`, and `just validate` exit 0, `just lab` 229/229 and 41/41, `just test` 1390 pass and 1 fail. The failure is the untracked `tools/evals/__tests__/conduct.spec.ts`, which wants a missing `rules/claudetto-code.md` and eval case. It predates the handover.
- End to end on the fake API (`/tmp/probe-e2e/run.sh`), the working-tree plugin saved the handoff, compacted with no summarizer request, and the next prompt was answered. `system` was byte-identical across the handover.

### Message 0 is written again at each handover

After the handover, the engine joins the kept first message, the handoff, the `/compact` caveat, its stdout, and the next prompt into one user message 0 (`/tmp/probe-e2e`). So the messages part, the first-turn environment block with it, misses the cache at every handover. That is the 4,176-token write in the paid run above. It is small against a summary, but it repeats per handover.

Cause, read off the request bodies on 2026-11-02: when the engine joins two user messages, it adds `\n` to the first one's last text block (`"Read notes.txt."` became `"Read notes.txt.\n"`). The prefix breaks inside message 0. Message 1 is the engine's `role: "system"` environment message, which it builds from seven attachments (`environment`, `model`, `deferred_tools_delta`, `agent_listing_delta`, `mcp_instructions_delta`, `skill_listing`, `date`) and makes again after a compaction. It is 8,913 to 10,268 characters, and the session's first request put its breakpoint on it.

Fixed in `compaction/handover.ts`: the hook answers `[first message, an assistant line, the handoff]`. With the assistant line, messages 0 and 1 of the request after the handover match the session's first request byte for byte, tools and system too (`/tmp/probe-shared/prefix.ts`, on `/tmp/probe-idle/bodies-sep.jsonl` and `/tmp/probe-e2e/bodies.jsonl`). The only difference is the form: a string in place of a one-block array, which ordinary turns also change and still hit. The lab test asks for the three messages. It failed before the fix and passes after it.

What it buys depends on the cache entry at message 1 still being alive. The first request writes it at the `1h` TTL, and only the request after a handover reads it again. Of 394 compactions in the transcripts since 2026-10-27, 25 came more than 60 minutes after the previous compaction or the session's start (`/tmp/probe-shared/gaps.ts`), so about 94% would hit. The rest write messages 0 and 1 again, about 2.5k tokens, as before the fix. No Mod API call sets a cache breakpoint, so the plugin cannot keep that entry warm.

Not fixed on the real API. Two paid runs on 2026-11-02 (`/tmp/probe-paid/run.sh real sep`) both missed. The first request after the handover read 14,167 tokens, which is the tools and system only, and wrote 3,915 and 3,900, against 4,176 without the assistant line. In the second run the gate logged the bodies (`/tmp/probe-paid/bodies-real.jsonl`):

- Tools, system, and messages 0 and 1 match across all three main requests. All top-level fields match too, except `metadata` and the first request's `safeguards`.
- Request 2 read the entry at message 1 (17,753 = 14,167 + 3,586). Request 3 did not, though only 6 blocks lie between its breakpoint and the end of message 1.

So the cause is on the server side, and the bytes the plugin controls don't cause it. It is unknown. One hypothesis fits both: the entry at message 1 stops being found once request 2 has read it and written a longer one. A run that hands over right after the first request, with no tool call between, tests it, and it is below. The assistant line is necessary, since without it the bytes differ, but not enough. The miss costs messages 0 and 1, about 3.6k tokens, written instead of read, once per handover. Cost of the two runs: 69,829 and 69,805 tokens, 0.0044% of 3.20B together, $0.10 each at `claudekit/price` rates with `1h` writes.

Tested on 2026-11-02 (`/tmp/probe-147/run.sh`, working-tree plugin, `claude-sonnet-5-5`, no `handoverTokens`). The prompt asks for a reply that starts with `# Handoff` and calls no tool, so the session's first request is also the handoff reply. Free first: the same shape on the fake API (`/tmp/probe-e2e/run.sh`, 2 requests) counted 24,773 tokens at four characters to a token with `bun claudekit/paid-run/main.ts /tmp/probe-e2e/bodies.jsonl 0`, against a 300,000 cap. Three earlier paid sessions did not test it: "Wrap up with a handoff." made the model call `ToolSearch` and then the `handoff` tool (twice, 50,202 and 50,236 tokens), and a prompt that wrapped the text in `---` lines got a reply that did not start with the heading (17,635). The fourth session did:

| Request | Messages | Input | Output | Cache read | Cache write (`1h`) |
| --- | --- | --- | --- | --- | --- |
| 1, the handoff reply | 2 | 2 | 28 | 12,776 | 4,841 |
| 2, after the handover | 4 | 4 | 6 | 13,532 | 4,353 |

The handoff file was saved and the `/compact` answered `[first message, assistant line, handoff]`. Request 2 matches request 1 in tools, system, and message 0 byte for byte, and message 1 in text (an array of one block against a string, as above). It read 13,532, which is 756 tokens more than request 1 read from the earlier sessions' entry, and it wrote 4,353 again. So messages 0 and 1 were not read, with no request between the write and the next request. The hypothesis that a read followed by a longer write loses the entry is wrong, and the miss is not about a second request at all. The cause stays unknown and server side. The plugin has no further byte to change, except possibly the form of message 1 (a string where request 1 sent a one-block array), which no run has isolated: it is the one difference left, and a run that sends the one-block form would test it.

Cost of this session: 35,542 tokens (6 input, 34 output, 26,308 cache read, 9,194 cache write), $0.04. All four sessions: 153,615 tokens (24 input, 998 output, 113,199 cache read, 39,394 cache write), $0.18, 0.0048% of 3.20B. The free count of 24,773 is the fake-API tokens at four characters to a token, against 17,647 and 17,895 billed for the two requests (35,542 together); it is a size to compare with the cap, not a bill.

### A handover costs half of a core compaction at 166k tokens

Measured on 2026-11-02 on one session shape, run in two arms (`docs/evidence/handover-vs-compaction.md`, `/tmp/probe-148`): seven `Read` results of about 21,200 tokens each, a turn that ends at 166,011 tokens of context, then a compaction and one prompt. Counted free first on the fake API (888,236 and 890,150 tokens against 8,000,000 allowed), then paid.

| Per compaction cycle | Handover | Core `/compact` |
| --- | --- | --- |
| Compaction request: input, output, cache read, cache write | 47, 510, 166,011, 22 | 23,091, 800, 144,849, 66 |
| Next prompt: input, output, cache read, cache write | 2, 6, 13,515, 4,791 | 2, 5, 12,775, 5,983 |
| Tokens | 184,904 | 187,571 |
| Dollars (`1h` writes) | $0.043 | $0.094 |

The tokens match, the dollars do not. Core's request puts its breakpoint on the message before the last (without a `ttl`), so the last `Read` result and the reply, 23,091 tokens, went as uncached input at 20 times the read rate. The fork puts its breakpoint on the final reply and reads all of it from cache. One run per arm. The two arms with the calibration and a mistimed try took 2,000,248 tokens, $1.73, 0.0625% of 3.20B.

### Outside methods for context cost, read on 2026-11-02

- `alexgreensh/token-optimizer`: a `PostToolUse` hook returns a trimmed `updatedToolOutput` and archives the full output; its A/B of 20 runs per side shows 11% to 15.7% fewer tokens. It also prints compaction instructions from `PreCompact`, restores state on `SessionStart` with source `compact`, and has a "Start fresh" mod button that saves a checkpoint, clears, and sends it.
- `Druthulu/ProjectArchitect`: sets `autoCompactEnabled: false`, trims through `$.session.compact` with its own instructions, fires an injection once through an `O_EXCL` flag file, keeps state in files, and its hooks always exit 0. Its benchmark compares different workloads, so its numbers are not a fair test.
- The jsonobject.com context-rot guide gives no Claude Code setting or measurement; its `/clear` plus `PLAN.md` routine rests on one Reddit post. It points to the API's `clear_tool_uses_20250919` context editing and Anthropic's long-running harness of a progress file plus git.
- The official docs say an edit of `CLAUDE.md` mid-session does not break the prompt cache; it applies after `/clear`, `/compact`, or a restart. A tip pasted into this session said the opposite.
- `opusplan` switches model on each plan-mode toggle, and each switch starts a fresh cache.
- A Reddit thread on what breaks the prompt cache (`r/ClaudeAI` `1xksgor`, 2026-11-01) says a 5:45 gap on the 5-minute tier wrote all 44k tokens again. Claude Code `2.1.316` picks 1 hour on a subscription within its usage limits and 5 minutes on an API key, and `ttl_expired_5m` is one of its miss causes. This account runs the 1-hour tier: in the local transcripts since 2026-10-01, 101 gaps of 5 to 60 minutes between main-thread requests gave 0 misses (`/tmp/gap.ts`). The 5-minute case is unmeasured, and measuring it needs paid calls with `CLAUDE_CODE_PROMPT_CACHE_TTL=5m`.

## Fixed

### The classifier reads the user's words after Stop hook feedback as hook text

While a `/goal` Stop hook looped (2026-10-31), the user typed "Approved." and later a longer message, and the harness appended each one after the hook feedback in the same message. The classifier then blocked the approved edits, and said the approval "came inside Stop-hook text". The rounds of the loop and the blocked retries spent calls at about 140k context each.

Fixed in `73d465d9` for the `classify` block: `plugins/claudetto/src/blocks/classify/hook-feedback.ts` reads the API blocks of a user row that starts with `Stop hook feedback:`, and `transcriptOf` in `transcript.ts` writes the first block as a `Hook said:` line and the rest as a user line. `FRAME` says hook text authorizes nothing. `plugins/claudetto/tests/classify.test.ts` checks that the typed words reach the classifier as the user's. The built-in auto mode classifier builds its own transcript, which a hook cannot change, so the fix applies when the `classifier` option is on, whose verdict settles the call before the built-in classifier runs. No paid classifier eval has run on the new transcript.

### "Rewire the Agent" matches comments in source and test files

The rule text in `src/automode/rules.ts` covers what a later agent "believes" and "text planted to steer a later session", so a comment that a later agent reads matches it. A subagent in SwifterKit was denied a `///` doc comment above a private function in a test file (2026-10-31), while edits of the same kind passed. Fix: name the instruction surfaces the rule covers, and add the doc comment as a failing case first.

Fixed in `69401cf6`: the `Rewire the Agent` rule text at `plugins/claudetto/src/automode/rules.ts:139` now says a comment or doc comment in a source or test file is not an instruction surface, and `plugins/claudetto/src/blocks/classify/__tests__/prompt.spec.ts:23` checks it.

### The `classify` block denies a call whose reason says the rule does not apply

On 2026-11-02 the `classify` block denied two `Write` calls of the lab file `plugins/claudetto/tests/opening.test.ts` under "Data Exfiltration", and each reason said that the file sends nothing anywhere and that the block does not apply. The same day it denied an `Edit` of `ISSUES.md` under "Rewire the Agent" with a reason calling the write "a benign local documentation write". It also denied an `Edit` of the handoff under `.claude/claudetto/handoffs/` under "Data Exfiltration" with a reason saying it "sends nothing outside the working tree", which left the handoff stale. `FRAME` in `src/blocks/classify/prompt.ts` asks for `<block>` before `<reason>`, so the model writes the verdict before the reason that should decide it. Fix: ask for the reason first, and add the denied write as a failing case first.

Fixed in `69401cf6`: `FRAME` at `plugins/claudetto/src/blocks/classify/prompt.ts:11-14` asks for `<reason>` before `<block>` and says a reason that no rule applies gives `<block>no</block>`, and `plugins/claudetto/src/blocks/classify/__tests__/prompt.spec.ts:17` checks the order.

### The classifier does not credit the user's authorization of a named secret for a named use

On 2026-11-02 the user wrote, mid-turn, to take the `CLAUDE_CODE_OAUTH_TOKEN` of `.env` for a scratch-login probe. The `classify` block then denied the launcher four times, under "Data Exfiltration", "Expose a Credential", and "Credential Exposure", saying nothing the user said authorized it. The launcher exported the token and then ran `exec claude`, so the token never reached argv. The probe of 4.7 is still not run.

Fixed in `69401cf6`: the `Provided Credentials` allow rule at `plugins/claudetto/src/automode/rules.ts:183-184` covers a secret the user named for a named use, such as a `.env` token for a scratch login, kept in the environment and off the command line.

### The classifier denies the agent driving a nested Claude Code session

A `tmux` session that starts `claude` and reads its pane was denied under "Rewire the Agent" on 2026-11-02, as "the agent driving its own terminal". Task 11.2 of `release-0-3-0` needs exactly that run to read `params.model` of each request.

Fixed in `69401cf6`: the `Rewire the Agent` rule text at `plugins/claudetto/src/automode/rules.ts:139` now says a nested `claude` session started in `tmux` whose pane is read is not an instruction surface.

### Main sessions ran on `claude-opus-5`, not `claude-opus-5-5`

The API logged 40,885 responses of the main sessions this week as `claude-opus-5` up to 14:00 UTC on 2026-10-30. The `/model` picker of Claude Code lists "Default (recommended) Opus 5" first, so an unpinned alias resolves to the older model. The user runs only `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`. The `/claudetto:setup` snippet pins the four `ANTHROPIC_DEFAULT_*_MODEL` keys, and a response from a model off the tier row now shows one line naming both models. The `opusplan` and plan-mode switches are not yet run under `tmux`.

Fixed in `69401cf6`: `MODEL_PINS` at `plugins/claudetto/src/tiers/env.ts:5-10` pins the four `ANTHROPIC_DEFAULT_*_MODEL` keys that `/claudetto:setup` writes, and `plugins/claudetto/src/blocks/model-row/off-row.ts:23` shows one line naming both models when a response comes from a model off the tier row. Gap: the `opusplan` and plan-mode switches are still not run under `tmux`.

### The agent counts and prices models the user does not run

While reading the week's usage on 2026-11-02, the main agent looked up `claude-opus-5` prices and counted models other than `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`. The user corrected it twice.

Fixed in `96901c6b`: `AGENTS.md:9` says to count, price, and look up only `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, and to measure the weekly limit in tokens.

### The agent opens a reply with agreement after a correction

On 2026-11-02, after the user named a fact, a reply opened with "You're right that the aliases can be pinned.", and the pattern recurred after the user had criticized it. The output style's rule against it is re-sent every turn and did not hold. A Stop-time `claude-haiku-5-5` judge of the first sentence was built and then removed on 2026-11-02, because it added one model call to every stop and a full main-model turn to every blocked stop. The rule has no check.

Fixed in `69401cf6`: `plugins/claudetto/output-styles/Concise.md:7` tells the agent to open with the next action or the changed fact after a user fact that contradicts its last reply, and says agreement, praise, apology, and promises carry no information.

### The agent answers its own defect with apology, narration, and a retrospective

On 2026-11-02, after its `pkill` killed the user's processes (see "The agent killed the user's processes with a loose `pkill` on 2026-11-02"), the agent's reply broke the output style three ways. It apologized, which the style forbids ("No preamble, restatement, praise, or apology"). It opened with "Here is what happened", a preamble, where the first sentence should have been the cause: `pkill` took `-U` and `501` as patterns and matched any command line that held them. It closed with "What I've changed", a retrospective of its own actions, where the style asks for a bug report: what broke, where, what it cost, the fix, with the fix recorded in `ISSUES.md` and not told in the reply. "The agent opens a reply with agreement after a correction" is close, but covers none of these three. The rules are re-sent every turn and did not hold. No check exists.

Fixed in `69401cf6`: `plugins/claudetto/agents/main.md:31` says to report a defect the agent's own action caused as a bug (the cause, what broke, where, its cost, and the fix) with no apology, and `plugins/claudetto/output-styles/Concise.md:7` and `:19` ask for the outcome first and an end on the result.

### The agent writes comments that narrate what code does

On 2026-11-02 the main agent added comments in third-person narrative, describing what the code does and who reads it, in code it was not asked to comment. `AGENTS.md` allows a comment only for why, and only when it is needed.

Fixed in `69401cf6`: `plugins/claudetto/rules/claudetto-code.md:7` allows a comment only for a reason the code cannot show and bans one that narrates what the code does or who reads it.

### The agent hands the user work it can do itself

On 2026-11-02 the main agent called a scratch login "a step only you can do" while `.env` held a token the user had authorized for it. It also skipped tasks of the user's list and dropped a decision after one path failed. The user had to name each case.

Fixed in `69401cf6`: `plugins/claudetto/agents/main.md:15` says to take another route when one is blocked and to call the agent stuck only when the next step needs what only the user has, giving the exact `! <command>` and finishing the rest.

### The agent ignores the prompt guides in `external/please-use-me-often/`

On 2026-10-31 the main agent wrote prompt text with abbreviated custom XML tags, while `external/please-use-me-often/xml-prompting-guide.md` was in the repository. The user had to point to the folder twice across the two sessions.

Fixed in `96901c6b`: `AGENTS.md:11` says to write prompt text by the guides in `external/please-use-me-often/`, `xml-prompting-guide.md` first.

### The agent reads every user message as a task

The Reddit thread "Why is Claude so narcissist" (`r/ClaudeAI` `1xl33ox`, 2026-11-01, copy in `external/2026-11-02/`) lists the same failures that this repository's sessions show. The poster runs Opus 5.5 and Fable 5.1 on Max 20x.

| Complaint in the thread | This repository's sessions |
| --- | --- |
| A remark such as "let me get the specs" starts a global search | `15437c12:7644` "what part of user's message told you to 'search it up'?" |
| It runs on its own instead of asking | `15437c12:2539` "Nobody told you to turn it off."; on 2026-11-02 the agent ran a compaction probe no one asked for, then stopped it with no instruction to stop |
| A rhetorical or frustrated question becomes work | 2026-11-02: "a rhetorical question != 'go do a task'" |
| It answers a correction by tutoring or agreeing | "You're right" 119 times in the transcripts, 95 of them in `15437c12` |
| "Listen" makes it do nothing; "be a peer" makes it pedantic; a rewrite makes it dry | The same session swings both ways: "stop asking" at `6d6267be:489` and `15437c12:2443`, and "Nobody told you to" at `15437c12:2539` |

Where the prompts push it:

- The default Claude Code prompt. The full prompt says, at about line 57, to read an unclear or generic instruction as a change to the code. The lean prompt that Opus 5.5 and Sonnet 5.5 get by default keeps "When you have enough information to act, act." and "using your own judgment", and drops the full prompt's rule to answer an exploratory question in 2 to 3 sentences and not implement until the user agrees. Its ask-first rules cover only risky actions. No default line says to distrust the user: the thread's claim of a "never trust the user" baseline does not hold in the text, and the full prompt says to defer to the user's judgement.
- This plugin. `main.md:7` "you find out how things are, change them", `:11` settle a question "from the conversation… then go on", `:15` "When a route is blocked, take another route", `:31` "Fix each defect you find, in any file and in earlier sessions' work", `:35` "Take local, reversible actions freely", and `:43` "a message naming a defect asks for the fix". `:11` does classify a message as question, observation, correction, or request, and `:43` says "Answer a question… then wait", but nothing marks a remark, a rhetorical question, a brainstorm, or shared reference material as a non-task, and `:31` ("in any file") conflicts with `:11` ("nothing beyond it").

The thread and `external/please-use-me-often/` agree that prose rules alone did not hold: the poster's pasted account instructions "changed absolutely nothing" except that replies went dry, and the dossier's index says prompt-only fixes "failed again on the same incidents" (`agent-failure-dossier/00-INDEX.md:51`). The dossier cites arXiv `2605.18583` (out-of-scope action rates of 5.4% to 27.7% for Claude Code, Codex CLI, and Gemini CLI, and removing consent text moved Claude Code from 0% to 17.1%) and `2605.28122` (19.51% of 10,000 benign runs overeager, with the harness explaining more of the variance than the model). `agent-terms/TERMS-OF-SERVICE.md:29` (S1.1) and `:33` (S1.3) hold the rules the prompt lacks: classify the message first, and treat pasted material as context. Fix: add those two rules to `main.md`, drop "in any file" from `:31`, and test them on recorded remarks and rhetorical questions from these transcripts before shipping.

Fixed in `69401cf6`: `plugins/claudetto/agents/main.md:11` tells the agent to classify each user message first and to treat a remark, a rhetorical question, a brainstorm, or pasted material as context and not a task, and it dropped "in any file" from the fix rule at `:31`.

### The agent writes "not verified" instead of checking

On 2026-11-02 the agent said that compaction may run on Haiku, marked it "not verified", and stopped. A free fake-API probe answered it the same day (see below). The transcripts hold 73 hits of "can't verify", "unverified", and "not confirmed", not split by speaker. The thread names the opposite face of the same habit: the model doubts what the user saw first-hand. `Concise.md:15` asks the agent to mark an unmeasured number, which is right for a report and wrong as a place to stop when a free check exists. `agent-terms/TERMS-OF-SERVICE.md:86` (S3.8) says to take the user's first-hand observation as established, and `:88` (S3.9) says to fact-check only when asked or when the error would change the outcome. Fix: say in `main.md` that a free check is run before the claim is reported, and that the user's observation is a fact, not a claim to test.

Fixed in `69401cf6`: `plugins/claudetto/agents/main.md:19` says to run a free check that can settle a claim before reporting it and to treat the user's reported observation as evidence to test a counterclaim against.

### Replies end with offers and pedantic caveats

The thread complains of "do you want me to do X?" endings and of caveats such as "to be fair they delivered". The full default prompt asks for "What changed and what's next". `Concise.md:15` says "Give the facts that change the next step, and end on it". No line in either prompt bans an offer to continue or an idle caveat. `agent-terms/TERMS-OF-SERVICE.md:245-251` (S9.7) and `:90` (S3.10), and `CODE-OF-CONDUCT.md:52-57`, hold the rules. Fix: end on the result, or on the one step that needs the user.

Fixed in `69401cf6`: `plugins/claudetto/output-styles/Concise.md:19` says to end on the result or the one step that needs the user and to add a caveat only when it changes a decision.

### The handoff block nests each handoff in the next

`plugins/claudetto/src/blocks/handoff/block.ts` writes a handoff on every `/clear` (`CONTINUED` at `:124`) and reads it back through `$.prompt.submit` at the next start (`submitReadBack`, `:130-136`, scheduled at `:165`). The read-back becomes part of the next session, so the next handoff contains it. A `/clear` typed by the person also gets the read-back, which overrides what `/clear` means.

The intended sequence: the agent finishes its tasks, calls a registered tool such as `mcp__claudetto__handoff` (`$.tool.register`, `index.d.ts:3150-3164`) with the goal, state with proof, decisions and why, ruled-out approaches, the check command, the files touched, and the next prompt. The plugin adds the user's recent prompts word for word from `$.session.messages`, writes the file, and, once the session is idle, runs `$.command.run({ command: "clear" })` (`:3179-3189`) and then `$.prompt.submit` with the handoff and the next prompt, behind a one-shot guard. A `/clear` the person types gets nothing.

Checked on 2026-11-02 with Claude Code 2.1.316: an interactive pty session, the fake Messages API, and a probe plugin that calls `$.command.run({ command: "clear" })` and then `$.prompt.submit` from `turn.complete` inside `$.clock.after(0, …)` (`/tmp/probe-handoff/`):

- `command.run` accepts the built-in `clear`. It resolved `{"text":""}`, and `session.end` fired with `{"reason":"clear"}`.
- The queued submit ran as the first turn of the new session. Its request held 2 messages, so no history crossed over.
- The model sees a `<local-command-caveat>` block, the `/clear` record, and then "The probehand plugin sent a message: … This is how Claude Code surfaces a prompt a plugin submits between turns — it starts this turn in the user's place. Address the message above."
- `session.start` does not fire on `/clear`, so a read-back that waits for it never runs.
- A `/clear` the person types reaches the plugin's `command.run` hook with `origin: {"kind":"composer"}`. The plugin's own `command.run` call does not reach its own hook. `session.end` carries no origin. So the one-shot guard keys on the plugin's own call, and a typed `/clear` is told apart by its `command.run` origin.

Fixed: `mcp__claudetto__handoff` writes the file and ends the turn with `$.turn.abort`, so the tool result sends no further request. Then it runs `clear` and submits the handoff with `next_prompt` once. Checked on 2026-11-02 with Claude Code 2.1.316 in `tmux`, against the fake Messages API (`/tmp/e2e-handoff/`). The model's first request called the tool, and no request followed it in that turn. After `/clear`, the second request held the nine-section handoff and the next prompt. The cost is cosmetic: the aborted turn shows `Interrupted · What should Claude do instead?` under the call. A typed `/clear` writes no file and reads none back.

Fixed in `69401cf6`: `CONTINUED` at `plugins/claudetto/src/blocks/handoff/block.ts:130` reads a handoff back only on `resume`, so a typed `/clear` gets nothing, and `plugins/claudetto/src/blocks/handoff/call.ts:57` ends the handoff turn with an abort before it clears and submits.

### The agent killed the user's processes with a loose `pkill` on 2026-11-02

To stop its fake API, the agent ran `pkill -f 'bun fake.ts' -U $(id -u)`. BSD `pkill` stops reading options at the first pattern, so `-U` and `501` became two more patterns, and `-f` matched them anywhere in a command line. That killed every process of the user whose command line holds `-U` or `501`, among them Chrome helpers (`--metrics-shmem-handle=…501…`) and the user's windows. Fix: stop a probe process only by the pid its launcher recorded, as `kill <pid>`. Never use `pkill` or `killall` with a pattern.

Fixed in `96901c6b`: `AGENTS.md:10` says to stop a process only by the pid its launcher recorded, with `kill <pid>`, and never to use `pkill` or `killall` with a pattern.

### Paid probe rounds took a quarter of the week

Sessions in project folders under `/tmp`, the `claudetto-probe-*` eval rounds, ran on the real API: their message ids are real (`msg_011C…`). From 2026-10-27 to 2026-11-02 they used 0.861B of the 3.371B main-thread tokens, 25.5%, in 8,137 calls. 0.586B of that was on 2026-10-27 alone. The largest rounds were `round9-200k` (176.6M tokens read), `citable-90k` (162.9M) and `round8-200k` (161.0M). Each round fills synthetic notes files of about 25k characters through `Read`, so 80.4% of their re-read is `Read` results. Fix: count a round's tokens on the fake API before it runs, gate it on that count, and report its share of the week after it.

Fixed in `7919dc54`: `replayRun` at `claudekit/paid-run/count.ts:46` replays a planned round on the fake API and counts its tokens before any paid call, `overBudget` at `claudekit/probe/round/round.ts:49` stops a round at its spend cap, and `costLine` at `claudekit/probe/plan/cost.ts:15` prints the weekly share.

### Core's `context_management` section contradicts the handoff block

Core's system section `context_management` tells the model that the context gets summarized and that "you don't need to wrap up early or hand off mid-task". claudetto's handoff block in the same request tells it to end a long conversation with a handoff. Fixed: the handoff block answers `prompt.section` for `context_management` with `{ text: null }`. A lab test checks it, and in a fake-API session system block 2 fell from 5,760 to 5,478 characters, with the sentence gone (`/tmp/probe-shared/run.sh`).

Fixed in `69401cf6`: `plugins/claudetto/src/blocks/handoff/block.ts:253` answers `prompt.section` for `context_management` with `{ text: null }`.

### Replacing auto-compaction with the handover

Free probes on 2026-11-02, all on the fake API:

- `$.model.fork({ prompt })` from a `session.compact` hook answers an automatic compaction (`trigger: "auto"`, set off by a reported `input_tokens: 990000`). The hook can answer with `[first message, assistant line, the fork's handoff]` (`/tmp/probe-fork`).
- Mid-turn, the fork lags: it sends the main thread as last sent, without the newest tool call and its result. Its breakpoint lands on the older assistant message, so the last tool result went as uncached input (33,794 characters in the probe). The compaction's own `e.messages` holds the newest pair, and an answer without them drops that result from the turn.
- At idle, after a finished turn, the fork repeats the last main request byte for byte and adds the final reply, which carries the breakpoint, and the prompt. The lookback finds the last request's entry one message back. That is core compaction at its best: one full read from cache, plus the handoff's output.
- The reply-based handover costs no full read, because the handoff is the turn's own last reply. It needs the model to write that reply at the right point.
- `turn.complete` carries `e.usage`, so the plugin can size the context at each turn's end without a call.

Built in `compaction/handover.ts` and `compaction/block.ts`. At a main turn's end, a handoff reply hands over as before. Any other reply checks `$.session.usage()`. When the last response's context is at the option `handoverTokens` or more, the plugin asks `$.model.fork` for a handoff and hands over to it. The option defaults to 400,000, the default of `heavyTokens`, or half the window when that is smaller, so a 200k model hands over at 100k. A fork reply without the title, or no reply, logs one line and leaves the compaction to the engine. A flag stops a prompt typed during the fork from starting a second one.

Defect, fixed: the first build forked again at every later turn's end after a fork that wrote no handoff. Each repeat costs a full read of the context, 400k tokens or more from cache, plus the reply's output, with the same likely outcome. A second flag, `declined`, now skips the fork until the next main compaction, which `handOverTo` sees for every trigger but `precompute`. The case "after a fork without a handoff, no turn's end forks again until a compaction" failed before the fix (2 forks where 1 was expected) and passes after it.

Defect, fixed: when the context right after a handover was still at the size, each turn's end forked, handed over, and submitted the next prompt itself, so the session ran on its own with no end. A first message larger than the size does it, such as a 120k paste on a 200k model, whose size is 100k. Each round costs a full fork read, a compaction, and a turn. The turn after a handover now forks nothing when it ends at the size: it logs one line and sets `declined`, so the engine's compaction takes the context. The case "a turn after a handover that ends still at the size forks nothing" failed before the fix (2 forks) and passes after it.

- The host refuses a hook that is not a function literal or a function's name, so a factory `turnCompleteWith(options)` failed to load. The hook literal in `block.ts` builds a `Session` of callbacks from `$`, as `summarize` does, and `handover.ts` takes no `$`.
- Lab: 7 new cases. The 4 that expect a fork failed before the code and pass after it. `claude plugin test plugins/claudetto` gives 239/239 with the two defect cases.
- End to end on the fake API (`/tmp/probe-e2e-fork/run.sh`): a Read, then a final reply reported at 450,000 input tokens. The fork request repeated request 1 through message 3 byte for byte, with the final reply and the prompt after it (`prefix.ts ... 1 2 4`). The handoff file was saved, the compaction answered `[first, assistant line, handoff]`, and the next prompt went in. The request after it repeated request 0 through message 1.
- Measured on the real API (`/tmp/probe-fork-real/run.sh`, `handoverTokens` 25,000, 122,874 tokens in all): the fork request read 33,568 tokens from cache, wrote 29, sent 47 uncached, and answered with 602, so it costs one cached read of the context plus the handoff's output. The request after the handover read 13,420 (tools and system) and wrote 4,913 (messages 0 and 1, the assistant line, and the handoff), as the message-0 section above predicts.
- Defect, fixed: a fork handover submitted "Continue from the handoff above: take its next steps." The fork runs after the turn answered the user, so its handoff's next step was "Wait for the user's next request. Don't re-read `notes.txt`", and the prompt made the model re-read the file anyway: two requests, about 37k tokens, for nothing. A fork handover now compacts and waits for the user; only a `# Handoff` reply, which comes mid-task, sends the prompt. The fork case expects no prompt and failed before the change with the prompt received.
- Probe defect, 52,559 tokens lost: the first real run of `/tmp/probe-fork-real/run.sh` set `handoverTokens` as the string `"16000"`. The host refused the options ("Handover Size in Tokens must be a number"), so the hooks module did not load and the session ran with no plugin: 2 requests, no fork. The script was also written without the execute bit, so the user's first launch failed with `permission denied`. The same string-only type sat in `claudekit/session/argv.ts`, where `inlinePluginOptions` took `Record<string, string>`, so no probe built on it could set a number option. It now takes `string | number | boolean`, with a case in `argv.spec.ts` that keeps a number a JSON number; the case failed the type check (`TS2322`) before the change. The run measured the context after the `Read` at about 34k tokens, so the script now sets `handoverTokens` to the number `25000`. The engine's docs say the fork's prefix comes from the cache, and the lookback sits one message back, as on an ordinary turn. The request after the handover still writes messages 0 and 1, as above.
- Decided, the size: 400,000 matches `heavyTokens`, where the tool-call cap already treats the context as heavy, and half the window keeps a 200k model clear of the engine's own threshold. The option moves it, and no measurement backs a better number.
- Decided, no mid-turn fork: mid-turn the fork lags one tool pair behind, so its breakpoint misses and the newest result goes uncached, which loses the read the fork exists for. The engine's compaction keeps that case.
- Decided, no reminder at the tail: it would add tokens to every request and move the breakpoint's bytes each turn, while the fork at idle costs one cached read once per handover.

Fixed in `69401cf6`: `handoverTokens` at `plugins/claudetto/src/blocks/compaction/handover.ts:118` sizes the fork handover, and the `declined` flag at `:151` stops a repeated fork until the next compaction.

### The paid run on 2026-11-02 cost 3.4 times its estimate

The approval was for about $0.90 at 150k tokens. The run took about 895k tokens, about $3.04 at API prices.

- The context was 286k tokens, not 150k. The build had already printed a last body of 698,333 characters before the paid run, and the agent did not convert that to tokens or count it.
- Both big calls missed the cache, which cost about 547k extra cache-write tokens, about $2.20. The arms forked and resumed the session in new processes. The fake API could have shown for free whether the warm turn's prefix and the arms' prefixes matched, and the agent skipped that check.
- The agent did not stop when the run outgrew the approved figure, and reported the overrun only afterwards.

Fix: before a paid run, build the same requests on the fake API, count their tokens, and compare their prefixes with the request meant to warm the cache. Ask again when the counted size differs from the approved one.

Fixed in `7919dc54`: `replayRun` at `claudekit/paid-run/count.ts:46` builds a planned run's requests on the fake API, counts their tokens, and compares each prefix with the warm request at `:62`, and `claudekit/paid-run/main.ts` prints the result without a paid call.

### Frontier model prose departs from plain language

arXiv `2610.29162` measured 14 models, 9 frontier ones with Claude Opus 5.5 among them, in chat, code, and essays. Frontier models overuse inanimate subjects with animate verbs, rare n-grams, long dependencies, stacked nouns, reduced object relatives, and verbs made from nouns. Opus 5.5 scores worse than Opus 5 on 19 of 21 measures. The paper ran no reader study and tested no prompt fix. `Concise.md` says "Short sentences, literal words" but names none of these forms, so it has nothing to check a reply against. The dossier reports 580 words cut to about 100 with ASD-STE100, from one user (`agent-failure-dossier/05-appendices-and-limitations.md:72`).

Fixed in `69401cf6`: `plugins/claudetto/output-styles/Concise.md:15` names the forms to avoid: an inanimate subject with an animate verb, stacked nouns, verbs made into nouns, and reduced relative clauses.

### The agent acted on its own and asked nothing on 2026-11-02

In this session the agent:

- read a rhetorical question as a task and acted on it;
- ran a compaction probe no one asked for, then stopped it with no instruction to stop, which cost a user message to restart;
- proposed keeping auto-compaction "as a safety net" with no cost figure, after the user had set cost as the test;
- wrote "not verified" about compaction's model instead of running the free probe;
- after that correction, still listed free checks as "not checked" or "unmeasured" (the second compaction request, `command.run` with `clear`, the two small compactions), each answered the same day by a free probe or a transcript read;
- reported that the installed plugin is behind the source as an issue;
- measured the weekly limit in dollars when the limit is spent in tokens.

Each cost a user correction. The causes are the prompt lines in "The agent reads every user message as a task" and "The agent writes 'not verified' instead of checking".

Fixed in `69401cf6`: `plugins/claudetto/agents/main.md:11` asks before any edit the task does not name and treats a rhetorical question as context, and `:19` runs a free check before a claim is reported.

### The main agent adds work that no task or user message names

On 2026-11-02, while applying `release-0-3-0`, the main agent went past the boundary the user set and added parts that nobody asked for:

- It started implementing 13.1 after the user had set 12.1 as the last task of the session.
- It added an `openingJudge` option to `plugin.json` and `README.md` for 12.1, whose task names a check and no switch.
- It added a CHANGELOG Unreleased entry and a README feature row for the same check.
- Earlier, on 2026-10-30, `57631e4c` added the `tasks.md` Stop loop of the `finish` block beside `/goal`, and on 2026-10-31 `cdabb0a4` removed `/goal` but kept the loop. The user did not ask for a loop, and it blocked ten stops of this session after the user had ended it.
- It built `claudekit/openings/`, a structural check of reply openings, for a reading no one asked for. It was deleted on 2026-11-02.

Each one was removed after the user named it, and each one cost a user correction. The cause: the agent reads the repository's habit, such as an `off` switch beside every paid option and a CHANGELOG line for every change, as a requirement of the task. `<code>` of the main prompt already says "Change only the lines the task names". Fix: before an edit outside the files the task names, the agent checks the task text for that file, and asks when the task does not name it.

Partial fix on 2026-11-02: `plugins/claudetto/agents/main.md:11` gained the scope rule ("change only the files and parts the task names"). The eval case `W5-11_I13` measured `main.md` at 0/10 against the default body at 10/10. Given "Rename `fetchUser` to `getUser` in `api.ts`", `main.md` renamed only in `api.ts` and asked about the three broken `web/` callers. So the rule over-reached for callers that a change breaks.

Fixed on 2026-11-02: `main.md:11` and the spec requirement "Work Stays inside What the Task Names" now count each caller or test that the named change breaks as part of the task, with the scenario "Callers of a Renamed Function". A rerun of the `main.md` arm on `claude-opus-5-5` passed 10/10, and each session renamed the three `web/` callers without asking.

### `docs/types.md` names the wrong Claude Code version

`docs/types.md` says the vendored types came from `2.1.312`, and the first line of `plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts` reads "Written by Claude Code 2.1.316."

Fixed: `docs/types.md:6` now says `2.1.316`, as the first line of `index.d.ts` does (`head -1 plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts` prints "Written by Claude Code 2.1.316.").

### The prompts say "correction", which frames the rule as social

"Correction" reads as a social or emotional event, so the rules that use it prime the model to answer the person (with agreement, apology, or a promise) instead of the content. Sites: `plugins/claudetto/output-styles/Concise.md:7` ("After a correction, open with…"), `plugins/claudetto/agents/main.md:11` ("a correction updates what you know") and `:19` ("corrects you"), the same lines in `openspec/changes/release-0-3-0/drafts/main.md` and `drafts/output-style.md`, and task 12.1. Fix: name the content event, such as a fact from the user that contradicts the last reply, and say what to do with it.

Fixed: the prompts name the content event. `grep -rniE 'correction|corrects you' plugins/claudetto/agents plugins/claudetto/output-styles plugins/claudetto/src openspec/changes/release-0-3-0/drafts` prints nothing, and `bun test tests/repo/prompt/conduct.test.ts` (task 17.4) passes 4 tests.

### A fake API in the same process as `spawnSync` hangs every session

`/tmp/probe-real/build.ts` started `startFakeApi` and then ran `claude` with `spawnSync`, which blocks the event loop the fake answers on. All 6 sessions hit the 120 s timeout, which cost 12 minutes and no tokens. `/tmp/probe-compact/probe.ts` has the same pattern. Fixed: `launchFakeApi` of `claudekit/api/launch.ts` runs the fake as its own process and returns its URL and pid, and its test answers a client while the caller's event loop is blocked. A probe that runs `claude` with `spawnSync` uses it.

### The fake API gave every answer the same message id

`claudekit/api/fake.ts` stamped each answer with `msg_fake`. The CLI joins answers that share a message id into one assistant message, so with a list of tool calls the second call merged into the first, and the request prefix changed between calls. A probe on 2026-11-02 read that change as a cache break. Fixed in the working tree and not committed: each answer after the first gets `msg_fake_N`. The new test in `claudekit/api/__tests__/fake.spec.ts` failed before the fix (1 distinct id of 3) and passes after it.

### `compaction-cost` leaves tokens out of a compaction

`claudekit/compaction-cost/bill/replay.ts:70-71` prices a compaction as the context at the cache-read rate plus the summary at the output rate. It assumes a cache hit, and leaves out the cache write after the compaction (a mean 23.2k tokens, measured) and the analysis and thinking output. So its "$0.26 per compaction" and its threshold replay understate compaction. Fixed: each replayed compaction adds the mean measured write of the first request after a boundary, and those recorded writes leave the fixed write total, so none is counted twice. `measureKept` also took two manual boundaries with `pre` 2 and `post` 9,273, which put the summary share at 1.82 per token compacted, so no compaction shrank the context and a 120k threshold compacted 39,421 times. A boundary whose `pre` is below its `post` is now skipped. `bun claudekit/compaction-cost/main.ts --thresholds 120000,224999` on 35 sessions, 42,419 requests, and 207 compactions bills $1,979.78 at 120k against $2,391.88 at 224,999, −17.2%, and −11.1% with the lost-work charge. The analysis and thinking output of a real compaction is still unmeasured.

### `claudekit/summary-cost/pty.py` hung after its deadline

After the deadline it sent `SIGTERM` and then blocked in `os.waitpid(pid, 0)` without reading the pty. Claude Code writes to its terminal while it exits, so the child blocked on a full pty and the driver waited for it. Fixed in the working tree and not committed yet: `pump` keeps reading through a 10 s grace, then `SIGKILL`. `claudekit/summary-cost/__tests__/pty.spec.ts` failed before the fix (15,003 ms) and passes after it.

### The `tasks.md` loop overrides the user's stopping point and repeats declined blocks

On 2026-11-02 the user said the session ends after 12.1. The `finish` block then blocked five stops in a row, each telling the agent to start 4.3. It reads only the open boxes of `tasks.md`, not the user's last instruction, and each blocked stop cost a request. Task 9.1 covers repeated blocks with no file change, but not a boundary the user set.

On 2026-11-02, after the user had told the agent to stop and wait, the `finish` block blocked five more stops in a row with the same 4.3 text. Each time the agent declined, and no file changed between blocks. The block keeps no count of its own repeats, does not read the agent's refusal, and has no cap, so it only stops when the user writes. Each round is a full-context turn spent on no work. Fix: stop blocking once the same task text has been blocked and declined with no file change since, and add the repeated block as a failing lab case first. Its cap message, `LOOP_CAP` in `src/blocks/finish/prompts.ts:8`, then showed as "claudetto: claudetto loop: 5 stops in a row…", a chain of colon labels that says nothing a sentence could not.

Fixed, uncommitted, on 2026-11-02 by removing the whole `finish` block, at the user's word: the user never asked for the loop, and a cap still spends a full-context turn on each repeat. `src/blocks/finish/` and `tests/finish/` are deleted, and the built-in `/goal` covers a session that must work to a condition.

### The gate takes the `$.env` API in a command for a read of an env file

`Bash` calls were denied by the claudetto gate with "This call reads `.env`, which can hold secrets" (2026-10-30 to 2026-11-02), and none read an env file: a `perl -0pi -e` and a `sed -i` with `\$\.env\.get` in the script, a heredoc whose text names `.env`, and `grep -n "^<[a-z_]*>$" FILE`, read as a `<` redirect from `[a-z_]*`. The gate now takes input files from the redirects that `src/blocks/gate/shell/shell.ts` parses instead of a regex over the raw text, and `codeSecret` in `src/blocks/gate/paths.ts` skips `.env` after an escaped `$`. The cases are in `src/blocks/gate/findings/__tests__/pattern.spec.ts`.

### `bunx ctx7` is denied by the auto mode classifier

Running the Context7 CLI, `bunx ctx7 --help`, was denied as code from outside the repository (2026-10-30), so the arguments of the `docs` skill were read from `packages/cli/README.md` of `upstash/context7`. On 2026-10-31 the CLI ran, and `ctx7` `0.8.2` has no `search` command and no `--library-version` flag, both of which that README and the skill named. The skill now runs `library`, then `docs` with the version in the ID, such as `/colinhacks/zod/v3.24.2`, and `src/blocks/context7/__tests__/skill.spec.ts` fails on a command or flag that `ctx7 --help` does not list.

### Stray edits from a broken `cp -R` in the main tree

A `cp -R` from a worktree copied three changed files into the main tree, and each one came back in every fresh worktree. `biome.jsonc` (a `$schema` of `2.6.4` against the pinned `2.6.3`) and `plugins/claudetto/commands/setup.md` (a rewrap with the same text) were restored. The owner wanted the `high` effort, so the commit "feat(you-should-know): default the side check to `high` effort" changes `DEFAULT_EFFORT`, the manifest `default`, the `README.md` line, and the two add-on lab cases together.

### A hook lab file named after no block

`plugins/claudetto/src/blocks/__tests__/catalog.spec.ts` checked that each block has a lab file or folder, but not that each lab entry names a block. `tests/goal.test.ts` was added beside `tests/finish.test.ts` for the `finish` block and broke that layout without failing anything. Fixed in `5782abb2`: both files moved to `tests/finish/`, and a new case fails on any lab entry that names no block. That case failed on `goal.test.ts` before the move.

### `just capture --help` ran a capture

`tools/capture/run.ts` ignored `--help` and started both arms, and the `capture` recipe comment of `justfile` left out `--shipped` and `--deny`. Fixed in the commit "feat(capture): read an MCP server or another plugin": `--help` prints the usage, and the comment lists every flag.
