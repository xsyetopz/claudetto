# `claudetto` 0.2.0: The Built-Ins, and a Goal Engine

A plan for a third `/goal` run, after `openspec/changes/trim-0-2-0/design.md` and `openspec/changes/spec-workflow-0-2-0/design.md`.
The aim: Claude Code as a small harness that the user controls, in the way of `earendil-works/pi`, with no change to the Claude Code binary.
Each built-in part, each tool and each skill too, gets one of two questions:
can claudetto replace it with a better part, or is it not needed, so that claudetto turns it off?
Part 1 lists each built-in part of Claude Code 2.1.302 and the lever that turns it off or replaces it.
Part 2 replaces the built-in `/goal` with a goal engine of claudetto.
Part 3 replaces the built-in advisor with an advisor that the user controls.

## `/goal` Condition

```text
The plan openspec/changes/builtins-0-2-0 is done when the final turn shows these, run after the last commit on feat/0.2.0: `bun tools/builtins.ts --check` exits 0; `just test tests/claudetto/goal tests/claudetto/advise` exits 0; `just lab` exits 0; `just docker check` exits 0; `git status --short -- src tools tests plugins wiki` is empty.
```

## What the Built-In `/goal` Is (2.1.302)

From `external/cc-2.1.302/strings.txt`:

- `/goal <condition>` adds one session Stop hook of type `prompt` with the condition as its text (`zft`).
  The text that Claude gets: "The hook will block stopping until the condition holds" (`P6n`).
- So a model judges the condition from the conversation at each stop.
- The state is an attachment of kind `goal_status` in the transcript (`x6n`, `Isn`).
- `CLAUDE_CODE_GOAL_CHECKIN_MINUTES` sets a check-in time.
- `/goal` refuses to run when `disableAllHooks` or `allowManagedHooksOnly` is set, or in a workspace that is not trusted.
- The `ProposeGoal` tool lets Claude propose a condition, with a bound of 500 characters (`Pjn=500`).

Its limits:

| Limit | Effect |
| --- | --- |
| One condition in prose | Many parts in one sentence, and the judge can misread one of them. |
| A model judges | Each check costs a model call, and "tests pass" is judged from text, not from a run. |
| Proof only in the conversation | A compaction can remove the proof, and then the judge cannot see it. |
| No budget | No bound on turns, tokens, cost, or time, other than the check-in. |
| No progress check | A loop that makes no progress goes on until the user stops it. |
| No steps | No order of steps, no state for each step, and no resume from a step. |

## Part 1: The Inventory of the Built-Ins

Counts from `strings.txt` of 2.1.302, measured on 2026-10-17.
A step of this plan writes them again with a script, so these numbers are only a start.

| Group | Count | Lever to turn off | Lever to replace |
| --- | ---: | --- | --- |
| Commands (`/name`) | 98 | `command.describe` with `isHidden` | `command.run` answers in place of Claude Code (`{ text }` or `{}`) |
| Built-in plugins (`cc-plugin-*`) | 12 | `enabledPlugins` with `false` | A plugin of claudetto |
| Attachments (reminders and notices that Claude Code adds) | 76 or more | `prompt.attachment` with `{ text: null }` | `prompt.attachment` with `{ text }` |
| System prompt sections | per prompt | `prompt.section` with `{ text: null }`, or `prompt.compose` | `prompt.section` with `{ text }` |
| Tools | per session | `permissions.deny`, or `tool.call` with `{ deny }` | `tool.describe`, and `$.tool.register` for a new tool |
| Built-in agents (`Explore`, `Plan`, `general-purpose`) | 3 | `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS`, or `agent.offer` with `isOffered: false` | `$.agent.register` |
| Compaction | 1 | `DISABLE_AUTO_COMPACT` | `session.compact` answers with its own `messages` |
| Commit and PR attribution | 1 | the `attribution` setting | `attribution.text` |
| Git instructions and status | 1 | `includeGitInstructions: false` | `prompt.section` or `prompt.context`. Which one holds the status is not checked. |
| Status line | 1 | no `statusLine` setting | `statusLine` command |
| Skills of Claude Code | per build | `CLAUDE_CODE_DISABLE_BUNDLED_SKILLS` | `skill.prompt` |
| Server tools (`advisor`) | 1 or more | `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` (`docs/env.md:240`) | `$.tool.register`. No hook can refuse or rewrite a server tool (`types-2.1.302.d.ts:14216-14222`). |

