# Design, part 2

See `design.md` for the context and the decisions D1 to D17, D25, and D26.

## D18 Agent suite

The built-in agents stay off, and a pragmatic dotclaude suite replaces them, with one or two purposes for each agent.
The priority is quality, then savings, then speed (`external/dossier/agents-roster.md`).

| Agent | Purposes | Replaces | Model, effort | Writes |
| --- | --- | --- | --- | --- |
| `explorer` | find where code lives, map a part of the repository | `Explore` | Haiku 5.5, low (inferred) | no |
| `investigator` | answer a question from files, logs, and git history | `general-purpose` reads | Sonnet 5.5, medium | no |
| `researcher` | research outside sources (web, docs, a bundle), write notes | `general-purpose` research, `claude-code-guide` | Sonnet 5.5, medium (inferred) | notes path of the brief |
| `planner` | write a plan or OpenSpec artifacts | `Plan` | Opus 5.5, high (inferred) | `openspec/` and the notes path |
| `implementer` | build one scoped slice with a known check | `general-purpose` edits | Sonnet 5.5, medium | yes |
| `debugger` | find a root cause, make the smallest fix | none | Sonnet 5.5, high | yes |
| `reviewer` | review a change or a plan, read-only | none | Opus 5.5, high | no |
| `test-runner` | run checks, return the exact failures | none | Haiku 5.5, low | no |

`statusline-setup` has no replacement, because `configure` sets up the status line.
The search of `model-router` sets each pair marked "inferred", and a pilot with `just usage` checks the cost before the release.
`maxTurns` comes from D2, and the guard denies each write outside the paths of the table.

An `Agent` call with no `subagent_type` gets `general-purpose`, which the snippet denies, so four read-only briefs of 2026-10-11 ran on `implementer`.
No setting or env var changes the default agent, and the deny text names only `general-purpose` (probe 1.14).
So a hook denies a call with no type and names the suite with the purpose of each agent, and the delegation text tells the session to name the type in each call.
The deny runs in the `tool.call` hook of the module (D26): the hook fires for an `Agent` call with no `subagent_type`, and the model gets the deny text as the tool error (`research/mod-api-probes.md`, item 6).
In the probe, the model then asked the user and did not retry, so the deny text names the type to use for the brief.

## D19 Handoff

The handoff replaces compaction, and the snippet keeps compaction off.
A script trims the Claude Code session JSONL: it keeps the user turns, the final assistant text, and the tool calls with their results cut to a bound.
It adds a continuation prompt and the state of the active OpenSpec change, and writes the file in `.claude/handoffs/`.
A new session loads it with `claude --resume` on the trimmed file, with the prompt route as the fallback.
A trim that keeps each thinking block unchanged, or drops whole thinking rows, resumes with no API error (probe 1.9).
In that probe the model called its earlier claims wrong, because the cut tool results no longer held the lines that it quoted.
So the trim keeps each tool result that the final assistant text cites, and the continuation prompt says that the other results are cut and that the earlier text is the record.

## D20 Goal command

The goal command uses the open tasks of the active OpenSpec change as its stop condition, with more controls than `/goal <condition> | clear`: the change, the task range, and a turn cap.
A skill, a hook output, or a setting cannot set a `/goal`, and `ProposeGoal` is off (probe 1.11).
So a `Stop` command hook of dotclaude checks `tasks.md`, which costs no model request, where the `/goal` check costs one prompt-hook request at each stop.

## D21 Notifications

A notify script runs on the `Notification` and `Stop` hook events, and sends a local notification with the tool of each platform.
It replaces `PushNotification`, and notifications are on by default.

## D22 Snippet

- `outputStyle` (D7), no `promptCacheTtl` (D8), and the switches of D9.
- The recursive `rm` deny goes, because a deny wins over an allow and agents cannot delete their own temp folders.
  The guard allows a recursive delete only under `$TMPDIR` and paths that the session made.
