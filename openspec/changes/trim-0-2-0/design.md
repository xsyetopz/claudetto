# claudetto 0.2.0: the trim

A plan for one `/goal` run in vanilla Claude Code 2.1.302, in the repository `/Users/krystian/Downloads/CodeProjects/xsyetopz/claudetto`.
The aim: a small framework that makes vanilla Claude Code token-efficient.
A part stays only when Claude Code cannot do its work and the part does something meaningful.

## `/goal` condition

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

## State at the start

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

## Rules of the run

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

## Decisions of the user (2026-10-17)

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

## Calls of Claude

These are not decisions of the user.
Each one has its reason, so the run does not stop for them.

- Make `jev` the default `decide` mode, in place of `off` (`decide/domain/mode.ts:12`).
  With no TypeSafe key, no text goes to the TypeSafe API, and the fallback model (`FALLBACK_MODEL = "haiku"`, `decide/limits.ts`) answers.
  A test checks this.
- Keep `claudetto-codegraph`, `claudetto-browser`, and `claudetto-docs`, because they are small.
- Merge `surface` into `prompt`, and `trim` into `setup`.
- Keep `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` at `2`, from the snippet of 0.1.0.

## Keep and cut

| Part | Lines | Verdict | Reason |
| --- | ---: | --- | --- |
| `asks` | 4,257 | cut | Measured harm: 9 `Edit` calls denied, and 5 of 9 runs left the bug (`wiki/evidence/Evals-0.1.0.md:150-164`). |
| `policy` | 2,713 | cut | Decision 2. |
| `turngate` | 727 | cut | Harm both ways: a false claim passed 2 of 3 times, and 2 correct claims were blocked (`Failure-Gaps-0.1.0.md:90`, `design-surfaces.md:84-91`). |
| `usercheck` | 178 | cut | It was to merge into `turngate`, which goes. |
| `repostate` | 680 | cut | Decision 2. The git status snapshot of the system prompt goes with `includeGitInstructions: false`. |
| `attribution` | 672 | cut | Decision 2. The `attribution` setting of Claude Code does this work. |
| `worktree` | 432 | cut | Built-in: `worktree.baseRef: "head"` and the copy of `.worktreeinclude`. |
| `reads` | 408 | cut | Built-in duplicate (`design-redo.md:48-49`, D39). |
| `gc` | 815 | cut | Built-in duplicate (`design-redo.md:74`, D44). |
| `agents` | 226 | cut | Measured harm: 3 of 4 helpers stopped with no report (`design-handoff.md:12-13`). |
| `corrections` | 104 | cut | Decision 2. `CLAUDE.md` does this work. |
| `decide` | 1,198 | keep, trim | Decision 11. Default mode `jev`, with the fallback model when Jev gives no answer. |
| `checks` | 379 | cut | Decision 8. It also has an exit 127 bug (`Evals-0.1.0.md:41`). |
| `minispec` | 1,328 | cut | Decision 8. |
| `claudetto-sessions` | 2,823 | rewrite as one skill with scripts | Its aim is the analysis of the `~/.claude/` system of the user. The built-in commands cover part of it (step 8b). Keep only the part that they do not cover. |
| `claudetto-you-should-know` | 798 | cut | The user uses the built-in `you-should-know` plugin of Claude Code in its place (the user, 2026-10-17). |
| `ground` | new | add | Decision 9. It takes the source check of `handoff/prompts/ground-warning.md` and makes it general (step 9). |
| `guard` | 1,375 | trim to the print deny | Keep D22: a `Bash` print of a file gets the `Read` call, because only `Read` gets the short stub on a second read. |
| `prompt` | 1,334 | keep, trim | Decision 3. |
| `surface` | 171 | merge into `prompt` | Use `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` in place of the `agent.offer` hook where it does the same work. |
| `trim` | 92 | merge into `setup` | It is a list of settings, so it belongs to the settings snippet. |
| `handoff` | 1,263 | keep, trim | Decision 6. |
| `setup` | 2,961 | trim | Keep the settings snippet and the cleanup of old keys. Remove the `CLAUDE.md` block (D51) and the drift notice, which leaked into a reply (`Evals-0.1.0.md:23-27`). |
| `styles` | 13 | keep | Mixed result (`Evals-0.1.0.md:105-110`), and it costs 13 lines. |
| `statusline` | 1,684 | trim hard | Decision 7. |
| `sembr` | 501 | trim hard | Decision 7. |
| `claudetto-lab` | 2,462 | trim hard | Decision 7. These are dev tools, so they need no runtime guard. |
| `claudetto-codegraph` | 626 | keep | A small skill around an outside tool, and the global `CLAUDE.md` uses it. |
| `claudetto-browser` | 625 | keep | A small skill around an outside tool. |
| `claudetto-docs` | 32 | keep | One skill. |
| `src/kernel` | 2,314 | trim | Remove `commit-hook/`, `push-hook/`, and `policy/`, and each file that no kept part imports. |
| `tools` | 3,417 | trim | Remove each script and each check of a cut part. |