The 12 built-in plugins: `agents-md`, `claude-test`, `diff`, `easel`, `mermaid`, `mods-guide`, `plugin-authoring`, `responsive-mode`, `sec-default`, `telemetry`, `tips`, and `you-should-know` (each with the prefix `cc-plugin-` and the suffix `@builtin`).

### Steps of Part 1

1. Write `tools/builtins.ts`.
   It reads `external/cc-2.1.302/` (`strings.txt`, `types-2.1.302.d.ts`, `docs/`) and writes `wiki/reference/Builtins.md`.
   One row for each built-in part: its name, its group, its text size in bytes, its lever to turn off, its lever to replace, and what claudetto does with it.
   - The attachments: the full list of kinds, with no cut at a window of the bundle.
   - The tools: the tool names of the bundle, from a pattern that does not start from a list of known names.
2. Give each row one verdict, with its reason:
   - `replace`: claudetto replaces it, because a better version is measured or is clearly better by a fact.
   - `off`: claudetto cannot replace it, and it is not needed, so claudetto turns it off.
   - `keep`: vanilla and untouched, only because it is needed and no lever can make it better.
     Give the missing lever as the reason.
   Give each tool and each skill its own row, not one row for the group.
   The rule for the commands: when a mod hook or a custom command can do the work of a built-in command at zero cost, the verdict is `replace`.
   Zero cost means no model call and no new text in the context, such as a `command.run` answer with `{ text }` from files and `$` calls.
   A built-in command that nothing needs gets `off` with `command.describe` and `isHidden`.
   The aim of each verdict is less code, fewer tokens, and fewer parts.
   For each `off` and `replace` row, give the number of bytes of context that it saves or adds.
3. Put each `off` lever in the settings snippet of `setup`, and each `replace` lever in its slice.
   Start with the attachments, because each one adds text to the context of each turn where it fires.
4. `bun tools/builtins.ts --check` fails when the table of `wiki/reference/Builtins.md` differs from a new run, so that a new release of Claude Code shows each new part.
5. Check: `bun tools/builtins.ts --check`.

## Part 2: The Goal Engine

The slice `goal` of claudetto.
It replaces the built-in `/goal`, and it keeps the name and the known form: `/goal <condition>`, `/goal clear`.

### What It Does

- A goal is a list of checks, not one sentence.
  Each check is one of these kinds:
  - `run`: a command, and the check passes when it exits 0, such as `just check`.
    The engine runs it with `$.process.run`, and no model reads the output.
  - `file`: a file exists, or a file holds a text.
  - `judge`: a sentence for a small model, only for what no command can check.
    The engine runs it with `$.model.classify` on the facts of the turn, not on the whole conversation.
- A goal can come from a plan file.
  `/goal GOAL.md` reads the steps and the checks of the file, such as each `Check:` line of these plans.
- The state is in `.claudetto/goal.json`: the checks, the step, the result of each check with its time, the counts, and the budget.
  A compaction, `/clear`, and a resume do not lose it.
  The `session.compact` hook of `handoff` puts the state into the handoff.
- At the end of each turn (`turn.complete`), the engine runs the checks of the current step.
  When one fails, it starts the next turn with `$.prompt.submit`, with only the failing checks and the tail of their output.
  When all pass, it goes to the next step, or it clears the goal and shows the result.

### Controls

| Control | Default | Effect |
| --- | --- | --- |
| `--max-turns` | none | Stop after this count of turns. |
| `--budget` | none | Stop at this cost, or this share of the plan limit, from `$.session.usage()`. |
| `--until` | none | Stop at this time. |
| `--stall` | 3 | Stop when this count of turns in a row ends with the same failing checks and the same output. |
| `/goal pause`, `/goal resume` | | Keep the state, and stop or start the loop. |
| `/goal skip`, `/goal step <n>` | | Move to another step, with a line in the state file. |
| `/goal status` | | Show the step, each check, and the budget, with no model turn (`command.run` answers). |

The defaults are a proposal of Claude, not a choice of the user.

### Why It Costs Fewer Tokens

- A `run` check costs no model call.
  The built-in judge costs one call at each stop.
- The next turn gets only the failing checks, not a restatement of the goal.
- The proof is in the state file, so Claude does not need to print each output again for the judge.

### The Built-In Parts That the Engine Turns Off

