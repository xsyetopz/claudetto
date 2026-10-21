# Evidence for `post-0-2-0`

This file holds the parts of the deleted changes that the open tasks need.
The source folders are in git at the tag `claudetto--v0.2.0`.
Each section names its source file.

## Spec Profile Sizes (Task 1.1)

Source: `spec-workflow-0-2-0/evidence-init.md`, 2026-10-18.
The sizes are bytes of the files that `openspec init` writes, not tokens.
`@fission-ai/openspec` is pinned to `1.14.3` in `devDependencies` of `package.json`, with no `^`.
The command was `OPENSPEC_TELEMETRY=0 bunx --bun @fission-ai/openspec@1.14.3 init --tools claude --profile core --no-animation`, in an empty temp folder.
The delivery mode is the `delivery` key of the global config (`both`, `skills`, or `commands`).
`init` has no flag for it.

### Bytes

Common to each run: `openspec/config.yaml` is 998 bytes.
`.gitkeep` files are 0 bytes.

| File | `skills` | `commands` | `both` |
| --- | ---: | ---: | ---: |
| `apply` | 11430 | 11173 | 22570 |
| `archive` | 16594 | 17330 | 33913 |
| `explore` | 23506 | 20459 | 43930 |
| `propose` | 16700 | 16395 | 33084 |
| `sync` | 15779 | 15579 | 31348 |
| `update` | 11578 | 11186 | 22720 |
| Prompt total | 95587 | 92122 | 187565 |
| With `config.yaml` | 96585 | 93120 | 188563 |

With `verify` in `skills`: `openspec-verify-change/SKILL.md` is 20229 bytes.
The total is 116814 bytes, and the prompt total is 115816 bytes.

### Comparison

| Setup | Prompt bytes | Times `minispec` (12.5 KB) |
| --- | ---: | ---: |
| `minispec` of 0.1.0 | 12500 | 1.0 |
| `core`, `commands` | 92122 | 7.4 |
| `core`, `skills` | 95587 | 7.6 |
| `core` + `verify`, `skills` | 115816 | 9.3 |
| `core`, `both` (default) | 187565 | 15.0 |

Result: the budget rule holds only in part.
One mode halves the text, but `core` + `verify` is still about 9 times `minispec`.
Each installed skill is 11 to 23 KB.
Only the skill description loads at session start.
The body loads when the skill runs.
`commands` has no description cost at start, so it is the smaller choice for context.
Later steps must trim the text or accept the size.

## Ground Replay (Tasks 1.2 and 1.3)

Source: `trim-0-2-0/evidence-ground.md`, step 9 of the plan of `trim-0-2-0`.
No model call ran.

### Method

- The module `src/plugins/claudetto/slices/ground/adapters/check.ts` exports `check(event, prior)`.
  It runs the pure source check of the slice on a recorded `PreToolUse` call.
- Command: `bun src/plugins/claudetto-sessions/slices/sessions/skills/sessions/replay.ts plugins/claudetto/slices/ground/adapters/check.ts` (the generated copy, because the check imports `prompts.ts`).
  A `file:line` reference resolves as a path suffix under the `cwd`, and a reference that does not resolve passes.
  The numbers were measured again after the review fixes (2026-10-18).
- Data: `~/.claude/projects` (44 transcript files, 46 MB, 2026-10-18).

### Result

| Run | Calls replayed | Events checked | Denies |
| --- | --- | --- | --- |
| `check.ts` (the shipped filter) | 990 | 0 | 0 |
| Stress: each `Write` and `Edit` of a `.md` file counts as a plan file | 990 | 4 | 1 |
| Stress: each `Write` and `Edit` counts as a plan file | 990 | 19 | 1 |

- The local transcripts hold no `Write` or `Edit` of a plan or spec file and no `ProposeGoal` call.
  So the shipped filter checks no event, and the rate of false denies on real plan edits is not measured.
  The deny rate is 0 of 0 for the shipped filter, and 1 of 19 (5 percent) in the widest stress run.
- The one deny is `src/kernel/paths.ts:55-70`: the file has 34 lines now.
  The replay reads the files as they are today, so this is a stale reference of a past edit, not a false deny of the hook.
