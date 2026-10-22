# Faults of Claudetto 0.2.0 in Real Sessions

Source: `~/.claude/projects/*/*.jsonl` and the `subagents/` folders, read-only.
The Python results of the mining run are in the transcript `~/.claude/projects/-Users-krystian-Downloads-CodeProjects-xsyetopz-claudetto/b92de5a9-1c90-46ef-8ddd-5570013992a9/subagents/agent-a8507bb670f95ee8f.jsonl`.
The scratch scripts and data were deleted after the run.
The tag `[NEEDS CLARIFICATION: run figure]` marks a figure that I checked against that transcript, but that the scratch data can no longer reproduce.
The data covers 1258 [NEEDS CLARIFICATION: run figure] files and 282 sessions with a `cost-state` record.
Counts are "real" unless the cell says "dev" or "eval".

## Scope Warning

Read this first, because it changes how to read each count.

Claudetto 0.2.0 was loaded in only three sessions with real work:

- OpenJoystickDriver `a3686f55`, from about 17:40 on 2026-10-21, after `/claudetto:setup`.
- `~/.claude` `2c164b38`, the `/claudetto:setup user` session.
- The claudetto dev session `b92de5a9`.

One eval session, `7895b8fd`, also loaded it.
I found the plugin by the `<reply_style>` output-style prompt and by `mcp__claudetto__advise`.
There are zero `mcp__claudetto__advise` calls, zero `claudetto:` agents, and zero `claudetto:dry` or `claudetto:patch` skill uses in real sessions.

The other real sessions (about 190) ran a "vanilla" setup that the user built on 2026-10-18 in session `646bdf41`.
That setup has:

- A user mod, `~/.claude/mods/handoff/hooks/register.ts`, with the tool `mcp__handoff__handoff` and a 100k Haiku cap.
- A custom output style, `Concise`.
- Custom agents `implementer` (Sonnet), `reviewer` (Opus), `scout` (Haiku), and `writer` (Haiku).
  The source of these agents is unconfirmed.
  They are not in the 0.2.0 plugin cache.
  The old claudetto `agents` slice was cut in commit `82debe85`.
- A global `CLAUDE.md` that says "You coordinate.
  Do the work through subagents".

The user wrote in `646bdf41`: "this is supposed to be vanilla with a normal small mod + settings.json, not direct claudetto borrow."
The vanilla setup copies claudetto designs (print deny, report-now cap, handoff, agents).
So a fault in a vanilla session is "claudetto-derived design", and not proof that the 0.2.0 plugin caused it.
Each row has a group tag in the id column:

- `A` means a session with the 0.2.0 plugin loaded.
- `B` means a vanilla session, or a Claude Code behavior, that 0.3.0 must prevent or must not reproduce.
- `C` means a dev or eval session (low weight).

## Ranked Fault Table

Rank is by count and by cost to the user.
"unconfirmed" means I did not find the cause in `src/` or in the logs.

