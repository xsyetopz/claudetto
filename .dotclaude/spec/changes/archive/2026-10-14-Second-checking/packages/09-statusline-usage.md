---
schema: dotclaude-spec/2
kind: package
id: P09
title: Core plugin: statusline usage items
wave: 2
deps: ["P08"]
owns: ["src/plugins/dotclaude/slices/statusline/","tests/dotclaude/statusline/",".dotclaude/spec/changes/1.0.0/evidence/second-check-statusline-usage.md"]
satisfies: []
verify: just test tests/dotclaude/statusline && just lab
agent: implementer
status: done
---

## Goal

Apply the answers of the user (2026-10-13) on the usage items of the `5h` and `7d` windows of the status line.

## Context

- P08 restored the pace arrows (`domain/pace.ts`, `segments.ts`), put ` · ` between the items, and aligned the columns by place (`domain/rows.ts`).
  Read `.dotclaude/spec/changes/1.0.0/evidence/second-check-statusline.md` first.
- The 0.28.0 source is at the tag `dotclaude--v0.28.0`, in `plugins/dotclaude/features/statusline/{derive,segments,limits,format}.mjs` (`git show dotclaude--v0.28.0:<path>`).
- Answer of the user: put `↻` back before the reset time, as 0.28.0 shows it (`↻1:50pm`, `↻Oct 19 at 7am`).
  Keep the 1.0.0 time format unless 0.28.0 has a better one for the window, and say which you chose.
- Answer of the user: put the run-out clock `⏵` of 0.28.0 back.
  Read how 0.28.0 derives it (the time at which the use reaches 100% at the current rate) and when it shows it (only when the run-out comes before the reset).
  Port the same math, with its bounds in `limits.ts`.
- Answer of the user: put `5h` and `7d` on two rows, one window per row, only where it fits the idiomatic placement of the 1.0.0 rows.
  Read `domain/rows.ts` and the row order.
  When two rows fit the layout (for example, the usage column of the rows, as in the 0.28.0 example where the `5h` and `7d` items stand in one column at the right of the model and folder rows), do it, so that the label, percent, arrow, `⏵`, and `↻` of the two windows align field by field.
  When it does not fit, keep one row and say why in the evidence file.
- Answer of the user: the percent colors of 0.28.0 (`USAGE_LEVELS` by the raw percent) are not good enough, so do better.
  Color the percent by the projected use at the end of the window, from the same rate that gives the pace arrow and `⏵`: green when the projection stays below the warn level, yellow when it passes the warn level, red when it passes 100% (a run-out before the reset).
  Use the raw percent alone when too little of the window has passed (`PACE_MIN_FRACTION`).
  Put each level in `limits.ts`.
  A test pins each color band and the early-window case.
- The 0.28.0 example of the user:

  ```text
  ◆ Opus 5.5 medium ∴     ◧ ░░░░░░ 0k/300k 0% ⇥300k     5h ░░░░░░    1% ▼14% ↻1:50pm
  ▣ dotclaude             ◇ 277k                         7d █░░░░░   13% ▼3%  ↻Oct 19 at 7am
  ```

  The usage bars are not requested.

## Steps

1. Read the P08 evidence, the 1.0.0 slice, and the 0.28.0 source of `⏵`, `↻`, and the usage colors.
2. Write the tests of each answer, and show that they fail on the current code.
3. Change the slice in the style of the code around it.
   Keep each file at 300 lines or less, and each test file at 500 lines or less.
4. Write the evidence file `.dotclaude/spec/changes/1.0.0/evidence/second-check-statusline-usage.md`: each answer, its test, the result, and a plain text sample of the rows before and after, with the color of each percent named.

## Acceptance

- `just test tests/dotclaude/statusline && just lab` passes, or the report says that it did not run and names the cause.
- Each answer of the user has a test that failed before the change.
- The width bound of `width.ts` holds: a row that does not fit drops the alignment, not an item.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- `just generate` may run in the worktree for the tests, and the commit holds no change of `plugins/`.
- Keep a public signature of the kernel.
