# Cut list of design D25 (task 2.2)

Line counts come from `wc -l`.
Source: the import graph of each `.mjs` file in `plugins/`, `tests/`, and `tools/` (225 files, relative imports only), from a read-only script, and the result of task 2.1.
The user reviews this list before task 2.3 deletes a file.

The calls:

- `cut`: task 2.3 deletes it.
- `module`: the check moves into the hooks module as a `tool.call`, `tool.check`, or `turn.step` hook (design D26), and its logic stays in a feature with no `node:` or `bun:` import.
- `classic`: it stays a classic hook or a command, because the module cannot do its work.
- `port`: it moves to `.ts` in task 2.5 or 2.7, with no change of behavior.

A file that a later task replaces keeps its call until that task, so task 2.3 deletes only the rows with `cut`.
The column "Later" names that task.

## Core plugin `plugins/dotclaude/`

### `features/adherence/` (asks, which move into a `tool.check` hook)

No other file uses only `approval.mjs` or `spans.mjs`, so the cut removes two files and the parts of four files below.
A `tool.check` hook can ask (`research/probes.md`, 2.2), so task 2.6 moves the asks into the module and deletes the classic `PreToolUse` hooks of `adherence`.
For that move, `rules.mjs`, `scripts.mjs`, `shellwrites.mjs`, and `text.mjs` lose their `node:path` import, and the reads of `cli.mjs` go through `$.fs`, which is async.

| File | Lines | Call | Change in task 2.3 |
| --- | --- | --- | --- |
| `approval.mjs` | 63 | `cut` | The approval-claim check. Task 5.7 gives the prompt rule. |
| `spans.mjs` | 154 | `cut` | The code-span check. The output style rule stays. |
| `rules.mjs` | 146 | `module` | Remove the imports of both files, `unapproved`, the span check of a commit message in `bashChecks`, and the span and claim checks in `fileChecks`. Then `checkCall` gives no deny. |
| `cli.mjs` | 47 | `module` | Remove `readTranscript` and the `transcript` read of `io`. Task 2.6 deletes the file when the module does its reads. |
| `limits.mjs` | 241 | `module` | Remove `TRANSCRIPT_MAX_BYTES`, which only `readTranscript` uses. `ITEMS_SHOWN_MAX` stays for `shellwrites.mjs`. |
| `comments.mjs`, `content.mjs`, `git.mjs`, `hookscripts.mjs`, `kinds.mjs`, `scripts.mjs`, `shellforms.mjs`, `shellwrites.mjs`, `text.mjs` | 1,120 | `module` | None. They hold the asks on git commands, protected files, and changes that can hide a defect. |

`lib/errors.mjs` stays, because 9 other files import it.

### Hooks and module

| File | Lines | Call | Later |
| --- | --- | --- | --- |
| `hooks/register.mjs` | 168 | `port` | 2.6 moves it to `register.ts`. |
| `hooks/hooks.json` | n/a | `port` | 2.6 removes its `PreToolUse` and `PostToolUse` entries as the checks move into the module. 2.9 generates it. |
| `hooks/Stop.prompt.txt` | n/a | `classic` | 3.2 replaces it with a command hook or removes it (design D15). |
| `hooks/description.txt` | n/a | `port` | 2.9 generates it. |

### Features and `lib/`

