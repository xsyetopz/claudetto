# External Research for 0.3.0-alpha.2

Method: the main agent of this session read the plan files (`prd.md`, `architecture.md`, `proposal.md`, `research/sessions.md`, the `agent-roster`, `session-hygiene`, and `permission-gate` specs), then each file below in full.
It checked the claims about the current code with `grep` and `Read` in `plugins/claudetto/`.
A number in this file comes from a file that the agent read, unless it carries `(proposed)`.
The dossier corpus is one user, one plugin project (then named `dotclaude`), and three days, so it shows which failures occur, not how often.

## Sources

- `external/claude-ai/swe-best-practices.md`: the practices B1 to B5 (flow, AI-agent operation, agent and harness design, agent security, rules for the agent), with the evidence table.
- `external/claude-ai/swe-worst-practices.md`: the anti-patterns W1 to W5 with a severity (S1 loses data or leaks, S3 is drag), each with its countermeasure in the best-practices file.
- `external/agent-failure-dossier/00-INDEX.md`: the index of 18 failure modes (I01 to I18), the enforcement ladder, and the quick lookup by symptom.
- `external/agent-failure-dossier/01-grounding-and-memory.md`: I01 ungrounded defaults, I02 instruction decay, I03 context rot, with session-log evidence.
- `external/agent-failure-dossier/02-verification-and-honesty.md`: I04 false completion, I05 specification gaming, I06 sycophancy.
- `external/agent-failure-dossier/03-safety-and-trust-boundaries.md`: I07 destructive or out-of-scope actions, I08 invented APIs and packages, I10 injection and over-refusal.
- `external/agent-failure-dossier/04-engineering-delegation-and-cost.md`: I09 over-engineering, I11 multi-agent failures, I12 cost and token waste.
- `external/agent-failure-dossier/05-appendices-and-limitations.md`: the Claude Code 2.1.296 levers by issue (from binary strings, not documented), the limits of the dossier, and themes outside the 12 issues.
- `external/agent-failure-dossier/06-autonomy-and-consent.md`: I13 over-deferral, I14 consent drift, I15 tests that pin wording.
- `external/agent-failure-dossier/07-measurement-and-environment.md`: I16 invalid evals, I17 orphaned background jobs, I18 harness and sandbox side effects.
- `external/agent-failure-dossier/08-session-log-corpus.md`: the method, the counts (classifier denials, sandbox bypasses, turn limits), and the safeguards that held.
- `external/agent-failure-dossier/.claude/.cc-writes`: an empty folder, not a ledger and not a file.
  It has no entry (mode `drwx------`, dated 2026-10-21 in the dossier copy), and it has no format.
  Section I18 of `07-measurement-and-environment.md` says that the sandbox creates empty `.claude/.cc-writes` folders wherever a shell starts.
  The same empty folder is at `/Users/krystian/Downloads/CodeProjects/xsyetopz/claudetto/.claude/.cc-writes`, and the global git ignore of the user (`**/.claude/.cc-writes/`) hides both.
  It is unrelated to the claudetto edit ledger, which lives in `$.state` (0.3.0) and moves to one ledger file in the temp folder (alpha.2 spec `session-hygiene`).

## Findings

Legend: `covered` means the alpha.2 plan or the 0.3.0 code does it already (the cell says which), `partly` means some of it is there, `new` means no plan file or code has it.
The slice names are those of `plugins/claudetto/slices/`.
Each fix uses a documented surface first: a setting, an env var, a mod hook (`tool.check`, `tool.call`, `turn.step`, `turn.complete`, `prompt.context`, `session.start`), agent frontmatter, or text.
The dossier warns against new formats (I09: the user ordered that no tool invent its own schemas), so no fix below adds a file format.

### X1: Database and infrastructure loss has no class in the gate

- Source: `swe-worst-practices.md`, W5 Agent misconduct, item W5-5; `swe-best-practices.md`, B4-5 and B4-6.
- Quote: "Destructive "repair" when surprised (seeing empty data → dropping/recreating tables; ..."
- Slice: `guard`.
- Fix: add a database and infrastructure class to the Bash rules of `tool.check`, with `ask` for `DROP`, `TRUNCATE`, and `DELETE` with no `WHERE` run through `psql`, `mysql`, `sqlite3`, `mongosh`, and `redis-cli FLUSHALL`/`FLUSHDB`, for `dropdb`, for `prisma migrate reset`, `rails db:drop`, and for `terraform destroy` and `kubectl delete` of a namespace.
  A `SELECT`, `EXPLAIN`, and `\d` stay `allow`.
