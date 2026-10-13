# Second check of the status line (P08)

The check compares the 1.0.0 `statusline` slice with the 0.28.0 status line.
The 0.28.0 source is in `plugins/dotclaude/features/statusline/`, and the git tag is `dotclaude--v0.28.0`.
The command for each test is `just test tests/dotclaude/statusline`.
The hook lab is `just lab`.

## Verdicts

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| Pace arrows (`▼` green reserve, `▲` yellow deficit) | `pace.test.ts` | Same as 0.28.0. The glyphs, the colors, the window spans (5 h and 7 d), the pace math (`round(used - 100 * elapsed)`), and the reserve and deficit sides match. | None in the code. Added a test that pins the 3% threshold, which 0.28.0 also has. |
| Separator ` · ` and column alignment | `layout.test.ts`, `snapshot.test.ts`, `render.test.ts` | Works as requested. Rows that do not fit fall back to the unpadded join. | Formatting only: `render.test.ts` was re-formatted by `biome format`. |
| Damaged cache (torn, empty, or non-object) | `git-cache.test.ts` | The damaged text is rejected. `parseSaved` returns `null`, so the status line runs `git` again. | None. The test passes before any fix. |
| `baseName` in `domain/format.ts` splits on `\` | None pins it. | By design, so a Windows path shows its last folder. | None. |
| Non-atomic cache write | Reviewed in `adapters/git-cache.ts` and `src/kernel/node/fs.ts`. | No defect. The git cache writes through `writeAtomic` (a temp file, then a rename). A reader that sees a torn file gets `null` and runs `git` again. | None. |
| `JSON.parse` hits (`adapters/cli.ts`, `adapters/git-cache.ts`, `domain/usage.ts`) | Covered by `cli` and `git-cache` tests. | Each parse is inside a `try`. | None. |

## Rows before and after

The snapshot uses the `NO_COLOR` output with a width of 200 columns.
The input has `5h` at 23% and `7d` at 80%.

Before (commit `1f2159f4`, no arrows, no separator):

```text
⌂ dotclaude  ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦  ▤ 45k/300k 15%  $1.23 +300 -20
◷ 5h 23% 3h12m  ◷ 7d 80% 2d4h
```

After (commit `0f8063af` and this change):

```text
⌂ dotclaude         · ⎇ main ✎2 ↑1 ↓2
◈ Opus 5.5 high ✦   · ▤ 45k/300k 15%     · $1.23 +300 -20
◷ 5h 23% ▼13% 3h12m · ◷ 7d 80% ▲11% 2d4h
```

## Questions for the user

These are differences from the 0.28.0 example of the user.
They are not changes in this package.

1. 1.0.0 draws no usage bars, and it writes no `↻` before the reset time.
   The 0.28.0 example shows both.
2. 1.0.0 puts `5h` and `7d` in one row.
   So the two windows do not align field by field, as in the 0.28.0 two-row layout.
   Should 1.0.0 use one row for each window?