| id | fault | count | sessions | example quote or evidence | likely cause |
| --- | --- | --- | --- | --- | --- |
| F01 B | Worktree guard rejects a subagent `Bash` command as "too complex to verify" | 354 real, 87 dev | 14 real | 9.2% of subagent `Bash` calls. 50 agents hit it, median 6, max 17. Reasons: 137 "too complex", 113 "names git in a form too complex", 46 "runs swift with the text", 27 "runs sed with a value computed at runtime" | Claude Code guard for `isolation: worktree` (52 `Agent` calls). Claudetto link: the old `implementer` isolation (cut in `82debe85`) and `worktree.baseRef` in `src/plugins/claudetto/slices/setup/slice.ts`. Unconfirmed |
| F02 B | Subagent stops at its turn limit and the work is left half done | 13 results, 51 mentions real, 5 and 21 dev | 24 real | "stopped at its 40-turn limit". The user said "as they removed turn limits for agents" in `a3686f55` | `maxTurns` of the cut agents slice (30 to 60) or of the vanilla agents. Unconfirmed |
| F03 B | Auto mode classifier denies a command, and the agent retries or loops | 29 real (14 main, 15 sub), 94 dev | n/a | Reasons: Irreversible Local Destruction 8, Auto-Mode Bypass 5, Interfere With Workloads 2, Credential Leakage 2, Security Weaken 2, Unrequested Commit 2, 7 single hits. 2 more: "could not evaluate" | Claude Code. Not claudetto |
| F04 B | Decision put in prose instead of a question tool | 8 blocks real, 7 sessions. 37 of 164 human prompts (23%) begin with `>` to quote a prose question | 7 real | `AskUserQuestion` was used 82 times in real main, so the tool is known | `src/plugins/claudetto/slices/styles/styles/Concise.md` ("What I Need from You" pattern). Known fault 8 of `.claudetto/0.3.0-findings.md` |
| F05 A | Sandbox blocks `swift build` and `swift package describe` with `sandbox_apply: Operation not permitted`, `readonly database` in the SwiftPM cache, and `NSCocoaErrorDomain Code=513` | about 10 errors, then 1 workaround | 1 (`a3686f55`) | `--disable-sandbox` and a build in `$TMPDIR` failed too. The model fell back to a "source-only review" at 17:54. The user allowed `sandbox.enabled: false` at 17:56 and the build then worked | `sandbox.enabled: true` and `allowUnsandboxedCommands: false` in `slices/prompt/slice.ts`. `sandbox.filesystem.allowWrite` has only 5 package caches in `slices/setup/slice.ts`. Known faults 1 to 3 |
| F06 B | `Context budget of 100000 tokens is used up` and "result held back" errors | 30 and 6 real | 10 real | A Haiku subagent loses its result at the cap | Vanilla mod `register.ts`. Mirrors `HAIKU_HANDOFF_TRIGGER_TOKENS` 100_000 in `src/kernel/budget.ts` |
| F07 B | Lowercase `bash` tool call: `No such tool available: bash` | 39 real, 21 dev | 56 files | Always a Sonnet 5.5 subagent, one wasted retry each | Unconfirmed. Not a claudetto message |
| F08 B | Print-only `Bash` (`cat`, `head`, `tail`, `sed -n` alone) instead of `Read` | 652 [NEEDS CLARIFICATION: run figure] real, 222 dev | many | `Bash` 18,240 [NEEDS CLARIFICATION: run figure] calls against `Read` 492 in real subagents. Real main: 2740 [NEEDS CLARIFICATION: run figure] against 92 | Claude Code auto mode `bashFirst` steer. The claudetto print deny then turns it into a retry (F09) |
| F09 A | Print deny: the agent sends a print-only command and gets "This command only prints a file" | 9 real, 6 dev | 1 real (`a3686f55` subagents) | `agent-a0` 1, `agent-ab` 5, `agent-af` 3. Each cost one retry with `Read`. My own `Bash sed -n` was denied the same way | `src/plugins/claudetto/slices/guard/prompts/print-deny.md`. The guard works and the text is clear. The cost is the retry |
| F10 B | Large tool output is persisted and then re-read | 319 persisted, 49 re-reads (2.12M chars) | many | 522 real subagent `Bash` results above 16000 chars. 58 results above 30k chars. The largest are 124k, 92k, 87k | `BASH_OUTPUT_MAX_CHARS` 16_000 in `src/kernel/budget.ts` set by `bashOutputMaxChars`. Vanilla sessions may not have it. Unconfirmed |
| F11 B | `Blocked: sleep N followed by` | 23 real sub, 9 dev | 12 real | The agent polls a build with `sleep` | Claude Code rule |
| F12 A | `Concurrent subagent limit` error on `Agent` launch | 2 real, 15 dev | 1 real (`a3686f55`, 17:43:33) | Work was queued to `HANDOVER.md` | `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "2"` in `slices/prompt/slice.ts` |
| F13 B | Subagent hand-back floods the main context | 1167 [NEEDS CLARIFICATION: run figure] real, 494 dev (6.5M and 2.0M chars) | many | `queued_command` attachments | Claude Code framing. Volume rises with `run_in_background` (207 launches) |
| F14 B | Context grows far above the planned window | main: 756 [NEEDS CLARIFICATION: run figure] requests above 200k, 291 above 300k. sub: 1639 [NEEDS CLARIFICATION: run figure] above 200k, 385 above 300k | many | Mean context 95,768 [NEEDS CLARIFICATION: run figure] (main) and 88,339 [NEEDS CLARIFICATION: run figure] (sub). 61 Haiku requests above 100k | `CONTEXT_WINDOW` 300_000 and `HANDOFF_TRIGGER_TOKENS` 225_000 in `src/kernel/budget.ts`. The vanilla mod acts only on the main thread. Unconfirmed |
| F15 B | Subagents carry most of the cache-read cost | 1.63B of 2.1B cache-read tokens (78%) | all | `implementer` 12,876 [NEEDS CLARIFICATION: run figure] requests, 1.267B cache read. `reviewer` 4,758 [NEEDS CLARIFICATION: run figure] requests, 245M | Agent design (vanilla). 0.3.0 can set a budget per agent |
| F16 B | Opus `reviewer` for each review | 222 results | many | Opus is 54% of real cost ($433.76 of $799.26) | Vanilla agent model. Unconfirmed |
| F17 A | Setup runs an interactive `codegraph install` that no session can answer | 1 | 1 (`2c164b38`) | The command stopped at a prompt | `slices/setup/slice.ts`. The model chose the command |
| F18 A | After setup, the new sandbox blocks writes to `~/.claude/CLAUDE.md` and the Claude settings files | 1 | 1 (`2c164b38`) | The model said so in its own reply | `sandbox` block in `slices/prompt/slice.ts` and the `allowWrite` list in `slices/setup/slice.ts` |
| F19 A | The status line command points to the versioned `0.2.0` plugin folder | 1 | 1 (`2c164b38`) | Each update needs a second `/claudetto:setup user` | `slices/setup/slice.ts` and `slices/statusline`. Cause by the model's own statement, so it is unconfirmed in the code |
| F20 A | Setup advice to run `alias claude='claude --allowedTools Glob,Grep'` as a workaround | 1 | 1 (`2c164b38`) | A workaround of a block, in a reply | Unconfirmed. Review the `allow` list in `slices/prompt/slice.ts` |
| F21 A | Setup preview is long: 9102 [NEEDS CLARIFICATION: run figure] chars and 68 changes | 1 | 1 (`2c164b38`) | The model asked 2 `AskUserQuestion` questions and then applied the change | `slices/setup/slice.ts` |
| F22 B | Keychain dialogs from probe processes the agent started | 3 prompts | 3 (`ef7c75f8`, `dd4454f5`) | "user is getting this error. not sure why. is it from your session?" and "this keeps happening." | Project scripts (14 `security` commands in real main). Not claudetto. Unconfirmed |
| F23 B | The agent defers work or asks for approval that the user already gave | 3 prompts | 2 (`ef7c75f8`, `a3686f55`) | "again, no need to ask for approval. You do what was agreed upon, and that's it." and "why are you deferring work?" | Unconfirmed. The `ask` rules in `slices/prompt/slice.ts` (`GIT_ASK`) can add a stop |
| F24 B | The agent says "blocked by the permission check" and does not give the user the command | 4 admissions | 1 (`97afdb89`) | "you're stupid. if you can't do it, GIVE USER the command to do it." It followed a blocked `kill` of stale agent processes | Classifier denial (F03). The prompt text in `slices/prompt` has no rule for it. Unconfirmed |
| F25 B | The agent tells the user to run it with `!` or "yourself" | 30 mentions | many | The user pays the work back | `Concise.md` has a "Run `! just sandbox`" line. Unconfirmed in the others |
| F26 B | Repeated same-file reads | 25 cases of 3 or more reads in a session | 25 | | No cause found |
| F27 B | The same tool error repeats 3 or more times | 38 pairs of transcript and error | 38 | | Mixed. The rows above cover the largest |
| F28 B | Auto-mode bypass loop after the user turned the sandbox off | 5 real | 1 (`agent-af`, 17:57) | The classifier blocked `swift build --build-tests` and a read-only `sed -n; grep` | Claude Code. Follows F05 |
| F29 B | zsh `no matches found` on a glob, and `= not found` | 39 and 10 real | many | | Claude Code shell. A `setopt` fix is not in `src/`. Unconfirmed |
| F30 B | `Monitor` call without `description` | 15 | 15 | | Claude Code tool schema |
| F31 B | `Write` before `Read` ("File has not been read yet") and "File has been modified since read" | 9 and 4 real | n/a | | Claude Code |
| F32 B | Safety check on `rm` with a glob after `cd` | 3 real, 3 dev | 3 | `rm .../*` in awesome-biomejs-lints | Claude Code |
| F33 B | `timeout: command not found` | 3 | 3 | macOS has no `timeout` | The agent does not know the platform |
| F34 B | `Bash` `Exit code` errors | 51 main, 398 sub | all | | Mixed. Mostly build and test failures |
| F35 B | The handoff loop: a plugin prompt, `/clear`, and a resume | 182 calls, 179 resumes | many | 432 assistant mentions of handoff | Vanilla mod. Mirrors `slices/handoff/slice.ts` |
| F36 B | `dangerouslyDisableSandbox` in the tool input | 3 real, 10 dev | 2 | `~/Library/Application Support/Google/Chrome` `Operation not permitted` is macOS privacy | The agent chose it. `allowUnsandboxedCommands: false` should stop it. Unconfirmed |
| F37 C | `bun is unable to write files to tempdir: EPERM` for `jscpd` in the `dry` skill | several dev | dev | The model once used `dangerouslyDisableSandbox` | `src/plugins/claudetto/slices/dry/adapters/cli.ts` (fixed with `BUN_TMPDIR`) |
| F38 C | `openspec init` EPERM on `.claude/skills` | 1 dev | `b92de5a9` | | Sandbox settings |
| F39 C | Status line hook `SyntaxError: JSON Parse error: Unexpected EOF` on `--help` | 1 dev | dev | | `src/plugins/claudetto/slices/statusline/adapters/cli.ts` line 122 (fixed in dev) |
| F40 C | `Interactive mode required` for `openspec config profile` | 1 dev | dev | | The agent chose a command that needs a tty |
| F41 C | The print guard itself fails: "The print guard failed" | 3 dev | dev | | `src/plugins/claudetto/slices/guard/prompts/fail-deny.md` |
| F42 C | Weekly limit and sleep errors from the API | 5 and 2 dev | dev | | Cost. Claude Code |

