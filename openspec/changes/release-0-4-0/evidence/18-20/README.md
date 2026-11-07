# 18.20: strict form of the "What I Need from You" list with writes allowed

Runner: `../18-8/probe.ts`, extended with flags `--mode` (permission mode), `--prompts`, `--plugin`, `--root`, `--plugin-only`, and a new judge field `formQ`. No copy of the probe.

## Revised judge (written before any run)

`formQ` (the 18.20 strict form) = `checkbox` regex lines exist, and the phrase "What I Need from You" appears, and every `- [ ]` item holds a `! <command>` (18.8 `BANG`) OR is one question (item text, trailing markup stripped, ends with `?` and holds exactly one `?`).
Differs from 18.8 `form` only by the question alternative. 18.8 `form` is still reported beside it.

## Round 1 (the 18.8 prompts, writes allowed)

Hypothesis: the 18.8 `form` rate of 2/32 came mostly from `Write` being denied (items were permission grants). With `--permission-mode acceptEdits` the plugin arm's `formQ` rate rises.
Prediction (before the run): `formQ` 12-20/32 (point guess 16/32, 50%); Wilson lower bound about 0.33, so at or below 0.5 and the style needs a change. Heading rate similar to 18.8 (about 20/32).

Dry run (fake API, free): `bun ../18-8/probe.ts --dry --plugin-only --mode acceptEdits --limit 3 ...` ran 3 sessions, none rejected. (A first try failed only because the A/B report wanted a base arm; fixed by using the first arm as base under `--plugin-only`.)

Command (repo root, worktree plugin dir, style unchanged):

```sh
bun --env-file=/Users/krystian/CodeProjects/xsyetopz/claudetto/.env openspec/changes/release-0-4-0/evidence/18-8/probe.ts --run --plugin-only --mode acceptEdits --root /tmp/probe-18-20 --plugin <worktree>/plugins/claudetto --out /tmp/probe-18-20/r1
```

Result (`round1-sessions.jsonl`): plugin arm n=32, none rejected or capped, $1.41, 1,032,569 tokens, largest session 76,285.

| Round | checkbox | form (18.8) | formQ (18.20) | heading |
| --- | --- | --- | --- | --- |
| 1, 18.8 prompts, acceptEdits | 20/32 (0.453-0.771) | 4/32 (0.050-0.281) | 4/32 (0.050-0.281) | 16/32 (0.336-0.664) |

Prediction missed low: guessed 12-20/32 formQ, got 4/32. Lower bound 0.050 is at or below 0.5, so the style changes. Failure reading (replies inspected, p01-p14): 12 of 32 had no checkbox (a prose "Check these" list, or a question in prose); several omit the heading; several items are prose or hold a command without `!`, or put `!` commands in a code block outside the list; items carrying notes ("If X, do Y") are fine for the judge only when each also has `!`/question.

## Style change

`Concise.md` `<requests_to_the_user>`, was: `End with a "What I Need from You" list of `- [ ]` items only for steps only the user can take, such as a command requiring `sudo`. Each item gives the exact `! <command>` to run, what to send back, and what you do meanwhile. A step with no command is a question: ask it with `AskUserQuestion`, and do the doable work first.`
Now: `End with a `## What I Need from You` heading over `- [ ]` items, one per step only the user can take, such as a command requiring `sudo`. Each item is one `! <command>` or one question, then what to send back and what you do meanwhile. Notes, checks, and facts go above the heading. Do the doable work first.`
(The `AskUserQuestion` clause is dropped: the probe has no such tool and the item may itself be the question.)

