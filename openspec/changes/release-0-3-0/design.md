# Design

## Context

- The status line render is pure: `statusOf` in `plugins/claudetto/src/statusline/main.ts` takes the stdin text, the env, and the clock. `src/statusline/__tests__/silent.spec.ts` fails on `Bun.file`, `Bun.spawn`, `fetch`, and `node:fs` in any statusline source.
- `newestHandoff` in `plugins/claudetto/src/blocks/handoff/read-back.ts` accepts only `handoff-YYYY-MM-DDTHH-MM-SS.md`. `wroteOwn` in `handoff.ts` skips the code-built file when Claude wrote any path under the handoff folder, so a misnamed Claude file is never read back, and the next session injects an older file.
- `agents/main.md` is 3,614 bytes with frontmatter, and its budget was 3,678 characters as the request carried it, which was not reproduced on 2026-11-03: the plain arm's third `system` block read 3,519 with `-p` and 3,807 with `--interactive`. On 2026-10-31 the user set a cap of at most 6,000 characters instead of a fixed number.
- The `/context all` reading of 2026-10-31 is in `proposal.md`. Of its rows, memory files (550) and the seven `openspec-*` skills (about 690) belong to this repository, not to claudetto.

## Goals / Non-Goals

**Goals:**

- One reader module for the status line's file reads, so the render stays pure and testable.
- One handoff template in code that both writers use.
- FAFO as the session's method for getting unstuck, in `main.md`, the subagent bodies, and `Concise.md`.
- New prompt rules that each have an eval case, with the main body at most 6,000 characters.
- Every prompt claudetto ships follows `external/please-use-me-often/xml-prompting-guide.md`.
- A session prompt with no task-specific rule.

**Non-Goals:**

- Turning the sandbox off (user, 2026-10-31). Claudetto's settings that grow its block are in scope.
- Changing `/statusline` setup. It already reports correctly that the settings hold claudetto's command.

## Decisions

### Status line reads go through one module

A new `src/statusline/local.ts` reads `.git/HEAD` (following a `gitdir:` line) and `openspec/changes/*/tasks.md`. It returns plain data: `{ branch?, changes: [{ name, done, total, mtimeMs }] }`. `main.ts` calls it once and passes the result into `renderRows` as an argument. Segments stay pure functions of their input. `silent.spec.ts` allows file reads in `local.ts` only. A second test runs `local.ts` against a temp folder and shows it reads no path outside the named files.

The project folder is `workspace.project_dir` when stdin has it, then `workspace.current_dir`, then `cwd`. The `.git` search walks up at most 32 parents. Each read is capped: `HEAD` at 4 KiB, each `tasks.md` at 256 KiB, and at most 32 change folders.

Alternatives considered:

- `git rev-parse` in a child process is rejected. It costs a process every 5 seconds (`refreshInterval`), and the spec forbids child processes.
- Asking Claude Code to send the branch on stdin is not possible: it sends `worktree.branch` for worktree sessions only.

The OpenSpec part goes on the first row after the PR part, as `☰ release-0-3-0 4/12`. Only changes with an open box are shown, because a finished change waiting for archive is noise on every refresh. The two most recently modified are shown, then `+N`. A box is counted the way OpenSpec counts it: a box that holds only `x`, in either case and with any spacing, is done, and every other box is open. The status line has its own pattern, with a test that compares its counts with `openspec list --json` on this repository.

### One handoff template, rendered two ways

`handoff.ts` gets one `HANDOFF_TEMPLATE`: the file name pattern, the title `# Handoff`, and the nine `##` headings. `contextManagementText` prints the template as a skeleton. `handoffText` fills the same skeleton: recent turns under Current state, touched files under Key files and symbols, and a fixed "Code could not read this" line in each other section. The source line stays as the second line, so `sourceLine` in `read-back.ts` still tells the two writers apart.

The session end checks every path Claude wrote under the handoff folder. A validly named file keeps today's behavior. A misnamed one is read with `$.fs.read` and written again under a valid name with `$.fs.write`, and the user sees one line. `$.fs` has no rename, so the old file stays. Rejected: loosening `HANDOFF_NAME` to accept any name, because the read-back sorts by name, and the mixed forms in the folder do not sort by time.

### `main.md` is rewritten to the XML prompting guide