- Status: `new`. A `grep` of `slices/guard/` for `sql`, `redis`, `mongo`, `dropdb`, `terraform` found nothing.

### X2: `git add -A` and `git commit -a` sweep the edits of the user

- Source: `03-safety-and-trust-boundaries.md`, I07 Recipe, step 4.
- Quote: "Use `git commit --only <paths>` so parallel sessions don't sweep each other's work."
- Slice: `guard` with `hygiene` (the edit ledger).
- Fix: in `tool.check`, when Bash runs `git add -A`, `git add .`, or `git commit -a`, and the work tree holds a changed file that is not in the ledger of this project, answer `ask` (or `deny` with a reason) that names the ledger paths to stage.
  This uses the shared ledger of the alpha.2 spec, so it needs no model call and no new file.
- Status: `new`. `gate.ts` has no `git add` rule, and the ledger spec only adds a line per changed file at the next turn.

### X3: A subagent that hits its turn limit returns no report

- Source: `04-engineering-delegation-and-cost.md`, I11 field evidence, session logs.
- Quote: "A prose rule in the agent file, meant to keep the last turn for the report, failed in a live run."
- Slice: `agents` (and `prompt` for the text).
- Fix: put `maxTurns` in the frontmatter of `worker`, `scout`, `reviewer`, and `researcher`, and add a `turn.step` handler that tells a subagent two turns before the limit to report now.
  The dossier says a turn-counting hook worked at 15 of 16 turns where the prose rule failed, and that 10 turn-limit notices came from subagents with 116k to 266k tokens and no report.
- Status: `new`. The four agent files have no `maxTurns` (read in `plugins/claudetto/agents/`).

### X4: Subagents change the shared work tree with `git stash` and `pkill`

- Source: `03-safety-and-trust-boundaries.md`, I07 field evidence, session logs.
- Quote: "A subagent's `git stash`/`pop` in the shared checkout restored 81 staged-deleted files (SL 47eff936)."
- Slice: `agents` and `guard`.
- Fix: set `isolation: worktree` in the frontmatter of `worker`, and make the gate `deny` `git stash` (push and pop), `git checkout -- .`, `git reset` of paths, and `pkill -f`/`kill` of a `pgrep` hit when the call comes from a subagent while other sessions share the tree.
  The gate allows `git stash` today, because it asks only for `stash drop` and `stash clear` (`slices/guard/domain/git.ts:99`).
- Status: `new`. The plan has `worktree.baseRef` and the "Worktrees Keep Work" requirement of cleanup, but no isolation and no stash rule.

### X5: The agent guesses facts that code can print

- Source: `01-grounding-and-memory.md`, I01 Recipe, step 1; `07-measurement-and-environment.md`, I18 Recipe, step 4.
- Quote: "Derive the state; don't describe it. A SessionStart (or UserPromptSubmit) hook prints the facts the agent tends to guess:"
- Slice: `prompt` (`prompt.context`), with `spec`.
- Fix: add one short line to `prompt.context` that code builds at session start: the branch, the latest tag, the active `openspec` change, the shell, and `grep` when it is `ugrep` (28 `exceeds complexity limits` errors in 15 sessions, each rediscovered).
  The line has no model call and costs a few tokens, and it replaces the guesses ("`[Unreleased]` in a changelog of an untagged release", GNU flags on macOS).
- Status: `new`. The alpha.2 `prompt-base` spec adds only the plan line.

### X6: Repeat reads and long Bash results fill the context

- Source: `04-engineering-delegation-and-cost.md`, I12 field evidence, session logs.
- Quote: "22 of its 44 file reads were repeats. `/context` warned "Bash results using 70.3k tokens (23%)""
- Slice: `prompt` (tool texts) and a new small handler in `ground` or `prompt`.
- Fix: in `tool.call` for `Read`, keep the path, range, and hash in `$.state` (the ledger hash function already exists), and answer a repeat of an unchanged range with a one-line "unchanged since the read at turn N".
  For Bash output, set the output length env var of Claude Code in the snippet (the name must be checked against the docs) (proposed).
  The `main.md` line "Read each range of lines one time" is prose, and the dossier says prose decays (I02).