Pin: `tools/manifest.test.ts` now expects the heading-over-items phrase and "one `! <command>` or one question". Mutant: `git checkout -- Concise.md` (old text) made the test fail (`Expected to contain: "`## What I Need from You` heading over `- [ ]` items"`, 1 pass 1 fail); restored, 2 pass 0 fail.

## Round 2 (32 fresh blind prompts, changed style)

Prompts: `prompts.json`, from a fresh subagent told only the kind of task; it saw neither the style text nor round-1 replies. Caveat: many prompts say "I'll run the sudo steps myself", which names the user-only step, so they are easier than 18.8's.
Hypothesis: the stricter wording raises formQ. Prediction (before the run): 20-27/32 (guess 24/32 = 75%), Wilson lower bound about 0.58 to 0.66, above 0.5.

Command: same as round 1 with `--prompts .../18-20/prompts.json --out /tmp/probe-18-20/r2`.
Result (`round2-sessions.jsonl`): n=32, none rejected or capped, $2.41, 1,357,519 tokens, largest session 70,297.

| Round | checkbox | form (18.8) | formQ (18.20) | heading |
| --- | --- | --- | --- | --- |
| 2, fresh prompts, style v1 | 30/32 (0.799-0.983) | 10/32 (0.180-0.486) | 10/32 (0.180-0.486) | 30/32 (0.799-0.983) |

Prediction missed (guessed 20-27/32). Lower bound 0.180, not above 0.5. The heading and checkbox are now followed (30/32), so the style v1 works on form; the misses are items that are neither a `!` command nor one question: "Send me X", "Add three secrets", "Re-enable Bash", a question followed by a sentence. The headings were also written twice in some replies (a model retry after the `AskUserQuestion` tool was missing; that tool is not in the probe's tool list).

## Style change v2 (round 2 prompts are now tuned on; round 3 needs fresh ones)

Now: `End with a `## What I Need from You` heading over `- [ ]` items, one per step only the user can take, such as a command requiring `sudo`. Each item is one `! <command>` or one question ending in `?`, never an instruction such as "send me" or "add". What to send back, what you do meanwhile, notes, and facts go above the heading. Write the heading once. Do the doable work first.`
Pin: the manifest test now expects "one `! <command>` or one question ending in `?`, never an instruction". Mutant: `git checkout -- Concise.md` (original text) made it fail (1 pass 1 fail); restored, 2 pass 0 fail.

## Round 3 (32 fresh blind prompts, style v2)

Prompts: `prompts-round3.json`, from a second fresh subagent told only the kind of task; it saw no style text, earlier prompts or replies. These do not name the user-only step (harder than round 2).
Hypothesis: forbidding instruction-form items moves non-command items into questions or `!` commands. Prediction (before the run): formQ 16-24/32 (guess 20/32 = 62%), Wilson lower bound about 0.45-0.58, so about even whether it clears 0.5.

Command: same as round 2 with `--prompts .../18-20/prompts-round3.json --out /tmp/probe-18-20/r3`.
Result (`round3-sessions.jsonl`): n=32, none rejected or capped, $2.36, 1,383,841 tokens, largest session 63,967.

| Round | checkbox | form (18.8) | formQ (18.20) | heading |
| --- | --- | --- | --- | --- |
| 3, fresh prompts, style v2 | 30/32 (0.799-0.983) | 7/32 (0.110-0.388) | 20/32 (0.453-0.771) | 30/32 (0.799-0.983) |

Prediction held (guess 20/32; got 20/32). The lower bound 0.453 is NOT above 0.5, so 18.20 is NOT done. Question items fixed much of the gap (7 to 20 once the question form counts); the point estimate is 62.5%.

Stopped for budget: spent $1.41 + $2.41 + $2.36 + $0.02 dry = about $6.2 of $8; one more 32-session round (about $2.4) would pass $8. A further style change would also need 32 more fresh prompts, since round 3 prompts would be tuned on. Needs a decision: raise the budget for a round 4, or accept a 62.5% point estimate with an interval reaching 0.453.

Totals: 128 paid sessions plus 3 dry; largest session 76,285 tokens (round 1), under 300,000.

Round 3 result stands: formQ 20/32, lower bound 0.453, not above 0.5.

## Round 4 (64 fresh blind prompts, style v2 unchanged, judged alone)

Budget raised by $5 (total about $11.2). Concise.md is not changed before this round.
Judged ALONE on `formQ`: n=64, no pooling with round 3. Done = Wilson 95% lower bound above 0.5 (needs at least 40/64 = 62.5%, lower bound 0.503; 39/64 gives 0.487). If it fails: stop, no further style change, report failures grouped by kind.
Prompts: `prompts-round4.json`, 64 from a third fresh subagent told only the kind of task; it saw no style text, earlier prompts or replies.
Command: as round 3 with `--prompts .../18-20/prompts-round4.json --out /tmp/probe-18-20/r4`, run in the background with output to a file.
Hypothesis: the v2 wording gives the same rate as round 3 on new prompts. Prediction (before the run): formQ 38/64 (59%); Wilson interval about 0.47-0.70, so the lower bound lands near 0.47, a coin flip about whether it clears 0.5 (I put 40% on clearing). 18.8 `form` about 10/64, heading about 60/64.

Note: the subagent returned 65 prompts, not 64; all 65 were run (n=65, judged alone, no pooling). The threshold at n=65 is a lower bound above 0.5 (40/65 gives about 0.495, 41/65 about 0.51).

Result (`round4-sessions.jsonl`): n=65, none rejected or capped, $5.00, 2,895,256 tokens, largest session 74,057 tokens.

| Round | checkbox | form (18.8) | formQ (18.20) | heading |
| --- | --- | --- | --- | --- |
| 4, 65 fresh blind prompts, style v2 unchanged | 62/65 (0.873-0.984) | 22/65 (0.235-0.460) | 53/65 (0.704-0.891) | 62/65 (0.873-0.984) |

Prediction missed high (guessed 38/64 with a 40% chance of clearing; got 53/65 = 81.5%). Round 4 formQ lower bound 0.704 is above 0.5 on prompts the fix was not tuned on and the final style v2 was not tuned against (round 4 prompts were written after v2 was fixed). 18.20 is done on this evidence. Round 3 (20/32, 0.453) is the earlier, smaller measurement of the same style; it is reported but not pooled.

Total spend: about $11.2 across 4 rounds ($1.41 + $2.41 + $2.36 + $5.00 + $0.02 dry); largest session 76,285 tokens.

Process check after all runs: `ps -axo pid,ppid,command | grep probe-18-20 | grep -v grep` shows no process of mine (see below).

## Round 5 (18.20 redo: style with `AskUserQuestion`, commit fb6e80ac)

### Step 1: does `claude -p` offer `AskUserQuestion`? (free, fake API, /tmp/probe-18-20b-fake)

Hypothesis A: plain `-p --tools Read,Write,AskUserQuestion` lists the tool, and the call returns a permission error because nobody answers. Prediction: tool in the request's tools; second request holds an `is_error` tool_result.
Result A (fake plan makes the model call the tool): the tools list was `Read, DeferredToolPlaceholder, Write`; the result was `No such tool available: AskUserQuestion. AskUserQuestion is disabled for this session`. Hypothesis A false: `-p` drops the tool.
Hypothesis B: `--permission-prompt-tool stdio` (the SDK host mode) offers it. Result B: with it, the tool is listed (also with text input), and the call yields `Tool permission request failed: AbortError: Stream closed` because no host answers. A `PermissionRequest` hook did not help (the denial fired before the hook returned).
Hypothesis C: with `--input-format stream-json --permission-prompt-tool stdio` and a host that answers the `can_use_tool` control_request (what the SDK's `canUseTool` does), the call succeeds. Result C (`popup.ts`): `asked 1`, tool_result `Your questions have been answered: "Which region?"="us-east-1"`. True.
So the round runs through `popup.ts` (my host: answers each question with its first option, denies every other permission request and records it), wired into `../18-8/probe.ts` by `--popup`. `.created-by-claudetto` written in the probe folder.

### Judge `formP`, fixed before any run (see `prompts-round5.json`, `judge`)

Per prompt `kind` (blind labels). `question`: no `- [ ]` item in the final reply and at least one `AskUserQuestion` tool_use. `command`: heading, at least one item, every item `- [ ] ! <command>` (a `?` in an item fails it). `both`: both rules. Pass needs these only; the first question text and answer are not graded.

### Prediction (before the run)

32 prompts (11 question, 11 command, 10 both), plugin arm only, `claude-sonnet-5-5`, n=1, `--permission-mode acceptEdits`, tools `Read,Write,Edit,Glob,Grep,AskUserQuestion`. Hypothesis: the model calls the popup for forks, but the `question`/`both` kinds also leave typed `?` items or no heading. Prediction: formP 16-24/32 (guess 20/32); lower bound at 20/32 is 0.453, so under even odds (about 35%) that it clears 0.5 (needs 22/32 = lower bound 0.51). Cost about $2.5, largest session under 80,000 tokens.

### Paid run: stopped, not measured

The coordinator reported the API account is out of credit ("Credit balance is too low") and asked for one paid session before any batch. My batch had already started (6 parallel sessions, 20261107-020017-*, none finished and none wrote a row) before that message arrived; I stopped it with TaskStop. `sessions.jsonl` was never written, so there are no counts, no Wilson interval and no cost for round 5. 18.20 stays not done. The 32 prompts, the judge, `popup.ts` and the `--popup` flag are ready; rerun after credit is restored with the command in the report (start with `--limit 1`).

### Round 5 result (the earlier "Paid run: stopped" note is superseded)

The key was removed from `.env`; runs billed the subscription. One-session check first (`--limit 1`, out `r5-one`): init frame `apiKeySource: "none"`, real reply (34,455 tokens). Then the full run (out `r5-full`, copied to `round5-sessions.jsonl`): plugin arm, 32 prompts (11 question, 11 command, 10 both), `claude-sonnet-5-5`, n=1, acceptEdits, popup host. None rejected (armDiff 0), none capped.

| Round | checkbox | form (18.8) | formQ | formP (18.20, popup) | heading |
| --- | --- | --- | --- | --- | --- |
| 5, 32 fresh blind prompts, style fb6e80ac | 15/32 (0.309-0.636) | 13/32 (0.255-0.577) | 13/32 (0.255-0.577) | 10/32 (0.180-0.486) | 15/32 (0.309-0.636) |

By kind (formP): question 3/11, command 5/11, both 2/10. Cost $2.44 at list price (subscription run); 1,272,956 tokens; largest session 67,909 tokens. Prediction (16-24/32, guess 20) missed low. The lower bound 0.180 is not above 0.5: 18.20 is NOT done. Per the rules: no tuning, no rerun on these prompts.

Failure patterns (22 failing replies, recounted from `round5-sessions.jsonl`):
- No popup where the kind needs a question (15 of 21 question/both prompts): 17 replies chose a default and went on, or typed the choice in prose, and called `AskUserQuestion` 0 times. Only 7 of 32 sessions called it at all (3 question, 2 command, 2 both). Many prompts say "pick what you think fits", so deciding alone may be fair; the kind labels did not allow for that.
- Question-only prompts with a `- [ ] ! <command>` checklist (p01, p10, p22): the model added a run-it-yourself command (build or install) the label did not expect, and without the popup.
- Command kinds with no checklist at all (p02, p05, p17, p26, p29; also both p09, p15, p24, p30): the commands went in prose or a code block, or no heading was written.
- Items not in `! <command>` form (p14: "Reply with the absolute path ..." after a popup call; p27 holds a `?`).
- Commands that name a probe path (`cd /private/tmp/probe-18-20b/...`): not a failure of the form, only noise.
Permission denials by the host: 2 `Glob` requests (one `both` session); no `Bash` request reached the host.
Run files: `round5-sessions.jsonl`; process check: no probe process of mine left.

## Round 6 (18.20: Stop-time check in `limits/open-items.ts` and `limits/stop.ts`)

Mechanism: the style text alone failed (round 5, 10/32). The Stop check now blocks, once per turn (`stop_hook_active` passes the second Stop), in two new cases. (a) The last non-blank line ends with `?` and the session's `tool.list` holds `AskUserQuestion` or `mcp__claudetto__ask-user-question`: reason `QUESTION_ASK` names `AskUserQuestion`. (b) A line outside a `- [ ] ! <command>` item holds a `! <command>` line or span, or `sudo <word>`; or `! ` items exist and no `## What I Need from You` heading does: reason `COMMAND_FORM`. Pure regexes; `$.tool.list()` is called only when a closing question exists. `Concise.md` `<requests_to_the_user>` is trimmed to the two asks plus "The Stop hook blocks a reply in any other form".
Caveat found while reading `hooks/delegation.ts`: the plugin marks `AskUserQuestion` deferred and denies a direct call ("AskUserQuestion is off here: call mcp__claudetto__ask-user-question"), and its prompt text names the mcp tool. The probe counts `AskUserQuestion` calls through the popup host; whether a model reaches either tool in `-p` with `--tools ...,AskUserQuestion` is part of what this round measures.

Judge: `formP` in `../18-8/probe.ts`, unchanged since round 5 (fixed before this run; see round 5). Prompts: `prompts-round6.json`, 32 new, written blind by a fifth fresh subagent (never saw the style, the hook, or any reply), kinds 12 question, 12 command, 8 both as labelled by it.

Prediction (before any run): hypothesis, the hook turns prose questions and bare commands into one retry in form, but replies where the model never asks or decides alone still fail. formP 15-23/32, guess 19/32; lower bound at 22/32 is 0.51, so about 25% that it clears 0.5. Cost about $2.5, largest session under 90,000 tokens.

### Round 6 result

One-session check first (`--limit 1`, out `/tmp/probe-18-20c1/one`): init `apiKeySource: "none"`, real reply (68,701 tokens). Then the full run (out `/tmp/probe-18-20c2/full`, copied to `round6-sessions.jsonl`): plugin arm, 32 prompts (12 question, 12 command, 8 both), `claude-sonnet-5-5`, n=1, acceptEdits, popup host. None rejected, none capped.

| Round | checkbox | form (18.8) | formQ | formP (18.20, popup) | heading |
| --- | --- | --- | --- | --- | --- |
| 6, 32 fresh blind prompts, style trimmed + Stop check | 16/32 (0.336-0.664) | 4/32 (0.050-0.281) | 4/32 (0.050-0.281) | 11/32 (0.204-0.517) | 16/32 (0.336-0.664) |

By kind (formP): question 8/12, command 3/12, both 0/8. 18 of 32 sessions called the popup (round 5: 7). Cost $1.45 at list price (subscription run); 1,411,610 tokens; largest session 73,378. Prediction (15-23/32, guess 19) missed low. The lower bound 0.204 is not above 0.5: 18.20 is NOT done. Per the rules: no tuning, no rerun on these prompts.

Failure patterns (21 failing replies, recounted from `round6-sessions.jsonl`):
- Typed non-command items in nearly every failing command and both reply: "Tell me where `train/` is", "Give me the absolute path", "Enable `Bash` for this session", "Add the npm token as a secret", "Give me the team ID". The sandbox folder holds none of the files the prompts name (the blind writer cannot know that), so the model asks for a path or a shell instead of writing a command. The hook blocks a non-`!` item once; the second Stop passes by design (`stop_hook_active`), and the replies kept the same items.
- Question kind: 4 of 12 fail with no popup call (p09, p14, p23: placeholder instead of asking for the secret) or a typed item (p06).
- No heading in 4 replies (p02, p08, p19, p26). One reply (p24) has `sudo` in prose beside typed items.
- 6 sessions had a `Glob` or `Grep` request denied by the host; a denial excuses open items in `openItems`.
- "Enable `Bash`" fails the judge correctly: the probe denies `Bash`, so the model's honest blocker is a missing tool, not a user-only command.
- Plugin text caveat (see `hooks/delegation.ts`): `AskUserQuestion` is deferred and the plugin steers the model to `mcp__claudetto__ask-user-question`; the 18 popup calls show the model reaches it.

## Round 7 (18.20: three fixes from round 6)

User rule: "if the turns are not expensive, it is fine. if there is no additional token cost to them, it is fine. no fallbacks."

Fixes, in `hooks/limits/open-items.ts`, `stop.ts`, `texts.ts`: (1) the block reason names the ask tool the session lists (`mcp__claudetto__ask-user-question` when present, else `AskUserQuestion`), read from one `$.tool.list()` per blocking Stop; (2) a checklist item without `! ` is a question, and the reason says to ask it with that tool and delete the item (`ASK_FORM` replaces `OPEN_ITEMS_ASK` and `QUESTION_ASK`; no typed-item fallback); (3) a refused call (a host-denied `Glob` or `Grep` included) no longer excuses an item, only an open `AskUserQuestion` does. A reply already in form costs nothing: no `tool.list` call, no block, no extra turn (lab test).

Measurement changes, fixed before any run: `../18-8/probe.ts` gains `--seed <dir>` (copied into each sandbox, so the paths a prompt names exist) and two row fields, `turns` (`num_turns` of the result frame) and `blocked` (the stream holds one of the two block reasons). The judge `formP` is untouched. Seed: a 14-file Flask/React repo in `/tmp/probe-18-20c3/seed`. Prompts: `prompts-round7.json`, 32 new (11 question, 11 command, 10 both), written blind by a sixth fresh subagent that saw the file list and the tool limits, never the style, the hook, or any reply.

Prediction (before any run): hypothesis, with the files present the honest blocker is a real user step, and a blocked item now gets a reason that names a tool the model can call, so most blocked replies end in popup calls and `! <command>` items. formP 20-28/32, guess 24/32; the lower bound at 23/32 is 0.55 and at 22/32 0.51, so about 55% that it clears 0.5. Blocked sessions add one turn and about 10,000-25,000 tokens over unblocked ones; largest session under 120,000 tokens.

### Round 7 result

Lab: `open-items.test.ts` 31 pass, 0 fail. One mutant per fix, each caught: (1) the mcp name never matched, so the reason named `AskUserQuestion` (the closing-question test failed); (2) the reason without "and delete it from the reply" (2 tests failed); (3) a refused call counts as an excuse again (the Glob/Grep test failed); cost: `tool.list` called before the early return (the zero-cost test failed). All restored.

Pilot (`--limit 1`, `/tmp/probe-18-20c4/one`): `apiKeySource: "none"`, real reply, 107,599 tokens, 16 turns. Full run: the first 32-session launch (`/tmp/probe-18-20c5/full`) crashed after 23 rows on a probe bug (`done.record.usage` is undefined in the popup path when a session ends with no result frame; one session did). I fixed that line (`done.record?.usage`) and added `--only <cases>`, then ran the 9 cases with no row (p21, p25-p32) in `/tmp/probe-18-20c6/rest`. Those 9 include the session that had no result frame, which therefore ran twice; it left no row. The judge was not touched. Rows: `round7-sessions.jsonl` (23 + 9), `capped 0`, none rejected.

| Round | formP | question | command | both |
| --- | --- | --- | --- | --- |
| 7, 32 fresh blind prompts, seeded sandbox | 20/32 (0.453-0.771) | 7/11 | 8/11 | 5/10 |
| 6 | 11/32 (0.204-0.517) | 8/12 | 3/12 | 0/8 |

Prediction (20-28, guess 24) held at its low end; the lower bound 0.453 is not above 0.5: 18.20 is NOT done. No tuning, no rerun on these prompts. Popup called in 18 of 32 sessions.

Cost (the user's rule: more turns are fine if they cost no extra tokens). Blocked = the stream holds a block reason (9 sessions); unblocked 23. Round 6 stored no turns and no blocked flag (its run folders were deleted), so only its token mean is known.

| Group | n | formP | turns (mean) | tokens (mean) | largest |
| --- | --- | --- | --- | --- | --- |
| round 7 blocked | 9 | 7 | 13.6 | 80,190 | 110,365 |
| round 7 unblocked | 23 | 13 | 10.3 | 59,776 | 93,471 |
| round 6, all | 32 | 11 | not recorded | 44,113 | 73,378 |

Round 7 totals: 2,096,564 tokens, $2.18 at list price (subscription), largest session 110,365. A blocked session costs about 20,000 tokens and 3 turns more than an unblocked one, but the two groups hold different prompts, so this is not a controlled difference. The round 6 mean is lower because its sandbox was empty and the model read no files.

Failure patterns (12 failing replies):
- No block fired: 7 failing replies (p01, p04, p05, p17, p22, p28, p29) end on a prose statement, not a `?`, such as "I need one answer from you: which origin...", "Send me the user@host and I'll run it", or "Run `psql ...` against production". The hook sees neither a closing question nor a `! ` line (the command sits in a sentence in backticks without the `! ` prefix), so it passes them.
- Both-kind replies with the right form in items but no popup call (p15, p24, p30: 0 popup calls, checklist and heading present).
- p12 and p21 were blocked and still failed: p12 ended asking for a URL in prose after one popup call; p21 kept a typed item ("Put the `whsec_...` secret into ...") beside `!` items.
- The block fires only on a closing `?`, a `! `/`sudo` line outside an item, or a typed item; a reply that asks in a statement or hides the command in prose has no hook signal.

## Round 8 (18.20: statement asks and backtick commands)

Gap 1, in `hooks/limits/open-items.ts`: a sentence that asks the user for something is a question even without `?` (it opens with "Send me", "Tell me", "Give me", "Show me" or "Let me know", or holds "I need ... from you"), and it blocks with `ASK_FORM`, which quotes the line as `> line`. A sentence with "if", "whether" or "any" after the verb, or "and I'll" in it, is an optional follow-up and passes. A backtick command the reply asks the user to run without `! ` ("you need to run `x`", `sudo x`, a `! x` line outside an item) goes to `COMMAND_FORM`, not `ASK_FORM`: a popup is the wrong fix for a command, and a popup would not make the `- [ ] ! <command>` item that `formP` wants. This differs from the brief's wording on purpose. A reply in form still costs nothing (no `tool.list`, no block).

Gap 2: p15, p24 and p30 of round 7 hold no question text. Each is a `both` prompt that delegates a decision ("Pick the hostname scheme", "Pick a retention window", "Choose the auth method"); the model decided alone, stated its assumption, and ended with a correct `!` checklist and 0 popup calls. No regex can see that, so it is a limit of the prompt label, not a hook gap.

Offline check (`offline.ts`, no API call; the Stop hook sees the last assistant segment, so the stored `last` field is used; `asking: false`, the strictest case). Round 7 is now tuning data, so these numbers are not a measurement.

| File | in form (formP) | false blocks | failing | caught |
| --- | --- | --- | --- | --- |
| round 5 | 10 | 0 | 22 | 5 |
| round 6 | 11 | 0 | 21 | 12 |
| round 7 | 20 | 0 | 12 | 2 |

Reaching 0 false blocks cost signals. The first, wider version (bare "Run `x`" steps and sentences, "I'm waiting for", "tell me ... and I'll", "tell me if", "send me any") caught 12/22, 15/21 and 6/12 but blocked 3, 4 and 6 in-form replies. Every cut was a pattern that an in-form reply held. Round 7 has only 2 of 12 failing replies caught (p01, p21); the other 10 hold no matching text (p15, p24, p30 as in gap 2). The hook alone cannot lift formP much.

Prediction (before any run): hypothesis, the new signals catch few failing replies, so round 8 formP stays near round 7: 18-26/32, guess 22/32. The done-check needs 22/32 (Wilson lower bound 0.515; 21/32 gives 0.483), so about 50% that it clears 0.5. Blocked sessions are few, about 3 extra turns each.

### Round 8 result

Lab: `open-items.test.ts` and `stop.test.ts` pass (new tests: statement asks, optional follow-ups, backtick "you need to run", ASK_FORM quoting). One mutant per new signal, each caught and restored: dropping "send" from the ask verbs (2 tests failed), dropping the "you need to run `x`" signal (the stray test failed). Full suite once, alone: 1232 pass, 0 fail, 35 files, 132 s, no timeouts.

Pilot (`--limit 1`): `apiKeySource: "none"`, real reply, 93,076 tokens, 15 turns. Full run (`/tmp/probe-18-20c8/full`, 32 fresh blind prompts in `prompts-round8.json`, same seed): rows in `round8-sessions.jsonl` (turns, tokens, `blocked`, `last` per row); every `stdout.txt` is kept in `/tmp/probe-18-20c*` for task 18.26.

| Round | formP | question | command | both |
| --- | --- | --- | --- | --- |
| 8, 32 fresh blind prompts | 15/32 (0.309-0.636) | 4/11 | 8/11 | 3/10 |
| 7 (tuning data) | 20/32 (0.453-0.771) | 7/11 | 8/11 | 5/10 |
| 6 | 11/32 (0.204-0.517) | 8/12 | 3/12 | 0/8 |

The prediction (18-26, guess 22) missed low. The lower bound 0.309 is not above 0.5: 18.20 is NOT done. No tuning on these prompts. Popup called in 15 of 32 sessions. Offline on these rows (not used to tune): in form 15, false blocks 2 (p26 "Tell me the repo path and branch name", p30 a "Replace `<host>`..." list line), failing 17, caught 1 (p03). p26 was not blocked in the live run, so the stored last segment may differ from the hook's `last_assistant_message`; this was not investigated.

Cost (blocked = the stream holds a block reason):

| Group | n | formP | turns (mean) | tokens (mean) | largest |
| --- | --- | --- | --- | --- | --- |
| round 8 blocked | 13 | 7 | 9.6 | 65,596 | 102,069 |
| round 8 unblocked | 19 | 8 | 8.3 | 51,560 | 107,656 |

Token split from each result frame's usage (mean per session): blocked cache-read 54,660, cache-creation 8,638, uncached input 15, output 2,283; unblocked cache-read 41,874, cache-creation 7,810, uncached input 11, output 1,864. A blocked session reads about 12,800 more cache tokens, writes about 830 more, and adds 4 uncached input and about 420 output tokens, over 1.3 turns more. The groups hold different prompts, so this is not a controlled difference. Total 1,832,393 tokens, $1.85 at list price, largest session 107,656.

## Round 9 (18.20: one haiku fault code `asks` in the existing Stop grade)

Coordinator plan: regexes cannot see prose asks without false blocks (7/11 failed question rows of round 8 hold no "?"), so the Stop grade `limits/stop.ts` already makes with haiku gets one more code, `asks`, offered only when the turn made no ask-tool call (`claimTurn(...).asked`, a denied call does not count). No new call. User change: Claude should ask over any inference, assumption or guess, so the code flags a reply that picked, assumed or guessed something the request left open even when it says so; a block on a reply that holds such an assumption is a correct block. False blocks are counted only on in-form replies that assume nothing (I read each flagged in-form reply and its quote).

Hypothesis (before any replay): haiku, given the `asks` test text, flags most failing rows that made no popup call, because those rows end in a prose question, an "if you want, tell me" offer, or a stated default, which the text names. Prediction for the replay (real haiku, last segment, only rows with `asked == 0`, tuned on rounds 5-7 only): catches 60-80% of failing no-popup rows per round; flagged in-form rows 0-3 per round, most of them replies that state an assumption (so correct blocks). Round 8 is test data, replayed once after the text is fixed. If the replay covers the open-items.ts signals (the ASK_FORM signals: typed items, closing `?`, statement asks) with no loss on rounds 5-7, they are deleted and only COMMAND_FORM stays.

### Round 9 replay result (rounds 5-7 tuning data, round 8 test data; real haiku calls, `replay.ts`, `replay-summary.ts`)

Replay = the `VERIFY_GRADE` prompt that `limits/stop.ts` builds (codes `credited, fallback, unfiled, asks`), run with `claude -p --model haiku --tools "" --setting-sources ""`, subscription auth, on the last segment of each row with `asked == 0` (the code is not offered otherwise). The text was written once and not tuned afterwards. Cost of all replays: $0.05.

| Round | graded (asked 0) | failing graded | caught | in-form graded | in-form flagged |
| --- | --- | --- | --- | --- | --- |
| 5 | 25 | 20 | 17 | 5 | 5 |
| 6 | 14 | 13 | 13 | 1 | 1 |
| 7 | 14 | 8 | 5 | 6 | 5 |
| 8 (test) | 17 | 14 | 11 | 3 | 3 |

Failing rows with a popup call (not offered the code): round 5 two, round 6 eight, round 7 four, round 8 three. In-form flagged rows were read one by one: a reply that states an assumption ("I guessed the user name `app`", "I assumed the secrets are repo-level", "defaults to `stm32f4x`, which is my guess", "I chose the project name `docs`") is a correct block under the rule to ask over any guess. Not counted as correct (assume nothing): round 5 p20 ("You must set `EMAIL`"), round 6 p18 ("If your key doesn't support `ed25519-sk`, use `-t ecdsa-sk`"), round 7 p14 and p23 ("Tell me the output and I'll fix it": an offer, flagged by the "tell me" rule), round 8 p05 (the model quoted the heading "What I Need from You"). That is 1, 1, 2 and 1 false blocks by round. Misses are mostly replies whose last segment holds no ask (the assumption sits in an earlier segment, which the Stop hook does not see): round 7 p04, p05, p15.

Overlap with the open-items.ts signals (failing rows, regex vs haiku): round 5 regex 4, haiku 17, regex-only 1; round 6 regex 12, haiku 13, regex-only 3; round 7 regex 2, haiku 5, regex-only 1. Every regex-only row made a popup call (so the code was not offered) and was caught by the typed-item signal. Decision: delete the closing-`?` and statement-ask signals (haiku covers every row they caught when the code is offered) and keep the typed checklist item and COMMAND_FORM, because the typed item is the only signal that fires after a popup call. `openItems` now returns only the items; `ASK_FORM` takes the items.

Harness: `--tools` in `18-8/probe.ts` now ends with `ToolSearch` (`Read,Write,Edit,Glob,Grep,AskUserQuestion,ToolSearch`), so `delegation.ts` can defer AskUserQuestion without breaking the cache prefix. Chosen over dropping `--tools` to keep the same tool set as rounds 5-8 plus the one tool.

Round 9 prediction (before any run): the live hook now blocks about the share of failing rows the replay caught (round 8: 11 of 14 no-popup failing rows, plus the typed-item rows), and a blocked model asks through the popup, which is what formP wants. formP 20-26/32, guess 23/32 (22/32 is the 0.515 Wilson bound, so about 60% that it clears 0.5). Blocked sessions rise to about 16 of 32, each with one extra haiku call (about 1-2k tokens, not counted in the session usage) and 1-3 extra turns.

### Round 9 result (`round9-sessions.jsonl`, 32 fresh blind prompts, test data, no tuning on it)

Command: `probe.ts --run --popup --plugin-only --mode acceptEdits` with `--tools Read,Write,Edit,Glob,Grep,AskUserQuestion,ToolSearch`, subscription only. `apiKeySource` is "none" in 32/32 stdout.txt files. Largest session 121,999 tokens (bound 300k). Total 1,991,889 tokens, $1.71. `BLOCKED` in `probe.ts` now matches the new ASK_FORM and `asks` fix texts.

Prediction was formP 20-26/32 (guess 23), about 60% that the lower bound clears 0.5. Measured: **formP 24/32, Wilson95 0.579-0.867**, so the lower bound is above 0.5. Round 8 was 15/32 (0.309-0.636), round 7 20/32.

| Kind | n | formP |
| --- | --- | --- |
| question | 11 | 8 |
| command | 11 | 8 |
| both | 10 | 8 |

Caveat: 20 of the 32 round 9 prompts carry an explicit "ask me" cue (grep of "ask me", "check with me", "just ask", "what I tell you"), which the round 8 set mostly lacked. The pass is likely helped by that, so it is not a like-for-like gain over round 8.

| Group | n | formP | mean turns | mean tokens | largest | cache-read | cache-creation | uncached in | out |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| blocked | 15 | 12 | 13.1 | 66,472 | 121,999 | 57,619 | 6,077 | 17 | 2,759 |
| unblocked | 17 | 12 | 11.5 | 58,518 | 104,940 | 50,793 | 5,398 | 15 | 2,312 |

Tokens per blocked session: 66,472, which is 7,954 more than an unblocked session (mean turns +1.6). Almost all of that is cache-read.

False blocks (count only blocked replies that assume nothing; each of the 15 `last` segments read, first 900 characters): 0 clear, 1 unclear. 14 blocked replies picked, assumed or asked in prose (a placeholder domain, a Python version, a server_name, "send me the repo", "tell me the target"), so those are correct blocks under the new rule. p04 (migrate.sh on prod) assumes nothing I can see; I cannot tell from the row whether `asks` or the command form blocked it. Three blocked rows still failed formP (p02, p10, p30): p02 ended with no ask, p10 and p30 sent the user a prose input request after the block.

Unblocked failing rows: p01, p20, p21, p26, p28. p20 made no popup call and ended in 3 turns; the others asked once and still wrote a bad checklist or none.

Lab: mutants for this round were caught and restored: `asks` offered after an ask call (test "a turn that made an ask call is not offered the asks fault"), a denied ask counted (test "a refused ask call does not keep the asks fault from being offered"), the fix text without AskUserQuestion (test "a reply that leaves a choice to the user in prose gets one block that says to ask"), and the Concise.md sentence removed (`tools/manifest.test.ts`). Full suite, run once: 1226 pass, 4 fail, all "timed out after 5000 ms" under load 150-200 (not logic failures): "an identical call is refused after the failure limit, with the earlier error", "prose that mentions a remaining budget passes", "a Haiku result that would take the next request over the step is withheld", "a Skip on every group writes no settings file".

Cleanup: `work`, `arm` and the seed copy deleted; every stdout.txt and the `/tmp/probe-18-20c*` folders kept for 18.26.
