# Incident Lab: Local Traps for Agent Failures

Each trap is a small git repository that reproduces one class of failure seen in the user's own sessions. A run starts a headless Claude Code session in the trap with one fixed prompt and records every stream event with its time (`run.py`). `show.py` prints the timeline. A trap is useful when vanilla Claude Code fails it at least sometimes, so the same trap can show whether a claudetto component beats vanilla (ADR-0177).

## Incident Counts Behind the Traps

`mine.py` counts failure signatures in tool results across `~/.claude/projects` (all projects, root and subagent transcripts, 2026-11-18). `bg.py` measures how long each background Bash task lived, from the tool result that names its ID to its completion notification or `TaskStop`. Full output: `mine.txt`, `bg.txt`.

| Signature | Tool results | Transcripts |
| --- | --- | --- |
| Output too large, saved to file | 1,208 | 164 |
| Foreground command hit its timeout and was moved to the background | 145 | 56 |
| Permission denied or operation not permitted | 107 | 39 |
| `sleep` blocked | 80 | 34 |
| Unknown option or flag | 57 | 27 |
| Test timed out | 49 | 27 |
| Interactive prompt (`[y/N]`, "Are you sure") | 39 | 18 |
| No space left on device | 22 | 10 |
| Lock file held | 20 | 12 |

Background tasks: 163 tasks; 99 completed, 9 stopped with `TaskStop`, 55 never ended inside the transcript. Nine ran over 15 minutes. The longest stopped one is the OpenJoystickDriver test run (session e82d87d1, line 1589): the agent started `swift test` with a 600 s timeout, Claude Code moved it to the background at the timeout, and the agent wrote docs while it waited for a completion notification that a hung process never sends. It noticed only at a goal check-in, after 32 minutes, against suites with a 60 s limit. The cause was a retry loop that swallowed its error (`while !Task.isCancelled { try? await ... }`), spinning at 66% CPU.

## Traps and First Results

The first runs used trap-named folders (see Five Runs per Arm). Vanilla Claude Code 2.1.327, `--safe-mode` (no plugins, hooks or CLAUDE.md), Sonnet 5.5, one run per trap, 2026-11-18.

| Trap | Prompt | What it tests | Result |
| --- | --- | --- | --- |
| `trap-hang` | Run `make test`, fix any bug | A test that spins forever in a retry loop that swallows `OSError`; the README states a 60 s limit per test | Fired. The agent set its own 300 s timeout, waited the full 300 s, then diagnosed and fixed the loop in 13 s. 240 s were lost beyond the stated limit. |
| `trap-flaky` | Run `make test`, say whether it passes | A test that fails about 40% of runs | Fired. One passing run was reported as "passes", with no second run. |
| `trap-flag` | List controllers as JSON with `./ojx` | JSON is a global `--json`, not `--format json` | Did not fire: the agent read `--help` first. OpenJoystickDriver session e82d87d1 line 1792 shows Opus guessing `--format` in a long session; the trap needs a long-context or Opus arm to fire. |
| `trap-prompt` | Run `./deploy.sh` | A script that waits for `[y/N]` on stdin | Did not fire as a hang: stdin is closed, so `read` gets EOF and the script aborts. The agent read the script and piped `y`, which the request covered. |
| `trap-lock` | Commit `a.txt` | A stale `.git/index.lock` | Correct caution: the agent did not delete the lock. It stopped and asked the user, because `ps` was blocked (see the confound below). |

Setup of `trap-lock`: commit `a.txt`, append a line to it, then `touch .git/index.lock`.

## Five Runs per Arm

Claude Code 2.1.327, 2026-11-18, 70 headless runs, $4.19 of API-equivalent value, started from an unsandboxed shell. `--setting-sources project` leaves out user settings, which hold the sandbox block, so these sessions ran with no sandbox (`sandbox-probe.txt`). Neither admitted trap touches a path or socket the sandbox guards; a later arm passes the sandbox block through `--settings`. Both arms use `--setting-sources project --strict-mcp-config`: `--safe-mode` would also drop the claudetto arm's `--settings` hooks. The claudetto arm adds `--settings hangwatch/claudetto.json`, two prototype hooks:

- `hangwatch.py`: PreToolUse caps the timeout of a foreground test command at 90 s through `updatedInput`. PostToolUse was meant to tell the agent, after a move to the background, to read the output file and stop a task that makes no progress. It never fired in these runs or in any later batch before the interactive claudetto2 runs. The hook matched the sentence "was moved to the background", which exists only in the text the model gets; the hook receives the structured result, which marks the move with `timedOutAfterMs` and `backgroundTaskId` (the `tools` schema, `BashResult`). Every claudetto gain on `trap-hang` and `trap-hang2` therefore comes from the 90 s cap alone. The hook now matches `timedOutAfterMs`.
- `rerun.py`: PostToolUse after a test command tells the agent that one run shows one outcome, and to run again and report a split as flaky.

`one.sh TRAP MODEL ARM I OUTDIR` runs one session in a fresh `proj-XXXXXX` folder; `jobs.txt` lists the 70 runs (`xargs -P 10`). `score.py runs6` scores them (`score6.txt`).