- Status: `new`. Check first whether the engine already returns a stub for a repeat read (proposed).

### X7: The snippet sets a 1 hour cache TTL that the dossier measured as a loss

- Source: `04-engineering-delegation-and-cost.md`, I12 session logs; `02-verification-and-honesty.md`, I06 session logs (calibration that held).
- Quote: "a 1h TTL cost +21% for subagents and +7% for the main session (SL b4b2017c)."
- Slice: `setup`.
- Fix: drop `CLAUDE_CODE_PROMPT_CACHE_TTL: "1h"` (`plugins/claudetto/slices/setup/prompts.ts:69`), or keep it for the main session only and set the subagent variant, which the dossier names as `_PROMPT_CACHE_TTL` next to `CLAUDE_CODE_SUBAGENT_MODEL` (from binary strings, so check the docs).
  The same dossier says the 1h setting was dropped later (I06), and that turns more than one hour after the previous one are 1.6% of turns and 80% of cache writes (a Reddit report).
  The user runs sessions of hours, so measure it in a `just sandbox` run (paid, so it needs approval) before the change.
- Status: `new`. The plan does not touch the TTL.

### X8: Subagents stack duplicate `Monitor` calls on one condition

- Source: `07-measurement-and-environment.md`, I17 field evidence, session logs.
- Quote: "subagents stacked several duplicate Monitors on one condition (SL e473653f)."
- Slice: `guard` (the alpha.2 matcher gets `Monitor`).
- Fix: in the same handler that now sees `Monitor`, keep the command text of each live `Monitor` in `$.state`, and `deny` a second call with the same command, with the reason "already watching".
  Add one line to `main.md`: a tool error (`pgrep` failed) means the state is unknown, not "nothing runs" (I17 Recipe, step 2).
- Status: `new`.

### X9: A rejected call is retried in another form

- Source: `06-autonomy-and-consent.md`, I14 Recipe, step 3.
- Quote: "A rejection is terminal for that action."
- Slice: `guard`.
- Fix: keep the hash of the input of each call that a person declined in `$.state`, and answer `deny` with the earlier reason for an identical retry (this needs a mod hook that sees the answer of the person; the dossier lists the `PermissionDenied` hook for the classic surface) (proposed).
- Status: `partly`. `agents/main.md:7` says a denied call means the user declined it, and it says to run a stopped action again only on the same path after its cause is gone, but the dossier shows a background subagent that retried with a reworded comment.

### X10: The agent hands work back that it can do

- Source: `06-autonomy-and-consent.md`, I13 Recipe, step 1.
- Quote: "A step goes to the user only after a failed attempt or a named hard block"
- Slice: `prompt` (`agents/main.md`, section `<verification>`).
- Fix: add one line, "Try the step once before you hand it to the user, and name the block", and one line, "Put the open decisions in one question with a recommendation and a default".
  The dossier calls this among the most frequent user corrections, and it says a cost guess was pessimistic, so a paid-run line should give the number (the plan already does this in `release-evidence`).
- Status: `partly`. `main.md` has "Give a check to the user only when a block stops you" and "Do the agreed work straight through", but no "try once".

### X11: A hook text that does not say who acts is read as an instruction

- Source: `03-safety-and-trust-boundaries.md`, I10 field evidence, session logs.
- Quote: "Text injected by a hook must say who acts."
- Slice: the new `notes` slice, `hygiene`, `handoff`.
- Fix: each text that a hook adds to the context names the actor ("The user changed `a.ts`", "claudetto removed ...").
  The dossier case is a hook that said "Set each one to `false`", after which the model edited its own settings.
  Use `$.ui.log` (the user sees it, the model does not) for any notice whose action belongs to the user.
- Status: `partly`. Goal G7 and the `Notices Report a Change` requirement cover the user side only.

### X12: Secrets can leave through `git add`, `printenv`, and `curl -d @file`