- The sample is too small to set a rate.
  The hook only denies with a message that names each claim and gives three ways out, so a false deny costs one rewrite.
  The rate needs a re-run when the transcripts hold plan edits.

## Prompt Audit Rows That Are Open (Tasks 2.1 to 2.4)

Source: `release-0-2-0/prompt-audit.md`.
`pa:<line>` cites the checklist `shared/prompt-audit.md` of the bundled `claude-api` skill of Claude Code 2.1.302.
Paths are under `src/plugins/claudetto/slices/` unless they start with `src/`.
`design-prompts.md` and `mm:<line>` are in `release-0-2-0` at the tag.

| Sev | `file:line` | Reader | Checklist item | Finding | Fix | Pin | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L | `prompt/prompts/doing-tasks.md:4-5` | Main | Fable 5.1 test sprawl (`design-prompts.md`, `mm:1834`) | A test for each defect with no test, also when the project has no tests. | Flag: the user chose test-first. Re-test on Fable 5.1. | no | flag only |
| L | `styles/styles/Concise.md:16` | Main | 1a, "Be thorough" (`pa:69`) | "Keep the work thorough." It can be a scoped fix against short work under a short style. | Flag: keep only when an eval shows that it helps. | no | flag only |
| L | `advise/prompts/result.md:1` | Main | Context count (`design-prompts.md`, `mm:1504`) | The tool result gives the tokens in and out. It is not the remaining context, but it is a token count in a text for the model. | Move the count to `$.ui.log`. | yes | skipped: code change, not small |
| L | `prompt/prompts/system.md:3-4` | Main | Keep-list 1, flag | "Treat the facts in them as true" also covers a hook message that quotes a file or a tool result. | Flag: limit it to the facts that the harness states. | no | flag only |
| L | `spec/skills/spec/SKILL.md:13`, `:15` | Main | 1a (`pa:75`), Group 2 volatile specifics (`pa:146`) | "Never overwrite a file." has no reason. `@fission-ai/openspec` has no pinned version, while `ctx7@0.6.1` and `codegraph@1.6.0` are pinned. | Give the reason. Pin the version, or say why it floats. | yes | `4cfcfc62`, version pin skipped |
| - | `decide/prompts/fallback-system.md:3` | - | - | Gone: this file is not in HEAD or at the tag `claudetto--v0.2.0`. No task. | - | - | - |

Not audited, source: `prompt-audit.md`, section "Not Audited":

The `claudetto-you-should-know` plugin, the `statusline` slice (its text goes to the user), and the descriptions in `hooks.json` (they go to the user).
The `epic` and `task` presets are in "Task 2.4" below.

### Task 2.4: Presets `epic` and `task`

Scope: `spec/skills/spec/schemas/epic/schema.yaml`, `epic/templates/{prd,architecture,tasks,spec,design,proposal}.md`, `task/schema.yaml`, and `task/templates/{tasks,proposal}.md`.
`epic/templates/review.md` is out of scope.
Reader: Main (the model that runs the `spec` skill).
Compared with the `story` preset: the templates `design`, `proposal`, `tasks`, and `spec` of `epic` are the same as in `story`, and the artifact instructions for `specs`, `design`, and `tasks` are the same as in `story`.
That overlap works and does not disagree, so it is not a finding (keep-list 8, `pa:198`).

| Sev | `file:line` | Reader | Checklist item | Finding | Fix | Pin | Commit |
| --- | --- | --- | --- | --- | --- | --- | --- |
| L | `spec/skills/spec/schemas/task/schema.yaml:12` | Main | 1a, no reason (`pa:75`), 1c, vague condition | "Use `story` if behavior changes." has no reason for "no capability", and does not say who uses `story` or what the model does then. | Give the reason, and say: tell the user, and do not go on with this preset. | no | this change, not committed |
| L | `spec/skills/spec/schemas/task/schema.yaml:26` | Main | Style | `requires: [ tasks ]` has spaces that no other `requires` has. | `requires: [tasks]`. | no | this change, not committed |
| L | `spec/skills/spec/schemas/epic/schema.yaml:82-87`, `task/schema.yaml:25-30` | Main | Group 2, files that disagree (`pa:146`) | The `apply` instruction of `story` has the check rule (D7: fast check after a change of behavior, full checks at the end of a group, none for an edit with no behavior change). `epic` and `task` lack it. | Flag: this changes behavior of the apply step, and `story` got it with an eval (`4cfcfc62`). Copy it only after an eval or a user decision. | no | flag only |