The `0.2.0` body breaks the guide in `external/please-use-me-often/xml-prompting-guide.md`. Its tags are short handles (`<harness>`, `<asking>`), its rules are line lists with no reasons, many say what not to do, and several hold one task or one project. The new body is `drafts/main.md` in this change folder. Each tag names what its section holds, each section is prose, and each rule says what to do with its reason beside it (guide 2.5, 5.3, 5.4). It measures 5,985 characters with the method `JSON.stringify(body.trim()).length - 2`, under the cap of at most 6,000 characters that the user set on 2026-10-31. No test or constant holds that cap now.

| `0.2.0` section | Flaw the user named on 2026-10-31 | New section |
| --- | --- | --- |
| `<role>` | "Read an unclear request as a task" turns doubt into unrequested work | `<role>`, `<understanding_the_request>` |
| `<security>` | Refuses destruction and DoS even on the user's own systems | `<security_work>`, decided by ownership and authorization |
| `<harness>` | Names assumed structures, not the literal forms | `<harness_messages>`, quoting `<system-reminder>`, `hook additional context:`, `<pasted_content id="…">`, and the mid-turn message line |
| `<project>` | Mixes reading order, conflicts, and tools | `<project_context>` |
| `<tools>` | Assumes a `just` file | `<project_context>`, with "the task runner the project already has" |
| `<scope>`, `<asking>` | Send a block to the user as a question | `<finding_out>` (FAFO), `<finishing>` |
| `<defects>` | Limited to "this session" | `<fixing_defects>`, with earlier sessions in scope and `SendMessage` to a live session |
| `<code>` | Code style in a session prompt | the code rules file below |
| `<actions>` | A paid-run gate, and "ask" as the answer to a block | `<actions_and_consent>` |
| `<claims>` | No source order, no hypothesis before confirmation | `<finding_out>`, `<claims_and_evidence>` |

FAFO meets the user's "no guessing" through `<claims_and_evidence>`: an experiment is a stated hypothesis with a predicted result, and an inference stays labeled until a check confirms it. The section also answers the failures in the user's pasted complaint: a reported verified fix counts as evidence, an environment explanation needs evidence, and a wrong earlier answer is named and replaced. The paid-run line is deleted with nothing in its place (user, 2026-10-31). A side agent noted that paid steps then run without asking. That is the user's decision, and `<actions_and_consent>` still gates a changed bound and any publish or send. This repository's paid-run rule moves to `AGENTS.md` as a cost report after the run. "Call a part done only after a check" is not repeated, because `Concise.md` states it. `FAFA` is not named in the prompt. The correction eval case uses the recorded text.

### Code style rules move to a user rules file

The code rules of `<code>` apply to edits, not to every turn, and the YvanDaSilva comment the user pasted names their worst failure: guards for states the types already rule out. `drafts/code-rules.md` holds them as one `<writing_code>` section, with "guard only at a trust boundary" and "name the edge cases you handled". `claudetto:setup` offers to write it to `~/.claude/rules/claudetto-code.md`. Claude Code `2.1.316` reads `~/.claude/rules/`. Whether its `paths:` frontmatter scopes a user rules file is unverified, so a task checks it in `tmux` before setup offers it.

### Subagents and the output style use the same guide

Each subagent body gets `<role>`, `<doing_the_work>`, `<harness_messages>`, `<when_blocked>`, and `<report_format>`. Rules are kept, regrouped, reworded to say what to do, and given reasons, so the rule-kept check is a compare against `0.2.0`. The bodies are not in the main context: only the descriptions are, at 289 tokens, so prose in a body does not work against the footprint goal. The subagents cannot reach the user, so `<when_blocked>` has them try another route within their tools, then report the block with the exact command for the parent or the user. `Hephaestus` works a failing check or a hook message in its task's files through to the cause. A permission denial still ends that part. `Concise.md` renames `<opening>` to `<first_sentence>`, `<shape>` to `<sentence_style>`, `<honesty>` to `<reporting_results>`, and `<asks>` to `<requests_to_the_user>`, and "What I Need from You" items carry the `! <command>` line.

### The cheap summary's thinking gets its own measured room

