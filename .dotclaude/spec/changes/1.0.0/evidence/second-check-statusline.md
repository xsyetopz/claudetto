# Second check of the status line (P08)

The check compares the 1.0.0 `statusline` slice with the 0.28.0 status line.
The 0.28.0 source is in `plugins/dotclaude/features/statusline/`, and the git tag is `dotclaude--v0.28.0`.
The command for each test is `just test tests/dotclaude/statusline`.
The hook lab is `just lab`.

## Verdicts

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| Pace arrows (`▼` green reserve, `▲` yellow deficit) | `pace.test.ts` | Same as 0.28.0. The glyphs, the colors, the window spans (5 h and 7 d), the pace math (`round(used - 100 * elapsed)`), and the reserve and deficit sides match. | None in the code. Added color tests for `▼` green and `▲` yellow, and `7d` reserve and deficit cases. These pass on the current code, so they pin the behavior and show no defect. |
| Finding 1: the arrow colors and the `7d` arrow were not pinned | `pace.test.ts` | Confirmed as a gap in the tests, and no defect in the code. | Added the tests. Five pace tests fail on `1f2159f4`. |
| Finding 2: `joinRow` moved later items left when a middle place was empty | `layout.test.ts` | Confirmed defect. The cost of a row moved left when the context place was empty. Before the fix, the test `a row with an empty middle place keeps its later item in its column` failed. | An empty place now keeps its column as blank space. Tests cover an empty middle place with color codes, a row with fewer items, and a wide glyph. |
| Finding 3: alignment was chosen per row | `layout.test.ts` | Confirmed defect. A row that did not fit lost its padding, and the other rows kept theirs. Before the fix, the test `the rows drop the alignment together when one row does not fit` failed. | The block drops the alignment for all rows when one aligned row does not fit. Each row keeps its items and the ` · ` separator. |
| Finding 4: subagent rows joined with two spaces | `subagents.test.ts` | Confirmed mismatch with the main status line. The pinned test now expects ` · ` and failed before the fix. | Subagent items use `ITEM_GAP`. The subagent rows are not aligned in columns. Each row has optional items and a description that fills the rest, so an empty item would shift the later items. Aligning them needs a pass over all rows, which this package does not include. |
| Finding 5: emoji with default emoji presentation had one column | `width.test.ts` | Confirmed defect. `⚡`, `✅`, `⭐`, and `❌` had one column. Before the fix, the test `an emoji with default emoji presentation takes two columns` failed. The range `0x1f300-0x1faff` was already wide. | Added the `Emoji_Presentation` code points of `0x2300-0x2bff` as ranges. Text-presentation symbols such as `✎` and `◷` keep one column. |
| Damaged cache (torn, empty, or non-object) | `git-cache.test.ts` | The damaged text is rejected. `parseSaved` returns `null`, so the status line runs `git` again. | None. The test passes before any fix. |
| `baseName` in `domain/format.ts` splits on `\` | None pins it. | By design, so a Windows path shows its last folder. | None. |
| Non-atomic cache write | Reviewed in `adapters/git-cache.ts` and `src/kernel/node/fs.ts`. | No defect. The git cache writes through `writeAtomic` (a temp file, then a rename). A reader that sees a torn file gets `null` and runs `git` again. | None. |
| `JSON.parse` hits (`adapters/cli.ts`, `adapters/git-cache.ts`, `domain/usage.ts`) | Covered by `cli` and `git-cache` tests. | Each parse is inside a `try`. | None. |

## Tests that fail on `1f2159f4`

The check puts the `1f2159f4` versions of the `statusline` slice in the tree, runs `just generate`, runs the test folder, and restores `src/` from `HEAD`.
The result is 47 pass and 21 fail.
The failing tests are these:

- Pace: the `5h` arrows, the arrow colors, and the `7d` reserve and deficit (5 tests).
- Snapshots: the rows at 124, 60, and 32 columns, and the colored rows at 124 columns.
- Layout: the ` · ` separator, the column of the separator, the block alignment, the empty middle place, the fewer items, and the wide glyph.
- Subagents: the ` · ` separator in the JSON row.
- Render and change: the first row, the narrow width, and the row without git or limits.
- Width: the emoji test.

Most of these come from the missing ` · ` separator and the missing pace arrows in `1f2159f4`.
The tests that fail only on the defects are the empty middle place, the block alignment, the subagent separator, and the emoji width.

## Rows before and after

The snapshot uses the `NO_COLOR` output with a width of 200 columns.
The input has `5h` at 23% and `7d` at 80%.

Before (commit `1f2159f4`, no arrows, no separator):

```text
⌂ dotclaude  ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦  ▤ 45k/300k 15%  $1.23 +300 -20
◷ 5h 23% 3h12m  ◷ 7d 80% 2d4h
```

After (commits `c248d0ff` and `7e1d95df`):

```text
⌂ dotclaude         · ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦   · ▤ 45k/300k 15%     · $1.23 +300 -20
◷ 5h 23% ▼13% 3h12m · ◷ 7d 80% ▲11% 2d4h
```

At 60 columns, the block drops the alignment for all rows:

```text
⌂ dotclaude · ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦ · ▤ 45k/300k 15% · $1.23 +300 -20
◷ 5h 23% ▼13% 3h12m · ◷ 7d 80% ▲11% 2d4h
```

## Questions for the user

These are differences from the 0.28.0 example of the user.
They are not changes in this package.

1. 1.0.0 draws no usage bars, and it writes no `↻` before the reset time.
   The 0.28.0 example shows both.
   Should 1.0.0 use one row for each window?
2. 0.28.0 showed a run-out time, such as `⏵12:46pm`, after the pace arrow.
   It was red at or above the first `USAGE_LEVELS` value (75) and yellow below it.
   1.0.0 shows no run-out time.
   Should 1.0.0 restore the `⏵` run-out time, and with which color rule?
3. The percent colors of 0.28.0 use `USAGE_LEVELS` in `paint.mjs` (`levelColor`): red at 90 or above, yellow at 75 or above, and green below.
   1.0.0 uses the same `USAGE_LEVELS` values in `paint.level` in `color.ts`.
   Should the percent colors stay as they are in 1.0.0, or follow another rule?