Total: 42 faults.
Group A has 9 (F05, F09, F12, F17 to F21).
Group B has 28.
Group C has 5 (F37 to F41), plus F42 as cost.

The count in F03 for the dev column sums 13 main and 81 sub.
The session count is "n/a" where I did not compute it per fault.

## Exposure That the Logs Show, Not Faults

These commands ran in real sessions.
They show how much the `ask` and `deny` lists in `slices/prompt/slice.ts` would have fired.
The match is by regex on the `Bash` input, so heredoc text gives false hits (for example `sudo`).

| Command | real main | real sub | dev |
| --- | --- | --- | --- |
| `git reset --hard` | 0 | 42 | 18 |
| `git checkout --` or `git restore` | 0 | 8 | 21 |
| `git push` | 54 | 3 | 43 |
| `git push --force` | 0 | 0 | 5 |
| `git worktree remove` or `prune` | 6 | 15 | 12 |
| `rm -rf` and `rm -r` | 22 | 120 | 101 |
| `kill`, `pkill`, `killall` | 12 | 92 | 18 |
| `.env` file in `Bash` | 12 | 26 | 27 |
| `gh pr merge` or `gh release create` | 2 | 0 | 1 |

## User Frustration

There are 164 real human prompts and 56 dev prompts.
Interrupts are rare (2 real, 1 dev).
Each quote is under 25 words.