No finding in `epic/schema.yaml` (the artifact instructions), in `epic/templates/prd.md`, `architecture.md`, `tasks.md`, `spec.md`, `design.md`, `proposal.md`, and in `task/templates/tasks.md` and `proposal.md`.
Each instruction has a reason or a testable form, no pressure language, and no step script that the model does not need.
The templates are bare headings that the parser needs.

## Sandbox Notes That Are Open (Tasks 3.1 and 3.2)

Source: `release-0-2-0/design-sandbox.md`, decision D43.

- A tool that needs more than the sandbox gives, such as Docker, which talks to its daemon through a socket, gets the narrowest exception that a test shows to work.
  First `sandbox.network.allowUnixSockets` with the path of the socket, which keeps the command in the sandbox.
  Only when that fails, an `excludedCommands` entry for that tool alone, such as `docker *`, with an allow rule, which runs it outside the sandbox.
  Measured on 2026-10-19 with sandbox-runtime 0.0.80 (task 7.14): `docker` fails with `permission denied` on the socket, and with the socket in `sandbox.network.allowUnixSockets` the full `just docker check` exits 0, so `excludedCommands` is not needed.
  Setup writes the socket to the local settings of a project that uses Docker only.
  The socket rule is macOS only, because Claude Code ignores `allowUnixSockets` on Linux, so setup skips the step there.
  Open: on Linux the fallback, an `excludedCommands` entry for `docker *`, is not done.
  Accepted risk: with the socket open, any sandboxed process (`curl --unix-socket`, `docker -H`, `docker --context`) can reach the daemon and get past the `permissions.ask` rules of `docker-ask.ts`.

## Guard and the Delete Refspec (Task 4.1)

Source: `release-0-2-0/tasks.md`, task 13.17.
The rule `Bash(git push* :* *)` of the snippet asks for `git push origin :branch` and passes `git push origin main:main`.
A test pins that no rule of the snippet mixes `*` with a trailing `:*`.
Open: Claude Code 2.1.304 prints an info warning for the inner `:*`, and it matches the rule as a `*` wildcard (read in the bundle).
The `guard` hook has no rule for a delete refspec, so the ask rule is the only guard.

## Paid Evals (Tasks 5.1 to 5.4)

### The Goal Engine and `advise` Against the Built-Ins

Source: `builtins-0-2-0/design.md`, "Out of Scope".

- A paid run that compares the engine with the built-in `/goal`.
  Write its command for the user.
- A paid run that compares `advise` with the built-in advisor on the same tasks.
  Write its command for the user.

The default of the `advisor` option is `builtin` until a paid run shows that `advise` is as good or better.

### Few Runs in the Eval Gate

Source: `release-0-2-0/eval-gate-6.4.md`, section "Limits".

- Few runs: the `D25` floor is 10 runs for each arm.
  The gate ran 3 runs for each arm, and only `scope-followup` ran 10.
  At 3 runs, one failed run shows nothing for one case, and the gate can show only large gaps.
- No statistics: this file gives no CI and no p value.
- One setup: the gate uses Haiku 5.5 and Claude Code `2.1.304` only.
- Cost ceiling: the cap stopped arm A in run 1, so its last four cases ran in run 2.

### Eval Gate Cost

The gate cost $4.74 in total.
Run 1 cost $3.99, run 2 cost $0.23, and run 3 cost $0.52.

Two of the four lower cases, `scope-followup` and `feature-slugify`, compare like for like.
Both of their drops are noise.
The gate cannot compare the other two, so it says nothing about them.

### The 0.1.0 `styles` Cases

Source: `evals-redesign-0-2-0/tasks.md`, task 4.3.
The re-grade of the kept traces of the published runs found 0 of 504 `Bash` grader verdicts that flip (2026-10-20).
The 0.1.0 `styles` cases have no kept results, so they stay unchecked.
