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
