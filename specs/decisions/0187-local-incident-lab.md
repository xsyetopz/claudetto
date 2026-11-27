---
status: accepted
date: 2026-11-18
---
# A Local Incident Lab Reproduces Agent Failures

## Context and Problem Statement

ADR-0177 ships a component only when it beats vanilla Claude Code on a measured check. Failures such as a hung test that runs unnoticed for 32 minutes happen in real sessions, days apart, on projects claudetto cannot rerun. Without a way to cause them on demand, a component that targets them has nothing to beat. How does claudetto produce such failures locally?

## Considered Options

- Wait for incidents in real sessions and compare before and after.
- Replay recorded transcripts through a fake API.
- Keep small trap repositories, each built from a real incident, and run live headless sessions in them.

## Decision Outcome

Chosen: trap repositories. Each trap is a git repository of a few files with one fixed prompt and one measured outcome. A trap is admitted only with a real incident behind it, cited by transcript line, and only when vanilla fails it in at least one of five runs; a trap vanilla always passes measures nothing. A recorded replay cannot show what the model does next, because the bad step is the model's own choice. Waiting for real incidents gives one sample per week and no control arm.

The lab runs from a plain terminal or CI, outside any agent sandbox, because a session nested in a sandbox loses its own sandbox and `ps` (reports/2026-11-18-research/incident-lab/README.md, Confound). Each trap runs 5 times per arm, vanilla against claudetto from the same base (`--setting-sources project --strict-mcp-config`, because `--safe-mode` drops `--settings` hooks, CTX-853), with the user's sandbox block passed through `--settings`, because `--setting-sources project` alone runs with no sandbox (incident-lab/sandbox-probe.txt), on Sonnet 5.5 and on Opus 5.5. Every trap has an interactive arm too, driven through `tmux`, because a timed-out command behaves differently there: in `-p` the agent waits inside its turn, while interactively it keeps working and waits for a notification (the OpenJoystickDriver case).

## Consequences

- The first five traps ran 5 times per model and arm (70 headless runs, $4.19 of API-equivalent value, 2026-11-18; reports/2026-11-18-research/incident-lab/score6.txt). Admitted: `trap-flaky` (vanilla ran the test once in 10 of 10 runs; a rerun hook made both models run it 2 or 3 times in 10 of 10) and `trap-hang` (vanilla lost 254 s on Sonnet and 240 s on Opus past the stated limit; a timeout-cap hook cut that to 120 s and 150 s). Not admitted, 0 of 10 failures on vanilla: `trap-flag` (both models read `--help` first), `trap-prompt` (stdin is closed, so the script aborts) and `trap-lock` (no run deleted the lock without checking for a live git process). Each needs a harder arm, such as the long-context arm below.
- A second batch of 40 runs ($5.09) admitted `trap-hang2`, which is `trap-hang` with no stated limit; vanilla's hung test lived 638 s summed on Opus and 1243 s on Sonnet, against 492 s and 486 s with the hook. It also admitted the mutant measure of `trap-loop` (vanilla's own tests hung on a never-returning `deliver()` in 10 of 10 runs). It rejected `trap-loop`'s loop measure: every model wrote a bounded loop, so the measure caught 0 of 10 vanilla failures (incident-lab/score7.txt).
- A lab arm is not isolated from its neighbours on the same machine. One vanilla run tried `pkill -f "unittest discover"`, which matched the test processes of parallel runs; the sandbox refused the signal. Parallel runs therefore keep the sandbox on, and the scoring reads each run's own task ids, not process names.
- The interactive arm ran `trap-hang` 30 times through `tmux` ($4.13 at list prices, from the transcripts' usage, because an interactive session emits no cost event). The driver must accept the folder trust dialog with Down and then Enter, because "No, exit" is preselected. Without a `-p` background deadline, two leaks ran to the end of the 900 s window, and the headless arm could not have shown them.
- `trap-bg` (the OpenJoystickDriver prompt: test in the background while the agent edits) ran 20 times interactively for about $2.17. Vanilla ended its turn with the hung test alive in 10 of 10 runs, so the trap is admitted. A Stop hook block that offers "or say why it must keep running" changed nothing on Opus in 5 of 5 runs, because the model took that exit each time. A block that leaves the model a way out measures as no control. Sonnet stopped its task in 5 of 5 runs after the rerun note, and the Stop hook never fired there (incident-lab/README.md, Background Test While the Agent Works).
- A hook prototype must be checked against the payload the hook receives, not against the text the model sees. The hang note matched model-facing text and fired in no run of the headless batches or the first 20 interactive runs; the hook's Bash result marks a timeout with `timedOutAfterMs`. Each prototype hook gets a fire count per arm, and a component with 0 fires is unmeasured, whatever its arm scored.
- A trap's directory name must not reveal it. An earlier batch ran in folders named after the trap; Sonnet read the name ("the project is named flaky") and the results moved (runs5-leaked/). Runs now use neutral `proj-XXXXXX` folders.
- The trap list grows from the incident counts in `incident-lab/mine.txt`, highest count first: background-moved timeouts (145 results), denied operations (107), blocked `sleep` (80), unknown flags (57), test timeouts (49), interactive prompts (39), full disk (22), held locks (20).
- A run costs meter: $0.06 to $0.13 of API-equivalent value per headless run ($4.19 for 70, $5.09 for 40); a run that waits on a hung test costs more, because the session stays open while the test runs.
- Strongest risk: a trap is a toy, and passing it may not carry over to a 3-hour session at 400k tokens. Each trap therefore also has a long-context arm that pads the session with a real recorded prefix before the prompt.

Source: user request, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl, the message quoting the OpenJoystickDriver goal check-in); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/e82d87d1-ad1f-491a-ac1a-461bf5c46eb4.jsonl:1589,1679,1683,1685,1710,1792,1799; reports/2026-11-18-research/incident-lab/README.md, mine.txt, bg.txt, runs/*.jsonl, runs6/, score6.txt, runs7/, score7.txt, runs-tmux/, runs-bg/, score_bg.py, tmuxrun.py, sandbox-probe.txt (Claude Code 2.1.327, Sonnet 5.5 and Opus 5.5, 2026-11-18); ADR-0177.