- Source: `swe-worst-practices.md`, W4-1 and W5-8; `swe-best-practices.md`, B5-14.
- Quote: "Printing, logging, committing, or transmitting secrets."
- Slice: `guard`.
- Fix: reuse the secret path list of `slices/guard/domain/paths.ts` to `deny` `git add`/`git commit` of a secret file, `curl`/`wget` with `-d @path`, `--data-binary @path`, or `-F x=@path` of a secret file, and to `ask` for a bare `env`, `printenv`, or `set`.
  This keeps the read deny for `Read(**/.env)` that the snippet has, and it closes the packaging path (`git archive` kept a write-denied `.mcp.json`, I10).
- Status: `new`. `gate.ts` has no `git add`, `printenv`, or upload rule (found by `grep`).

### X13: The sandbox costs more prompts than it saves

- Source: `03-safety-and-trust-boundaries.md`, I10 field evidence, session logs.
- Quote: "`dangerouslyDisableSandbox` calls in 10 sessions."
- Slice: `setup`.
- Fix: keep the sandbox out of the snippet (it has no `sandbox` key today), and let the inventory report `sandbox: on|off`, with one line that says the gate is the layer of claudetto.
  The count of bypass calls is in the bold line of that section and in the table of `08-session-log-corpus.md`.
  When the sandbox is on, setup names the fixes that the dossier found at the root: `bunfig.toml` `env = false`, and one absolute temp path that is the same in and out of the sandbox (I18 Recipe, steps 3 and 4).
- Status: `partly`. The inventory requirement exists, but `sandbox` is not a field of it (`architecture.md`, Data and Interfaces).

### X14: Auto mode classifier denials

- Source: `08-session-log-corpus.md`, Counts across the corpus; `03-safety-and-trust-boundaries.md`, I10.
- Quote: "Auto-mode classifier denials | 24 (14 main, 10 sub)"
- Slice: `setup`.
- Fix: none; the snippet already sets `permissions.disableAutoMode: "disable"` (`slices/setup/prompts.ts`, near the `defaultMode` key).
- Status: `covered` (0.3.0 snippet, and F3 of `sessions.md`).

### X15: An empty `.cc-writes` folder inside a plugin folder breaks a scan

- Source: `07-measurement-and-environment.md`, I18 field evidence, session logs.
- Quote: "Empty `.claude/.cc-writes` folders appeared wherever a shell started. One inside `agents/` made a test fail with EISDIR"
- Slice: `hygiene`.
- Fix: in `session.start`, remove an empty `.cc-writes` folder under the plugin folders `agents/` and `skills/` (an empty folder holds no bytes, so the delete loses nothing), and say so only when it removed one (G7).
  Make the loaders and tests that list folders skip dot-entries (I18 Recipe, step 5).
- Status: `new`. Low impact.

### X16: Delegation needs bounds, not only a roster

- Source: `04-engineering-delegation-and-cost.md`, I11 Recipe, steps 1 to 4; industry practice in I11.
- Quote: "Use a single agent unless the task decomposes into parts that share little context."
- Slice: `prompt`, `agents`.
- Fix: add to the `Delegation by Fit` text: parallel `worker` calls only on disjoint files and each in its own worktree (X4), the acceptance check runs on the merged result, and `reviewer` gets the diff and the plan, not the summary of the worker.
  The orchestrator-plus-subagents design cost about 15 times the tokens in the Anthropic report that the dossier cites, so delegate for context protection and a cheaper model (`scout` is Haiku), not for parallel speed.
  This matters because goal G4 and the goal of fewer tokens pull against each other.
- Status: `partly`. The `agent-roster` spec names the roster and three scenarios, but not these bounds.

### X17: Subagent reports return into a full context

- Source: `01-grounding-and-memory.md`, I03 field evidence, session logs.
- Quote: "two hand-backs of 88k and 103k tokens arrived into a full context (SL 087f5a37)"
- Slice: `agents`.
- Fix: add one line to each agent file: write detail to a file in the temp folder of the session and return the path with at most five lines (proposed).
  `worker.md` and `scout.md` say "Return a short result", but the dossier shows prose limits fail without a measure.
- Status: `partly`.

### X18: Decisions and rejected approaches do not survive a handoff

