# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.

## [Unreleased]

### Added

- One Decider answers each typed question the hooks ask. With `TYPESAFE_API_KEY` set, Jev (`jev-1.14.0`) answers first; `claude-haiku-5-5` at `high` effort answers when there is no key, when Jev fails or refuses the key, and for a ledger question Jev leaves unsettled. A `yes` from Haiku counts only with evidence that is words of the text it was given.
- Below `memoryFreeMinPercent` of free memory (default 20, `0` turns it off), a new `Bash` or `Monitor` command or subagent is refused until the agent's own runs end, because many lint runs at once froze the machine.
- The `openspec` change check warns when a MODIFIED requirement grows from under 500 characters to over 500, so a change that validates no longer turns a main spec invalid at its archive.
- A subagent that runs past `agentMaxMinutes` (default 15) has each further tool call refused and is told to report and end; `0` turns the limit off.
- The gate denies a test, lint, type, or build check piped into `tail`, `head`, `grep`, or `rg`, and a `git commit` or `git push` that runs after a pipe, unless an earlier `set -o pipefail` keeps the exit code, because a pipe returns its last command's exit code and a failing check would read as a pass.
- The gate denies `bun fmt` with no path or with `.`, and `prettier` or `biome` with `--write` over the whole repository, because these rewrite files outside the task. `bun fmt` with paths, `--check`, `--staged`, `--changed`, or `--stdin-filepath` still runs.
- Each session caps Go's heap with `GOMEMLIMIT` at a quarter of memory, unless you set it yourself, so type-aware `oxlint` (tsgolint) no longer climbs to 16 GB.
- The Stop grader flags a reply that leaves doable work to the user: a check on part of a set, an untested guess, or a run named as the next step.
- `/reply` quotes your mouse selection, or paragraph N of the last reply (`/reply N`), into the prompt as a `Re:` block.
- Each finished subagent run is logged to `.claude/claudetto/runs.jsonl`, with whether the root agent edited the same files within its next 3 turns.
- The root agent gives each edit task the command that checks it, and runs that command when the report arrives, before it builds on it.
- The injected rules say a removal deletes the feature's code, tests, and docs, adds no test that it stays gone, and keeps no compatibility path before 1.0.0.
- The `openspec` tool validates the main specs with no change open, and adds `init`, `new`, `list`, and the status graph.
- `/claudetto:setup` writes a `Read` deny to `permissions.deny` for each protected path, so the start notice stays silent after setup.
- The gate denies a branch switch that would rewrite a sandbox-protected file.
- Each `/claudetto:setup` question ends with Haiku's recommended option and why, and lists that option first. Secrets are redacted before Haiku sees the question, and when Haiku is unsure or fails, the question shows unchanged.
- The gate denies a linter's unsafe fixes (`--fix-suggestions`, `--fix-dangerously`, `--unsafe`, `--unsafe-fixes` of `oxlint`, `biome`, `ruff`); the safe `--fix` still runs.
- `/claudetto:setup` sets `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` to `1`, so a subagent has no `Agent` tool and cannot start an agent of its own.
- The Stop grader flags, in an interactive session, a choice asked in plain text in place of the popup.
- The gate sends a file read piped into a program that only shows it, such as `cat a.ts | head` or `cat a.ts | sed -n '1,5p'`, to `Read`. A read piped into a program that works on it, such as `wc`, still runs.
- The Stop check blocks a final reply that opens by agreeing with the user, such as "You're right" or "Good catch", and asks for the fact the check decided.
- The Stop grader flags a reply that leaves a step undone because a call was refused when the refusal named a change to the call, such as a command form or a flag. The agent changes the call as the reason says and sends it again. An action a denial declined stays declined.
- The Stop grader flags a reply that ends on a list of open items the agent could still do, or on an action it says waits for your approval without asking for it in the popup. The agent does the item, or asks in the popup and then does it.
- `claudetto-you-should-know` keeps your last 3 messages that a burst of tool calls pushed out of its 8-entry log, and no longer notes an action you asked for. Before, a run of tool calls dropped your request, and the side agent warned about the push you had asked for.
- Hygiene runs `mo clean` at each session start, with no terminal on stdin, so Mole clears user caches without a prompt and skips the caches that need `sudo`.

### Changed

