# Steps of trim-0-2-0

Each step ends with `just generate`, its check, and one commit.

## 1. Commit the start state

- Commit the uncommitted work of 2026-10-17.
- Move the stray handoff.
- Write the start size to `.claudetto/trim-size.txt` with `printf 'before %s\n' "$(find src -name '*.ts' -not -path '*/lab/*' | xargs cat | wc -l)" > .claudetto/trim-size.txt`.
  Step 10 adds the `after` line the same way.
- Check: `git status --short` prints nothing that the step did not leave on purpose.

## 2. Delete the cut slices and add-ons

- Delete the folder of each part with the verdict `cut`, in `src/plugins/claudetto/slices/`, `src/plugins/`, and `tests/claudetto/` or `tests/<add-on>/`.
  A slice is found by its folder (`tools/generate/discover.ts`), so the folder is the slice.
- Delete `src/kernel/commit-hook/`, `src/kernel/push-hook/`, and `src/kernel/policy/`, with `tests/kernel/policy.test.ts`.
- Fix each import of a cut part.
  The known ones: `tools/generate/emit/fill.ts` (`agents/limits.ts`, `asks/limits.ts`), `tools/validate.ts` (`agents/limits.ts`), `tests/claudetto/checks/guard.test.ts` (`asks`), `setup/domain/automode.ts` (`kernel/policy`), `setup/domain/commit-hook.ts`, and `setup/adapters/checkout.ts` (`kernel/push-hook`).
  Find the rest with `rg -l "slices/(asks|policy|…)/|kernel/(policy|push-hook|commit-hook)" src tools tests`.
- Remove the agent files, the skills, the `bin/` launchers, and the `hooks.json` entries of the cut parts from `src/`.
- Remove each prompt text that names a cut part, such as a custom agent name, `claudetto-run-checks`, or `minispec`.
- Check: `just check`.

## 3. Trim `guard` to the print deny

- Keep `slice.ts`, `limits.ts`, `domain/deny.ts`, `domain/reads.ts`, `domain/paths.ts`, `prompts/print-deny.md`, and `lab/print.test.ts`.
- In `adapters/mod.ts`, keep `countOf` and the print part of `onBashCall`, and remove `kindOf`, `isMainCheckout`, and the `guardReason` call.
- Delete `domain/guard.ts`, `domain/walk.ts`, `domain/reason.ts`, `domain/matchers/`, `prompts/deny-*.md`, and the labs `arithmetic`, `shared-git`, and `transcripts`.
- Delete the floor tests in `tests/claudetto/guard/`: `cwd`, `git-paths`, `lazy`, `options`, `shared-git`, `substitution`, `tiers`, `win-paths`, `worktree-folder`, `ports.ts`, and `matrix/`.
  Keep `print`, `large`, `errors`, `s1`, `support.ts`, and the `s1-*.json` data.
- Add one test: a `Bash` call that prints no file reads no file (the property that `lazy.test.ts` checked for the floor).
- Check: `just test tests/claudetto/guard && just lab`.

## 4. Trim `setup`, and move `trim` into it

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

## 5. Rebuild `prompt` on the vanilla short prompt

- Get the vanilla short prompt of 2.1.302 from `external/cc-2.1.302/strings.txt` and the `lean_body` section, and save it as a fixture.
- Write the tailored text as a `prompt.section` answer for `lean_body`, and drop sections with `prompt.compose` only where the vanilla text is wrong or wastes tokens.
- Remove the per-model variants (`domain/variants.ts`) unless an entry in `wiki/evidence/` measured a win for it.
- Move the tool description cuts of `surface` here, and use the env var of Claude Code where one does the same work.
- Report the size of the vanilla prompt and of the tailored prompt in characters, from the fixtures.
  A live measure needs a paid run, so write its command for the user and do not run it.
- Check: `just test tests/claudetto/prompt && just lab`.

## 6. Trim `handoff`

- Keep the `session.compact` answer for `auto` and `manual` and the `/handoff` command.
- Keep the handoff file on disk, because it is the only state that carried across `/clear` reliably (`agent-failure-dossier/08`).
- Remove each option and code path that no test needs.
- Check: `just test tests/claudetto/handoff && just lab`.

## 7. Trim `statusline`, `sembr`, and `claudetto-lab`

- For each one, first add a test that pins its current output on fixed input.
- Then rewrite it smaller, and run the same test.
- Remove each `claudetto-lab` CLI that no kept check, `justfile` recipe, or evidence method uses.
- Check: `just test tests/claudetto/statusline tests/claudetto/sembr tests/claudetto-lab && just lab`.

## 8. Trim `src/kernel` and `tools`

- Remove each kernel file that no kept part imports (`codegraph callers` on each export).
- Remove each check in `tools/` of a cut part.
- Check: `just check`.

## 8b. Rewrite `claudetto-sessions` as one skill with scripts

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

## 9. Add the `ground` slice

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

## 10. Docs and release notes

- After the user tags 0.2.0, remove the wiki pages of the cut parts: `src/wiki/claudetto/Turn-Gate.md`, `Corrections.md`, `Repo-State.md`, `Agents.md`, the floor part of `Guards.md`, and the rows of the cut parts in `src/wiki/reference/Bounds.md`.
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