- Source: `01-grounding-and-memory.md`, I01 Recipe step 2 and I03 Recipe step 2.
- Quote: "without a rationale file, 7 of 10 fresh sessions re-proposed an already-rejected simplification; with the file, 0 of 10 did"
- Slice: `handoff`, `decide`.
- Fix: the `decide` slice sees each `AskUserQuestion` answer, so keep the question and the chosen option in `$.state` and write them into the cold handoff (the one built with no model call), and add "ruled-out approaches" and "decisions and why" to `RULES` for the model-written handoff.
  `RULES` in `slices/handoff/prompts.ts` asks for the task, the done steps, the next step, and exact values, but not for decisions or ruled-out approaches.
- Status: `new`.

### X19: The paid-run arm is not asserted

- Source: `07-measurement-and-environment.md`, I16 Recipe, step 1; field evidence, "Wrong arm".
- Quote: "A relative `--plugin-dir` meant `just sandbox` loaded 0 plugins, so every earlier "sandbox check" had tested vanilla"
- Slice: `release-evidence` (the `just sandbox` and eval recipes).
- Fix: have the recipe read the init event of the stream output and fail the run when the plugin list, the model served, or the sandbox state differs from the spec, and keep the trace of each run.
  The alpha.2 success measures (`/context` at 10k, a note with no extra request, a subagent in each paired run) all rest on the arm being the one that the task names.
- Status: `new`.

### X20: A discrimination check for the paired eval

- Source: `07-measurement-and-environment.md`, I16 Recipe, step 5.
- Quote: "If the baseline arm also scores 1.00, report "case does not separate the arms", never "pass"."
- Slice: `release-evidence`.
- Fix: add the check to the "at least one subagent in each run" measure: a vanilla arm that also starts a subagent means the case tells nothing.
  Also give a sample size next to a verdict (the dossier case recommended shipping after two runs).
- Status: `new`.

### X21: The goal check can block a stop with no cap

- Source: `02-verification-and-honesty.md`, I04 Recipe, step 1.
- Quote: "Use a `stop_hook_active` guard to avoid loops; `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` caps re-blocks"
- Slice: `goal`.
- Fix: in `onStop` (`slices/goal/adapters/mod.ts:49`), count the blocks in `$.state` and let the stop go on after a bound (a value in `slices/goal/limits.ts`), with a `$.ui.log` line that says why.
  The cap name is from binary strings, so check it in the docs (proposed).
- Status: `new`. The ten lines of `onStop` have no counter.

### X22: A verdict from a piped check is a false pass

- Source: `02-verification-and-honesty.md`, I04 Recipe, step 2.
- Quote: "verdicts come from direct exit codes, never from `| grep`/`| tail`"
- Slice: `prompt` (`<verification>`).
- Fix: add one line to `main.md`; the check recipes of the project already exit with a code, so the line is enough.
  `sessions.md` F5 shows `just docker check > /tmp/... 2>&1` in many runs, which is the same pattern.
- Status: `new`. Low impact.

### X23: A reply with no visible text

- Source: `05-appendices-and-limitations.md`, Appendix C, item 3.
- Quote: "Reply text lost into hidden reasoning or tool turns"
- Slice: `reply` or `notes`.
- Fix: in `turn.complete` with reason `answer`, when the visible text is empty, show a note above the prompt, in code (the dossier workaround is a Stop hook that blocks such turns).
- Status: `new`. Low to medium impact.

### X24: Keep the user bounds behind a person's answer

- Source: `06-autonomy-and-consent.md`, I14 Recipe, step 1; `swe-best-practices.md`, B2-10.
- Quote: "Keep a registry of user-owned values."
- Slice: `setup` (project settings), `ground`.
- Fix: the bounds of claudetto already sit in named files (`kernel/budget.ts`, `slices/<s>/limits.ts`, `tools/limits.ts`), so a project-scope `permissions.ask` entry for `Edit(**/limits.ts)` and `Edit(**/budget.ts)` is a settings value with no code.
  Do not ask for every edit of `tests/**` (it breaks G1); ask only when an edit removes an assertion, in `ground`.
- Status: `partly`. `main.md` says "Keep each bound, test, check, config, and hook as it is", which is prose only.

### X25: The agent invents a settings key

