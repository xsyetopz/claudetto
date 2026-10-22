# Evidence for `0-3-0`

This file holds the results of the checks of change `0-3-0`, with the method of each.

## Baseline

`just docker check` on the `claudetto--v0.2.0` tree, 2026-10-22: `Ran 1347 tests across 164 files`, `0 fail`, `exit 0`.
The first run failed in `bun install --frozen-lockfile`, because `package.json` had dependency bumps with no `bun.lock` update.
`bun install` updated `bun.lock`, and the second run passed.

## Fault Map (Task 2.1)

Spec `release-evidence`, requirement "Fault Has a Test".
"fault N" is in `.claudetto/0.3.0-findings.md`, and "F N" is in `research/sessions.md`.
Each test is `test.failing` until the task that fixes its fault, so the suite stays green and a fixed fault fails the suite until its test is `test`.

Method: for each test file, a copy with each `test.failing` changed to `test` ran on the `v0.2.0` tree, and each test failed on the assertion of its fault (the session of 2026-10-22).

| Faults | Test | Fix task |
| --- | --- | --- |
| 4, 12, 43 | `tests/claudetto/setup/faults.test.ts` > faults 4, 12, and 43 | 7.1 |
| 1, 2, 13, F05, F18, F36 | `tests/claudetto/setup/faults.test.ts` > faults 1, 2, 13, F05, F18, F36 | 7.1 |
| 7, 38, F03, F08, F28 | `tests/claudetto/setup/faults.test.ts` > faults 7, 38, F03, F08, F28 | 7.1 |
| 17, F12 | `tests/claudetto/setup/faults.test.ts` > fault 17 and F12 | 7.1, 7.4 |
| 35 | `tests/claudetto/setup/faults.test.ts` > fault 35 | 7.1 |
| 36, 45 | `tests/claudetto/setup/faults.test.ts` > faults 36 and 45 | 7.1 |
| 37 | `tests/claudetto/setup/faults.test.ts` > fault 37 | 7.1, 3.3 |
| 41 | `tests/claudetto/setup/faults.test.ts` > fault 41 | 7.1 |
| 42 | `tests/claudetto/setup/faults.test.ts` > fault 42 | 7.1 |
| F10 | `tests/claudetto/setup/faults.test.ts` > F10 | 7.1 |
| 32 | `tests/claudetto/setup/faults.test.ts` > fault 32, and `tests/claudetto/surface/faults.test.ts` > fault 32 and D6 | 7.1, 3.2 |
| 28, 49 | `tests/claudetto/setup/faults.test.ts` > faults 28 and 49 | 7.1, 9.1 |
| 15 | `tests/claudetto/setup/faults.test.ts` > faults 4, 12, 13, 15, and 41 | 7.3 |
| 18, 46, 47, 50, F17 | `tests/claudetto/setup/faults.test.ts` > faults 18, 46, 47, and 50, and `tests/claudetto/surface/faults.test.ts` > faults 18, 46, and 47 | 7.3, 3.1, 7.4 |
| F19 | `tests/claudetto/setup/faults.test.ts` > F19 | 9.2 |
| 10 | the text of the prompt, with no test, because a test checks behavior and not words (the user, 2026-10-22) | 3.3 |
| 3, 33 | the text of the prompt, with no test, because a test checks behavior and not words (the user, 2026-10-22) | 3.2, 4.1 |
| 20 | `tests/claudetto/prompt/faults.test.ts` > fault 20 | 3.2 |
| 30 | `tests/claudetto/prompt/faults.test.ts` > fault 30 | 3.2 |
| 44 | `tests/claudetto/prompt/faults.test.ts` > fault 44 | 3.3 |
| 8, 11, F04, F11, F23, F24 | `tests/claudetto/prompt/faults.test.ts` > faults 8, 11, F04, F11, F23, and F24 | 6.1 |
| F29, F33 | the text of the prompt, with no test, because a test checks behavior and not words (the user, 2026-10-22) | 6.2 |
| 5, 9 | `tests/claudetto/agents/faults.test.ts` > faults 5 and 9, and > fault 9 | 4.1 |
| F01, F02, F16 | `tests/claudetto/agents/faults.test.ts` > F01, F02, F16 | 4.1 |
| 1, 6, 21, 23, F38, F40 | `tests/claudetto/spec/faults.test.ts` > faults 1, 6, 21, 23, F38, and F40 | 8.2 |
| 22, 23 | `tests/claudetto/spec/faults.test.ts` > faults 22 and 23 | 8.2 |
| 40 | `tests/claudetto/spec/faults.test.ts` > fault 40 | 3.6 |
| 24 | `tests/claudetto/surface/faults.test.ts` > fault 24 | 3.2 |
| 27 | `tests/claudetto/surface/faults.test.ts` > fault 27 | 3.5 |
| prd goal 4 | `tests/claudetto/surface/faults.test.ts` > prd goal 4 | groups 3 to 9 |
| 7, 14 | `tests/claudetto/guard/faults.test.ts` > faults 7 and 14 | 5.1 |
| 4, 12 | `tests/claudetto/guard/faults.test.ts` > faults 4 and 12 | 5.1 |
| F09, F41 | `tests/claudetto/guard/faults.test.ts` > F09 and F41 | 3.2, 5.1 |
| F24 | `tests/claudetto/guard/faults.test.ts` > F24 | 5.1 |
| 34 | `tests/tools/docker-missing.test.ts` > fault 34 | 11.5 |

### Faults with No Test Yet

| Faults | Reason |
| --- | --- |
| 16 | Task 3.6 removes the cause: no generated `prompts.ts`, so each source file runs alone. `just typecheck` covers it. |
| 19 | Design D6 asks for a measure of the status line refresh first (task 9.2). |
| 25, F06, F35 | Task 10.1 compares `handoff` with the built-in compaction (paid eval). |
| 26 | Task 9.2 rebuilds `ground`, and its tests come with it. |
| 29 | No plan decision changes `CLAUDE_CODE_PROMPT_CACHE_TTL`. The session data has no measure of the gaps between turns. |
| 31 | Task 9.2 rebuilds `decide`. The line count of the core plugin is pinned by prd goal 4. |
| 39 | `research/replace-matrix.md` keeps `ListAgents` with no deny. |
| 48 | Spec `lean-surface` "New Built-In Part" needs a capture of 2.1.306 (task 1.1). |
| 51, F21 | No task of the plan. Proposed in the findings only. |
| 52 to 58 | Faults of the planning process, not of the code. |
| F07, F22, F27, F30, F31, F32, F34, F42 | Claude Code behavior or project scripts, not claudetto (`research/sessions.md`). |
| F13, F14, F15 | The agent bodies of task 4.1 ask for a short result, and the eval of task 10.2 measures the cost. |
| F20, F25, F26 | No cause found in `src/` (`research/sessions.md`). |
| F37, F39 | Fixed in 0.2.0 (`research/sessions.md`). |

## Stub Capture of `claudetto:main` (Tasks 6.1 and 3.3)

Date: 2026-10-22.
Claude Code `2.1.307` (the `cc_version` of the captured request).
Cost: $0, because no request reached the API.

Method: the method of `research/probes.md`, with the plugin installed:

- `plugins/claudetto-lab/bin/claudetto-capture --port 8799 --upstream http://127.0.0.1:9 --no-count` saves the first request.
- `env -i` with a new empty `CLAUDE_CONFIG_DIR`, `ANTHROPIC_API_KEY=sk-ant-dummy`, `ANTHROPIC_BASE_URL=http://127.0.0.1:8799`, and `CLAUDE_CODE_MAX_RETRIES=0`.
- `claude plugin marketplace add` of this checkout, `claude plugin install claudetto@claudetto`, then `claude -p "say hi"` in an empty `git init` folder.
- A Python script compares `system[2]` with the body of `plugins/claudetto/agents/main.md` after its frontmatter.

Result:

- `system[2]` is 10,030 characters and equals the body of `claudetto:main`.
  It has no `# Harness` and no `# Memory` section, so no built-in section renders.
- The messages hold the `context_management` block of `prompt.context` with the handoff text.
- The whole first request is 47,727 characters, against 46,208 for the vanilla `base` probe of `research/probes.md`.
  Task 6.4 cuts the body, the attachments, and the tool texts, and pins the size.

## Stub Capture of the Agent List (Task 4.2)

Date: 2026-10-22.
Cost: $0, because no request reached the API.

Method: the method of "Stub Capture of `claudetto:main`", with a new `CLAUDE_CONFIG_DIR` and the plugin of this checkout.
A Python script counts the agent names in the first request.

Result:

- The first capture lists `claudetto:scout`, `claudetto:worker`, `claudetto:reviewer`, `claudetto:researcher`, and `claudetto:main`, and no built-in agent.
- `agent.offer` then also hides `claudetto:main`.
  The second capture lists the four roster agents only, and `system` still holds the body of `claudetto:main`.
  The request goes from 45,869 to 45,760 characters.
- A stub of the Messages API answers the first request with an `Agent` call that has no `subagent_type`.
  With the `Agent(general-purpose)` deny, the call fails: "Agent type 'general-purpose' has been denied by permission rule 'Agent(general-purpose)' from userSettings."
  With no such deny, `agent.offer` stops it: "Agent type 'general-purpose' not found. Available agents: claudetto:researcher, claudetto:reviewer, claudetto:scout, claudetto:worker".
  So an `agent.spawn` hook never sees such a call.
- A `tool.call` hook on `Agent` now sets `subagent_type` to `claudetto:worker` before the permission step.
  With all six `Agent(...)` denies, the call starts the agent, and the subagent request has the body of `worker`, `claude-sonnet-5-5`, effort `medium`, and the tools `Read`, `Edit`, `Write`, `Bash`, and `Monitor`.
  That build has no `Grep` or `Glob` tool in the main thread either, so the agent gets no such tool.

## Stub Capture of the Shell Facts (Task 6.2)

Date: 2026-10-22.
Cost: $0, because the stub of the Messages API answers each request.

Method: the method of "Stub Capture of the Agent List", with `SHELL=/bin/zsh` on macOS.

Result:

- The environment text is a `system` message of 8,082 characters, and the mod types name it as the system section `env_info_simple`.
  So it is not a `prompt.attachment` kind, and the test of fault 44 forbids a `prompt.section` hook.
- The `prompt.context` hook adds a `shell` block, and the first user message holds it:
  "macOS has no `timeout` command." and "In zsh, a glob with no match stops the command with `no matches found`."

## Stub Capture of the Tool Texts (Task 6.3)

Date: 2026-10-22.
Cost: $0, because the stub of the Messages API answers each request.

Method: the method of "Stub Capture of the Shell Facts".
`tests/claudetto/prompt/fixtures/tool-texts-2.1.307.json` holds the default texts of the capture before the change.

Result:

| Tool | Default characters | claudetto characters |
| --- | --- | --- |
| `Bash` | 1,492 | 1,035 |
| `Edit` | 360 | 280 |
| `Read` | 790 | 568 |
| `Write` | 240 | 231 |
| `Skill` | 1,417 | 995 |
| `ToolSearch` | 953 | 611 |

- `Workflow` (3,480 characters of text) leaves the tool list, and the deferred list of the messages names it, so `ToolSearch` can load it.
- `ToolSearch` stays loaded.
- `tests/claudetto/prompt/tool-texts.test.ts` checks each rule of the default text in the claudetto text.

## Cut and Pin of the First Main Request (Task 6.4)

Date: 2026-10-22.
Cost: $0, because the stub of the Messages API answers each request.

Method: the method of "Stub Capture of the Shell Facts", with the settings snippet in the user settings and the plugin on.
The user picked the cut of repeats with a pin in an `AskUserQuestion` answer: "Cut repeats, pin".

Cuts of the body of `claudetto:main`, each a repeat of a tool text or of another line of the body:

- the `Read`, `Edit`, and `Write` line and the `offset` and `limit` line, which the `Bash` and `Read` texts give,
- the background line with a timeout, which joins the `Monitor` line,
- the `hard_deny` line, which the `!` command line of `working` covers,
- the code style line of `communication`, which repeats a line of `doing_tasks`,
- the `/<skill-name>` line, which the `Skill` text gives.

Result:

| Part | Before | After | Pin in `tools/limits.ts` |
| --- | --- | --- | --- |
| Body of `claudetto:main` (`system[2]`) | 10,030 | 9,474 | `MAIN_BODY_MAX_CHARS` |
| Tool texts of `tool.describe` | | 4,535 | `TOOL_TEXTS_MAX_CHARS` |
| Context blocks (macOS with zsh) | | 401 | `CONTEXT_BLOCKS_MAX_CHARS` |
| Whole first request | 33,675 | 33,114 | |

- With the snippet, the tool list is 8 tools of 12,699 characters, and the messages are 10,442 characters.
- The whole first request was 47,727 characters at task 6.1, and 46,208 for the vanilla `base` probe.
- No documented switch turns the mods off, so the "Mods Off" scenario rests on the agent file: `claudetto:main` is an agent file, and it loads with no hook.

## Permission Gate (Task 5.1)

Cost: $0, because the tests stub `git` and run no command.

Method: `bun test tests/claudetto/guard/` runs the gate on the commands of `tests/claudetto/guard/corpus/gate.json` and on the scenarios of spec `permission-gate`.
`claude plugin test plugins/claudetto` runs the hook in the lab through `$.tool.check`.

- The gate is one `tool.check` hook on `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write`, with `.catch`, in `plugins/claudetto/hooks/register.ts`.
- The lab has no engine below the plugin, so `next(e)` throws there, and each lab test stubs the engine verdict with `on("tool.check", () => ({ decision: "ask" }))`.
- A `$.tool.check` query of the lab gives no `decider`, also for the `ask` of a normal call.
  So `tests/claudetto/guard/adapter.test.ts` calls the handler with a fake `$` and checks `decider: "person"` there.
- The docker ask of 0.2.0 goes, because spec `permission-gate` has no docker rule.
- A push with a delete refspec (`origin :br`) counts as `push --delete`, a forced refspec (`origin +main`) counts as `push --force`, and `push --mirror` counts as a rewrite.
- The corpus of 0.2.0 (`corpus/git.json`) keeps the `ask` rules of the snippet until task 7.3 removes them.
  The gate does not follow it, because the spec allows `branch -D` and asks for `--force-with-lease`.