On 2026-10-31 the user saw "Cheap summary reached its cap of 4048 output tokens, thinking included, so it is cut and the engine compacts". `summaryRequest` in `blocks/compaction/summary.ts` asks Haiku for `maxTokens` 2000 at `SUMMARY_EFFORT = "high"` (`871094f4`), and `capOf` adds 2,048 tokens of thinking room (`shared/thinking.ts`). A summary of at most 4,000 characters is about 1,000 tokens, so the hypothesis is that the thinking at `high` takes the rest. The result has no `stop_reason` and no thinking count, but `reply.text` is still there on a cut. So the cap log first gains the text length, which gives the split. One real compaction measures it. The fix then lowers the effort or raises the room, with the measured split and the old and new value put to the user, because a bound changes only to a value the user names.

### Footprint work starts with attribution

The `0.2.0` capture (`just capture --shipped --interactive --dump /tmp/cap-0-2-0`, free, fake Messages API) gives the first request at 42,752 characters without the plugin and 43,356 with it. System text falls from 3,857 to 3,665, and tool texts fall from 21,847 to 18,570. Messages grow from 8,348 to 12,384: `context_management` is 727, and the sandbox block grows from 8,207 to 11,470. So claudetto's net cost in the first request is +604 characters, and its largest piece is not its own prompt text. It is the sandbox block the engine renders from claudetto's sandbox settings in `src/sandbox/sandbox.ts`. The first footprint task splits the 12k by owner with the same command, and the sandbox block by setting. Cuts then target the largest claudetto pieces: the sandbox settings, with each cut setting kept by another layer, the tool texts in `blocks/tool-describe/texts.ts`, `main.md`, `Concise.md`, the `context_management` text, and the agent descriptions. A cut that lowers tokens is reported in tokens. A cost saving is not claimed without a billed-cost run ("A Cut Counts by Billed Cost").

### `/loop` is removed from the docs only

`/loop` is not reachable: the user typed it on 2026-10-31 and got "No commands match". No code of claudetto names it. `docs/surfaces.md` drops the sentence that offers it back, and `docs/keep/skills/loop.txt` is deleted.

### A handover replaces most compactions

Measured on 2026-11-02 (`ISSUES.md`, "The handover must hit the cache"). Core compaction re-reads the whole context on the session's model and restores read files, a mean 23.2k-token write after it. A hook that answers `session.compact` with `{ messages }` makes no model call and restores no file.

- Trigger: a main reply that starts with `# Handoff`. A trigger on a file write was dropped, because the `Write` call adds one more full read before the turn ends.
- The plugin runs `$.command.run({ command: "compact" })` with a flag set, because its own `$.session.compact` skips its own hook. The flag is cleared in a `finally`.
- The answer is `[first message, an assistant line, the handoff]`. Keeping message 0 by `handle` keeps the first-turn environment block. The assistant line stops the engine from joining two user messages, which would add `\n` to message 0 and break the prefix.
- Fork at idle: at a turn's end, `$.model.fork` repeats the last request and adds the final reply, so the cache serves the whole context. Real run: 33,568 read, 29 written, 602 output.
- Size: 400,000 matches `heavyTokens`; half the window keeps a 200k model clear of the engine's threshold. The option moves it. No measurement backs a better number.
- No mid-turn fork: mid-turn the fork lags one tool pair, so the newest result goes uncached.
- No reminder at the tail: it would add tokens to every request and move the breakpoint's bytes each turn.
- The fork handover sends no prompt: the real run's handoff said to wait for the user, and the prompt cost two requests, about 37k tokens.
- Open: the request after a handover misses the cache for messages 0 and 1 on the real API, though the bytes match. The cause is on the server side. The test is a handover right after the first request.

### Result caps are not a lever

A paid A/B on 2026-11-02 capped `Read` at about 3.8k characters and `Bash` at 4,000. The model split its reads, and the capped arm used 58% more tokens for the same answer. The levers are fewer calls, a smaller context per call, and no loops.

### A paid probe is gated by a free count

Probe rounds took 25.5% of the week's main-thread tokens, and one run cost 3.4 times its estimate because the context was 286k, not 150k, and both big calls missed the cache by setup. Each paid run is built first on `claudekit/api/fake.ts`, its tokens counted and its prefixes compared, and a probe stops its processes by recorded pid only. Each run is asked for first, with its tokens and weekly share, as `AGENTS.md` and the user require, and the report gives the measured tokens and weekly share after.