The line counts are non-test `.ts` files, from `find <dir> -name '*.ts' -not -path '*/lab/*' | xargs cat | wc -l` on 2026-10-17.

## Facts of Claude Code 2.1.302 for the plan

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

Each step ends with `just generate`, its check, and one commit.

### 1. Commit the start state

- Commit the uncommitted work of 2026-10-17.
- Move the stray handoff.
- Write the start size to `.claudetto/trim-size.txt` with `printf 'before %s\n' "$(find src -name '*.ts' -not -path '*/lab/*' | xargs cat | wc -l)" > .claudetto/trim-size.txt`.
  Step 10 adds the `after` line the same way.
- Check: `git status --short` prints nothing that the step did not leave on purpose.

### 2. Delete the cut slices and add-ons

- Delete the folder of each part with the verdict `cut`, in `src/plugins/claudetto/slices/`, `src/plugins/`, and `tests/claudetto/` or `tests/<add-on>/`.
  A slice is found by its folder (`tools/generate/discover.ts`), so the folder is the slice.
- Delete `src/kernel/commit-hook/`, `src/kernel/push-hook/`, and `src/kernel/policy/`, with `tests/kernel/policy.test.ts`.
- Fix each import of a cut part.
  The known ones: `tools/generate/emit/fill.ts` (`agents/limits.ts`, `asks/limits.ts`), `tools/validate.ts` (`agents/limits.ts`), `tests/claudetto/checks/guard.test.ts` (`asks`), `setup/domain/automode.ts` (`kernel/policy`), `setup/domain/commit-hook.ts`, and `setup/adapters/checkout.ts` (`kernel/push-hook`).
  Find the rest with `rg -l "slices/(asks|policy|…)/|kernel/(policy|push-hook|commit-hook)" src tools tests`.
- Remove the agent files, the skills, the `bin/` launchers, and the `hooks.json` entries of the cut parts from `src/`.
- Remove each prompt text that names a cut part, such as a custom agent name, `claudetto-run-checks`, or `minispec`.
- Check: `just check`.

### 3. Trim `guard` to the print deny

- Keep `slice.ts`, `limits.ts`, `domain/deny.ts`, `domain/reads.ts`, `domain/paths.ts`, `prompts/print-deny.md`, and `lab/print.test.ts`.
- In `adapters/mod.ts`, keep `countOf` and the print part of `onBashCall`, and remove `kindOf`, `isMainCheckout`, and the `guardReason` call.
- Delete `domain/guard.ts`, `domain/walk.ts`, `domain/reason.ts`, `domain/matchers/`, `prompts/deny-*.md`, and the labs `arithmetic`, `shared-git`, and `transcripts`.
- Delete the floor tests in `tests/claudetto/guard/`: `cwd`, `git-paths`, `lazy`, `options`, `shared-git`, `substitution`, `tiers`, `win-paths`, `worktree-folder`, `ports.ts`, and `matrix/`.
  Keep `print`, `large`, `errors`, `s1`, `support.ts`, and the `s1-*.json` data.