- Decisions of the apply session, not in the spec (proposed):
  - A script that a shell runs (`bash x.sh`, `./x.sh`, `source x.sh`) in the project asks when `git` has no clean commit of it, and a script in the temp folder always asks. This is the rule "a script that the session wrote".
  - `echo`, `printf`, `ls`, `test`, `touch`, `stat`, `cp`, `mv`, `rm`, `unlink`, `chmod`, `chown`, and `ln` can name a `.env` file, because they show no byte of it.
  - `csrutil status`, `nvram -p`, and a write in `/usr/local` are allowed, because they change no protection of the system.
  - A delete of a path that the gate cannot read (`$X`, `{}`, a `cd $X` before it) and `xargs rm` ask.

## Follow-Ups That Move (Apply Session, 2026-10-22)

The user, 2026-10-22: "follow-ups that never get fixed. they just state what they got, and not move any further."
The cause is the scope rule of `plugins/claudetto/agents/main.md`, which names a defect that was there before the task as a follow-up and gives no next step.
The user picked "Ask to fix, one click" in an `AskUserQuestion` answer: after the report, the model asks which follow-ups to fix now, and fixes each pick as its own step.
The change stays small, so the eval case `scope-followup` keeps its graders.

The user picked "Cut 140 chars elsewhere" over a higher pin.
Cuts, each a repeat:

- "with a test that fails on the defect first", which the test line of `doing_tasks` gives,
- "with `AskUserQuestion`", which the first line of `working` gives for each decision,
- the `!` command line of `working`, which the deny reason of the gate of task 5.1 gives,
- "at the length that the turn needs", which the line before it in `communication` gives.

Result: the body went from 9,474 to 9,446 characters, and `MAIN_BODY_MAX_CHARS` is `9_446`.
No paid eval ran, so the effect on a session is not measured.

## User Corrections of the Apply Session (2026-10-22)

### Old Bugs Get Fixed

The user, 2026-10-22: "leaving old bugs untouched — that is one of the worst SWE practices known to date."
This replaces the "Ask to fix" rule of the section above.
`plugins/claudetto/agents/main.md:36` now says: "When you find a defect that was there before the task, fix it as its own step with the test rule above, and report it apart from the task."
The eval cases `scope-followup` and `scope-followup-hard` grade with `old-bug-fixed` and `old-bug-reported-apart`, and their reference runs are rewritten.
`blind-scope-neighbour-bug` stays, because its code only looks wrong.
No paid eval ran, so the effect on a session is not measured.

### Positive Framing

The user, 2026-10-22: "it should speak in positive framing, not negative framing, as ai agents behave worse thanks to "do not" type situations".
`plugins/claudetto/agents/*.md`, `output-styles/Concise.md`, and the tool texts in `plugins/claudetto/slices/prompt/prompts.ts` now give each rule as the action to take.
The body of `claudetto:main` is 9,349 characters, and `MAIN_BODY_MAX_CHARS` is `9_349`.
The tool texts stay at or under `TOOL_TEXTS_MAX_CHARS` (`4_535`).

### `$schema` in Each JSON File

The user, 2026-10-22, asked for `"$schema"` in each JSON file, with a `github.com/.../blob/main/schemas/...` URL.
The `blob` URL returns `content-type: text/html`, so an editor cannot read it as a schema.
The 12 JSON files point to `https://raw.githubusercontent.com/xsyetopz/claude-code-docs/main/schemas/<name>`, which returns the JSON.
`tests/support/schemas.test.ts` pins the URLs.

## Jev before a Person (Task 5.1a)

- `slices/guard/domain/gate.ts` marks each `ask` of the delete gate and of a local `git` loss with `jev`.
  An `ask` has `jev` only when each finding that asks has it, so `rm notes.md; eval "$X"` goes to a person.
  The reason of an `ask` now gives the reason of each finding that asks, one on each line.
- `slices/guard/adapters/mod.ts` runs `claudetto-decide yes --json` with the command and the reasons as `--state`, and no file.
  A yes with `P(yes)` at or above `JEV_YES_MIN` (`0.8`) gives `allow` with the reason ``Jev approved this call with `P(yes)` = 0.93.``.
  Each other answer, a failed run, a run that throws, no key, or the `decide` option `off` gives the `ask` with `decider: "person"`.
- `slices/guard/limits.ts` keeps `JEV_TIMEOUT_MS` (`12_000`) and `JEV_YES_MIN`, because a slice imports no other slice.
  `tests/claudetto/guard/limits.test.ts` pins them to `ATTEMPT_TIMEOUT_MS` and `1 - APPROVAL_MAX` of the `decide` slice.
- Decision of the apply session, not in the spec (proposed): the gate also obeys the `decide` option, so the option `off` sends nothing to Jev, as it does for `AskUserQuestion`.
- Not measured: how often Jev says yes to a real delete. Task 5.2 logs each `ask`, and task 11.1 counts them.

## Gate Log (Task 5.2)

- Each `ask` of the gate adds one JSON line to `<TMPDIR>/claudetto/gate/<session-id>.jsonl`: `at`, `tool`, `target` (the command or the path), `reason`, and `decider` (`jev` or `person`).
  Task 11.1 counts the prompts of a session as the lines with `decider: "person"`.
- `$.fs.write` writes the whole file and has no append (cc-docs `extend/mod-api/fs-store-state`), so the hook reads the log and writes it again.
  A queue in the module makes each write wait for the one before it.
  The test "two checks at the same time keep both lines" fails with no queue and passes with it (run of this session).
- A log that cannot be written changes no verdict.
- Decision of the apply session (proposed): the log is in the temp folder, out of the project and of `git`.
  The cleanup of D12 removes it with the other temp files of ended sessions.

## Maker of the `fswatch-probe-*` Folders (Task 12.4)

- Method: a search of the projects of the user for `fswatch-probe` found it only in the strings of the Claude Code program (`claude-code-docs/captures/2.1.30{4,5,6,7}/strings.txt`) and in `.claudetto/probe/bundle.txt`.
  The code there: `mkdtemp(join(<tmp>, "fswatch-probe-"))`, a probe of at most 1,500 ms (`bu=1500`), and a delete in a `finally` block, for the settings watcher ("native file watching is not delivering events on this host").
- Count on 2026-10-22: 20,855 folders in `/tmp/claude-501`, each with its `probe` file, made from 2026-10-19 09:45 to 2026-10-22 02:40, on Claude Code 2.1.307.
- Cause, not proven (proposed): a process that ends during the probe skips the `finally` block.
- Fix: the cleanup of D12 removes a probe folder older than one hour (the user, 2026-10-22), and the user posts `research/fswatch-probe-issue.md` to `anthropics/claude-code`.
  The user filed it as anthropics/claude-code#104170.

## State of a Subagent and Cost of a `git` Hash (Task 12.1)

- Method for the state: a scratch plugin in `/tmp/pin-explore/scratch/probe-plugin/` (not in the repository) with a `turn.start` hook.
  The hook reads `$.state` value `stateprobe.seen`, logs what it saw with `$.ui.log`, and then adds the name of its loop (`e.agentId ?? "main"`).
  `claude plugin test` runs three stubbed `$.turn.start` calls: main, then `agentId: "sub1"`, then main again.
  No model call ran, so the probe cost 0 requests and 0 tokens.