### Worktree tools stay

`EnterWorktree` and `ExitWorktree` stay allowed and deferred. A deny would save 29 characters of the request, and the user keeps the tools.

### Setup writes `worktree.baseRef: "head"`

This reverses the `0.1.0` decision to leave the `worktree` setting unset, which held that none of its keys turns worktrees on or off. Claude Code `2.1.316` and `2.1.317` start a new worktree at `origin/<default branch>` unless `worktree.baseRef` is `"head"`, and the schema default is `"fresh"`. `just worktree-base` reproduced it, and two agents of this change started from `544088f7`, the `origin/main` of the day, and edited old code. Setup writes the key in a "Worktrees" group of its dialog, which names the key and what it does. A value the user set stays: `just setup` fills only an unset key, and the dialog does not offer to replace it.

### Hygiene stays code

The collector is the `SessionStart` hook and `bin/claudetto-hygiene`: no model call, and no tool, command, or skill text, so the request does not grow. Each shipped kind has its own retention key, with 0 for off, and `hygieneEnabled` turns all of them off. The shipped rows cover only Claude Code's temp leftovers (`fswatch-probe-*` and dead session folders) and claudetto's handoffs. The dev tools remove their own `mkdtemp` roots, and a dev-only `just gc` in `claudekit/gc/` is the backstop, so the plugin ships no pattern under `/tmp`. Claude Code's temp folder is `/private/tmp/claude-501` here while `$TMPDIR` is under `/var/folders`, so the root is found from `CLAUDE_CODE_TMPDIR`, `/tmp`, and `os.tmpdir()`, not assumed.

### The `finish` block is removed

The `tasks.md` loop reads only open boxes, so it cannot see a stopping point the user set. It blocked ten stops after the user ended the session. The user never asked for it (`57631e4c`). A cap that lets a declined block through was the other option. The user rejected it, because any loop still spends a full-context turn on each block it repeats. The whole `finish` block goes, since the loop was all it did. The built-in `/goal` covers a session that must work to a condition.

### The handoff becomes a tool

Each `/clear` wrote a handoff and read it back, so each handoff nested the one before, and a typed `/clear` lost its meaning. Checked on the fake API with 2.1.316: `$.command.run({ command: "clear" })` works, a queued `$.prompt.submit` runs as the new session's first turn, `session.start` does not fire on `/clear`, and a typed `/clear` reaches `command.run` with `origin.kind` `composer`. The agent calls a registered handoff tool; the plugin adds the user's recent prompts word for word, writes the file, clears at idle, and submits once.

### The classifier decides after its reason

`FRAME` in `src/blocks/classify/prompt.ts` asks for `<block>` before `<reason>`, so the verdict precedes the reason that should decide it. Three denials on 2026-11-02 had reasons saying the rule did not apply. The order flips, and each recorded denial becomes a failing case first.

### Conduct rules get eval cases, not judges

The Stop-time `claude-haiku-5-5` opener judge was removed on 2026-11-02: it added one model call to every stop and a full turn to every blocked stop. Prose rules alone did not hold either (`ISSUES.md`, "The agent reads every user message as a task"). Each new rule is worded on the content event, gets an eval case from a recorded reply, and is measured in the 4.6 run. Sources: `external/please-use-me-often/agent-terms/TERMS-OF-SERVICE.md` S1.1, S1.3, S3.8, S3.9, S3.10, S9.7, and arXiv `2610.29162` for the prose forms.

## Risks / Trade-offs

- [The status line reads files every 5 seconds] → Capped reads of at most 34 small files. A test bounds the count.
- [A new `main.md` rule moves model behavior in ways the evals have not measured] → Each rule has an eval case, and task 4.6 runs them.
- [The `/context all` figures are rounded by the engine, such as 4.6k] → Exact numbers come from `just capture`, and `/context all` is the user-visible check.
- [A handoff that Claude writes still differs inside the sections] → The spec fixes headings and order only. The content of a section stays Claude's.

## Migration Plan

- Existing handoff files are left as they are. Only new files follow the template.
- Users get the new status line on the plugin update with no settings change, because the command path stays the same.
- Rollback is a revert of the release commit.
