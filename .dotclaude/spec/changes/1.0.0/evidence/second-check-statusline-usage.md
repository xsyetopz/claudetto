# Second check of the status line usage items (P09)

The check covers the answers of the user (2026-10-13) on the usage items of the `5h` and `7d` windows.
The slice is in `src/plugins/dotclaude/slices/statusline/`, and the tests are in `tests/dotclaude/statusline/`.
The base commit is `85509760`, and the change is `ea2f6bb4`.
The command for the tests is `just test tests/dotclaude/statusline`.
The hook lab is `just lab`.

## Answers of the user

| Answer | Test | Result | Choice |
| --- | --- | --- | --- |
| Put `↻` before the reset time. | `limit-rows.test.ts`, the test with the glyph `↻` before the time. `clock.test.ts`, the clock forms. `narrow-rows.test.ts`, the countdown at 60 columns. | Pass. | The clock form (`↻3:12pm`, `↻Oct 14 at 4pm`) where it fits. The countdown (`↻3h12m`) where it does not. |
| Put the run-out clock `⏵` back. | `runout.test.ts`, the run-out time after the arrow, the time of 100% at the current rate, and the three cases with no run-out time. | Pass. | The run-out time shows only when the use reaches 100% before the reset. It is `⏵` in red, after the pace arrow. |
| Color the percent by the projected use. | `usage-color.test.ts`, five tests. | Pass. | Green when the projection stays below `PROJECTED_WARN` (75). Yellow from 75. Red above `PROJECTED_RUNOUT` (100). |
| Use the raw percent early in the window. | `usage-color.test.ts`, the two early-window tests. | Pass. | Before `PACE_MIN_FRACTION` (3%) of the window has passed, the raw percent gives the color. |
| Put `5h` and `7d` on two rows, aligned by field. | `limit-rows.test.ts`, three tests. | Pass. | At 124 columns, `7d` shares the folder row and `5h` shares the model row. The label, percent, arrow, `⏵`, and `↻` start in one column. |
| Keep one row when two rows do not fit. | `narrow-rows.test.ts`, the test at 60 columns. | Pass. | At 60 columns, both windows stay in one row with countdown times. |

The bounds of the answers are in `limits.ts`.
`PROJECTED_WARN` takes its value from `USAGE_LEVELS[0]` in `src/kernel/budget.ts`, so the level is not a second copy.

## Plan of the rows

`renderRows` in `domain/rows.ts` tries four plans in order.
The plans are two rows with clock times, two rows with countdown times, one row with clock times, and one row with countdown times.
It uses the first plan that keeps every item.
The reason is the width rule of the acceptance: a row that does not fit drops the alignment, not an item.

## Fail before the change

The implementer reported these results on `85509760` with the new tests.
This check did not run them again.

- Nine tests fail.
- `clock.test.ts` and `runout.test.ts` fail on import, because `clock` and `paceOf` do not exist on base.
- Two tests in `usage-color.test.ts` fail.
- The early-window tests and the 124-column clock test of `narrow-rows.test.ts` pass on base, so they guard the behavior and do not show a change.

## Other changes in the commit

- The test for a separator with an empty place before the next item is `a separator with an empty place before the next item sits next to that item`.
  It is in `narrow-rows.test.ts`, not in `layout.test.ts` as the implementer report says.
- Old tests changed: `pace.test.ts` (6 expectations, with a fixed 4-column percent field), `change.test.ts` (the end anchor), `layout.test.ts` (4 tests), `snapshot.test.ts` (5 inline snapshots), and `render.test.ts` (3 expectations).

## Rows before and after

The samples are the inline snapshots of `tests/dotclaude/statusline/snapshot.test.ts`.
The 124-column and 60-column samples use `NO_COLOR`.
The colors come from the color snapshot of 124 columns, and from a render at 60 columns with colors.

Before, at 124 columns (`85509760`):

```text
⌂ dotclaude         · ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦   · ▤ 45k/300k 15%     · $1.23 +300 -20
◷ 5h 23% ▼13% 3h12m · ◷ 7d 80% ▲11% 2d4h
```

Colors before, from the 124-column color snapshot of `85509760`: `5h` `23%` green, `▼13%` green, `7d` `80%` yellow, `▲11%` yellow.
The 60-column sample of `85509760` has the same input, so its colors are the same.

After, at 124 columns (`ea2f6bb4`):

```text
⌂ dotclaude       · ⎇ main ✎2 ↑1 ↓2                  · ◷ 7d  80% ▲11%  ⏵Oct 13 at 5pm ↻Oct 14 at 4pm
◈ Opus 5.5 high ✦ · ▤ 45k/300k 15%  · $1.23 +300 -20 · ◷ 5h  23% ▼13%                 ↻3:12pm
```

Colors after, at 124 columns: `7d` `80%` red, `▲11%` yellow, `⏵` red, `↻` dim, `5h` `23%` green, `▼13%` green, and `↻` dim.

Before, at 60 columns (`85509760`):

```text
⌂ dotclaude · ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦ · ▤ 45k/300k 15% · $1.23 +300 -20
◷ 5h 23% ▼13% 3h12m · ◷ 7d 80% ▲11% 2d4h
```

After, at 60 columns (`ea2f6bb4`):

```text
⌂ dotclaude · ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦ · ▤ 45k/300k 15% · $1.23 +300 -20
◷ 5h  23% ▼13% ↻3h12m · ◷ 7d  80% ▲11% ⏵1d5h ↻2d4h
```

Colors after, at 60 columns: `7d` `80%` red, and `5h` `23%` green.
The 60-column colors come from a render with the same input as the 124-column sample.

## Results

- `just test tests/dotclaude/statusline` passes 88 tests, with 0 failures, on `ea2f6bb4`.
- `just lab` exits with 0, and its 8 tests pass.

## Not checked in this file

- The fail-before results of the tests were not run again.
- `just check` was not run for this file.
  It is a Markdown file that the repository does not generate.

## Notes for the reviewer

- The change to `change.test.ts` removes the end anchor of the expectation.
  The first row no longer has to end with the id and the count.
  The test now passes when the text is anywhere in the row, so it checks less than before.
- In `domain/rows.ts`, when no plan keeps every item, the last plan drops items at the right.
  The acceptance does not cover this case.