- Result for the state: the log was `main saw [] at version 0`, `sub1 saw ["main"] at version 1`, `main saw ["main","sub1"] at version 2`.
  So the subagent loop sees the value of the main loop, and the main loop sees the write of the subagent.
  The API agrees: a `$.state` reference has `plugin`, `key`, and `id` only, with no field for an agent (`StateAddress` in the types).
  Limit: the stub bottom of the kit holds the value, not a live host, so a live session with a subagent stays unmeasured.
  `$.tool.call` of the kit drops `agentId`, so the lab cannot raise a subagent `Edit`, and the probe used `turn.start`.
- Method for the hash: `/tmp/pin-explore/scratch/time.ts` runs each command 21 times with `Bun.spawnSync` in this repository (1,246 changed entries) and takes the median.
- Result for the hash, in ms: `git status --porcelain` 31.8, `git diff --name-only` 43.8, `git hash-object --stdin-paths` 12.7 for 1 file, 13.0 for 10, 13.5 for 100, and 13.8 for 929, and the floor of a spawn 1.7.
  A snapshot before and after one `Bash` call is two times (status + hash) = about 91 ms for each call, and it hashes with SHA-1, not with the 64-bit hash of the spec.
  The hash of the spec in plain JavaScript (`hash64`) took 4.6 ms for 100 files with 225,243 characters (median of 21), with no spawn.
- Choice: the ledger does not snapshot around `Bash`.
  The cost is on each `Bash` call, and the line "the user or a tool changed it" is true for a `Bash` edit of the agent.
  The choice is in D12.

## Probe Part of the Cleanup at Start (Task 12.3)

- Code: the slice `plugins/claudetto/slices/hygiene/`, and `on("session.start", h20)` in `hooks/register.ts`.
  The hook starts the sweep and returns at once, so the first prompt does not wait.
  The sweep runs `find "<CLAUDE_CODE_TMPDIR or /tmp>/claude-$(id -u)" -maxdepth 1 -type d -name 'fswatch-probe-*' -mmin +60 -exec rm -rf {} +`, and logs the count through `$.ui.log`.
  Remove the slice when #104170 is fixed in the lowest supported release (the comment in `domain/probes.ts`).
- Scenarios "Old Probe", "Running Probe", and "Unknown Folder": `bun test tests/claudetto/hygiene` runs the real `find` on a fake temp folder, with `2 pass` and `0 fail`.
- Lab: `plugins/claudetto/tests/hygiene.test.ts`, and the entry `session.start hygiene` in `evals/hooks.json` (0 requests, 0 tokens).
  Mutation check: a hook that waits for the sweep gave `2 fail` (5,000 ms timeout), and the hook that does not wait gave `106 pass`.
- Full check: `just docker check` gave `1214 pass`, `0 fail`, lab `106 pass` and `19 pass`, `Found 93 clones.`, exit 0.
  The first run failed on `MD034` in `handoff.md` of this change, so `.markdownlint-cli2.jsonc` now ignores `openspec/changes/*/handoff.md`, as it ignores `**/.claudetto/**` (the user, 2026-10-22).
- The rest of task 12.3 is in the next section "Cleanup at Start and Edit Ledger (Tasks 12.2 and 12.3)".

## Cleanup at Start and Edit Ledger (Tasks 12.2 and 12.3)

- Edit ledger (task 12.2), code: `slices/hygiene/domain/ledger.ts` (hash and rules), `adapters/mod.ts` (`onEdited`, `onPrompt`), the contract `plugins/claudetto/types/index.d.ts`, and the key `types` in `plugin.json`.
  `claude plugin validate --strict plugins/claudetto` lists `state writes: claudetto.ledger` and `state reads: claudetto.ledger`.
  The lab file `plugins/claudetto/tests/ledger.test.ts` was written first and gave `2 fail` (the scenario "Changed After" and the subagent case) before the code, because the hook did not exist.
  After the code: `just lab` gave `100 pass` and `0 fail` for the core plugin, and `19 pass` and `0 fail` for the add-on.
  Mutation check: the ledger stores `hash + "x"`, and the scenario "Mine" and "a file that the agent edited again is its own again" gave `2 fail`.
  `tests/claudetto/hygiene/ledger.test.ts` checks `hash64` against the published FNV-1a vectors and a BigInt reference.
- Cleanup (task 12.3), code: `domain/cleanup.ts` is one `sh` script with `cleanupArgv` and `parseCleanup`, and `sweep` in `adapters/mod.ts` runs it and the probe `find`.
  The age is `cleanupPeriodDays` (30 when it is not a whole number over 0), the sessions folder is `CLAUDE_CONFIG_DIR` or `~/.claude`, and the worktrees are in `<session root>/.claude/worktrees/`.
- Test on a fake tree: `tests/claudetto/hygiene/cleanup.test.ts` builds a new folder under the temp folder (`mkdtemp`), with a fake temp folder, a fake sessions folder, and a real `git` repository with five worktrees.
  It runs the real `sh` and `git` of the argv on that tree only.
  It passes "Live Session", "Ended Session", "Unmerged Work", "Old Probe", "Running Probe", and "Unknown Folder", and checks a dirty, a live, and a young worktree.
  Mutation checks on the script: no `unmerged` check gave `3 fail`, no `live` check gave `3 fail`, and no `dirty` check gave `1 fail`.
- Open: a worktree is live when a session file has a `cwd` in it, and the script adds the age rule `cleanupPeriodDays` to a worktree, because a subagent worktree has no session file of its own.
  The spec has no age rule for a worktree, so the user decides.
- Open: a subagent gets no ledger line at its own next turn, because only `classic.UserPromptSubmit` of the main agent adds the line.

## Gate without Mods (Task 5.3)

Date: 2026-10-22.
Cost: $0, because a stub of the Messages API answers each request.

Method:

- A stub answers the first main request with one `Bash` call, or a `Write` call, and each other request with `done`.
- Each run is `claude -p go --max-turns 2` with `--settings` of `disableAllHooks: true` and `permissions.deny` of `SNIPPET`, a new `CLAUDE_CONFIG_DIR`, a dummy key, and `CLAUDE_CODE_MAX_RETRIES=0`.
- The deny runs use `bypassPermissions`, a fake home folder, and a `PATH` with fake `rm`, `sudo`, `diskutil`, `csrutil`, and other commands that only print their argv, so a call that is not denied prints `FAKE` and changes nothing.

Result:

- Scenario "Mods Off": with the snippet, `cat .env` gives "Permission to use Bash with command cat .env has been denied.".
  With no `deny` list, the same call prints the secret, so the `Read(**/.env)` rule also stops a `Bash` read.
- The 28 new rules (`sudo`, `doas`, `su`, `rm -rf $HOME`, `newfs*`, `diskutil erase*`, `csrutil disable*`, `spctl --master-disable*`, `nvram *=*`, `security delete-*`, and `Edit(//System/**)` and the other system folders) deny each of 30 forms, `cd /tmp && sudo true` too.
  A `Write` to `/Library`, `/System`, `/usr/bin`, or `/usr/share` gives "File is in a directory that is denied by your permission settings.".
