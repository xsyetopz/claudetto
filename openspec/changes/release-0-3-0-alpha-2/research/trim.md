# Trim Audit of the Core Plugin

Question of the user (2026-10-23): "what is the least amount of code needed to accomplish the very heavy and opinionated tailoring that a software engineer needs in Claude Code?"
A worker agent collected the evidence in `research/raw/trim-*.txt`.
The `ground` hook blocked its `Write` of this file, so the main session wrote it from the same files.
The target column is an estimate (proposed), and each count of now is from `research/raw/trim-loc.txt` and `research/raw/trim-target.txt`.

## Slices

| Slice | Lines now | Target (proposed) | Verdict | Reason |
| --- | --- | --- | --- | --- |
| `agents` | 27 | 27 | keep | Small. |
| `decide` | 1232 | shrink | shrink | Jev never ran, because no key reaches the hook (`research/raw/trim-decide-key.txt`). The user keeps Jev (`AskUserQuestion` answer, 2026-10-23). Carry the key in a `sensitive` `userConfig` field and cut the CLI path. |
| `dry` | 213 | 0 | delete (proposed) | The `dedupe` skill can call `jscpd` with no slice. |
| `goal` | 118 | 118 | keep | Small, and the `finish` stop of `research/failures.md` can join it. |
| `ground` | 346 | 280 | shrink and fix | It reads only the main session, so it blocks subagents (this file is the third case). |
| `guard` | 944 | 880 | rework | Allow-all with danger gates (spec `permission-gate`). Today it returns `allow` only on a sure Jev answer (`slices/guard/adapters/mod.ts:114`), so each other call falls to the prompts of Claude Code. |
| `handoff` | 682 | 620 | shrink | Drop the copy in the change folder (see below). The user allows a large cut (`AskUserQuestion` answer, 2026-10-23). |
| `hygiene` | 465 | 375 | shrink | Report removals only. |
| `prompt` | 230 | 190 | keep | It carries the context block. |
| `reply` | 45 | 0 | delete | The user allows its removal (`AskUserQuestion` answer, 2026-10-23), and the bubbles of the plan add code. |
| `setup` | 803 | 550 | shrink | Drop `snippet-0.2.0.json` and the 0.1.0 upgrade path. |
| `spec` | 793 | 600 | shrink | Upstream `openspec` has 24 top-level commands (`research/minispec-gaps.md`), and `minispec` keeps the workflow commands of D22 (`research/raw/trim-openspec-diff.txt`). |
| `statusline` | 1145 | 700 | shrink | The largest slice for a display. The gradient of the user replaces the theme code. |

Totals from `research/raw/trim-target.txt`: slices `7043` now, plugin TypeScript `8761` now, `5980` as the estimate after the cuts.
The kernel is `1581` lines, and `kernel/shell/scan.ts` alone is `349` (`research/raw/trim-loc.txt`).

## Dead Code

`research/raw/trim-dead.txt` lists `10` exports with no use, such as `BASH_OUTPUT_MAX_CHARS`, `HAIKU_AUTOCOMPACT_WINDOW`, `HANDOFF_LINES_MAX`, and four bounds of `slices/spec/limits.ts`.
It also lists about 50 exports that only their own file uses.
Delete the unused ones, and drop `export` from the rest.

## Shared Paths (Task 9.3)

Each parse or output path that two or more slices held, from a `grep` of `JSON.stringify(`, `JSON.parse(`, `YAML.parse`, `existsSync`, and `readdirSync` in `slices/` (2026-10-23).
The counts are lines of `.ts` in each slice, before and after task 9.3.

| Path | Slices | Result | Lines before -> after |
| --- | --- | --- | --- |
| A file read that gives `null`, `""`, or `[]` for a missing file | `setup` (5 sites), `spec` (2 sites), `statusline` | Moved: `setup` and `spec` use `fileReader` of `kernel/node/fs.ts`, which `statusline` used already | `setup` 706 -> 703, `spec` 793 -> 793 |
| A JSON parse that gives `null` for bad text | `goal`, `statusline` | Moved: `parseJson` in `kernel/text.ts` (+9) | `goal` 118 -> 116, `statusline` 1145 -> 1144 |
| The `tasks.md` parse | `spec`, `handoff`, `statusline` | Shared already in `kernel/change.ts` | no change |
| The JSON printer `JSON.stringify(x, null, 2)` | `setup`, `spec` (`dry` went) | Kept: one line in each slice, and a kernel printer adds lines now. Tasks 9.7 and 9.9 add the text views, and the printer moves to `kernel/` then | no change |
| A YAML parse | `setup` (skill frontmatter), `spec` (whole file) | Kept: two different inputs | no change |

The other cuts of task 9.3: `dry` (213) and `reply` (45) went, `IMAGE_SIDE_MAX_TEXT` went, `HANDOFF_LINES_MAX` now writes the line count of the handoff prompt, and 27 exports that only their own file uses lost `export`.
Plugin TypeScript in the scope of D16: `8667` -> `8408`.

## npm Packages (Task 9.10, D23)