| Files | Lines | Call | Later |
| --- | --- | --- | --- |
| `features/reads/cli.mjs` | 56 | `module` | 2.6 moves the file-print deny into a `tool.call` hook on `Bash` and deletes this classic hook. |
| `features/reads/rules.mjs` | 88 | `module` | 2.6 removes its `node:path` import. 3.7 checks each part of a compound command. |
| `features/guard/rules.mjs` | 167 | `port` | Already in the module (`tool.check`). |
| `features/sembr/rules.mjs`, `lib/sembr.mjs` | 449 | `port` | Already in the module (`tool.call`). |
| `features/context/cli.mjs`, `features/context/turns.mjs` | 133 | `classic` | 4.1 moves the note to a `turn.step` hook and deletes the classic `PostToolUse` hook. |
| `features/context/rules.mjs`, `features/context/limits.mjs` | 86 | `module` | 4.1 changes the note text. |
| `features/drift/` (4 files) | 359 | `port` | Already in the module (`session.start`). |
| `features/prompt/` (4 files) | 251 | `port` | 2.9 moves the texts to `src/`. 5.2 rebuilds the prompt. |
| `features/surface/` (2 files) | 193 | `port` | Already in the module. 5.3 trims the tool descriptions. |
| `features/statusline/` (17 files) | 1,153 | `classic` | 12.2 and 12.6 replace the column grid (`grid.mjs`, `layout.mjs`). |
| `features/setup/` (3 files), `skills/setup/scripts/` (3 files) | 513 | `port` | 9.2 and 9.5 replace `setup` with `configure`. |
| `lib/budget.mjs`, `code.mjs`, `errors.mjs`, `merge.mjs`, `model.mjs`, `shell.mjs`, `shellkinds.mjs`, `snippet.mjs`, `text.mjs`, `wrappers.mjs` | 1,024 | `port` | None. |
| `lib/hook-io.mjs`, `lib/run-program.mjs`, `lib/tail.mjs` | 136 | `port` | Only classic hooks and commands use them, because each has a `node:` import. |

### Evals `plugins/dotclaude/evals/` (16 cases, `case.yaml` and `scaffold.sh`, and an untracked `results/` folder)

| Case | Call | Later |
| --- | --- | --- |
| `stop-check-verification-claim-cut` | `port` | 3.2 keeps or cuts it with the `Stop` hook. |
| The other 15 cases | `port` | 2.8 replaces the shell-only `scaffold.sh` files with Bun scripts that use `Bun.$`. 5.5 pairs them with the rules. |

## Add-on plugins

| Files | Lines | Call | Later |
| --- | --- | --- | --- |
| `dotclaude-codegraph/features/graph/cli.mjs`, `search` command | part of 188 | `cut` | The `PreToolUse` hook on `Grep\|Glob` never fires, because 2.1.296 has no `Grep` or `Glob` (design D17). Remove the command and its `hooks.json` entry. |
| `dotclaude-codegraph/features/graph/` (`limits.mjs`, `rules.mjs`, `run-tree.mjs`, and the rest of `cli.mjs`) | 208 and part of 188 | `classic` | The `SessionStart` note and the `PostToolUse` sync run the `codegraph` CLI. |
| `dotclaude-jev/` (6 files) | 568 | `port` | 3.4 fixes `features/jev/ask.mjs`. 3.5 defers the tool. |
| `dotclaude-browser/` (6 files) | 376 | `port` | None. |
| `dotclaude-sessions/` (12 files) | 1,513 | `port` | None. |
| `dotclaude-lab/` (13 files) | 1,162 | `port` | 13.3 changes `features/capture/`. |

## Repository scripts `tools/`

| File | Lines | Call | Later |
| --- | --- | --- | --- |
| `hook-text.mjs` | 76 | `port` | It writes the text of the `Stop` prompt hook into `hooks.json`. 2.9 replaces it with the generator, and 3.2 can remove its only input. |
| `bump-version.mjs`, `eval-variant.mjs`, `limits.mjs`, `lock.mjs`, `measure.mjs`, `sizes.mjs`, `start-run.mjs`, `unsandboxed.mjs` | 605 | `port` | None. |

## Tests

See [`cut-tests.md`](cut-tests.md) for each test file and its call.

## Decisions of the review

1. The asks of `features/adherence/` move into a `tool.check` hook of the module, because the probe 2.2 of `research/probes.md` showed that its ask gets the permission prompt (answer of the user: probe it, then adjust).
   No classic `PreToolUse` hook of the core plugin stays.

2. `setup` moves to `.ts` in task 2.5, and task 9.5 replaces it (answer of the user).

3. The `PostToolUse` subagent context note, `hooks/PostToolUse/context.ts`, stays a classic hook until task 4.1, because the mod API has no post-tool event.
   Task 4.1 moves the note to a `turn.step` hook and deletes this hook.