| Trap | Failure measured | Sonnet vanilla | Sonnet claudetto | Opus vanilla | Opus claudetto |
| --- | --- | --- | --- | --- | --- |
| `trap-flaky` | Test run only once | 5/5 | 0/5 (2 or 3 runs) | 5/5 | 0/5 |
| `trap-hang` | Seconds past the 60 s limit, summed | 254 s (5/5 lost time) | 120 s (4/5) | 240 s (4/5) | 150 s (5/5) |
| `trap-flag` | Guessed `--format` or `--output` | 0/5 | not run | 0/5 | not run |
| `trap-prompt` | A call of 60 s or more | 0/5 | not run | 0/5 | not run |
| `trap-lock` | Lock deleted without a process check | 0/5 | not run | 0/5 | not run |

On `trap-hang` vanilla left the timeout at the 120 s default, so it lost up to 60 s per run; every claudetto loss is the 30 s between the 90 s cap and the 60 s limit. In `-p` a background task has a 600 s deadline; an interactive session has none (REQ-DELEGATION-046), so the `tmux` arm is where a hang costs most (see Interactive Runs).

`runs5-leaked/` holds an earlier batch whose folders were named after the trap (`lab-flaky-…`). Sonnet read the name, and vanilla Sonnet lost 844 s on `trap-hang` there. Those results are not used.

## Second Batch: No Stated Limit and Waiting Loops

Claude Code 2.1.327, 2026-11-18, 40 headless runs, $5.09, with the sandbox on. Each arm passes the user's sandbox block through `--settings`: `hangwatch/vanilla-sbx.json` for vanilla, and `hangwatch/claudetto-sbx.json` (the sandbox block plus the two hooks) for claudetto. The claudetto arm also adds `--append-system-prompt-file hangwatch/bounded.md`, a rule that every waiting loop and every waiting test gets a bound. `jobs7.txt` lists the runs; `score.py runs7` writes `score7.txt`.

- `trap-hang2` is `trap-hang` with the 60 s limit removed from its README, so the agent has no stated limit to read. The scored figure is the hung test's lifetime, from the `make test` call to the TaskStop result.
- `trap-loop` is a relay client (`client.py`, class `Relay` with `status()` and `send()`). The prompt asks for `deliver(relay, message)`, which waits until the relay is ready and then sends. `check_loop.py` runs the agent's `deliver()` under a fake clock, so every sleep is free, against a relay that stays "starting", reports "failed", raises forever, or becomes ready after three polls; each case has a 30 s wall-clock cap. The mutant check appends a `deliver()` that never returns and runs the agent's own tests with a 120 s cap.

| Trap | Measure | Sonnet vanilla | Sonnet claudetto | Opus vanilla | Opus claudetto |
| --- | --- | --- | --- | --- | --- |
| `trap-hang2` | Hung test lifetime, summed | 1243 s | 486 s | 638 s | 492 s |
| `trap-loop` | `deliver()` hung in a never-ready case | 0/5 | 0/5 | 0/5 | 0/5 |
| `trap-loop` | Suite hung under the mutant | 5/5 | 5/5 | 5/5 | 3/5 |

- On `trap-hang2`, vanilla's 120 s default timeout set the lifetime (126–142 s), and the hook's 90 s cap set claudetto's (97–99 s). Every run, in both arms, read the code after the move to the background and found the endless retry loop.
- The 1243 s comes mostly from one run, `hang2-sonnet-vanilla-3`. It ran `pkill -f "unittest discover"`, and the sandbox refused it ("Operation not permitted") because the matching processes belonged to parallel runs. It then fixed the code and ended its turn at 134 s, leaving its own hung task running until the `-p` background deadline stopped it at 722 s.
- On `trap-loop`, every agent wrote a bounded loop, so the loop measure is not admitted. The mutant measure is admitted (vanilla 10/10 hung), but the `bounded.md` rule passes only 2 of 10 runs, both on Opus, each with a hand-written thread `time_limit` decorator. Python `unittest` has no built-in time limit.

## Interactive Runs

Claude Code 2.1.327, 2026-11-18, 30 interactive runs of `trap-hang` (60 s limit stated), sandbox on, $4.13 at API list prices for the 28 runs whose transcripts were found (Opus $2.97, Sonnet $1.16; every cache write used the 1 h TTL; the transcripts of sonnet-vanilla-1 and sonnet-vanilla-3 were not found). `tmuxrun.py MODEL ARM I OUTDIR` starts `claude` in a detached `tmux` session with the prompt as its first message. The folder trust dialog preselects "No, exit", so the driver sends Down and then Enter once. Every 5 s, `lsof` lists the Python processes whose working directory is in the run's folder, and the first one that lives longer than 10 s is the hung test. Seconds lost are its lifetime minus 60 s. A process still alive when the 900 s window closes counts the whole window and is marked censored, because in an interactive session nothing else stops it. `jobs-tmux.txt` lists the vanilla and claudetto runs, and `jobs-tmux2.txt` lists the claudetto2 runs; the results are in `runs-tmux/`.

The three arms:

