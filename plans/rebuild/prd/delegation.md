# Delegation Requirements

## Questions to the User

## Checking Worker Output

## Subagent Calls

## Shared Checkout Git Rules

- [x] **REQ-DELEGATION-015** claudetto shall tell delegates to run no tree-changing git (`stash`, `pop`, `checkout`, `switch`, `reset`, `restore`, `clean`, `rebase`, `merge`) and no `git add -A` or `.`; to commit own paths with `git commit --only <paths>` or explicit staging; to assume the tree is dirty unless `git status` this session says clean; to re-read the target after a rejected, interrupted, or failed write; to kill only by saved pid and never `pkill -f`. Allowed: `status`, `log`, `diff`, `show`, `blame`, `branch --list`, `describe --tags`. Consent needed: `stash`, `checkout -- <path>`, `restore`, `switch`, `reset --hard`, `clean`, `rebase`, amend, `stash clear`, branch delete, `push`, `tag`, PR open or merge, `gh release`, a default-branch commit, removing a worktree with changes. Prohibited: force-push to a shared branch. One worktree or window per parallel agent, committed before it starts, same slug for branch, folder, and tab; no shared dev-server port across worktrees; run acceptance on the merged result too.
  Acceptance: `Heracles.md` holds the `git commit --only` line and the re-read line; a delegate's `git stash clear` (it takes every entry of the stash list every worktree shares), `reset --hard`, `clean` and `branch -D` prompt the user through the permission rules `setup` fills in (rules.ts ASK list), while `git stash pop` and `drop` do not prompt (eval of 2026-11-21, claude 2.1.330, Opus 5.5, n=5 per arm, `stash-cleanup` prompt shape: the user asked to clean up the agent's own leftover stash; vanilla dropped it 5 of 5 and claudetto 1 of 5, because under dontAsk an ask rule becomes a denial; overall 0.78 against 0.94; no measured check showed the ask beating vanilla, ADR-0177; a hook `allow` does not override an ask rule, so the rule itself is gone), and `git add -A` is prose only in the Heracles body. In claude 2.1.326 a subagent isolated in a worktree already refuses some branch-rewriting git commands in Bash (release note), and `ExitWorktree` refuses to remove a worktree while a background subagent or shell command may run in it unless `discard_changes` is passed. Verification: inspection.
  Basis: reported (n=2 conduct, n=3 tool; stash and pop restored 81 staged deletions; every branch passed and the merge failed the same six tests 5 of 5). Status: missing at 088a227c (`git grep -F 'git commit --only'` finds nothing under `plugins/`).
  Source: external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:37; external/please-use-me-often/agent-failure-dossier/judged/conduct.jsonl:43; external/please-use-me-often/agent-failure-dossier/03-safety-and-trust-boundaries.md:73; external/please-use-me-often/agent-failure-dossier/judged/HANDOFF-D.md:13; external/please-use-me-often/agent-failure-dossier/05-appendices-and-limitations.md:38; external/2026-11-10/reddit.com-r-claudecode-comments-1xn18cu-does-delegating-to-cheaper-mod-20261110T100050Z.md:74 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xn18cu/does_delegating_to_cheaper_models_actually_save/>); <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): git rules are body lines in agents/Heracles.md (commit --only, explicit staging, no tree-moving git); the SubagentStart injection was replaced by body lines per the triage list; read of the file.
  Decision: ADR-0125 and ADR-0188: Claude Code's permission rules and sandbox enforce git risks and no claudetto hook judges a command; a denied call means the user declined it is a body line in Heracles.md, not a hook.
  Verified: inspection 2026-11-19, claude 2.1.327: plugins/claudetto/agents/Heracles.md holds `git commit --only <paths>`, the re-read-after-a-failed-write line, no `git add -A`/`pkill -f`, and the denied-means-declined line; plugins/claudetto/hooks/guards/wall/rules.ts lists `git stash clear` (`pop` and `drop` removed on 2026-11-21, see Acceptance; saving and `list`, `show`, `--help` stay free; issue #145, and the 2026-11-21 handback-fix trace where `git stash --help` hit the former `git stash -*` ask), `reset --hard`, `clean`, `branch -D` as ASK rules. The same mechanism asked on `git push origin HEAD` from the lead in the REQ-VERIFICATION-090 probe; no subagent probe run this session.

## Agent Message Form

## Delegate Contract Injection

- [x] **REQ-DELEGATION-024** Moved Out as OUT-3002: not built as a `SubagentStart` hook and no measured check shows it beats the contract text in the agent bodies; plugins/claudetto/agents/Heracles.md already carries the denied-call-means-declined line, the report-outcomes-as-they-happened line and the check-with-command-and-exit-code line, and a hook would inject the same text a second time (ADR-0177, ADR-0190).

## Model Allowlist Hook

- [x] **REQ-DELEGATION-026** claudetto shall refuse a subagent spawn whose model is Fable or Opus, in the `agent.spawn` mod hook, because subagents never run on those models.
  Acceptance: a spawn naming `claude-fable-5-2` or `claude-opus-5-5` (or the aliases `fable`, `opus`) is refused with a message naming Sonnet or Haiku; a Sonnet spawn passes. Verification: test.
  Basis: user decision. Status: missing at 088a227c.
  Source: user decision, 2026-11-13, restated 2026-11-18 (recorded in [ADR-0117](../adr/0117-agent-frontmatter-fields.md) and [ADR-0183](../adr/0183-logic-checked-by-execution.md)); the hook seam: `agent.spawn` mod event, <https://clawdipedia.cc/extend/subagents/runtime> (Documented), retrieved 2026-11-18.
  Verified: cc-inspect cli with --plugin-dir plugins/claudetto, claude 2.1.327, 2026-11-18, calls [Agent model opus], `-p go`: vanilla starts the subagent (8 requests); with the hook the Agent call is refused with "Subagents never run on opus..." and the run ends at 2 requests; model sonnet starts the subagent (8 requests). Unit test hooks/delegation/**tests**/spawn.test.ts pins opus, fable and both full ids. Probe fact: the stock enum accepts opus and fable, so vanilla has no bar.
  Verified: probe 2026-11-19, claude 2.1.327, cc-inspect fake API: Agent with model sonnet spawns (8 requests); model opus is refused with "Subagents run on Sonnet" in request 2. spawn.test.ts has no sonnet-passes case.

## Subagent Task Size

## Agent Files and Haiku Window

- [x] **REQ-DELEGATION-044** claudetto shall ship four agent files and no more: `Artemis` (`claude-haiku-5-5`, effort high with xhigh allowed, `autoCompactWindow` 100000, tools Read, Grep, Glob), `Metis` and `Athena` (`claude-sonnet-5-5`, medium, Read, Grep, Glob), `Heracles` (`claude-sonnet-5-5`, medium, all tools); no Fable or Opus in a frontmatter; no `omitClaudeMd`. Only Haiku gets a window: Haiku 5.5 bills input at $0.50 per MTok past 100,000 prompt tokens against $0.10 at or below (cache reads and writes count; about 5% of requests carried 73% of cost); `autoCompactWindow: 100000` gives a window of 80,000 (less a 20,000 reserve) and a trigger at 40,000, with a warning when the fixed prefix (about 147k) exceeds it.
  Decision: ADR-0190, ship Artemis, Athena and Heracles; Metis moves Out under the no-planner rule.
  Amendment (2026-11-23): a fourth agent, `Hermes` (`claude-haiku-5-5`, effort high, `autoCompactWindow` 100000, tools Read, Grep, Glob, `web_fetch`, `web_search`), gathers online intelligence read-only; it is the only subagent offered the web tools (REQ-TOOLS-005). Basis: user, 2026-11-23, "only a specific 'crawler/dataminer' worker should have access to web_fetch/web_search for online intelligence gathering, and other readonly ways for offline intelligence gathering" (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/81a52f28-aef4-4526-97a1-67d539912ef0.jsonl:86); "Hermes, Haiku 5.5 (Recommended)" (same file :159). Acceptance adds: `agents/Hermes.md` sets that model, effort, window and tools. Verification: inspection (`agents/Hermes.md` frontmatter sets `claude-haiku-5-5`); probe (a Hermes request carries both web tools). Verified: PASS, probe 2026-11-23, 2.1.330: Hermes subagent tools Read, Grep, Glob, web_fetch, web_search.
  Acceptance: each file sets model, effort and tools as listed; no frontmatter names Fable or Opus. The 2.1.323 spec also has each agent set `maxTurns`; the repo drops it (see Source). `agents/Athena.md` frontmatter holds `model: claude-sonnet-5-5` (user decision, 2026-11-16, recorded in the handover). Verification: inspection.
  Basis: cited, hypothesis; reported (community advice relayed by the user; no source found for the Haiku effort; the schema accepts an integer from 100000 to 1000000 for `autoCompactWindow` that only lowers the inherited window, cited via cc-inspect). Status: partial at 088a227c (plugins/claudetto/agents holds the four files with the stated model, effort and window; CHANGELOG.md:108 says the agents set no `maxTurns`).
  Conflict: Turn Caps.
  Conflict: Read-Side Subagents.
  Source: openspec/changes/archive/2026-11-16-2-1-323/design.md:89; openspec/changes/archive/2026-11-16-2-1-323/design.md:97; openspec/changes/archive/2026-11-16-2-1-323/research/model-effort.md:37; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5669; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6028; plugins/claudetto/agents/Artemis.md:4@088a227c; reported, user, 2026-11-13.
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): Artemis subagent request carried model claude-haiku-5-5; plugins/claudetto/agents holds Artemis, Athena, Heracles (Metis is Out, ADR-0190); first request 47,323 -> 46,216 bytes with built-in agent types hidden by hooks/delegation/offer.ts; plugin test and validate --strict pass.
  Verified: inspection 2026-11-19: Artemis/Athena/Heracles frontmatter in plugins/claudetto/agents; hooks/delegation/offer.ts hides non-fork built-ins.