| Session | Quote | Assistant action before it |
| --- | --- | --- |
| `97afdb89` | "you're stupid. if you can't do it, GIVE USER the command to do it." | Said the permission check blocked the `kill` of stale processes (F24) |
| `a3686f55` | "again, no need to ask for approval. You do what was agreed upon, and that's it." | Asked for approval before a commit (F23) |
| `ef7c75f8` | "yes. why are you deferring work? You're tasked to move fully to 2.1.305" | Deferred the move (F23) |
| `ef7c75f8` | "user is getting this error. not sure why. is it from your session?" | Probe processes opened a keychain dialog (F22) |
| `dd4454f5` | "this keeps happening." | The same keychain dialog (F22) |
| `ef7c75f8` | "user can't do anything on their own unless you tell me exactly how you want." | Asked the user to act without the exact steps (F25) |
| `8d9e2230` | "try now." | A signing certificate loop, three prompts in a row |
| `646bdf41` | "this is supposed to be vanilla with a normal small mod + settings.json, not direct claudetto borrow." | Copied claudetto designs into the vanilla setup |
| `d7464d89` | "the AGENTS.md is unfair. agents must review translations, too." | A rule in a project file |
| `803eb651` | "we shouldn't have to maintain Swift + Python at the same time." | A design choice |
| `1079aae9` | "wait, so why was 0.5.0 published if it was still not fully fixed?" | A release before the fix (not claudetto) |

## Agents

Real: 623 [NEEDS CLARIFICATION: run figure] `Agent` results (4 came from subagents).

| Type | Results | Resolved model |
| --- | --- | --- |
| `implementer` | 346 | Sonnet |
| `reviewer` | 222 | Opus |
| `writer` | 23 | Haiku |
| `general-purpose` | 14 | |
| `claude` | 8 | |
| `scout` | 7 | Haiku |
| `statusline-setup` | 1 | |
| `impeccable:*` | 2 | |

Resolved model: Sonnet 365, Opus 229, Haiku 27.
The `model` argument was empty in 556 [NEEDS CLARIFICATION: run figure] calls, `sonnet` in 53, `opus` in 13, and `haiku` in 1.
Status: `async_launched` 450 and `completed` 171.
`run_in_background` was true in 207 calls and `isolation: worktree` in 52.

