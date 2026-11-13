# Defects Named in Session 17435f50

Each defect lists its source location (read), the evidence, and a proposed fix. No fix has run yet.

## D1. Path Spam: "The path … was not resolved (HooksError … ENOENT)"

- Source: `plugins/claudetto/hooks/tool.check/useBashRules/own.ts:29-36`. `realPath` calls `$.fs.stat(path, {resolve: true})` and logs through `$.ui.log` on failure. `own.ts:24-28` (`exists`) logs "was not checked".
- Feeds: `files.ts:18-26` `operands(args)` returns every argument that does not start with `-`, so regex patterns, jq filters, URLs, and `gh api` routes get treated as paths. `SHELL_VALUES` (`files.ts:28-38`) covers only `echo`.
- Callers: `recreate.ts:61-80` (`place`), `:133-137` (`bashRecreates`), `:171-190` (`listed`), `:192-217` (`afterBash`); `watch.ts:92` (`gateCheck`) and `:147` (`gateCall`).
- Siblings:
  - `settings.read/useSlimSurface/surface.ts:139-151` (`namesIn`) prints "The directory ~/.claude/commands was not listed" at startup.
  - `plugins/claudetto-openspec/hooks/fs.ts:22-40`.
  - `classic.Stop/useStopChecks/stop.ts:95`.
  - `hygiene/roots.ts:25,64` and `hygiene/sweep.ts:60,147`.
  - `command.run/useSetup/rules.ts:93` (224 records in OpenJoystickDriver).
- Hidden by: `gate.mock.ts:74-105` (`there()` is true for any path with no extension) and `asked.test.ts:45`, which stubs `ui.log`.
- Fix: treat ENOENT as an answer ("absent") and log nothing. Resolve only operands of commands whose operand is a path. Make the mock report absent paths as absent.

## D2. Status Line Has No Colour Until the First Measured Turn

- Source: `plugins/claudetto/statusline/main.ts:50-51` (`themeOf = colorOff(env) ? undefined : theme`), `color.ts:82-85` (`colorOff` checks only `NO_COLOR`), `color.ts:116-121` (`paintOf` returns plain text when the theme is undefined), `local.ts:152-169` (`readLine`).
- The theme comes from the line file, which `hooks/session.measure/useLineFile/line-file.ts:10-31` writes only after the first measured turn. Until then the theme is undefined and the line is plain.
- The spec says so on purpose: `openspec/specs/status-line/spec.md:251-254`, "No Theme File … paints with no colour". The user calls that a defect.
- Fix: paint the `dark` palette when no theme is known, unless `NO_COLOR` is set.

## D3. Bun Rules Hard-Baked Into Hooks

- `hooks/texts.ts:17`: the root prompt always says "in a bun repo, use bun and bunx, never npm…".
- `texts.ts:151`: `bun pm ls` hint.
- `tool.check/useBashRules/packages.ts:5-83`: denies npm-family commands when `bun.lock` exists (`BUN_FOR_NPM`, `NPM_FAMILY`), with no way to turn it off.
- `surface.ts:220-241`: `BUN_FACT` behind `bunRuleEnabled` (`plugin.json:28`). This is a second path for the same job.
- Others: `skills/docs/SKILL.md:6-7` (`bunx ctx7`), `setup.ts:161`, `settings.ts:22,221`, and `starter-families.ts:38-76`. The `bin/*` shebangs need Bun as the runtime, which is a separate and legitimate dependency.
- Fix: detect the package manager (the `packageManager` field, then lock files). Name it once in a SessionStart fact for any manager. Drop the Bun line from the prompt and the npm deny table.

## D4. Files Acting as Folders

Clusters of three or more files with a shared prefix in one folder:

- `classic.Stop/useStopChecks/open-items*`
- `command.run/useSetup/setup*`, `ignore*`, `settings*`, `starter*`
- `tool.check/useBashRules/shell-words*` (the `reading2`–`reading6` tests), `rules*` (`rules.generated.ts` beside the `rules.generated/` folder), `gate*`, `processes*`
- `agent.spawn/useMemoryHold/memory*`, `hold*`
- `tool.call/useDecideTool/decide*`
- `classic.Stop/useSliceCommits/slices*`
- `prompt.submit/useConstraintPin/pin*`
- `verify*`, `tool.call/useBudgetRun/budget*`, `useClaudettoAgents/delegation*`
- hooks root `texts*` and `cleanup*`
- `plugins/claudetto-you-should-know/hooks/register*` (8 files)
- `plugins/claudetto-openspec/hooks/openspec*`, `spec-*` (7), `validate-*` (5)
- `tools/hygiene/trash*`, `tools/claim-check-*`, `tools/decider-*`
- `tests/claudetto-openspec/fixture-*`, `fixtures/specs-apply.*.json`, `validation.*.json`