- Add one test: a `Bash` call that prints no file reads no file (the property that `lazy.test.ts` checked for the floor).
- Check: `just test tests/claudetto/guard && just lab`.

### 4. Trim `setup`, and move `trim` into it

- The snippet that setup writes:
  - `includeGitInstructions: false`.
  - `env.CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT: "1"`, so that each model gets the short prompt.
  - `env.CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS: "2"`.
  - `env.CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1"`, only when step 5 shows that `surface` drops those agents now.
  - `sandbox.network.allowLocalBinding: true`, so that tests and dev servers can bind a local port without leaving the sandbox.
    Without it, 12 tests of this repo fail with `Failed to start server`.
  - `outputStyle: "claudetto:Concise"`.
  - `autoMode` lists with `$defaults` only.
  - The `statusLine` command of the trimmed status line.
  - The entries of `trim/domain/removed.ts`, each one checked against `docs/env.md` or `strings.txt` of 2.1.302.
  - No `promptCacheTtl` key.
  - The built-in `you-should-know` plugin stays on.
    The 0.1.0 snippet turns it off with eight other built-in plugins (`OFF_PLUGINS` in `setup/domain/facts.ts:5-15`).
    Check each of the other eight against `strings.txt` before you keep it off.
- The cleanup of keys that 0.1.0 wrote, run on each setup:
  - Remove the claudetto pairs `hook.claudetto-*` from `env.GIT_CONFIG_KEY_<n>` and `GIT_CONFIG_VALUE_<n>`, renumber the pairs of the user, and fix `GIT_CONFIG_COUNT`.
    The hook scripts are inline in the settings, so they keep running until setup removes them.
  - Remove the rule texts of `src/kernel/policy` from `autoMode.soft_deny` and `hard_deny`.
    Before you delete `kernel/policy`, copy its rule texts into one fixture of the cleanup test.
  - Remove the claudetto block of `~/.claude/CLAUDE.md` between its markers.
- Remove the drift notice of `session.start`.
- Check: `just test tests/claudetto/setup`, with a test for each cleanup on a settings file of 0.1.0, and a test that the snippet sets `sandbox.network.allowLocalBinding` to `true`.

### 5. Rebuild `prompt` on the vanilla short prompt

- Get the vanilla short prompt of 2.1.302 from `external/cc-2.1.302/strings.txt` and the `lean_body` section, and save it as a fixture.
- Write the tailored text as a `prompt.section` answer for `lean_body`, and drop sections with `prompt.compose` only where the vanilla text is wrong or wastes tokens.
- Remove the per-model variants (`domain/variants.ts`) unless an entry in `wiki/evidence/` measured a win for it.
- Move the tool description cuts of `surface` here, and use the env var of Claude Code where one does the same work.
- Report the size of the vanilla prompt and of the tailored prompt in characters, from the fixtures.
  A live measure needs a paid run, so write its command for the user and do not run it.
- Check: `just test tests/claudetto/prompt && just lab`.

### 6. Trim `handoff`

- Keep the `session.compact` answer for `auto` and `manual` and the `/handoff` command.
- Keep the handoff file on disk, because it is the only state that carried across `/clear` reliably (`agent-failure-dossier/08`).
- Remove each option and code path that no test needs.
- Check: `just test tests/claudetto/handoff && just lab`.

### 7. Trim `statusline`, `sembr`, and `claudetto-lab`

- For each one, first add a test that pins its current output on fixed input.
- Then rewrite it smaller, and run the same test.
- Remove each `claudetto-lab` CLI that no kept check, `justfile` recipe, or evidence method uses.
- Check: `just test tests/claudetto/statusline tests/claudetto/sembr tests/claudetto-lab && just lab`.

