# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.

## [2.1.319] - 2026-11-07

### Added

- Every tool result passes through betterleaks, the one secret matcher, and each handoff is checked before it is written or read back. A missing `betterleaks` stops each tool result with an error that names `brew install betterleaks`.
- The gate uses a pinned community list of dangerous commands in place of claudetto's own lists.
- The gate denies package and build tools that the repo does not use (for example `npm install` in a Bun repo, or `cmake` in an Xmake repo), and denies writing or printing a file through `Bash` where `Write` or `Read` fits.
- A `Bash` line that ends in `; cat <file>` runs the rest, then reads the file with `Read` in the same call instead of being denied.
- The gate asks before it recreates a file that the session saw and did not remove.
- `/claudetto:setup` writes one `sandbox` block that turns on Claude Code's sandbox: writes only to the project, the temp folder, and the tool caches, cloud-credential reads denied, and no retry outside the sandbox.
- `/claudetto:setup` adds `DISABLE_TELEMETRY=1` to `env` and denies eight tools that claudetto does not use, such as `Workflow`, `CronCreate`, and `EnterPlanMode`.
- Setup saves a hash of each rule file it copies, and the next start logs which copies were updated or modified.
- The gate denies `pkill`, `killall`, and `kill <pid>` of a pid that no earlier result of the session shows a background command of its own printed. `kill -0`, `kill -l`, `kill %1`, and `kill $!` pass.
- The gate denies `rm` under a `/tmp` folder without this session's `.created-by-claudetto` marker, `git worktree remove` of a worktree the session did not add, and a forced `git branch` delete of a branch it did not make.
- An agent removes a marked `/tmp` folder, force-deletes a branch, or removes a worktree that its session or worker made, and kills a pid it started, with no prompt.
- Read-only commands (`ls`, `grep`, `git status`/`diff`/`log`) and project test runs (`bun test`, `npm test`) run with no prompt when no rule or setting of yours asks for them; a wrapper, a file redirect, or a network tool still prompts.
- The gate denies running a released Claude Code program (a path under `claude/versions/`) to read it, and names the cc-inspect `code` tool. `claude --help` on the installed command stays allowed.
- The Stop grader also blocks a reply that confesses, apologizes for, or narrates its own conduct ("my mistake", "I should not have") in place of the fact.
- A Stop grader reads the final reply and blocks once when it names an unchecked claim, a broken rule, credit to the user for what they did not say, an unfiled defect, a fallback, something the session did not see, unexplained jargon, or a reply that ends on a next step it has not taken.
- A Stop that leaves files the session wrote uncommitted is blocked once with a request to commit them.
- A reply or subagent report that names a file in a `! <command>` step is blocked when the file does not exist.
- Limits you set in chat are kept, shown on each prompt, kept through compaction, and enforced. A "stop asking" limit denies both ask tools.
- A remark or question is answered before the next tool runs, and a question waits for a read of the newest `ISSUES*.md`.
- A session is told which files it changed and which the user or another tool changed.
- The agents `Artemis`, `Metis`, and `Heracles` replace the built-in `Explore`, `Plan`, and `general-purpose`.
- `Monitor` and `AskUserQuestion` are served by claudetto's own deferred tools (`monitor`, `ask-user-question`), and `ask-user-question` accepts `multiSelect`.
- A subagent status line ships in the plugin's `settings.json`.
- Notifications are on by default: one fires when an unattended session stops on a failure.
- `/goal` is set again after a handoff clears the session.
- When claudetto's plugin code is not running, a typed `/claudetto:setup` is blocked before Claude sees it, with a reason that says to restart Claude Code or reinstall claudetto.
- `claudetto-openspec`, a plugin of its own, replaces `@fission-ai/openspec` with one deferred `openspec` tool and skills for apply, explore, propose, update, verify, and archive.

### Changed

- claudetto and `claudetto-you-should-know` are rebuilt from scratch as one hooks module each, with fewer modules and the same observable results.
- `/claudetto:setup` is the only setup; the command-line setup is gone, and setup no longer runs `openspec init`.
- The handover and the handoff writer are one, and a handoff carries every standing instruction and decision you stated, not only the last 12 turns.
- A resume no longer injects a handoff older than the resumed transcript.
- The Stop open-items check has an off switch and accepts only blockers the hook can verify.
- A question the reply leaves to you goes to the `AskUserQuestion` popup, and a command only you can run is a `- [ ] ! <command>` item under one "What I Need from You" heading. A Stop reply that types a question as an item, or a command outside that form, is blocked.
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
