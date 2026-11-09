# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.

## [Unreleased]

### Added

- `/reply` quotes your mouse selection, or paragraph N of the last reply (`/reply N`), into the prompt as a `Re:` block.
- Each finished subagent run is logged to `.claude/claudetto/runs.jsonl`, with whether the root agent edited the same files within its next 3 turns.
- The root agent gives each edit task the command that checks it, and runs that command when the report arrives, before it builds on it.
- The injected rules say a removal deletes the feature's code, tests, and docs, adds no test that it stays gone, and keeps no compatibility path before 1.0.0.
- The `openspec` tool validates the main specs with no change open, and adds `init`, `new`, `list`, and the status graph.
- `/claudetto:setup` writes a `Read` deny to `permissions.deny` for each protected path, so the start notice stays silent after setup.
- The gate denies a branch switch that would rewrite a sandbox-protected file.
- Each `/claudetto:setup` question ends with Haiku's recommended option and why, and lists that option first. Secrets are redacted before Haiku sees the question, and when Haiku is unsure or fails, the question shows unchanged.
- The gate denies a linter's unsafe fixes (`--fix-suggestions`, `--fix-dangerously`, `--unsafe`, `--unsafe-fixes` of `oxlint`, `biome`, `ruff`); the safe `--fix` still runs.
- A subagent or teammate cannot start an agent of its own.
- The Stop grader flags padding (apology, agreement, thanks, an account of the agent's own obedience, offers, restating what the user ran or said) and, in an interactive session, a choice asked in plain text in place of the popup.

### Changed

- Four prompt wordings no longer prime the wrong move: the Concise style says to call a reply wrong only when the check shows it, and to ask through the popup only for what the user alone holds, the answer-first denial asks the model to say what it did not check, and the unchecked-claim block calls the user's statement a claim to check.
- `/claudetto:setup` writes the sandbox as a deny list: writes allowed across the home folder, `/Volumes/`, and `/private/tmp`, with the files that run later write-denied; Keychains and cloud credentials read-denied; `allowMachLookup` `["*"]`; localhost ports open to bind; and `ps`, `top`, `sysctl`, and `launchctl list` run outside the sandbox. The per-tool cache entries are gone.
- The subagent cache TTL is set once, in `subagentPromptCacheTtl`, in place of `cacheTtl` in each agent file.
- The status line measures context against the compaction window, paints with the Claude Code theme's colours, and flows its items into up to four rows.
- The constraint ledger keeps a constraint only with the person's quoted words, and lifts it when the person allows it.
- Each question for the user goes through the popup only.
- A handoff dates its git state, and the read-back checks it again.
- The gate asks before it deletes a branch the session did not make, and allows one the person asked to delete.
- The root prompt drops an act the user says nobody asked for, and finds a credential's name in the repo's `.env` files before it asks; the Concise style corrects without agreeing and does not restate what the user ran or said; the Stop note on background tasks says to follow a waited-on task with the monitor.

### Fixed

- The claim check counts a popup answer as the person's words.
- The `Bash` tool text names `cat`, `head`, `tail`, `sed`, `awk`, and `echo` as commands not to read or change a file with, as the stock text does, so the agent stops sending reads the gate refuses.
- When the gate itself fails, it asks with the failure text and no longer runs the hooks beneath it.
- The temp-folder gate treats the sandbox `TMPDIR`, `/tmp/claude-<uid>`, as a temp base, so a folder made there gets its marker, and it expands a variable set earlier in the command in the path it made.
- The worktree gate lets an agent remove a worktree it added through a variable set earlier in the same command, such as `M=$TMPDIR/w && git worktree add $M`.
- The run limits count only file-tool writes that ran.
- The gate sends only a lone file read to `Read`, and names the file in place of a `head -n` count or a `sed` script.
- A remark that an earlier request covers counts as a task.
- No claudetto hook changes a tool call input any more, so auto mode keeps its review of the other calls in the response: `Agent` denies an off-form call with the form to send, and `ToolSearch` rewrites only its result.

### Removed

- The Stop grader no longer blocks a reply for leaving a choice in prose, unexplained jargon, a remark on its own conduct, or ending on a promised step. It still grades unchecked claims, recited rules, misplaced credit, fallbacks, unseen tool output, and unfixed failed commands.
- The `fold` hook is gone, so grouped tool results keep Claude Code's own fold.

## [2.1.319] - 2026-11-07

### Added

- Every tool result passes through betterleaks, the one secret matcher, and each handoff is checked before it is written or read back. A missing `betterleaks` stops each tool result with an error that names `brew install betterleaks`.
- The gate uses a pinned community list of dangerous commands in place of claudetto's own lists.
- The gate denies package and build tools that the repo does not use (for example `npm install` in a Bun repo, or `cmake` in an Xmake repo), and denies writing or printing a file through `Bash` where `Write` or `Read` fits.
- A `Bash` line that ends in `; cat <file>` runs the rest, then reads the file with `Read` in the same call instead of being denied.
- The gate asks before it recreates a file that the session saw and did not remove.
- The gate logs each ask and deny it returns to `~/.claude/claudetto/gate-asks/<session id>.jsonl`, one JSON line of time, tool, decision, project root, rule, and command, with secrets redacted and each text cut to 200 characters.
- `/claudetto:setup` writes one `sandbox` block that turns on Claude Code's sandbox: writes only to the project, the temp folder, and the tool caches, cloud-credential reads denied, and no retry outside the sandbox.
- `/claudetto:setup` adds `DISABLE_TELEMETRY=1` to `env` and denies eight tools that claudetto does not use, such as `Workflow`, `CronCreate`, and `EnterPlanMode`.
- Setup saves a hash of each rule file it copies, and the next start logs which copies were updated or modified.
- The gate denies `pkill`, `killall`, and `kill <pid>` of a pid that no earlier result of the session shows a background command of its own printed. `kill -0`, `kill -l`, `kill %1`, and `kill $!` pass.
- The gate denies `rm` under a `/tmp` folder without this session's `.created-by-claudetto` marker, `git worktree remove` of a worktree the session did not add, and a forced `git branch` delete of a branch it did not make.
- An agent removes a marked `/tmp` folder, force-deletes a branch, or removes a worktree that its session or worker made, and kills a pid it started, with no prompt.
- An agent moves (`git branch -f`, `git update-ref`) or deletes (`git update-ref -d`) a branch that its session or worker made with no prompt; on any other branch the gate still asks. A `git reset` to another commit still asks.
- Read-only commands (`ls`, `grep`, `git status`/`diff`/`log`) run with no prompt when no rule or setting of yours asks for them; a wrapper, a file redirect, or a network tool still prompts. A test run (`bun test`, `npm test`) runs whatever its test files hold, so it prompts unless Claude Code's sandbox is on.
- The gate denies running a released Claude Code program (a path under `claude/versions/`) to read it, and names the cc-inspect `code` tool. `claude --help` on the installed command stays allowed.
- The Stop grader also blocks a reply that confesses, apologizes for, or narrates its own conduct ("my mistake", "I should not have") in place of the fact.
- A Stop grader reads the final reply and blocks once when it names an unchecked claim, a broken rule, credit to the user for what they did not say, a fallback, something the session did not see, unexplained jargon, or a reply that ends on a next step it has not taken.
- A Stop that leaves files the session wrote uncommitted, notebooks included, is blocked once with a request to commit them.
- A reply or subagent report that names a file in a `! <command>` step is blocked when the file does not exist.
- Limits you set in chat are kept, shown on each prompt, kept through compaction, and enforced. A "stop asking" limit denies both ask tools.
- A remark or question is answered before the next tool runs.
- A session is told which files it changed and which the user or another tool changed.
- The agents `Artemis`, `Metis`, and `Heracles` replace the built-in `Explore`, `Plan`, and `general-purpose`.
- `Monitor` and `AskUserQuestion` are served by claudetto's own deferred tools (`monitor`, `ask-user-question`), and `ask-user-question` accepts `multiSelect`.
- A subagent status line ships in the plugin's `settings.json`.
- Notifications are on by default: one fires when an unattended session stops on a failure.
- `/goal` is set again after a handoff clears the session.
- When claudetto's plugin code is not running, a typed `/claudetto:setup` is blocked before Claude sees it, with a reason that says to restart Claude Code or reinstall claudetto.
- `/claudetto:setup` requires Mole (`mo`) for cache and build-folder cleanup and adds the project root to its `purge_paths`; a session start on a volume over 80% full shows the free space and offers `! mo clean --dry-run` and `! mo purge --dry-run`.
- Hygiene at session start removes old build folders that Mole misses, from rules in `hooks/hygiene/trash.toml` (gitleaks config schema; a project overrides it with `.claude/claudetto/trash.toml`), only in another checkout whose files and git index are older than `trashCleanupPeriodDays` and that no process uses, and removes `/tmp` folders whose marker names an ended session.
- Claude's `Bash` commands run at nice 10, and `CARGO_BUILD_JOBS` and `GOMAXPROCS` keep one core free unless you set them.
- When an agent or worker finishes, it removes the `/tmp` folders it marked, its clean worktrees, and its merged branches, and its reply names each worktree or branch that still holds work. The gate denies a `mkdir`, `mktemp`, or file write that makes a new `/tmp` folder without the `.created-by-claudetto` marker, also when the path is relative after `cd /tmp`.
- A finished agent whose own background shell or monitor still runs, and whose reply does not name it, is told to stop it with `TaskStop`, so no task outlives the reply and wakes the session later.
- The gate denies a background `while` or `until` loop that sleeps with no `timeout` and no `$SECONDS` limit, since one that waits for a result that never comes polls forever.
- `claudetto-openspec`, a plugin of its own, replaces `@fission-ai/openspec` with one deferred `openspec` tool and skills for apply, explore, propose, update, verify, and archive.

### Changed

- claudetto and `claudetto-you-should-know` are rebuilt from scratch as one hooks module each, with fewer modules and the same observable results.
- `/claudetto:setup` is the only setup; the command-line setup is gone, and setup no longer runs `openspec init`.
- The handover and the handoff writer are one, and a handoff carries every standing instruction and decision you stated, not only the last 12 turns.
- A resume no longer injects a handoff older than the resumed transcript.
- The Stop open-items check has an off switch and accepts only blockers the hook can verify.
- A question the reply leaves to you goes to the `mcp__claudetto__ask-user-question` popup, and a command only you can run is a plain `- ! <command>` bullet under one "What I Need From You" heading, one per reply. A Stop reply that types a question as a checkbox item, puts a command outside that form (in a checkbox included), or lists two or more command bullets is blocked.
- Tools are deferred only when the session has `ToolSearch`, so a `--tools` list without it keeps the prompt cache from the second request on.
- `Artemis`, `Metis`, and `Heracles` ask for a one-hour prompt cache.
- The stall rule ends the turn at the first Stop block after a stretch with no file change, so a `/goal` pauses after one check.
- The identical-failure and heavy-context refusals moved from the gate to `run-limits`.
- The built-in auto-mode classifier with the `autoMode` lists that setup writes replaces claudetto's own classifier.
- `/statusline` with no text writes claudetto's status line without a model call.
- The tool texts of 12 built-in tools and of `ListAgents` and `Agent` are shorter, and `Read`, `Write`, and `Skill` load on demand.
- The `Concise` output style and the agent texts ask for plain replies and short agent messages, with no greeting, thanks, or filler.
- A group of tool calls shows each call on its own row, in place of the collapsed "Ran N shell commands" row.

### Removed

- claudetto's own sandbox, its proxy, and the `sandboxConfig` option are gone, because the two sandboxes cannot nest.
- The env-file `Read` hook and the `.env` value rules are gone, because betterleaks covers them.
- 18 prompt commands and 27 local commands that claudetto does not use are turned off, and the built-in agents are withheld.
- The window rows and their reports, the cheap-summary option, and the own classifier's rules are removed.

### Fixed

- A denial that gave no reason is not retried.
- A denied tool call no longer counts as a look at the evidence in the Stop grader.
- The cleanup of `/tmp` folders lists only folders this session created and marked.
- The ignore text of setup says the paths narrow `Grep` and not `Glob`.
- Setup dialogs no longer draw a broken `�` character.