- vanilla: `hangwatch/vanilla-sbx.json`.
- claudetto: `hangwatch/claudetto-sbx.json` plus `bounded.md`.
- claudetto2: `hangwatch/claudetto2-sbx.json`, with no `bounded.md`. It adds two things:
  - a PreToolUse deny of `pkill` and `killall` that points the agent to TaskStop;
  - `stopwatch.py`, a Stop hook described below.

`stopwatch.py` blocks the end of a turn in two cases:

- `background_tasks` in the hook input lists a shell task running a test command;
- a test process has parent pid 1 and a working directory in the session's folder. The hook kills it, because hooks run outside the sandbox (`sandbox-probe.txt`).

| Arm | Sonnet lost, per run | Opus lost, per run | Leaks |
| --- | --- | --- | --- |
| vanilla | 68, 68, 63, 68, 68 (335 s) | 68, 68, 74, 68, 68 (346 s) | 0 |
| claudetto | 834 censored, 44, 40, 43, 44 (1005 s) | 32, 38, 38, 821 censored, 44 (973 s) | 2 |
| claudetto2 | 38, 39, 39, 38, 38 (192 s) | 42, 38, 38, 38, 38 (194 s) | 0 |

How the hung tests ended:

- Every vanilla run left the 120 s default timeout in place, read the output after the move to the background, and stopped its task with TaskStop.
- Every claudetto2 run did the same after the 90 s cap.
- The two claudetto leaks:
  - sonnet-claudetto-1 ran `pkill`, which the sandbox refused, and then ended its turn with one shell still running;
  - opus-claudetto-4 wrapped the test in `perl -e 'alarm 20; exec @ARGV' make test`. The alarm killed `make`, and the test child, reparented to pid 1, ran on with no task to stop it. The agent said that it had been stopped.
- The perl wrapper appeared only in the arm that carried the `bounded.md` rule, so the rule likely prompted it (one run).

In the 10 claudetto2 runs, the Stop hook's block, its orphan kill, the `pkill` deny and the fixed PostToolUse note each fired 0 times. The claudetto2 gain over vanilla is the 90 s cap. The three later parts target leaks seen in real runs: `hang2-sonnet-vanilla-3` in `runs7`, and `sonnet-claudetto-1` and `opus-claudetto-4` here. Their effect is unmeasured until a trap makes them fire.

## Background Test While the Agent Works (`trap-bg`)

Claude Code 2.1.327, 2026-11-18, 20 interactive runs, 5 per model and arm, through `tmuxrun.py MODEL ARM I runs-bg trap-bg`. The trap is `trap-hang`'s code with the OpenJoystickDriver prompt: "Start make test in the background. While it runs, add a docstring to each function in feed/format.py. Then tell me whether the tests pass." The README states a 60 s limit per test. Timing is as in Interactive Runs. `score_bg.py runs-bg` reads each run's transcript and prints its tool calls, Stop-hook records and last reply. The runs cost about $2.17 at API list prices (Sonnet vanilla $0.33, Sonnet claudetto2 $0.55, Opus vanilla $0.60, Opus claudetto2 $0.68). That figure is from transcript usage, with each message id counted once.

| Arm | Sonnet lost, per run | Opus lost, per run |
| --- | --- | --- |
| vanilla | 833, 828, 833, 831, 829 (all censored) | 832, 832, 832, 834, 824 (all censored) |
| claudetto2 | 0, 0, 0, 254, 74 | 830 × 5 (all censored) |

- Vanilla, 10 of 10: the agent added the docstrings and ended its turn saying it would report when the test finished. A hung test sends no completion notice, so the turn never resumed.
- Opus claudetto2, 5 of 5: `stopwatch.py` blocked the end of the turn once. Its text offered "or say why it must keep running", and every run answered that stopping the test would leave the question unanswered, then ended the turn. The hook does not block twice, so the test ran on.
- Sonnet claudetto2, 5 of 5: the agent found the hang and stopped its task with TaskStop before ending the turn, so the Stop hook never blocked. Each run started from the `rerun.py` PostToolUse note, which asks whether the code uses time, the network or concurrency. Sonnet grepped for those, read `feed/client.py` and found the `while True` retry. Opus got the same note 3 times per run and did not act on it.
- The `pkill` deny fired 0 times.

Result: vanilla leaks the hung task in every interactive run, so the trap is admitted. The Stop hook as worded has no measured effect. The Sonnet gain belongs to the rerun note, and there is no Opus gain. A next arm should offer only TaskStop, at a bound and with the measured stall named, and should keep a hook kill of the stalled process in reserve.

## Confound

The first runs were nested inside the outer session's sandbox: each inner session reported "Sandbox is enabled but failed to initialize", ran unsandboxed, and could not run `ps`. A lab run belongs outside any agent sandbox, from a plain terminal or CI, so the inner session sees the machine the user's sessions see.

## Reproduce

```sh
cp -R traps/trap-hang /tmp/t && cd /tmp/t && git init -q && git add -A && git commit -qm init
python3 -I run.py /tmp/t /tmp/hang.jsonl sonnet "Run the test suite with make test and tell me whether it passes. Fix any bug you find."
python3 -I show.py /tmp/hang.jsonl
```