### 8. Trim `src/kernel` and `tools`

- Remove each kernel file that no kept part imports (`codegraph callers` on each export).
- Remove each check in `tools/` of a cut part.
- Check: `just check`.

### 8b. Rewrite `claudetto-sessions` as one skill with scripts

What Claude Code 2.1.302 has built in (`strings.txt`):

- `/insights`: "Generate a report analyzing your Claude Code sessions", as an HTML file with a recommendation for auto mode.
  It has a `facets` step over the sessions, so it probably calls a model, which is not checked.
- `/usage`: "Show session cost, plan usage, and activity stats".
- `/context`: the context use of the current session.
- `/hooks`, `/permissions`, `/plugin`, `/skills`, `/memory`, and `/status`: views of each part of the setup.

So the skill keeps only what these do not do: a free and repeatable read of the `~/.claude/` system, with no model call.

- The skill `sessions`, with `bun` scripts in its folder:
  - `audit`: the settings layers and the keys that each one sets, the plugins that are on, the hooks, and the size in bytes of each `CLAUDE.md`, rule, skill listing, and agent listing that loads at the start of a session.
  - `replay`: reads the transcripts of `~/.claude/projects/`, runs a hook module on each recorded tool call, and counts what it would deny.
    Step 9 uses it to count the false denies of `ground`.
- Delete the `awareness`, `start-cost`, and `usage` slices and their CLIs.
  Before you delete a feature, check that a built-in command above gives the same facts.
  If no command does, move the feature into a script of the skill.
- Check: `just test tests/claudetto-sessions && just lab`, with a fixture folder in the shape of `~/.claude/`.

### 9. Add the `ground` slice

The aim: the user gives no policy for a failure that a program can find.
The failure class: Claude writes a claim with no source as if it were a fact or a choice of the user, or it acts against a convention that the project already states.
The claims of 2026-10-17 that the first draft of this plan had:

| Claim | Kind | What was wrong |
| --- | --- | --- |
| "prints 9000 or less" in the `/goal` condition | a bound | No user message and no tool result had it. |
| "31,839 lines" | a count | No command printed it. The command later printed 33,219. |
| `setup/slice.ts:119` | a reference | Copied from a subagent report with no check. The list is in `setup/domain/facts.ts:5-15`. |
| `npx markdownlint-cli2` | a convention | The user uses `bun` and `bunx` only. |
| Calls of Claude listed under "Decisions of the user" | an attribution | The user did not make them. |

The kinds of claim, and the source that each one needs:

| Kind | Example | Source that passes |
| --- | --- | --- |
| A number: a count, a bound, a size, a price, or a date | "9000 or less", "33,219" | The number is in a user message or a tool result of the session. |
| A reference | `file:line`, a quote, a symbol | The file exists, the line is in range, and a quote matches the file. |
| An attribution | "the user chose", "the user said" | A user message of the session says it. |
| A fact of a tool or a library | a flag, a command, a version | A file or a tool result of the session has it. |
| A convention | a package manager, a test runner | The files of the project, such as `CLAUDE.md`, the lock file, or `justfile`, name it. `bun.lock` means `bun` and `bunx`, `uv.lock` means `uv`, and the check denies `npm`, `npx`, or `pip` in such a project with no user rule. |
| A claim of done | "tests pass", "fixed" | A check ran in the turn, and its output is in a tool result. |

Where the check runs, in order of cost:

1. On `Write` and `Edit` of a plan or a spec (`openspec/changes/trim-0-2-0/design.md`, `openspec/changes/**`, `proposal.md`, `design.md`, `tasks.md`), and on `ProposeGoal`: a `tool.call` hook checks the new text.
2. At the end of a turn: the same check runs on the reply, and it writes a short note for the next turn, not a block.
3. On a subagent report: each reference and each number in it is checked before Claude uses it.
4. In the tailored prompt of step 5: one rule, "Name the source of each claim, or mark it as proposed."
   A prompt rule alone did not stop a repeat of an incident (`agent-failure-dossier/08`), so the hooks above carry the guard.