- The `/goal` command of Claude Code: `command.run` answers `goal`, so the built-in one does not run.
- The `ProposeGoal` tool: `permissions.deny`, or `tool.call` with `{ deny }`, with the text that names `/goal`.
- The `goal_status` attachment: `prompt.attachment` with `{ text: null }`, because the engine gives its own text.

### Steps of Part 2

1. Write the state format and its tests: create, update, and read a goal, with a fixture for each kind of check.
2. Write the check runner: `run`, `file`, and `judge`.
   The tests use a stub of `$.process.run` and of `$.model.classify`.
3. Write the loop: `turn.complete`, `$.prompt.submit`, the budget, and the stall rule.
   One lab test for each control.
4. Write the commands: `/goal`, `clear`, `pause`, `resume`, `skip`, `step`, and `status`.
5. Turn off the built-in parts of the list above.
   A lab test checks that the built-in `/goal` does not run.
6. Read the steps and the `Check:` lines of a plan file.
   The test reads `openspec/changes/trim-0-2-0/design.md` of this folder.
7. Write the wiki page of the slice.
8. Check: `just test tests/claudetto/goal && just lab`.

## Part 3: The Advisor

### What the Built-In Advisor Is (2.1.302)

- A server tool: the API runs it inside the request, so the engine runs nothing for it (`types-2.1.302.d.ts:14192-14203`).
- No `tool.check`, `tool.call`, or `tool.describe` hook, and no `PreToolUse` hook, can refuse, rewrite, or answer it (`types-2.1.302.d.ts:14216-14222`).
  A hook can only read it after the fact, in `serverToolUses` of a `turn.step` response.
- The user sets it with `advisorModel`, `/advisor`, and `--advisor` (`strings.txt`, `docs/env.md:240`).
- `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1` turns it off, and `--advisor` then has no effect (`docs/env.md:240`).

So claudetto cannot change the built-in advisor, but it can turn it off and give a tool in its place.

### The Replacement: The Tool `advise`

The slice `advise` registers one tool with `$.tool.register`.
At each call:

1. It reads the conversation with `$.session.messages()` (`types-2.1.302.d.ts:2815-2823`).
2. It cuts the context to what the advice needs: the question of Claude, the plan file, the last failing checks, and the tail of the conversation, to a byte bound in `advise/limits.ts`.
3. It asks a stronger model with `$.model.complete`, with `model`, `effort`, `maxTokens`, and `timeoutMs`, and with a cache mark on the part that stays the same.
4. It gives the advice to Claude as the tool result, with the model name and the token counts from `usage`.

A question with a fixed set of options goes to `second_opinion` of `decide` (Jev, then the fallback model), not to `advise`.
The tool text of `advise` says so.

### Controls of the Advisor

| Control | Default | Effect |
| --- | --- | --- |
| `advisor` option | `builtin` | `builtin`: the slice registers no tool. `claudetto`: the slice registers `advise`, and the snippet of `setup` sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, so that Claude sees one advisor only. |
| `advisorModel` option | `opus` | The model of `$.model.complete`. |
| `advisorEffort` option | `high` | The `effort` of the call. |
| Bounds in `advise/limits.ts` | | The context bytes, `maxTokens`, `timeoutMs`, and the most calls in one turn and in one session. |

The default is `builtin` until the paid run of "Out of scope" shows that `advise` is as good or better.
A change of the default is one line.

### What the Replacement Gives That the Built-In Does Not

- The user picks the model, the effort, and the context, and sets a bound on the cost.
- Each call goes through the hooks of claudetto, so the cost shows in the status line, and the handoff can name the advice.
- The context is cut, so a long session does not send the whole conversation at each call.

What it costs: the built-in runs inside one request of the API.
`advise` is a tool call of the engine, so it adds one round trip, and its context is a copy, not the cache of the main thread.

### Steps of Part 3

1. Write `advise/limits.ts` and the context cut, with tests on a fixture of `$.session.messages()`.
2. Write the tool with a stub of `$.model.complete`: an answer, an `api-error`, an `empty-reply`, and an `aborted` result each give a clear tool result.
3. Write the `advisor` option and its line in the snippet of `setup`.
   A test checks that `claudetto` sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`, and that `builtin` registers no tool.
4. One lab test: a call of `advise` in a stubbed session.
5. Check: `just test tests/claudetto/advise && just lab`.

## Out of Scope

- A paid run that compares the engine with the built-in `/goal`.
  Write its command for the user.
- A paid run that compares `advise` with the built-in advisor on the same tasks.
  Write its command for the user.