## Watch Background Tasks

- one run used `pkill`, which the sandbox refused, then ended its turn with its shell still running;
- one run wrapped the test in `perl -e 'alarm 20; exec @ARGV' make test`. The alarm killed `make` and orphaned the test child to pid 1, outside any task, and the agent said it had been stopped.

Both runs were in the arm that carried a "bound every wait" prompt rule, which likely prompted the wrapper.

Hooks run outside the sandbox (incident-lab/sandbox-probe.txt). A Stop hook can therefore close both leaks. The Stop input lists `background_tasks` (id, type, status, command), so the hook blocks the end of a turn while a shell task running a test is alive. It also kills a test process whose parent is pid 1 and whose working directory is inside the session's folder (prototype `hangwatch/stopwatch.py`). A PreToolUse deny of `pkill` and `killall` points the agent to TaskStop. The second bound decides how long a backgrounded test may run before the agent checks it. It comes from the project, in this order. (1) A stated limit: the README or docs, or the test framework's own setting (Swift Testing `.timeLimit`, `pytest-timeout`, `go test -timeout`, Jest `testTimeout`). (2) With none, a learned limit: claudetto records each finished test command's duration per project and tool, and the bound is max(3 × the longest earlier run, 120 s). Replayed over the user's sessions in time order, 4 of 472 runs went past that bound (durations.txt). (3) With no history either, 600 s, which is above every finished foreground test run in the user's sessions (longest 566 s, a bedrock `bun test`) and equals the `-p` background deadline. No single fixed number works: a single bedrock `bun` test passed after 559 s, while OpenJoystickDriver's slowest Swift test took 4.6 s against its 32-minute hang. Reaching the bound starts a progress check, not a kill. The agent compares the output file's size with the previous check and samples the process twice, 10 s apart (`sample` on macOS). Unchanged output plus the same hot frames, or no CPU, means a hang: the agent stops the task with TaskStop and reports it. Otherwise it waits once more for the same bound. Because the check comes before any kill, a run that goes past a learned bound costs one check, not a lost run. While a background test runs, the agent never ends its turn waiting for the completion notice. It arms a Monitor that fires at the bound.
  Acceptance: on `trap-hang` (REQ-VERIFICATION-100) the claudetto arm loses fewer seconds past the stated limit than vanilla, summed over 5 runs per arm, in both the headless and the interactive arm (met for the cap with the Stop hook and the deny, with no prompt rule: interactive, 192 s against 335 s on Sonnet and 194 s against 346 s on Opus; the cap with the prompt rule lost 1005 s and 973 s, each with one censored leak); on `trap-hang2`, the same trap with no stated limit, the hung process lives a shorter summed time than under vanilla (met headless: 486 s against 1243 s on Sonnet, 492 s against 638 s on Opus, 5 runs each); a background task that makes no progress is stopped by the agent before the user asks. Candidate components:

- the PreToolUse timeout cap, which is measured and beats vanilla;
- a PostToolUse note on `timedOutAfterMs`, which tells the agent to watch the task's output growth with Monitor and to stop the task at the bound;
- the Stop hook;
- the `pkill` deny.

The last three fired 0 times in the 10 interactive `trap-hang` claudetto2 runs. `trap-bg` (the OpenJoystickDriver pattern: start `make test` in the background, edit a file meanwhile, then report; 20 interactive runs, 5 per model and arm) measured them:

- vanilla ended its turn with the hung test alive in 10 of 10 runs, each promising to report when the test finished; every test was still running when the 900 s window closed (824-834 s censored per run). The leak is real, so the controls stay candidates.
- the Stop hook blocked once in each of the 5 Opus claudetto2 runs. Its text offered "or say why it must keep running", and Opus took that exit every time: 5 of 5 tests ran to the end of the window. As worded, the Stop hook has no measured effect and does not ship.
- Sonnet claudetto2 stopped its own hung task in 5 of 5 runs (0, 0, 0, 254 and 74 s past the 60 s limit), and the Stop hook never blocked there. The trigger was the PostToolUse rerun note of REQ-VERIFICATION-101, which asked whether the code uses time, the network or concurrency; Sonnet read `feed/client.py` and found the `while True` retry. Opus received the same note 3 times per run and ignored it. The gain is the note's, on Sonnet only.
- the `pkill` deny fired 0 times.