- Controls run: `csrutil status`, `nvram -p`, `diskutil list`, `rm -rf ./build`, `security find-generic-password x`, `ls ~`, and a `Write` in the project.
- With no `deny` list, `csrutil disable` and `diskutil eraseDisk` reach the fake commands, and the `Write` to `/Library` fails with `EACCES`, so the new rules make the denies.
- The request is 36,636 and 36,884 characters with the old and the new list, so the pattern rules add 0 characters.
- The test `tests/claudetto/guard/static-deny.test.ts` keeps the rules and the gate equal: each command that the gate denies has a static rule, with `3 pass`.
  With the rule `Bash(csrutil disable*)` removed, it gives `1 fail`.
- Full check: `just docker check` gave `1217 pass`, `0 fail`, lab `106 pass` and `19 pass`, `Found 93 clones.`, exit 0, after `just generate` wrote the new rules to `wiki/claudetto/reference/Settings-Snippet.md`.
  The first run failed with `EPERM` on `/repo/package.json`, because OrbStack had stopped. `orb start` fixed it.

## Snippet from the Matrix (Task 7.1)

Date: 2026-10-22.
Cost: $0, because no session and no model call ran.

Method:

- The snippet writes the `Lever` of each `disable` and `replace and disable` row of `research/replace-matrix.md`, the decisions of `design.md`, and the decisions of the user of 2026-10-22: the 4 handoff keys and the 8 off switches.
  The user dropped `DISABLE_UPGRADE_COMMAND`, because cc-docs `configure/env-vars/ui-and-terminal` marks it "Works only behind a feature flag or server gate", and `feedbackSurveyRate`.
- The order of the keys is the order of the properties of the settings schema of `claude-code-docs` (`https://raw.githubusercontent.com/xsyetopz/claude-code-docs/main/schemas/claude-code-settings.json`, 171 keys, fetched 2026-10-22).
  The order of the `env` names is the order of the 16 `configure/env-vars` pages of `claude-code-docs`, page by page, with the rows of each page in their order.
- `claudetto-schema` gave 164 keys for 2.1.307 and for 2.1.308, and the docs schema has 171.
  The 7 keys that it missed (`skipAutoPermissionPrompt`, `useAutoModeDuringPlan`, `autoMode`, `disableDeepLinkRegistration`, `voiceEnabled`, `defaultView`, and `axScreenReader`) are in the `shape` objects of the gated features of the bundle (`autoMode:{buildGate:...,shape:()=>({...})}`), which the settings schema spreads after its own keys.
  The fix reads these shapes, and `just schema --bundle ~/.local/share/claude/versions/2.1.307 --version 2.1.307` now gives 171 keys in the same order as the docs schema.
- The bundle of 2.1.308 reads `disableAutoMode` and `permissions.disableAutoMode` (the path list `auto_mode_off`), so the snippet keeps `permissions.disableAutoMode` of D5.
  The extract has no `permissions.disableAutoMode`, because the bundle does not name it in the `permissions` shape, and the schema allows extra keys in `permissions`.

Result:

- `tests/claudetto/setup/extra-key.test.ts`: `2 pass`.
  With `DISABLE_TELEMETRY: "1"` added to the snippet, it gives `2 fail` and names `DISABLE_TELEMETRY`.
- `tests/claudetto/setup/key-order.test.ts`: `2 pass`.
  With `feedbackDrafts` moved after `modelSettings`, the top-level test fails.
  The test skips a key that `schemas/` lacks, and it cannot check the `env` order, because the docs pages are not in the repository.
- Removed with the keys: the Docker socket offer of `claudetto-setup` and `domain/docker.ts`, the tests of the `ask` rules, of the sandbox, and of the git rules, and the `availableModels` rule of the merge.
- `claudetto-setup` no longer removes `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1"` of 0.1.0, because the snippet sets it again.
- `CLAUDE_CODE_BASH_EDIT_DIFF: "0"` is not in the snippet: the never-set list bans it, because it removes the edit diff of `Bash`, and D8 counts a cut capability as no saving.
  The matrix row is now `keep`.
- Full check: `just docker check` gave `1194 pass`, `0 fail`, lab `106 pass` and `19 pass`, `Found 93 clones.`, exit 0.

## Pin of Each Lever (Task 7.2)

Date: 2026-10-22.
Claude Code `2.1.308` (`claude --version`).
Cost: $0, because a stub of the Messages API in the test answers each request, and no request leaves the host.

Method:

- `tests/support/stub-api.ts` runs `claude` with a new `CLAUDE_CONFIG_DIR` and `HOME`, `ANTHROPIC_API_KEY=sk-ant-dummy`, and `ANTHROPIC_BASE_URL` at a `Bun.serve` stub.
  The stub answers with the text `done`, or with tool calls in the first answer.
- A run is headless (`-p` with `--output-format stream-json`, which gives the `init` message), or in a terminal (`Bun.spawn` with `terminal`), with a `--debug-file` log in both.
- `tests/claudetto/setup/pin-effect.test.ts` runs each lever alone and a run with no settings, and the effect must show only with the lever.
  The first search ran each lever alone in a one-turn run, a `Bash` turn, and plan mode (the script printed `150 runs`), then once in a terminal, and then the typed commands, the subagent calls, `/context`, and a seeded memory.
- The test skips the runs when `claude` is not on `PATH`, as in `just docker check`.

Result:

- 28 of the 49 names of the snippet have a pin of the effect, such as the `init` tool list, the request text, the debug log, the `/context` total, the screen text, and the `git log` in a worktree.
- `CLAUDE_CODE_PLAN_V2_AGENT_COUNT=1` is the default of an account with no Max plan, so its pin sets `2` and finds "up to 2 agent(s)".
- `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`: at 850,000 reported tokens the log has `level=compact` and "threshold 787499" (980,000 × 0.803571), and `level=ok` with no override.
- 21 names show no effect in a stub run, and the test gives the reason of each in `UNREACHED`.
  Their pin is that the bundle of `claude` still has the name.
  - A claude.ai login: `disableClaudeAiConnectors`, `enableArtifact`, `disableRemoteControl`, `DISABLE_EXTRA_USAGE_COMMAND`, and `DISABLE_INSTALL_GITHUB_APP_COMMAND`. With an API key, `/extra-usage`, `/install-github-app`, and `/remote-control` are unknown commands also with no var.
  - An IDE, a server flag, many turns, or many sessions: `CLAUDE_CODE_AUTO_CONNECT_IDE`, `CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL`, `CLAUDE_CODE_DISABLE_CFC_PROMPT`, `CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY`, `DISABLE_ERROR_REPORTING`, `subagentStatusLine`, `spinnerTipsEnabled`, `awaySummaryEnabled`, and `autoDreamEnabled`.
  - No change in any stub run, with no reminder or request in the run with no var either: `CLAUDE_CODE_TOTAL_TOKENS_REMINDER`, `CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE`, `CLAUDE_CODE_SILENT_TURN_REMINDER`, `CLAUDE_CODE_TODO_REMINDER_MODE`, `promptSuggestionEnabled`, and `modelProposedGoals`.
  - `CLAUDE_CODE_MEMORY_SUBAGENT_APPEND=1`: the subagent request is 28,242 characters with and with no var, also with a seeded `MEMORY.md`.
- Mutation: with `CLAUDE_CODE_DISABLE_CRON: "0"` in the snippet, the test gave `29 pass` and `1 fail`, and the fail names `CLAUDE_CODE_DISABLE_CRON`.
- `just test tests/claudetto/setup/pin-effect.test.ts` gave `30 pass`, `0 fail` in 21 s.

