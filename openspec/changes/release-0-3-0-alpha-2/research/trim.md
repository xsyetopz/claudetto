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
| `spec` | 793 | 600 | shrink | Same five commands as upstream `openspec` (`research/raw/trim-openspec-diff.txt`). |
| `statusline` | 1145 | 700 | shrink | The largest slice for a display. The gradient of the user replaces the theme code. |

Totals from `research/raw/trim-target.txt`: slices `7043` now, plugin TypeScript `8761` now, `5980` as the estimate after the cuts.
The kernel is `1581` lines, and `kernel/shell/scan.ts` alone is `349` (`research/raw/trim-loc.txt`).

## Dead Code

`research/raw/trim-dead.txt` lists `10` exports with no use, such as `BASH_OUTPUT_MAX_CHARS`, `HAIKU_AUTOCOMPACT_WINDOW`, `HANDOFF_LINES_MAX`, and four bounds of `slices/spec/limits.ts`.
It also lists about 50 exports that only their own file uses.
Delete the unused ones, and drop `export` from the rest.

## Handoff File in the Change Folder

Writers: `kernel/paths.ts:28` (`CHANGE_HANDOFF_FILE`), `kernel/change.ts:47` (`changeHandoffPath`), `slices/handoff/compact.ts:65-69` (`handoffPath`).
Tests: `plugins/claudetto/tests/change.test.ts:78` and `:87`.
Docs: `src/wiki/claudetto/slices/Handoff-Files.md:20` and `src/wiki/claudetto/Quickstart.md:35`.
Upstream `openspec` writes no handoff file.
Decision: each handoff goes to `.claudetto/handoffs/`, and the handoff text keeps the name of the open change and its next task (the user, 2026-10-23: "claudetto already has handoffs/ files, so what was the point of handoff.md ?").

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
