# `claudetto` 0.2.0: The Trim

A plan for one `/goal` run in vanilla Claude Code 2.1.302, in the repository `/Users/krystian/Downloads/CodeProjects/xsyetopz/claudetto`.
The aim: a small framework that makes vanilla Claude Code token-efficient.
A part stays only when Claude Code cannot do its work and the part does something meaningful.

## `/goal` Condition

Paste this line after `/goal` (477 characters, and the bound is 500):

```text
The plan openspec/changes/trim-0-2-0 is done when the final turn shows these, run after the last commit on feat/0.2.0: `just docker check` exits 0; `ls src/plugins/claudetto/slices` lists only decide ground guard handoff prompt sembr setup statusline styles; `ls src/plugins` has no minispec or claudetto-you-should-know; `cat .claudetto/trim-size.txt` shows the size before and after; `git status --short -- src tools tests plugins` is empty.
```

The built-in evaluator is a Stop hook of type `prompt` that reads only the conversation (`strings.txt`, `P6n`).
A compaction can remove an early check output from the conversation.
So the condition asks only for outputs of the final turn, and step 1 writes the start size to a file.

The condition has no line target on purpose.
A hard number can push the run to cut a kept part only to reach it.
Each part is as small as its tests allow.

## State at the Start

- Branch `feat/0.2.0`, last commit `d91d77ec`.
- Version in the manifests: `0.1.0-alpha.1`, which `CHANGELOG.md` gives as released on 2026-10-15.
  So the CHANGELOG entries go under `[Unreleased]`, and `just bump 0.2.0` comes at the end.
- The uncommitted work of 2026-10-17 is in the working tree.
  A copy is in `git stash list` as `before slice cut 2026-10-17`.
  Commit it first, as one commit, so that each step below is one commit that you can revert.
- Size at the start: the size command of the `/goal` condition prints 33,219 for `src/`, and 36,636 with `tools/`.
  The tests have 30,155 lines.
- A stray handoff is in `src/plugins/claudetto/slices/guard/.claudetto/handoffs/`.
  Move it to `.claudetto/handoffs/`.

## Rules of the Run

- Run the full checks with `just docker check`, as `CLAUDE.md` says.
  In the sandbox of Claude Code, 12 tests fail with `Failed to start server`, because the sandbox blocks local ports.
  Before the run, check that `just docker check` reaches OrbStack or Docker from the sandbox.
  If it does not, set `sandbox.network.allowLocalBinding: true` in the settings, and use `just check`.
- Use `bun` and `bunx` for JavaScript, and never `npm`, `npx`, `pnpm`, or `yarn`.
  Use `uv` or `pipx` for Python.
- Read `CLAUDE.md` and `.claude/rules/` of the repository first, and follow them.
- Edit `src/`, then run `just generate`.
  Never edit `plugins/` by hand.
- Make no paid run: no eval, no `just sandbox` session, and no model call.
  Measure only from files that exist, such as transcripts and `wiki/evidence/`.
  When a step needs a paid run, stop the step and write the exact command for the user.
- Never patch the Claude Code binary.
  Read `external/cc-2.1.302/` (`docs/`, `strings.txt`, `types-2.1.302.d.ts`) for facts.
- Before you delete a symbol in a shared file, run `codegraph callers <symbol>` (run `codegraph init -y` first if there is no index).
- Make one commit for each step, with the check output in the chat.

## Decisions of the User (2026-10-17)

1. Cut the destructive floor of `guard`.
   The user runs auto mode.
   The rules of the auto mode classifier run only in auto mode (`strings.txt`: "Rules for the auto mode classifier SOFT BLOCK section").
   In 2.1.302 the defaults have 17 `allow`, 72 `soft_deny`, 1 `hard_deny`, and 21 `environment` entries (`automode-defaults.json`).
2. Cut `policy`, `worktree`, `attribution`, `asks`, `turngate`, `repostate`, `corrections`, and `agents`.
3. Keep a custom prompt, because the built-in prompts are bad.
   Start from the vanilla short prompt and tailor it.
4. Turn off `includeGitInstructions`.
5. Keep Claude Code as vanilla as possible.
   Use a setting or an env var before a hook, and a hook only where no setting does the work.
6. Keep the handoff, because compaction is expensive.
7. Keep `statusline`, `sembr`, and `claudetto-lab`, and trim each one hard.
   The output of each stays the same or gets better, with less code.