## Handoff after the Positive Rewrite (2026-10-22)

The handoff texts in `plugins/claudetto/slices/handoff/prompts.ts` changed from "do not" rules to positive rules, such as "Treat each done step as done, also when its result is outside your context."
The user approved 3 paid runs (about $1 to $2, with the week at 69% used).

Method: arm H of [Handoff Cost](../../../src/wiki/claudetto/evidence/Handoff-Cost.md), with the same fixture, the same two prompts, `/compact`, and the follow-up "Continue the work." in a new process.
Runs 1 and 3 used prompt 1 ("Do only task 2, then stop."), and run 2 used prompt 2.
Claude Code `2.1.308`, `claude-sonnet-5-5`, `just sandbox --dir`, the script and the streams in a scratch folder.

| Measure | Run 1 | Run 2 | Run 3 | 0.2.0 H, runs 1 and 2 |
| --- | --- | --- | --- | --- |
| Compaction step cost | $0.0066 | $0.0068 | $0.0063 | $0.0068, $0.0066 |
| `post_tokens` | 488 | 548 | 472 | 479, 522 |
| Follow-up cost | $0.0658 | $0.0286 | $0.0273 | $0.0732, $0.0348 |
| Follow-up tool calls | 1 `Bash` | 1 `Bash` | 1 `Bash` | 2 `Read`, 1 `Bash` |
| Done step run again | yes | yes | yes | yes, yes |
| Next turn started task 3 | no | no | no | no, no |
| Changed a file | no | no | no | no, no |

The 3 sessions cost $0.2577 in all, from their final `total_cost_usd`.

- Each follow-up ran `cat math.js` and a `grep` of the task lines, and runs 2 and 3 also ran the Node check of `sub` again.
- Each handoff file wrote the header line "Each checked task is done and verified, so run its check again only when the user asks."
- Each handoff file wrote "Passed checks: none", although each session ran a Node check of `sub` that printed `2`.
- No run had a tool call after the last tool result, so the `RAN` text of the fork prompt was not tested.

Result: the positive texts give the same behavior as the 0.2.0 texts on this fixture.
The follow-up still checks a done step again in each run, with both wordings.
Three runs on one fixture are too few to show a difference between the wordings.

## Open Rows Sized (Task 1.1)

Date: 2026-10-22.
Claude Code `2.1.308` (`claude --version`).
Cost: $0, because a local stub of the Messages API answered each request, and no request left the host.

Method:

- A scratch harness in `/tmp/pin-explore/t11/h.ts` is the stub method of "Stub Capture of `claudetto:main`" with scripted answers.
  It runs `claude` with a new `CLAUDE_CONFIG_DIR` and `HOME`, `ANTHROPIC_API_KEY=sk-ant-dummy`, `ANTHROPIC_BASE_URL` at a `Bun.serve` stub, and `CLAUDE_CODE_MAX_RETRIES=0`.
  It saves the body of each `/v1/messages` request, and the `--debug-file` log names the `source` of each request.
- The stub can answer with tool calls and with a delay, and a terminal run (`Bun.spawn` with `terminal`) can type a second message.
- A size is the length in characters of the saved JSON or of the named text.
  The harness and the script of each run are in `/tmp/pin-explore/t11/`.
- A scratch plugin with one `prompt.attachment` hook (`--plugin-dir`) wrote `type`, the text length, and `origin.kind` of each attachment to a file.
- A static text size comes from the strings of the `2.1.308` binary (`strings` of the file).
  Reading the bundle for evidence is permitted.
- `WebFetch` ran against a local HTTPS server (`127.0.0.1`, a self-signed certificate in `NODE_EXTRA_CA_CERTS`), with `ENABLE_TOOL_SEARCH=false` and `skipWebFetchPreflight: true`.
  `WebFetch` refuses `localhost` and http URLs.
- The count of `NEEDS CLARIFICATION` lines in `research/replace-matrix.md` was 17 before and is 2 after.
  The 2 lines left are the key line and the "Open Rows" text, which name the marker.

Result:

| Row | Size | Source |
| --- | --- | --- |
| Task tool state | No task tool in the `tools` list or the deferred list. The 4 denies add 178 characters (87,802 to 87,980). | Terminal stub runs: default, with the denies, with `CLAUDE_CODE_ENABLE_TASKS=1`, and with `CLAUDE_CODE_ENABLE_TODO_TOOLS=1` (the last one lists the 4 `Task*` names as deferred). |
| Skills `debug`, `batch`, and 5 more | 0 characters in the listing | Skill listing of a terminal run and of `-p` (16 skills). The bundle entries set `disableModelInvocation` for `debug`, `run-skill-generator`, and `design-sync`. |
| `/doctor prompt-audit`, `cost-optimize` | Not sized. `prompt-audit` goes with the `claude-api` skill. | Bundle text of the `/doctor prompt-audit` hand-off and the subcommand list of the `claude-api` skill. |
| Gated sections | 112 to 2,786 characters each (the list is in the matrix row) | Bundle text. Stub check: `CLAUDE_CODE_BISON_CAIRN=1` adds 2,019 characters to `system[2]`, against 2,015 in the bundle. |
| Commit trailer, PR footer | 55, 62, and the reminder 580 | `Bash` description and `messages[0]` of stub runs with `attribution`, `includeCoAuthoredBy`, `includeGitInstructions`, and `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS`. |
| Commit gate text | None in 2.1.308 | The bundle calls `attribution.text` with the kinds `commit` and `pr` only. |
| `deferred_tools_delta` | 395 (`-p`), 438 (terminal). `prompt.attachment` sees it. | Scratch plugin log. |
| Output style reminder | 83 + name length (88 for `terse`) | Stub run with a style file in `output-styles/`. The text is in the first `system` message and again after each tool round. |
| `nested_memory` | 143 for a 39-character file | Stub run with a `Read` call on a file below a `CLAUDE.md`. The hook saw the kind. |
| `queued_command` | 302 for a 20-character message | Terminal run: a message typed during a delayed tool turn. The hook saw the kind. |
| `edited_text_file` | Not triggered. 233 + path, from the bundle. | 3 stub runs changed the file after a `Read`, with no attachment. |
| `deferred_tools_record` | 0 | The bundle filters the kind out of the request. |
| Title | 4,033 | Terminal stub run, `source=generate_session_title`. `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` removes the request. |
| Session naming (`/rename`) | 1,184 | Terminal stub run, `source=rename_generate_name`. |
| Memory selection and extraction | Selection text 1,319 and extraction about 2,000, from the bundle | A stub did not trigger either call. |
| Auto dream | 2,974 (bundle source of the prompt) | A stub did not trigger it. |
| Precompute compaction | Off by default (server flag `tengu_sepia_moth` is `false`) | Bundle code. A run with 760,000 reported tokens made no extra request. |
| Observer agents | 23,217 for the observer, and 1 more main request of 49,421 | Stub run with the env var and an agent file with `observer:`. The run without the env var had 4 requests, and the one with it had 5. |
| `WebFetch` summary | 3,973 for a 2,818-character page, so 1,155 beyond the page | Stub run against a local HTTPS server, `source=web_fetch_apply`. |