- Source: `03-safety-and-trust-boundaries.md`, I08 Recipe, step 3.
- Quote: "Validate config files against a schema, because invented keys otherwise pass silently."
- Slice: `ground`.
- Fix: in `tool.call` for `Write` and `Edit` of a `settings*.json` file, check each top-level key against `schemas/` of the repository and block an unknown key with its name.
- Status: `partly`. Each snippet key has a source row (`settings-levers`), and the snippet has a `$schema`, but an agent edit is not checked. Low impact.

### X26: New dependencies

- Source: `swe-best-practices.md`, B2-11; `03-safety-and-trust-boundaries.md`, I08 Recipe, step 1.
- Quote: "Verify every new dependency exists, is maintained, and is the intended package."
- Slice: `guard`.
- Fix: for `bun add`, `npm install`, `pip install`, and `cargo add`, allow a name that the lockfile or the manifest has, and `ask` for a new name.
  This conflicts with G1 (fewer prompts), and the install runs package scripts that can reach secrets, so make it a switch that is off by default.
- Status: `new`. Low impact for this user.

### X27: Bypass mode and file checkpoints

- Source: `03-safety-and-trust-boundaries.md`, I07 Recipe, steps 3 and 6.
- Quote: "Turn on checkpointing (`fileCheckpointingEnabled`, `/rewind`)."
- Slice: `setup`.
- Fix: add `permissions.disableBypassPermissionsMode: "disable"` next to `disableAutoMode` (the snippet has no `bypass` key), so the gate cannot be skipped by mistake, and add `fileCheckpointingEnabled: true`.
  Check both key names in the docs, and that the gate runs in bypass mode (proposed).
- Status: `new`. Low impact, and a recovery layer lets the gate allow more.

### X28: Instruction decay and the standing contract

- Source: `01-grounding-and-memory.md`, I02 Recipe, steps 1 and 2; `swe-best-practices.md`, B2-2.
- Quote: "Sort each rule. If it can be checked mechanically, make it a hook or linter."
- Slice: `prompt`.
- Fix: keep `main.md` short and move each mechanical rule to the gate or a hook (X1, X2, X8, X12), which also cuts tokens; the plan already tests the token count of each text.
  For a standing "run evals up to X, ask only for pushes" rule, use `CLAUDE.md` or `.claude/rules/`, not a new file.
- Status: `covered` (the `Fresh Session Size` requirement, architecture A6).

### X29: The MCP and skill tool soup

- Source: `swe-best-practices.md`, B3-9; `swe-worst-practices.md`, W3-9.
- Quote: "Large catalogs degrade selection and burn context (50+ MCP tools reported at ~72k tokens)."
- Slice: `setup`.
- Fix: the inventory also counts the calls of each MCP server and user skill in `~/.claude/projects/*/*.jsonl`, in code, and lists servers with no call in the last sessions as the first candidates to turn off.
  The research session did this count with a subagent (`sessions.md`, Method), which code can do for free.
- Status: `partly`. The plan lists the servers (A6, and the `Inventory` requirement), but it does not count their use.

### X30: No model call for a check that code can run

- Source: `swe-best-practices.md`, B3-2; `02-verification-and-honesty.md`, I06 session logs.
- Quote: "Deterministic code for deterministic steps."
- Slice: `notes`, `reply`, all.
- Fix: do not copy the dossier fix of a Stop `prompt` hook that blocks replies which open with agreement (it is a model call at each stop); the output style `claudetto:Concise` and the pushback rules of `main.md` (lines 43 to 45) are the surface, and a `turn.complete` rule costs 0 tokens, but the dossier I15 warns that a wording regex punishes good output.
- Status: `covered` for the plan (A3 and the constraint "The `notes` slice makes no model request"). I did not read the output style text, so the check of the opener is `partly` (proposed).

### X31: Other themes that the plan already covers

- Source: `00-INDEX.md`, summary table; `swe-best-practices.md`, B3-3, B3-19, B3-20.
- Quote: "Graduated autonomy: read-only → propose → act-with-approval → act-on-low-risk."
- Slice: `guard`, `handoff`, `goal`, `hygiene`.
- Fix: none. The dossier levers that the 0.3.0 code and the alpha.2 plan have: the handoff on `session.compact` and `turn.step` (I03), the cold handoff from state with no model call (`slices/handoff/prompts.ts`, `COLD`), the `/goal` Stop gate (I04), the edit ledger with the agent name (I07, B4-11), the gate log in `$TMPDIR/claudetto/gate/` (B4-11), `ground` on `tool.call` and not on a classic hook (I18: a classic `PreToolUse` never ran for an `Edit` whose `old_string` failed), the delete rule by recoverability (I07), and the `main.md` rule "Treat only the changes from your own calls as yours".
- Status: `covered`.