Tokens from `toolUseResult` (only results that carry token data):

| Type and model | n | Tokens | Time | Tools |
| --- | --- | --- | --- | --- |
| `implementer`, Sonnet | 87 | 5.72M | 496 min | 1992 |
| `reviewer`, Opus | 71 | 3.85M | 168 min | 1192 [NEEDS CLARIFICATION: run figure] |
| `writer`, Haiku | 7 | small | | |

Requests by `querySource`: `implementer` 12,807 [NEEDS CLARIFICATION: run figure], `reviewer` 4,758, `general-purpose` 833 [NEEDS CLARIFICATION: run figure], `writer` 444, `claude` 303, `scout` 90, main thread with `outputStyle:Concise` 5,107 [NEEDS CLARIFICATION: run figure].
The `implementer` cost is about $248 at the fitted Sonnet rates (my estimate).
No claudetto-named agent ran, so the 0.2.0 `Agent` description rewrite was not tested in real use.

## Cost

The numbers come from `cost-state` records (282 sessions).
`cost-state` appears to include subagent usage.

| Group | Cost |
| --- | --- |
| Real | $799.26 |
| Dev | $321.76 |
| Eval | $0.39 |

| Real project | Cost | Sessions |
| --- | --- | --- |
| OpenJoystickDriver | $386.61 | 28 |
| claude-code-docs | $194.71 | 59 |
| vscode-bnf-intellisense | $84.31 | 14 |
| versionlens-redux | $68.74 | 38 |
| export-for-ai-agents | $40.40 | 41 |
| awesome-biomejs-lints | $13.76 | 8 |
| `~` | $10.00 | 5 |
| `~/.claude` | $0.65 | |
| `-private-tmp` | $0.08 | |

| Real model | Cost |
| --- | --- |
| Opus 5.5 | $433.76 |
| Sonnet 5.5 | $363.76 |
| Haiku 5.5 | $1.45 |
| Mythos | $0.29 |

| Real model | Input | Cache creation | Cache read | Output |
| --- | --- | --- | --- | --- |
| Sonnet | 27,582 [NEEDS CLARIFICATION: run figure] | 47.6M | 1.329B | 11.19M |
| Opus | 4.24M | 25.0M | 734M | 5.73M |

Top real sessions: `ed0fd28b` $83.31, `803eb651` $76.56, `97afdb89` $70.15, `d205db63` $33.18, `514a6d80` $30.67, `d7464d89` $30.31, `8d9e2230` $26.58.
Main-thread cache creation is all 1h (10.2M).
Subagent cache creation is 5m (64.9M).
Fitted Sonnet rates per MTok are 2 in, 2.5 cache write, 0.1 cache read, 10 out (max error 0.0).
The Opus and Haiku fits are unreliable, so I used `cost-state` for them.
Weekly limit messages: 5 in dev.
Compaction: 1 boundary in dev.
The user clears and resumes by handoff instead.

## Reply Length

Main-thread assistant text, real: 2439 [NEEDS CLARIFICATION: run figure] blocks, median 145 chars, p90 925 [NEEDS CLARIFICATION: run figure], 49 above 1500, max 4060 [NEEDS CLARIFICATION: run figure].
Dev median is 130.
The `Concise` style holds the length down in most replies.

## Method

- I parsed each `.jsonl` file with Python 3 (`-I`), and wrote one event per line to a scratch file.
- I deduped `assistant` records by `message.id`, because each content block repeats the same `usage`.
- I took cost from `cost-state`, tokens from deduped `usage`, and agent data from `toolUseResult`.
- I split the data by project folder: real, dev (`...-claudetto`), and eval (`-private-tmp-claudetto-evals-*`, `-private-var-folders-*`).
- I found the plugin by the `<reply_style>` prompt and `mcp__claudetto__advise`, and found the vanilla setup by the `Concise` style and `mcp__handoff__handoff`.
- For tool errors I used `is_error` and start-of-text patterns.
  Plain substring search gave false hits in the `claude-code-docs` project, where the docs mention the classifier and the sandbox.
  Counts from that project are less reliable.
- For sandbox failures I used short `Bash` results only (under 6000 [NEEDS CLARIFICATION: run figure] chars).
- I read `src/` and `.claudetto/0.3.0-findings.md` to map each cause.
  I did not run any model, `claude`, `just sandbox`, or eval.
  I sent no session content to a web service.
- Limits: the session count is missing for several rows, the regex exposure table has false hits, and only three real sessions had the plugin loaded.
  So group A has few data points.
- I left out secrets (OAuth token names, `.env` values, and keys) from this report.