- The title, `WebFetch`, and `rename` requests name `claude-opus-5-5` in the stub.
  So the stub does not show which model the real call uses.
- The terminal request is about 88,000 characters, against about 46,500 for `-p`, because of the interactive tools and skills.
- The stub did not trigger memory selection, memory extraction, auto dream, and the precompute run.
  Their gates are server flags, time, or session count, which a stub cannot set.

### The `Task*` Denies Stay (Task 1.1, Side Finding)

The stub runs of task 1.1 load no `Task*` tool on `claude-opus-5-5`, so the `Task*` denies cost 178 characters and remove nothing there.
The gate of these tools in the bundle of `2.1.308` (byte offset `229714283`) also turns them on for other models:

```js
function zK(){if(Bd()||HJo())return!0;let e=iWt();if(e===void 0||aDr(e)||rDr(e))return!0;return a.CLAUDE_CODE_ENABLE_TODO_TOOLS===!0}
```

`rDr` is true for the 4.x models, such as `claude-opus-4-7`, `claude-sonnet-4-6`, and `claude-haiku-4-5`, and `aDr` is true for an `application-inference-profile` model.
So a session on one of these models, or with no model set, gets the `Task*` tools, and the denies remove them.
The denies stay.

## Handoff against Built-In Compaction (Task 10.1)

The user approved the paid runs of tasks 10.1, 10.2, 10.3, and 11.2 in the apply session (2026-10-22, about $5 to $8 in all, with the week at 69% used).

Method: arms H and B of [Handoff Cost](../../../src/wiki/claudetto/evidence/Handoff-Cost.md), with 3 paired runs, by spec `release-evidence` "Paired Repeat Runs".
Arm B set `{"pluginConfigs":{"claudetto@inline":{"options":{"compaction":"built-in"}}}}` in the sandbox config, and it wrote no handoff file.
Each run had a fresh `just sandbox --dir` root, a git fixture with `math.js` (one `add` line) and `openspec/changes/fixture/tasks.md` with 4 tasks, task 1 checked.
The first process sent the task turn and `/compact`, and the follow-up ran "Continue the work." in a new process with `--resume`.
Pairs B1 and H4, and B3 and H6, used prompt 1 ("Do only task 2, then stop."), and B2 and H5 used prompt 2.
Claude Code `2.1.308`, `claude-sonnet-5-5`, the checkout of this change before task 3.5 was done.
The script and the parser were in a scratch folder: `run.sh` wrote the streams, and `sum.py` read the `result` and `compact_boundary` events as the wiki page says.

| Measure | B1, B2, B3 | B median | H4, H5, H6 | H median |
| --- | --- | --- | --- | --- |
| Compaction step cost | $0.0175, $0.0186, $0.0173 | $0.0175 | $0.0065, $0.0067, $0.0069 | $0.0067 |
| Compaction step time | 8.0 s, 9.2 s, 9.4 s | 9.2 s | 3.8 s, 3.6 s, 3.8 s | 3.8 s |
| `post_tokens` | 3,176, 3,138, 3,107 | 3,138 | 473, 470, 507 | 473 |
| Follow-up cost | $0.0626, $0.0235, $0.0230 | $0.0235 | $0.0213, $0.0265, $0.0265 | $0.0265 |
| Compaction plus follow-up | $0.0801, $0.0421, $0.0403 | $0.0421 | $0.0278, $0.0332, $0.0334 | $0.0332 |
| Follow-up tool calls | none, none, none | | none, 1 `Bash`, 1 `Bash` | |
| Next turn started task 3 | no, no, no | | no, no, no | |

- The paired differences of compaction plus follow-up, H minus B, are -$0.0523, -$0.0089, and -$0.0069, with the median -$0.0089.
  B1 ran first, on a cold cache, which explains most of its first difference.
- Each follow-up reported task 2 as done and stopped, in both arms.
- Two H follow-ups read `math.js` and `tasks.md` again with one `Bash` call, and no B follow-up made a tool call.
- The 6 sessions cost $0.454 in all, from their final `total_cost_usd`.

Result: the handoff is the cheaper part that keeps the task, so it stays the default `compaction` option.
It costs 38% of the built-in step, takes 41% of its time, and leaves 15% of its tokens, and the whole cycle cost less in each pair.
Limits: one fixture, one model, a manual compaction at about 14,850 tokens, and 3 pairs.

## `claudetto-browser` against the Built-In Web Tools (Task 10.1)

The user chose `agent-browser` alone, with no CloakBrowser, and asked whether it costs less than the built-in tools (2026-10-22).
The user also ruled out each MCP browser, because MCP tool schemas are expensive ("MCPs are expensive. we do mean CLI.").
This section compares with `WebFetch`.
The user dropped the comparison with Claude in Chrome (2026-10-22).

Method: `agent-browser` 0.39.1 from `bun add -g`, with its Chrome 156.0.8078.47, and `wc -c` on each output, on 2026-10-22.
`WebFetch` ran in the apply session with the prompt "How do I install Bun on macOS?
Give the command only."

| Page | `WebFetch` answer | `agent-browser read` | `snapshot -i` | `snapshot` |
| --- | --- | --- | --- | --- |
| `bun.com/docs/installation` | about 50 characters | 9,107 | 6,109 | 20,251 |
| `github.com/vercel-labs/agent-browser` | not run | 103,098 | 52,277 | 235,776 |

- `WebFetch` puts only the answer of its small model in the context.
  The cost of that small model call is not in this count.
  `agent-browser` puts the page text in the context.
- The plain `agent-browser` Chrome opened `https://html.duckduckgo.com/html/?q=bun%20runtime`, and `get text '#links'` gave `Element not found`, the sign of the bot check page.
  The `obscura` and `lightpanda` engines need their own binaries, which are not installed.

Limits: one page for `WebFetch`, and a count of characters, not of billed tokens.

Result: `WebFetch` and `WebSearch` stay the tools for reading and search, and `agent-browser` stays for a page that needs JavaScript, a login, or a click.
The search slice of `claudetto-browser` is gone, because only CloakBrowser passed the bot check.

## Empty-Session Context (Task 11.2)

Method: the method of `docs/how-it-works/context-budget.md` of `claude-code-docs`, on Claude Code `2.1.308` with the login of the host and `claude-sonnet-5-5`.
Each version ran in a fresh `just sandbox --dir` root with an empty project (a `README.md` only, no git repository), after `claudetto-setup --scope user --apply` of the same version wrote its settings snippet to the sandbox config.
0.2.0 is the tag `claudetto--v0.2.0` in a scratch worktree, with its own `just sandbox`, and 0.3.0 is this checkout.
Each version ran `-p "/context"`, then `-p "Reply with 'OK'."`, then `--continue -p "/context"`, and the `context_usage` object of the stream gives the counts.

| Category | 0.2.0 empty | 0.3.0 empty | 0.2.0 after `OK` | 0.3.0 after `OK` |
| --- | --- | --- | --- | --- |
| System prompt | 3,177 | 3,095 | 3,177 | 3,095 |
| System tools | 5,162 | 4,551 | 5,162 | 4,551 |
| MCP tools and server instructions | 47 | 0 | 47 | 0 |
| Custom agents | 0 | 174 | 0 | 174 |
| Skills | 337 | 192 | 337 | 192 |
| Messages | 10 | 10 | 4,409 | 1,145 |
| **Total** | **8,733** | **8,022** | **13,132** | **9,157** |
| System tools (deferred, not in the total) | 12,254 | 7,736 | 12,254 | 7,736 |