Constraints on a move:

- `bunfig.toml:29` ignores `plugins/**/*.test.ts`.
- `project.just:36` `lab` runs `claude plugin test plugins/<each>`.
- `register.ts:32-65` loads hook modules by path.

## D5. Hook Texts and Forms

- `output-styles/Concise.md:19,27` gives a `sudo` example, which cannot run because the `!` shell has no TTY. `Concise.md` writes `- [ ] !` where the Stop hook wants `- !`.
- `texts-gate.ts:74` (Read not shell), `:85` (Write not shell), `:106` (pkill), `:111` (pid), `:127` (worktree), `:131` (loop with no time limit); `kill.ts:17-18,51,81-121`. Together these cause most denials in `sessions.md` §3.
- `texts.ts:51` (uncommitted list), `:225` ("A Stop hook blocked and no file changed"), `:242-249` (the `- ! <command>` form).
- `open-items.ts:11-20`; `texts-grade.ts:11,23,26,30,31,34,35`.

## D6. Leftovers From the 2.1.319 Issue List

Fixed in 2.1.321: the answer-first gate, the `/tmp` marker, installing into `/tmp`, and busy-wait loops.

Still open:

- `$.ui.log` on ENOENT (D1).
- `kill $VAR` refused.
- A subagent's leftover pid.
- Loops bounded by a counter or `date` still denied.
- Stop flags copied task text.

Prompt gaps:

- `! /skill` suggested as a shell command.
- Pinning an older dependency ("you were not supposed to pin to older typescript-bedrock.").
- Invented `.invalid` URLs.
- Asking for an API key instead of OAuth ("WHY WOULD YOU ASK FOR API_KEY???").
- "Not checked" laziness ("this is disgusting laziness. keep going.").

Sandbox gaps: iOS simulator and `openpty`.

## D8. Faults the User Pasted on 2026-11-13

Hook faults:

- Gate timeout hands the call to a person. In `www.clawdipedia.cc` the Bash gate timed out and asked: "The gate failed: timeout. A person must approve this call." The text is `texts-gate.ts:99-100` (`GATE_CHECK_FAILED`). The prompt also showed a stray line, "plugin hooks.json to update hooks". Task 5.3 deletes the gate. Until then, every gate timeout costs the user a prompt.
- The same command, which the gate let through, ran `git checkout --` on two files to discard their changes, and wrote to `/tmp/release323` instead of `$TMPDIR`.
- A command word was read as a path and logged: "The path /Users/kryz/claudetto/commit wasnot resolved (HooksError: claudetto: $.fs.stat(/Users/krystian/CodeProjects/xsyetopz/claudetto/commit) failed: ENOENT)". The word `commit` is no path. Source: `own.ts:33`. This is a live case of D1.
- The Stop hook asked for a rewrite, so one reply showed twice. The prompt-type Stop hook blocked a reply with "Delete the agreement and open with the fact your check decided". The model then sent the whole reply again, and the screen shows both versions. This breaks "A Reply Holds Only What Is New" in `specs/agent-conduct/spec.md`, which wants the block to ask only for the correction.

Agent conduct faults:

- A worktree was left behind and its cleanup was pushed onto the user. In `OpenJoystickDriver` the agent made `/tmp/ojd-base` with `git worktree add`, the guard refused to remove it, and the agent handed the user `! git -C … worktree remove --force /tmp/ojd-base`. The agent could have run that removal itself outside the sandbox, because `.git/worktrees` is read-only inside it.
- The agent read half a source. It read 100k of the cost guide's 216k chars and reported that as done. The user: "read more. this is a fault where you deliberately refused to do more work."
- The agent fetched a Claude platform page with `WebFetch`. The user: "you have clawdipedia-docs to use for claude platform. use that, dammit."
- A reply ended with a line on what was not done, which nobody asked for: "I haven't changed the design: the subagent settings and the paid A/B run still wait for your approval." The user: "nobody asked what you had to had not done. yet another great violation."
- A reply opened with "You're right." That opener is agreement and carries no fact.
- The agent searched code when asked to report. Asked to report these faults, it ran `rg` and read `own.ts` and `texts-gate.ts` first. The user: "NOBODY TOLD YOU TO FIND. REPORT THE FUCKING PROBLEMS TO THE FUCKING OPENSPEC."

## D7. Agent Files

- `agents/plan.md:4` and `search.md:4` use `model: claude-sonnet-5-5` with no `effort`.
- `sweep.md:4-5` uses `model: fable` and `effort: high`.
- `work.md` sets no model, effort, or tools.
- `plugins/claudetto/settings.json:2` sets `subagentStatusLine`, which 2.1.323 removed.