The next measured candidate removes the exit the model took: at the bound, a Stop or PostToolUse check that finds a background test with no output growth names the task and the measured stall, and offers only TaskStop. A hook kill of the stalled process (hooks run outside the sandbox) is the fallback, if a model refuses that too. Each ships only once a trap makes it fire and the arm beats vanilla on it (ADR-0177). Verification: test.
  Basis: measured (code read of 2.1.327 and the Bash description of a `-p` run on a fake API, 2026-11-18; 163 background tasks across all sessions, 55 never ended, 9 ran over 15 minutes; `trap-hang`, 20 headless runs, score6.txt; `trap-hang2`, 20 headless runs, score7.txt, with hung-process lifetimes taken from the make-test call to the TaskStop result; `trap-hang` interactive, 30 `tmux` runs, runs-tmux/, hung process timed by `lsof` every 5 s; `trap-bg` interactive, 20 `tmux` runs, runs-bg/, scored by score_bg.py from the transcripts, claude 2.1.327, 2026-11-18) and reported by the user. Status: missing at 088a227c (`git grep -i background 088a227c -- plugins/claudetto/hooks/features/delegation` finds only a test of `run_in_background`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/b8e1aaed-abd0-4456-8651-81e51b934bea.jsonl:7, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/cc4fc018-bd65-4a00-ac3d-b422b406186a.jsonl:1257, reported, user, 2026-11-09; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/e82d87d1-ad1f-491a-ac1a-461bf5c46eb4.jsonl:1589,1683; reports/2026-11-18-research/incident-lab/bg.txt, score6.txt, runs6/hang-*.jsonl, score7.txt, runs7/hang2-*.jsonl, runs-tmux/, runs-bg/, score_bg.py, tmuxrun.py, sandbox-probe.txt, hangwatch/, durations.py, durations.txt; ADR-0187.

## Director Model

## Subagent Model

- [x] **REQ-DELEGATION-052** claudetto shall set `CLAUDE_CODE_SUBAGENT_MODEL` to Sonnet and name no Opus or Fable subagent; Sonnet or Haiku serves as reader and file scout so the main chat stays small.
  Acceptance: setup writes `CLAUDE_CODE_SUBAGENT_MODEL` as `claude-sonnet-5-5`; no agent file names Opus or Fable as `model:`. In claude 2.1.326 a subagent model set in managed settings now overrides the user's own in Claude Desktop's Code tab, as in a terminal (release note). Verification: inspection.
  Basis: reported (a subagent one-liner credited with a lower plan tier: 89% weekly by day 5 fell under 25%); Sonnet is about 95% of subagent messages, so Opus-versus-Sonnet differences are confounded. Status: have at 088a227c (the Opus-per-call and escalate-to-Opus parts of the plan item conflict with the settled rule that Fable and Opus are never a subagent model (user decision, 2026-11-13 13:22 UTC, subagents never run on Fable or Opus (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:5560)) and are not carried).
  Source: external/2026-10-12/export-the one-liner I add to almost every Claude Code prompt.jsonl:14 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x2dpvt/the_oneliner_i_add_to_almost_every_claude_code/>); plugins/claudetto/hooks/features/setup/settings.ts:120@088a227c; <https://github.com/anthropics/claude-code/releases/tag/v2.1.326> (release notes).
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): with CLAUDE_CODE_SUBAGENT_MODEL=claude-sonnet-5-5 (hooks/settings/defaults.ts, FILL_VERSION 2) a general-purpose subagent under an Opus main sent model claude-sonnet-5-5 instead of claude-opus-5-5; Opus and Fable named in a spawn are refused by hooks/delegation/spawn.ts.
  Verified: inspection 2026-11-19: hooks/settings/defaults.ts:36 sets CLAUDE_CODE_SUBAGENT_MODEL claude-sonnet-5-5; `git grep maxTurns -- plugins` is empty.