- **Breaking:** claudetto reads the TypeSafe key only from `TYPESAFE_API_KEY`, in the shell that launches Claude Code or in the `env` block of the settings. The `typesafeApiKey` option is gone, so an install that set it must set the variable. A project `.env` file is not read.
- **Breaking:** with a key, the constraint ledger and the branch gate send your messages to `api.typesafe.ai`, redacted by the secret scan first. Before, only the `decide` tool reached that host. Without a key, no request reaches it.
- **Breaking:** the popup is Claude Code's own `AskUserQuestion` again, with its description cut to one sentence. Auto mode reads a popup answer only from that tool, so an action you approved in claudetto's popup, such as a merge, was judged as if nobody had asked for it. The tool `mcp__claudetto__ask-user-question` is gone.
- **Breaking:** the monitor is Claude Code's own `Monitor` again, with its description cut from 6,354 characters to under 200. The wrapper `mcp__claudetto__monitor` did nothing the built-in tool does not, and it cost a registration, a denial of the built-in call, and a rewrite of each `ToolSearch` result. The tool `mcp__claudetto__monitor` is gone.
- `ToolSearch`, `EnterPlanMode`, and `ExitPlanMode` each carry a description of at most 200 characters in place of the stock one, which is 953 characters for `ToolSearch`.
- **Breaking:** each plugin runs its guards in one `tool.check` hook and one `tool.call` hook. A guard that throws in `tool.check` asks you, and one that throws in `tool.call` refuses the call. Before, 2 of the 25 gating hooks caught a fault, and a guard that threw without a `.catch` let the call through.
- The constraint ledger asks the Decider about each sentence of your message, and each entry is one of your sentences, word for word. Before, Haiku wrote the whole ledger with a quote per entry. A message of more than 41 sentences is read by its first 20 and its last 21. The first prompt after a resume reads your earlier messages too.
- The branch gate asks the Decider whether you told the agent to delete the branch, in place of three regular expressions. Only a `yes` allows the delete; a `no`, an unsettled answer, and a Decider that fails all leave the gate asking you.
- Every caught fault is logged with its cause. The `catch` sites that bind no error fell from 64 of 92 to 1 of 90, and the caller of the one that stays logs it (`rg -U --count-matches --no-filename -g '*.ts' -g '!*.test.ts' -g '!*.mock.ts' -g '!*.spec.ts' 'catch \{|\.catch\(\s*(async\s*)?\(\s*\)' plugins/*/hooks`, summed).
- The clone gate passes: 19 clones with 2 new ones (193 of 43,099 lines, 0.45%) became 17 with none new (179 of 46,067 lines, 0.39%) (`just clones`).
- The source of `plugins/claudetto/hooks` grew from 9,985 to 10,947 lines, with 542 of them in `hooks/decider/` (`find plugins/claudetto/hooks -name '*.ts' ! -name '*.test.ts' ! -name '*.mock.ts' ! -name '*.spec.ts' ! -path '*rules.generated*' -print0 | xargs -0 cat | wc -l`).
- The installed `claudetto-openspec` plugin shrank from 2,394,380 to 108,922 bytes, because its Bun-run specs and fixtures moved to `tests/`.
- Every description the model sees fits 200 characters, where 18 of 59 did not, and every model call names its model, its effort, and its `maxTokens`.
- The session-start hook adds its lines to the env file once. Before, each start added a copy, and every `Bash` command ran them all.
- `claudetto-you-should-know` checks before each main-loop tool call that can change something, in place of every sixth step. The call waits for the check. When the check has a note, the call is stopped, and the agent brings the note to you before it acts. Reads, searches, and questions to you run with no check.
- Three prompt wordings no longer prime the wrong move: the Concise style says to call a reply wrong only when the check shows it, and to ask through the popup only for what the user alone holds, and the unchecked-claim block calls the user's statement a claim to check.
- `/claudetto:setup` writes the sandbox as a deny list: writes allowed across the home folder, `/Volumes/`, and `/private/tmp`, with the files that run later write-denied; Keychains and cloud credentials read-denied; `allowMachLookup` `["*"]` and `enableWeakerNetworkIsolation`, so `gh` and other Go tools verify TLS certificates; localhost ports open to bind; and `ps`, `top`, `sysctl`, and `launchctl list` run outside the sandbox. The per-tool cache entries are gone. Any other command the sandbox blocks, such as `claude -p` reading its login from the Keychain, can retry outside the sandbox. Auto mode's classifier or your approval decides each retry, so the agent runs the command itself and no longer hands it to you.
- The root prompt casts the agent as an expert junior software engineer working in your repository, and has it report a defect it caused as a third-person bug report rather than an admission.
- The rule modules that `scripts/vendor-rules.ts` generates pass through `bun fmt` before they are written, so each one stays within the 300-line lint limit after formatting and is unchanged by the format check.
- The root prompt has the agent weigh a disputed claim as a third party's claim before it checks it.
- The root prompt drops "the" where the reader already knows the referent, in the style of instruction labels. It shrinks from 5,205 to 5,041 bytes.
- The plugin manifests no longer pin a `version`, so `claude plugin update` and auto-update pick up each commit on `main`. The pinned `2.1.319` had kept installs on their cached copy. The release tags each plugin with the version in `package.json`.
- The subagent cache TTL is set once, in `subagentPromptCacheTtl`, in place of `cacheTtl` in each agent file.
- The status line measures context against the compaction window, paints with the Claude Code theme's colours, and flows its items into up to four rows.
- The constraint ledger lifts a constraint when the person allows it.
- Each question for the user goes through the popup only.
- A handoff dates its git state, and the read-back checks it again.
- The gate asks before it deletes a branch the session did not make, and allows one the person asked to delete.
- The root prompt drops an act the user says nobody asked for, and finds a credential's name in the repo's `.env` files before it asks; the Concise style says only what to write: a correction opens with the corrected fact, and each sentence of a reply carries a fact, a result, or a step the person has not yet seen; the Stop note on background tasks says to follow a waited-on task with the monitor.
- The plugins move to the `xsyetopz` marketplace, which lists every xsyetopz plugin: add it with `/plugin marketplace add xsyetopz/bedrock` and install `claudetto@xsyetopz`. This repo no longer ships its own `claudetto` marketplace; the status line finds claudetto under `plugins/cache/xsyetopz/`.