Probe of 2026-10-23, Claude Code 2.1.309, Bun 1.4.4.
Method: four temporary plugins in `/tmp` (deleted after), each with `hooks/hooks.json` (`"modules": ["./register.ts"]`), a `register.ts` that imports the package `ms` (version 2.1.3, no `dependencies`), and one lab test that reads the result of a `prompt.attachment` hook.
`claude plugin test <dir>` ran each one through `$claude()` of `tools/telemetry.ts`, the runner of `just lab`.
The docs say only "a hooks module imports its own files by relative path" (`types/claude-code/index.d.ts:20-24`), and the `extend/mod-api` pages were not loadable in this run.

| Import form | Result |
| --- | --- |
| `from "ms"` | refused |
| `from "ms@2.1.3"` | refused |
| `from "https://esm.sh/ms@2.1.3"` | refused |
| `from "npm:ms@2.1.3"` | refused |

Each failed with `hooks module did not load: cannot import "<spec>" (from hooks/register.ts): a hooks module imports its own files by relative path and "claude-code", nothing else`.
Result: the mod runtime resolves no package import in any form.
So no package goes into the import graph of `hooks/register.ts` (the whole kernel and the `adapters/mod.ts` and `domain/` files), and a copy of package source in `plugins/` would be claudetto code, not a package.

Candidates (`dependencies` and license from the registry metadata, 2026-10-23; the unpacked size of each is the `dist.unpackedSize` field there):

| Candidate | Replaces | License | `dependencies` | Verdict |
| --- | --- | --- | --- | --- |
| `shell-quote` 1.12.0 | `kernel/shell/scan.ts` and its files (1005 lines with `shell.ts`) | MIT | none | No: the kernel is in the hooks graph (`guard`), which loads no package. It also only splits words, and the scan finds heredocs, `$(...)`, and `ansi-c` quoting. |
| `shlex` 3.0.0 | same | MIT | none | No: same reason, and it has no operators. |
| `bash-parser` 0.5.0 | same | MIT | many | No: it has `dependencies`, and the same graph rule. |
| `sh-syntax` 0.7.0 | same | MIT | none listed | No: the same graph rule. |
| `marked` 18.1.1 | `slices/spec/domain/markdown.ts` (244 of 1823 lines) | MIT | none | No (judged from the code, not prototyped): only CLI adapters import the file, so Bun could load it, but the rules follow the line regexes of OpenSpec 1.14.3 for parity, and a token stream needs a mapping back to raw blocks that adds lines. |
| `remark-parse` 11.0.0, `markdown-it` 15.0.3 | same | MIT | yes | No: they have `dependencies`. |

Adopted: none. The line counts stay as they are.
Pin test: `tests/support/pinned-imports.test.ts` passes on zero imports today and checks each pinned import of `plugins/` against `package.json` and the `dependencies` of the package.
Open: a prototype of `marked` for `markdown.ts` could change the verdict if the parity cases of `tests/claudetto/spec` pass with fewer lines.

## Handoff File in the Change Folder

Writers: `kernel/paths.ts:28` (`CHANGE_HANDOFF_FILE`), `kernel/change.ts:47` (`changeHandoffPath`), `slices/handoff/compact.ts:65-69` (`handoffPath`).
Tests: `plugins/claudetto/tests/change.test.ts:78` and `:87`.
Docs: `src/wiki/claudetto/slices/Handoff-Files.md:20` and `src/wiki/claudetto/Quickstart.md:35`.
Upstream `openspec` writes no handoff file.
Decision: each handoff goes to `.claudetto/handoffs/`, and the handoff text keeps the name of the open change and its next task, and a `handoff.md` has no use because `.claudetto/handoffs/` already holds the handoff files (the user, 2026-10-23).

## Agents

From `research/raw/trim-agents.txt`:

| Agent | Model | Effort |
| --- | --- | --- |
| `researcher` | `claude-sonnet-5-5` | `low` |
| `reviewer` | `claude-sonnet-5-5` | `high` |
| `scout` | `claude-haiku-5-5` | `low` |
| `worker` | `claude-sonnet-5-5` | `medium` |

`reviewer` breaks the cap of the user (Sonnet at most `medium`, Opus at most `high`).
The test `tests/claudetto/agents/faults.test.ts:29` forbids Opus for the reviewer, so a move to Opus also changes that test.
`research/economy.md` decides the model.

## First-Request Text

From `research/raw/trim-tokens.txt`, in characters:

- `main.md` body: `9360`, the largest item.
- The `tool.describe` replacements of 7 tools: `4535`.
- The output style `Concise.md`: `1451`.
- The descriptions of 4 subagents: `258`.
- The context block and the shell blocks: `369`.

With `CHARS_PER_TOKEN` of `kernel/budget.ts`, the `main.md` body alone is near a quarter of the 10k goal (proposed).
So the cut of `main.md` is the largest step to the 10k goal that claudetto controls.

## MiniSpec and Upstream OpenSpec

`node_modules/@fission-ai/openspec` has the artifacts `proposal`, `specs`, `design`, and `tasks` (`research/raw/trim-openspec-diff.txt`).
MiniSpec adds the presets `task`, `story`, and `epic`, with `prd`, `architecture`, and `review` in `epic`.
Its domain and CLI are `778` lines.
A shape that calls the upstream CLI in place of `spec` is `5380` lines in total (`research/raw/trim-target.txt`), but it adds a dependency of `40153` lines (`research/raw/trim-openspec-diff.txt`).
Keep MiniSpec, and keep its commands equal to upstream.