8. Remove `minispec` and `claudetto-run-checks`.
   The spec workflow of `openspec/changes/spec-workflow-0-2-0/design.md` replaces `minispec` in a second `/goal` run.
9. The user must not need to give Claude policies or check its calls one by one.
   claudetto reads the conventions from the project, guards with checks that a program runs, and asks the user only for a choice that is theirs.
   Each rule that the user had to give in this session is a gap that claudetto closes by itself (step 9).
10. Use the built-in `you-should-know` plugin of Claude Code in place of `claudetto-you-should-know`.
11. Jev is first-class.
    Keep `decide`, and when Jev gives no answer for any cause, a smaller Claude model answers.

## Decisions of the User (2026-10-18)

1. 0.2.0 holds all three plans: `trim-0-2-0`, then `spec-workflow-0-2-0`, then `builtins-0-2-0`.
2. Triage the open tasks of `release-0-2-0` after the trim.
   Close each task of a cut part as replaced, and fold the valid rest into the fix phase.
3. Lightweight means each of these: the fewest tokens for each session, the least code, the fewest interruptions, and the fewest moving parts.
   The user, verbatim: "if you have 200 lines of code you can write in 50 lines of code, rewrite it. if you have complex logic whose behaviour can be represent in just a few lines, rewrite it. good != lots of lines. good != same behaviour/consequence for least amount of code."
   The user meant `==` in the last sentence (the user, 2026-10-18): good is the same behavior with the least code.
4. Keep `ground` small: first only the checks of conventions (such as the package manager) and of `file:line` references.
   Add the checks of numbers and attributions only when the replay shows few false denies.
5. Breaking changes are permitted, with no legacy upkeep.
   Edit the wiki only after the user tags 0.2.0.

## Calls of Claude

These are not decisions of the user.
Each one has its reason, so the run does not stop for them.

- Make `jev` the default `decide` mode, in place of `off` (`decide/domain/mode.ts:12`).
  With no TypeSafe key, no text goes to the TypeSafe API, and the fallback model (`FALLBACK_MODEL = "haiku"`, `decide/limits.ts`) answers.
  A test checks this.
- Keep `claudetto-codegraph`, `claudetto-browser`, and `claudetto-docs`, because they are small.
- Merge `surface` into `prompt`, and `trim` into `setup`.
- Keep `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` at `2`, from the snippet of 0.1.0.

## Keep and Cut

| Part | Lines | Verdict | Reason |
| --- | ---: | --- | --- |
| `asks` | 4,257 | cut | Measured harm: 9 `Edit` calls denied, and 5 of 9 runs left the bug (`src/wiki/claudetto/evidence/Evals-0.1.0.md`). |
| `policy` | 2,713 | cut | Decision 2. |
| `turngate` | 727 | cut | Harm both ways: a false claim passed 2 of 3 times, and 2 correct claims were blocked (`src/wiki/claudetto/rationale/Decisions.md`, `design-surfaces.md:84-91`). |
| `usercheck` | 178 | cut | It was to merge into `turngate`, which goes. |
| `repostate` | 680 | cut | Decision 2. The git status snapshot of the system prompt goes with `includeGitInstructions: false`. |
| `attribution` | 672 | cut | Decision 2. The `attribution` setting of Claude Code does this work. |
| `worktree` | 432 | cut | Built-in: `worktree.baseRef: "head"` and the copy of `.worktreeinclude`. |
| `reads` | 408 | cut | Built-in duplicate (`design-redo.md:48-49`, D39). |
| `gc` | 815 | cut | Built-in duplicate (`design-redo.md:74`, D44). |
| `agents` | 226 | cut | Measured harm: 3 of 4 helpers stopped with no report (`design-handoff.md:12-13`). |
| `corrections` | 104 | cut | Decision 2. `CLAUDE.md` does this work. |
| `decide` | 1,198 | keep, trim | Decision 11. Default mode `jev`, with the fallback model when Jev gives no answer. |
| `checks` | 379 | cut | Decision 8. It also has an exit 127 bug (`src/wiki/claudetto/evidence/Evals-0.1.0.md`). |
| `minispec` | 1,328 | cut | Decision 8. |
| `claudetto-sessions` | 2,823 | rewrite as one skill with scripts | Its aim is the analysis of the `~/.claude/` system of the user. The built-in commands cover part of it (step 8b). Keep only the part that they do not cover. |
| `claudetto-you-should-know` | 798 | cut | The user uses the built-in `you-should-know` plugin of Claude Code in its place (the user, 2026-10-17). |
| `ground` | new | add | Decision 9. It takes the source check of `handoff/prompts/ground-warning.md` and makes it general (step 9). |
| `guard` | 1,375 | trim to the print deny | Keep D22: a `Bash` print of a file gets the `Read` call, because only `Read` gets the short stub on a second read. |
| `prompt` | 1,334 | keep, trim | Decision 3. |
| `surface` | 171 | merge into `prompt` | Use `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` in place of the `agent.offer` hook where it does the same work. |
| `trim` | 92 | merge into `setup` | It is a list of settings, so it belongs to the settings snippet. |
| `handoff` | 1,263 | keep, trim | Decision 6. |
| `setup` | 2,961 | trim | Keep the settings snippet and the cleanup of old keys. Remove the `CLAUDE.md` block (D51) and the drift notice, which leaked into a reply (`src/wiki/claudetto/evidence/Evals-0.1.0.md`). |
| `styles` | 13 | keep | Mixed result (`src/wiki/claudetto/evidence/Evals-0.1.0.md`), and it costs 13 lines. |
| `statusline` | 1,684 | trim hard | Decision 7. |
| `sembr` | 501 | trim hard | Decision 7. |
| `claudetto-lab` | 2,462 | trim hard | Decision 7. These are dev tools, so they need no runtime guard. |
| `claudetto-codegraph` | 626 | keep | A small skill around an outside tool, and the global `CLAUDE.md` uses it. |
| `claudetto-browser` | 625 | keep | A small skill around an outside tool. |
| `claudetto-docs` | 32 | keep | One skill. |
| `src/kernel` | 2,314 | trim | Remove `commit-hook/`, `push-hook/`, and `policy/`, and each file that no kept part imports. |
| `tools` | 3,417 | trim | Remove each script and each check of a cut part. |

