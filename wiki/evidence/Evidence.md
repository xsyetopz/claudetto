# Evidence

The index of the evidence pages.
Each row gives what the page measures, its date, its Claude Code version, and its source file.
A date or a version that the page does not state is marked "not stated".

## Measurement pages

| Page | What it measures | Date | Claude Code version | Source file |
| --- | --- | --- | --- | --- |
| [Handoff-Cost](Handoff-Cost) | The cost of one `/dotclaude:handoff` and one `/compact`, from the same session | 2026-10-12 | `2.1.296` | `wiki/evidence/Handoff-Cost.md` |
| [Usage-Evidence](Usage-Evidence) | The plans, the prices, the models, and the usage of dotclaude 1.0.0, with one measured week | Measured week 2026-09-21 to 09-28, measures of 2026-10-03, prices of 2026-10-13 | `2.1.287` for one fact, otherwise not stated | `wiki/evidence/Usage-Evidence.md` |
| [Prompt-Variants](Prompt-Variants) | The system prompt variant of each model family, the verification line of each subagent block, and the size bounds of the first request | Not stated | Not stated | `wiki/evidence/Prompt-Variants.md`, with the variants in `src/plugins/dotclaude/slices/prompt/domain/variants.ts` |
| [Evals](Evals) | The suite of 12 cases, how to run it, and where its current results are | Newest full run 2026-10-10 | `2.1.296` for the runs | `wiki/evidence/Evals.md`, with the cases in `src/plugins/dotclaude/evals/` and `src/plugins/dotclaude/slices/*/evals/` |

## Evidence files

The records below are in `.dotclaude/spec/changes/1.0.0/evidence/`.
They are inputs to the pages above and to the design.
When a record has no date in its text, the date is the date of its commit.

- `automode.md`: the auto mode classifier, from `claude auto-mode defaults` and `claude auto-mode config`.
  Date 2026-10-12, Claude Code `2.1.296`.
- `claude-directory-home.md`: the files of `~/.claude.json` and `~/.claude/`, part of the P28 report.
  Date 2026-10-12, version not stated.
- `claude-directory-rules.md`: the rules and agents answers of the P28 report, and its open items.
  Date 2026-10-12, Claude Code `2.1.211` and `2.1.296`.
- `claude-directory.md`: the files of a project `.claude/` and of the files next to it, the P28 report.
  Date 2026-10-12, Claude Code `2.1.296`.
- `destructive-floor.md`: the critique evidence of the destructive floor.
  Date 2026-10-13, version not stated.
- `dotclaude-directory.md`: the files and folders that code in `src/` writes, the P32 report.
  Date 2026-10-12, version not stated.
- `extract.md`: the built-in text of Claude Code, from two live sessions with only the capture plugin, the P01c evidence.
  Date 2026-10-12, Claude Code `2.1.296`.
- `handoff-cost.md`: the cost of one `/dotclaude:handoff` and one `/compact`, the record of [Handoff-Cost](Handoff-Cost).
  Date 2026-10-12, Claude Code `2.1.296`.
- `inventory.md`: the built-in parts of Claude Code that a setting, an env var, or a mod event can turn off, the P01d report.
  Date 2026-10-12, Claude Code `2.1.296`.
- `rules-slice.md`: the findings of step 4 of P29.
  Date 2026-10-12, Claude Code `2.1.296`.
- `tiers.md`: the account tiers of Claude Code, from two investigator runs on the strings of the binary.
  Date 2026-10-12, Claude Code `2.1.296`.
- `worker-lessons.md`: the lessons of the Bun port to Rust, which P35 uses.
  Dates 2026-10-12 and 2026-10-13, version not stated.
- `zero-token.md`: the tasks that dotclaude 1.0.0 gives to Claude, and that a hook, a script, a setting, or a status line command can do, the P33 list.
  Date 2026-10-12, version not stated.