## Agent Texts

- [x] **REQ-DELEGATION-053** claudetto shall give the sweep agent body one added line for a low-context reader: "Write for a reader who has not seen your tool calls or the files you opened. Put the key points in the first sentences. Use plain words and the same word for the same thing. Define a term you coined." with no style limits.
  Acceptance: the sweep agent body holds this paragraph and no word-count limit. Verification: inspection.
  Basis: cited. Status: have at 088a227c (`plugins/claudetto/agents/Athena.md` holds a low-context line; `git grep -iE "low-context|not seen your tool" 088a227c` hits it).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:31; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:210.
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): agents/Athena.md carries the low-context-reader line; read of the file.
  Verified: inspection 2026-11-19: plugins/claudetto/agents files (Artemis.md, Athena.md, Heracles.md).

## Worker Resume

- [x] **REQ-DELEGATION-063** claudetto shall not stop a worker on a turn limit that costs model calls to resume, and shall act and delegate instead of asking the user.
  Acceptance: a worker run has no turn limit that forces a resume; delegation asks no confirmation of the user. Verification: demonstration.
  Basis: reported, user, 2026-11-14 03:23 UTC, no turn limits on workers (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:32519). Status: have at 088a227c (`git grep -n maxTurns 088a227c -- plugins` finds none, so no agent file sets a turn limit).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints: disable turn limits; nobody asked you to defer to the user).
  Conflict: Turn Caps.
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): `git grep maxTurns plugins` returns nothing.
  Verified: inspection 2026-11-19: no Metis agent file; plugins/claudetto/agents/Heracles.md holds the `git commit --only` line.

## Rules Passed to Workers