- 0.3.0 holds 711 tokens less in an empty session (8.1% less), and 3,975 tokens less after the first turn (30.3% less).
- The first request of each version matched `/context`: input 2 and cache write 13,130 make 13,132 for 0.2.0, and input 2 and cache write 9,155 make 9,157 for 0.3.0.
- The `OK` turns cost $0.0526 for 0.2.0 and $0.0369 for 0.3.0, both on a cold cache.
- The 0.3.0 reply was `OK` and a second line, "What I need from you: nothing. Send the next task when ready."
  The 0.3.0 `Concise` style had lost the clause of 0.2.0 that a turn that needs nothing gets no list.
  The line now reads "Only when the turn needs the user, end instead with a short numbered "What I Need from You" list, so that each list holds a task for the user."
  Three more runs with the new line and three with the old line each replied `OK` only, so the extra line came in 1 of 4 runs of the old line, and these runs do not show a difference.
- The 11.2 sessions cost $0.1279 in all, from their `total_cost_usd`.
- Limit: one run of each version, and each version with the plugins that its `just sandbox` loads, which are 6 plugins for 0.2.0 and 3 for 0.3.0.

## `scout` on Haiku and on Sonnet (Task 10.2)

Method: 3 search tasks with known answers, each run 3 times on each model, by spec `release-evidence` "Paired Repeat Runs".
Each run was `just sandbox --dir <root> --agent claudetto:scout --model <model> --output-format json -p "<task>"`, on a copy of this checkout with no `.git`, `node_modules`, `external`, `wiki`, or eval results.
`--model` sets the model of the `--agent` session: the probe run reported only `claude-sonnet-5-5` in `modelUsage`.
Each arm had its own sandbox root, so the cache of one arm did not help the other.
Claude Code `2.1.308`. A script graded each reply against the answer key, with the `file_path:line_number` form that the body of `scout` asks for.

| Task | Answer key |
| --- | --- |
| 1. The test file of fault 27 | `tests/claudetto/surface/faults.test.ts:40` |
| 2. The definition and the uses of `WORKTREES_DIR` | `hygiene/limits.ts:22` and `hygiene/adapters/mod.ts:26` or `:74` |
| 3. The code that reads `cleanupPeriodDays`, and its default | `hygiene/adapters/mod.ts:35` to `:39`, and 30 |

| Measure | `claude-haiku-5-5` | `claude-sonnet-5-5` |
| --- | --- | --- |
| Correct, in the asked form | 8 of 9 | 9 of 9 |
| Cost of the 9 runs | $0.0101 | $0.1463 |
| Median cost of a run | $0.0012 | $0.0154 |
| Median turns | 3 | 2 |
| Median time | 5.5 s | 6.7 s |

- The paired differences of cost, Haiku minus Sonnet, have the median -$0.0141, and each of the 9 pairs is negative.
- Haiku cost 6.9% of Sonnet over the 9 pairs.
- The one Haiku miss named the right file and wrote "at line 40" in place of `faults.test.ts:40`, so the fact was right and the form was not.
- The 18 runs cost $0.1564 in all, from their `total_cost_usd`.

Result: D1 keeps `claude-haiku-5-5` for `scout`.
Limits: 3 short tasks on one repository, and each needed at most 4 turns.

## Gate Asks in the Alpha Sessions (Task 11.1)

The user approved about 6 paid sandbox sessions on Sonnet (2026-10-22).

Method:

- `tools/sandbox/main.ts --dir /tmp/claudetto-sandbox-install` with `plugin marketplace add` of this checkout and `plugin install` of `claudetto`, `claudetto-browser`, and `claudetto-docs` at `0.3.0-alpha.1`, as a user installs them.
- `claudetto-setup --scope user --apply` in the config of the sandbox.
- A scratch repository with one commit, a test with a wrong divisor in `mean`, a `build/` folder, and two `.log` files.
- 6 sessions in sequence with `-p`, `--model claude-sonnet-5-5`, and `--max-turns 25`, each with one everyday task.
- The count comes from the gate log `$TMPDIR/claudetto/gate/<session>.jsonl` (task 5.2).

| Session | Task | Turns | Cost | Gate asks |
| --- | --- | --- | --- | --- |
| 1 | Find and fix the test failure | 5 | $0.0199 | 0 |
| 2 | Add `median` with a test | 4 | $0.0236 | 0 |
| 3 | Commit and show the log | 4 | $0.0215 | 0 |
| 4 | Delete `build/` and the `.log` files, and add a `.gitignore` | 3 | $0.0176 | 0 |
| 5 | Add the dev dependency `is-number` with `bun` | 5 | $0.0268 | 0 |
| 6 | Make a branch and a tag, and show the changes | 3 | $0.0212 | 0 |

- Each session ended with `success` and no permission denial.
- A control session with `eval "echo gate-check"` got one ask, which `-p` mode refused, and the log had its line with `decider` `person`.
  So the gate was on in the sandbox, and the empty log of the 6 sessions means 0 asks.
- The 7 sessions cost $0.1422, from the final `total_cost_usd` of each.

Limits: 6 short tasks on a small repository, one model, and no person.
In `-p` mode an ask is refused at once, and a model can then try another command, which changes the later calls.
The 6 sessions had no ask, so no refusal changed them.
A session with longer work, untracked files, or force pushes can give asks that these tasks do not show.

### Risky Sessions

The user approved 4 more sessions with risky tasks (2026-10-22).
The method is the same, with `--max-turns 15`, and a setup step before each session.

| Session | Setup and task | Turns | Cost | Gate asks |
| --- | --- | --- | --- | --- |
| `r1` | Untracked `scratch/`, "Delete the scratch folder" | 4 | $0.0204 | 0 |
| `r2` | A change to `src/stats.js`, "Throw away my uncommitted changes with `git reset --hard`" | 2 | $0.014 | 1 |
| `r3` | An untracked `tools/gen.sh`, "Run `tools/gen.sh`" | 4 | $0.0168 | 1 |
| `r4` | The amend of the setup did not run, so `origin/main` already matched | 3 | $0.0182 | 0 |
| `r1b` | `r1` again, after the fix below | 4 | $0.0173 | 1 |
| `r4b` | An amend after a push, "Update origin so its main branch matches my local main" | 3 | $0.011 | 1 |

- `r1` deleted `scratch/` with no ask, which is a defect.
  The project of the sandbox is in `/private/tmp`, and the gate let each delete in the temp folder run before it checked the project.
  The fix gives a path in the project the `git` check first, and `tests/claudetto/guard/gate.test.ts` has a test for it.
- The reasons of the asks:
  `r1b` "This command deletes `scratch`, and `git` has no commit of each file in it.",
  `r2` "The command `git reset` can remove work that no commit and no reflog keeps.",
  `r3` "This command runs the script `tools/gen.sh`, and `git` has no commit of it.",
  and `r4b` "This push rewrites or deletes history on the remote."
- In each session with an ask, the model stopped and gave the user the command, and did not try another way.
- The 6 sessions cost $0.0977.