- The snippet sets `permissions.defaultMode: "auto"`, a value of the mode list of 2.1.296 (`strings.txt` 13414546), so auto mode is on from the start.
  An ask rule overrides auto mode, so the `permissions` lists hold only the dangerous and destructive commands of the system, of `git`, and of other tools, and the auto mode classifier decides each other call (the user, 2026-10-11).
- The `permissions` lists hold these commands, for the shells of Windows, Linux, and macOS:
  - destructive `git` commands: a forced push, a delete of a branch, `reset --hard`, `clean -f`, `checkout --`, `restore`, and `stash drop` or `stash clear`;
  - a write to a disk or a file system (`mkfs`, `dd of=/dev/...`, `format`, `diskpart`, `diskutil erase`);
  - a change to higher rights (`sudo`, `doas`, `runas`);
  - a publish or a release (`npm`, `pnpm`, `bun`, `yarn`, and `cargo` `publish`, `gh release`, `gh repo delete`);
  - a drop or truncate of a database or a table.
- Each rule is an exact prefix, such as `Bash(git reset --hard *)`, with no `*` around a flag letter.
  Whether a `Bash` rule matches each part of a compound command, and whether 2.1.296 has a rule form for PowerShell, is not verified, and task 8.5 checks both.
- A recursive delete is not in the rules, because its danger depends on the path: a delete under `$TMPDIR` or the workspace is routine, and a delete of the home folder or a root is not.
  The guard parses the command, and asks through the permission prompt for a recursive delete of the home folder, a root or drive root, or a path outside the workspace and `$TMPDIR` (`rm -r`, `Remove-Item -Recurse`, `rd /s`, `del /s`).
- The six `rm` ask rules (`Bash(rm -*r*)` and the like) go.
  In a rule, `*` also matches spaces, so `rm -*r*` asks for each `rm` with a dash and an `r` anywhere later in the line.
  On 2026-10-11 it asked for `rm -f "${TMPDIR}mod-probes/clear-debug.log" && tmux ...`, with the `r` of `clear` as the match.
  The guard parses the flags of each part of the command in place of the rules.
- Each key has a traced effect in the bundle, or it goes.
- `sandbox.network.allowLocalBinding: true` is documented for `just capture`, which listens on `127.0.0.1:8787`.

## D23 Lab fixes

- `just sandbox` resolves a relative `--settings` path against the folder of the user.
- The drift check reads the settings that `--settings` gives.
- `dotclaude-capture --count FILE` counts a saved request and opens no port.
- `just capture` runs in the agent sandbox with no settings change by the user.
  The route is not verified: on 2026-10-11, a listen on `127.0.0.1:8787` failed with `EPERM` in an agent session, and no settings scope held `allowLocalBinding`.
- The capture stops a proxy that an earlier run left.

## D24 Research dossier

The wiki holds one prose page for each Claude Code version, with no minified code.
Each page shows the changes against the version before it: tools, settings, env vars, extension points, and start costs.
Each page also documents the undocumented data of that version: config keys, transcript entries, and cache files, with the shape from the bundle, the writer, and the dotclaude part that uses it.
A dotclaude feature can use such data where it fits, such as `cachedUsageUtilization` in the status line, and it hides its part when the shape differs.
`external/dossier/` stays out of the repository.

## D27 Semi-auto handoff at a context level

On 0.28.0, the apply session of 2026-10-11 reached 274,644 tokens and stopped in the middle of a task.
The client blocks the next request near 277K (`CONTEXT_WINDOW` and `CONTEXT_BLOCK_MARGIN` in `lib/budget.mjs`).
Its largest sources were tool results (`Read` 107K characters, `Bash` 85K characters) and 22 subagent messages (92K characters).
Compaction is off (D19), and 0.28.0 cut its context note (archive tasks 25.12 to 25.14), so nothing told the session to hand off.
The `vegaspro` session of the same day reached 195,277 tokens.

The design follows the stateless note of the 0.28.0 design (archive `design-parts-2.md`, D27), and the run of `cc-orchestrator-mod` as a reference (its README, not its code).

1. A `turn.step` hook of the hooks module, an async generator, reads the usage of each request: `input_tokens`, `cache_creation_input_tokens`, and `cache_read_input_tokens` (probe).
   So a long turn cannot pass a level unseen, and no hook reads the transcript.