The line counts are non-test `.ts` files, from `find <dir> -name '*.ts' -not -path '*/lab/*' | xargs cat | wc -l` on 2026-10-17.

## Facts of Claude Code 2.1.302 for the Plan

- `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT` picks the short system prompt with short tool descriptions.
  Newer models use it by default, and the full prompt is the default only for Haiku 4.5, Sonnet 5, Opus 4.7, and older (`docs/env.md`).
  Hooks, MCP servers, and `CLAUDE.md` stay.
- `CLAUDE_CODE_SIMPLE` and `--bare` load no hooks module of an installed plugin (`strings.txt:217156`).
  So claudetto cannot use them.
- The short prompt opens with the section `lean_body` (`types-2.1.302.d.ts:8640-8641`).
  `prompt.section` replaces the text of one section, and `prompt.compose` can drop, add, or reorder sections (`d.ts:4262-4291`).
- `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` and `includeGitInstructions: false` remove the commit and PR instructions and the git status snapshot.
- A `session.compact` mod hook can answer with its own `messages`, so the handoff can replace the summary (`d.ts:11222` and the lines after it).
  The triggers are `manual`, `auto`, `plugin`, and `precompute`.
- `DISABLE_AUTO_COMPACT=1` stops the auto compaction and keeps `/compact`.
  In one profile with `DISABLE_COMPACT=1`, "Prompt is too long" stopped 10 of 43 sessions (`agent-failure-dossier/08`).
  So do not turn compaction off fully.
- `subagentPromptCacheTtl` defaults to 5 minutes.
  One user measured +21% cost with 1 hour for subagents (`agent-failure-dossier/04`), so keep 5 minutes.
- `promptCacheTtl` defaults to 1 hour on a subscription.
  The current snippet sets `"5m"` at `slices/setup/slice.ts:101`, which is against D18.
  Remove the key, so that the vanilla default applies.
- `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` defaults to 20.
  Parallel agents in one shared tree caused the most destructive incidents (`agent-failure-dossier/08`), so keep the snippet value `2`.
- `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` defaults to 8.
- A `/goal` condition holds at most 500 characters, and a separate evaluator checks it from the conversation (`strings.txt`, `ProposeGoal`).

## Steps

The steps and the notes for the spec integration are in [`design-steps.md`](design-steps.md).

## Out of Scope for This Run

- The integration of OpenSpec, GitHub Spec Kit, or BMAD.
- Each paid measure: the live prompt size, the evals, and the handoff cost of the new prompt.
  Write their commands at the end of the run, for the user.
- A push, a tag, a pull request, or a publish.