### Fixed

- The Stop hook no longer counts a finding bullet that mentions a `! <command>` step as a second `- ! <command>` bullet; only a bullet that opens with the `!` step counts.
- A `while` or `until` loop whose body runs only `:` or `true`, such as `until grep -q x f; do :; done`, is denied in the foreground and in the background, because it holds a CPU core while it waits. The denial names the form to send: a `sleep` in the body and a time limit.
- A command whose program is `[` or `[[`, such as `[ -f x ] && echo y` or `if [ -d node_modules ]; then …; fi`, no longer gets "The gate cannot read this command, so a person must approve it."
- A search pattern that starts with `/\`, as in `grep -v "/\.git/"`, no longer opens a "The gate failed" permission dialog, and the same pattern in a `! <command>` step no longer makes the Stop hook drop its checks.
- The secret scan reads each string of a structured tool result as raw text, so a secret after a line break inside a result object is redacted.
- The claim check counts a popup answer as the person's words.
- Hygiene finds old build folders in other checkouts again: it walks each folder in Mole's `purge_paths` besides the project, and never enters `~/.claude/projects` or `~/.claude/plugins`. Before, it walked only the project, whose own checkout always stays, so it found nothing outside a nested checkout.
- The `Bash` tool text names `cat`, `head`, `tail`, `sed`, `awk`, and `echo` as commands not to read or change a file with, as the stock text does, so the agent stops sending reads the gate refuses.
- When the gate itself fails, it asks with the failure text and no longer runs the hooks beneath it.
- The temp-folder gate treats the sandbox `TMPDIR`, `/tmp/claude-<uid>`, as a temp base, so a folder made there gets its marker, and it expands a variable set earlier in the command in the path it made.
- The worktree gate lets an agent remove a worktree it added through a variable set earlier in the same command, such as `M=$TMPDIR/w && git worktree add $M`.
- The run limits count only file-tool writes that ran.
- The gate sends a file read to `Read` anywhere in a chain, such as `cd src && sed -n '1,5p' a.ts`; a read piped into another command still runs. It names the file in place of a `head -n` count or a `sed` script.
- The gate denies an in-place edit written as `sed --in-place`, run by `find -exec` or `-execdir`, or run behind `xargs`.
- No claudetto hook changes a tool call input any more, so auto mode keeps its review of the other calls in the response: `Agent` denies an off-form call with the form to send, and a `ToolSearch` query and its result pass as they came.
- The `autoMode` lists that `/claudetto:setup` writes define the trusted repo and its source control again, which the replaced list had dropped. They add two soft rules, `Write Outside the Trusted Repo` and a closing `Any Other Danger`, so a block has a rule to cite. Claude Code shows the cited rule in the denial, as in `Auto mode: [Write Outside the Trusted Repo]`. Before, a push to another of your repos fit no rule and came back with "it gave no explanation". Naming the repository in your message clears that rule. Run `/claudetto:setup` again to write the new lists.

### Removed

- The `typesafeApiKey` option, in favor of the `TYPESAFE_API_KEY` variable.
- The tool `mcp__claudetto__ask-user-question`, in favor of the built-in `AskUserQuestion`.
- The tool `mcp__claudetto__monitor`, in favor of the built-in `Monitor`.
- **Breaking:** the answer-first gate, which denied the first tool call after a message it read as a remark or a question. It denied work you had asked for, as after "Now it's active". No tool call is held for an answer any more, and the ledger no longer classes each message as a task, question, remark, or dispute.
- The ledger's Haiku extraction prompt, its parser, and its quote check, which the Decider's per-sentence read replaces.
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