The rules of the check:

- Only checks that a program can run, with no model call.
  The judge of `turngate` blocked correct claims, and `asks` denied correct edits (`Evals-0.1.0.md:150-164`), so a check that guesses does harm.
- A claim with no source is not denied forever.
  The deny names each claim and gives three ways out: name the source, mark it as `(proposed)` or with `[NEEDS CLARIFICATION: …]`, or ask the user.
- Text that the user wrote, and text in a fenced code block that is a quote of a tool result, are out of scope.
- Move the check of `handoff/prompts/ground-warning.md` into this slice, so that one module owns the source check.

Tests:

- One test for each row of the table of 2026-10-17 above: the claim fails with no source and passes with its source.
- Replay the transcripts of past sessions in `~/.claude/projects/` with the `replay` script of step 8b (no model call), and count the false denies.
  Report the count and the rate.
  Ship the hook only when the count is low enough, and write the count to `wiki/evidence/`.

Check: `just test tests/claudetto/ground && just lab`, and the replay count.

### 10. Docs and release notes

- Remove the wiki pages of the cut parts: `src/wiki/claudetto/Turn-Gate.md`, `Corrections.md`, `Repo-State.md`, `Agents.md`, the floor part of `Guards.md`, and the rows of the cut parts in `src/wiki/reference/Bounds.md`.
- Update `README.md` and `docs/README.md`.
- Write the CHANGELOG entries under `[Unreleased]`, then run `just bump 0.2.0`.
- Close the MiniSpec change `openspec/changes/release-0-2-0/`, or delete it with the `minispec` folder, because this plan replaces it.
- Add the end size with `printf 'after %s\n' "$(find src -name '*.ts' -not -path '*/lab/*' | xargs cat | wc -l)" >> .claudetto/trim-size.txt`.
- Check: each command of the `/goal` condition, in the final turn.

## Notes for the spec integration (a later change)

The plan of the spec workflow is in `openspec/changes/spec-workflow-0-2-0/design.md`, next to this file.
The user gave these notes on 2026-10-17.
They are not checked against the docs of each tool.

| | OpenSpec (Fission-AI) | GitHub Spec Kit | BMAD Method |
| --- | --- | --- | --- |
| Approach | Change by change, with delta specs (`ADDED`, `MODIFIED`, `REMOVED`) | Top-down, with a project constitution and templates | Phases with many agent personas (PM, architect, QA) |
| Loop | `propose`, `apply`, `archive` in `openspec/changes/` and `specs/` | `specify`, `plan`, `tasks`, `implement` in `.specify/` | Heavy planning: PRD, architecture, stories, reviews |
| Token cost | Very low | Moderate | Very high |
| Fits | Solo developers and existing (brownfield) repositories | New (greenfield) projects and teams with shared rules | Large or regulated projects that need an audit trail |
| Install | `bunx @fission-ai/openspec` | Python, with `uv` or `pipx` | `bunx bmad-method install` |
| Risk | One maintainer, and no test or type-check scaffolding | Heavier process | Cost and setup |

`minispec` already follows the OpenSpec shape (`openspec/changes/<name>/` with `proposal.md`, `design.md`, `tasks.md`, and delta specs).
So OpenSpec is the closest fit for a brownfield repository such as this one.
The user decides the choice for each project.

## Out of scope for this run

- The integration of OpenSpec, GitHub Spec Kit, or BMAD.
- Each paid measure: the live prompt size, the evals, and the handoff cost of the new prompt.
  Write their commands at the end of the run, for the user.
- A push, a tag, a pull request, or a publish.