## Permission Classes

The gate of claudetto (alpha.1 code) has: OS and disk (`mkfs`, `dd` to a device, `diskutil erase`, `csrutil`), root and system paths, delete by recoverability, local `git` loss, remote `git` rewrite, and secret paths.
This list comes from the dossier safety files (`03`, `06`, `07`) and the two claude.ai files, and it marks what the gate lacks.

### Truly dangerous: ask or deny

- OS install destruction.
  `rm -rf /`, `~`, and `$HOME` (the replay found `rm -rf` attempted 117 times, I07), a machine-wide `sudo` change from an inference (I06), a `mktemp` failure that leaves `$d` empty so `cd $d && bash scaffold.sh` runs in `$HOME` (I17), and `find /` scans (waste, not loss).
  The gate has these (`DENY_ROOT`, `DENY_DISK`, `DENY_SYSTEM_WRITE`), except the empty-variable case, which needs `ask` for a delete or `cd` whose target is a variable that can be empty (new).
- Database loss.
  Dropping or recreating a live table or database when data looks empty (W5-5), the Replit case with production credentials (W4-4, B4-5), a one-step `DROP COLUMN` migration (W1-4), and a migration or schema change (B2-7, B4-6).
  The gate has no class (X1).
- Git loss.
  `reset --hard`, `checkout --`, `restore`, `clean -f`, `stash drop` and `clear`, force push, `push --delete`, and a history rewrite (all in the gate), plus the ones that it lacks: `git stash` and `pop` in a shared tree (81 files restored, I07), `git add -A` that sweeps the edits of the user (X2), and `git archive` that copies a write-denied file (I10).
- Secrets.
  Read, print, log, commit, or send a secret (B5-14, W5-8), a `.env` read, credential exploration (a classifier reason), and the lethal trifecta of private data, untrusted content, and an outbound channel (W4-1).
  The gate has the read deny, and it lacks the commit, print, and upload paths (X12).
- Other harm that no undo repairs.
  `terraform destroy` on production (I07), a publish, an external send, a payment (B4-6), `kill` or `pkill -f` of the process of another session (I07, I17), and a script that a person must read first (`eval`, an unread script, a piped delete list).
  The gate asks for the last group (`ASK_HIDDEN`, `ASK_SCRIPT`, `ASK_DELETE_PIPED`).

### False alarms: run with no prompt

- A delete in the temp folder, such as `rm -rf /tmp/ccd` (16 of 17 denials in `sessions.md`, F1).
  The dossier adds a caution: a temp exemption that a subagent added turned a hook off for every project under `/tmp` (I14), so the allow must match the exact temp folders (the alpha.2 "One Temp Folder" requirement).
- A read of the temp folder and a read-only MCP call (F2), and a `Monitor` that only reads a log.
- Classifier reasons that blocked work with no loss in the dossier: `Safety Bypass Flag` (5), `Credential Exploration` (4), `Create Unsafe Agents` (3), `Tmux Self Drive` (2), `Interfere With Workloads`, and one denial that carried over to a read-only `ls`.
  The 0.3.0 snippet already turns auto mode off, so these do not return.
- Sandbox errors (EPERM) from the tools, not from an attack: Bun reading `.env`, the pnpm store, `mktemp`, SSH commit signing, and the SwiftPM cache (the count of sandbox bypasses is in I10 and in the table of `08-session-log-corpus.md`).
- The injection detector on a benign report that quotes docs (4 cases, I10), and over-refusal of benign text such as a recipe or a game with weapon words (I10).
- A guardrail benchmark with 0 boundary crossings in both arms, where the only refusal of the hook was a false positive (I07 counter-evidence).
- A failing `pgrep` or `ps` (a tool error, which means "unknown", not "stop"; I17).
- Build, test, `git status`, `git diff | grep`, a delete of a build folder (the `permission-gate` spec of 0.3.0), and `git branch -D` (the reflog keeps the commits, per the same spec).