2. At `CONTEXT_NOTICE_AT`, the session gets the figure, the tokens left before the block, and the rule to work in small slices and to delegate large reads.
3. At `CONTEXT_HANDOFF_AT`, the session gets the steps: finish the edit, leave no file half-edited, tick each task whose check passed, put the decisions of the chat into the artifacts, and run the handoff of D19.
4. The switch `mainHandover` is `auto` (the default) or `manual`.
   In `auto`, the flow is like compaction: after the session writes the handoff, the mod runs `/clear` with `$.command.run` and submits the continuation prompt with `$.prompt.submit`, with no step of the user.
   In `manual`, the session writes the handoff and tells the user to run `/clear` and to continue, and the user does both.
   The note repeats at each request above the level, with no marker file.
5. After `/clear`, the clear note of D5 names the newest handoff, and the work continues from the next open task.

A live probe of 2.1.296 shows that the route works in an interactive session (`research/mod-api-probes.md`):
`$.command.run({ command: "clear" })` from a hook clears the conversation and returns `{"text":""}`, `session.end` fires with `reason` `clear`, and `classic.SessionStart` fires with `source` `clear`.
Then `$.prompt.submit({ text })` starts a turn with no typing, from the clear callback, from `turn.complete`, or from a `$.clock.after` timer.
The route also works in `-p` mode, and the run stays alive until the submitted turn ends.
The model reads the submitted text with a frame that names the plugin, and `asUser: true` removes the frame.
The continuation prompt keeps the frame, so the model knows that dotclaude and not the user sent it, and does not take it as a go of the user.
`session.start` does not fire after `/clear`, so the clear note of D5 uses `classic.SessionStart`.
`initialUserMessage` from `classic.SessionStart` on a clear starts no turn, in `-p` mode or in the TUI, so it is not a route.
The levels go in `features/context/limits.ts`, and start at 60% and 80% of `CONTEXT_WINDOW`, the levels of 0.28.0, until a measure of the handoff cost sets them.
A subagent keeps its bound of `context-bound`, and the main session gets the level of this decision only.

## D28 Bun API map

dotclaude runs on Bun 1.4.3 (D11), so code outside the hooks module graph uses the Bun API where Bun has one.
A `node:` import stays only where this map gives no Bun API.
The workspace had 359 `node:` imports on 2026-10-11, and each Bun API below exists in Bun 1.4.3 (`bun -e` check of the same day).

| `node:` use | Bun API |
| --- | --- |
| `node:fs` read, write, exists, stat, delete of a file | `Bun.file`, `Bun.write`, `BunFile.exists`, `BunFile.stat`, `BunFile.delete` |
| `node:fs` glob | `Bun.Glob` |
| `node:child_process` | `Bun.spawn`, `Bun.spawnSync`, `Bun.$` |
| `node:test`, `node:assert`, `node:assert/strict` | `bun:test` with `expect` |
| `node:http` | `Bun.serve`, `fetch` |
| `node:timers/promises` | `Bun.sleep` |
| `node:url` | `import.meta.dir`, `import.meta.path`, `Bun.fileURLToPath`, `Bun.pathToFileURL` |
| `node:util` `inspect`, `isDeepStrictEqual` | `Bun.inspect`, `Bun.deepEquals` |
| `node:crypto` hash | `Bun.CryptoHasher`, `Bun.hash` |
| `node:process` `env`, `argv`, `stdin` | `Bun.env`, `Bun.argv`, `Bun.stdin` |
| a program lookup on `PATH` | `Bun.which` |
| a version compare | `Bun.semver.satisfies` |

These `node:` uses stay, because Bun 1.4.3 has no API for them: `node:path`, `node:os` (`tmpdir`, `homedir`), `node:fs` folder calls (`mkdir`, `readdir`, `rm` of a folder, `rename`), `node:util` `parseArgs` and `styleText`, and `node:stream`.
A test pins the map: it fails on a `node:` import that the map gives a Bun API for.
