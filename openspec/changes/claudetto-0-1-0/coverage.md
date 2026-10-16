# Coverage of the Faults

This file maps each fault of [faults.md](faults.md) and each row of [faults-review.md](faults-review.md) to a task of [tasks.md](tasks.md).
Task 17.5 checks that each named task is done.
The register has two V1 rows: V1 of Claude Code 2.1.300 and V1 of the user settings.

## Register

| Fault | Task |
| --- | --- |
| S1 | 6.1 |
| S2 | 7.1 |
| S3 | 2.1 removes the `handoff` slice, and in 3.1 the handoff enters as a compaction message |
| S4 | 8.6 |
| S5 | 8.5 |
| S6 | 8.5 |
| S8 | 8.6 |
| S9 | 9.1 |
| S10 | 5.1 |
| S11 | 7.3, 9.4 |
| U1 | 7.3 |
| U2 | 8.4 |
| U3 | 8.3 |
| U5 | 16.1, 16.2, 16.3 |
| U7 | 11.2, 11.3 |
| U8 | 3.1 to 3.5 |
| U9 | 9.4 |
| U10 | 4.4 |
| L1 | 3.4, 4.2 |
| L3 | 2.1, 16.2 |
| N1 | 16.2 |
| N2 | 11.1 |
| N3 | No task: the fault is in Claude Code, and `claudetto` has no `Setup` hook of type `mcp_tool`. The upstream issue is not posted. |
| N4 | 8.4, 8.5 |
| N5 | 3.8, 16.2 |
| N6 | 1.1: the add-on stays off (decision of the user) |
| N7 | 8.5 |
| N8 | 8.5 |
| N9 | 4.2 |
| N10 | 4.2 |
| N11 | 4.4 |
| E1 | 2.1: removed with the `spec` slice |
| E2 | 2.1: removed with the `spec` slice |
| E3 | 11.3 |
| E4 | 1.1: removed with its plugin |
| E5 | 4.3 |
| E6 | 9.5 |
| E7 | 6.2 |
| E8 | 4.4 |
| W1 | 8.6 |
| O1 | 1.5 |
| O2 | 9.4 |
| C1 | The lint ignore is done, and 3.1 lints the written file |
| C2 | 1.8 |
| C3 | 1.9 |
| V1 (2.1.300) | 2.6 |
| V2 | 3.1 |
| V3 | 8.6 |
| V4 | 7.2 |
| V5 | No task: design input |
| V6 | 4.1 |
| V7 | 1.10 |
| V1 (user settings) | 3.4, 8.5 |
| S7, L2, L4, U6, W2 | No task: not faults |

## Review Rows

| Rows | Slice | Task |
| --- | --- | --- |
| 1 to 7 | `agents-md` | 1.1: removed with its plugin |
| 8, 12, 13 | `agents` | 7.1 |
| 9 to 11 | `agents` | 7.3 |
| 14, 15 | `asks` | 6.2 |
| 16 to 20 | `attribution` | 6.4 |
| 21, 23 | `browser` | 12.1 |
| 22, 24 to 28 | `browser` | 12.2 |
| 29 to 34 | `checks` | 6.3 |
| 35 to 40 | `codegraph` | 13.2 |
| 41 to 45 | `decide` | 8.1 |
| 46 to 51 | `docs` | 14.1 |
| 52, 53 | `guard` | 6.1 |
| 54, 55, 57 | `handoff` | 2.1: removed with the slice |
| 56 | `handoff` | 3.2 |
| 58 to 62 | `kernel` | 2.2 |
| 63 to 67 | `kernel` | 2.5 |
| 68, 72 | `lab` | 15.3 |
| 69 to 71 | `lab` | 15.2 |
| 73 | `prompt` | 4.2 |
| 74, 75 | `prompt` | 4.1 |
| 76 | `prompt` | 4.3 |
| 77 to 79 | `rules` | 2.1: removed with the slice |
| 80, 81 | `sembr` | 8.2 |
| 82 to 85 | `sessions` | 16.1 |
| 86 to 89 | `sessions` | 16.3 |
| 90 to 97 | `setup` | 8.4 |
| 98 to 105 | `spec` | 2.1: removed with the slice |
| 106 to 108 | `stamp` | 2.1: removed with the slice |
| 109 to 113 | `statusline` | 5.5 |
| 114 to 120 | `styles` | 8.3 |
| 121 | `surface` | 4.4 |
| 122 to 128 | `tools` | 1.11 |
| 129 to 131 | `trim` | 4.4 |
| 132 | `you-should-know` | 11.4 |
| 133, 134 | `you-should-know` | 11.2 |
| 135, 138 | `you-should-know` | 11.3 |
| 136, 137 | `you-should-know` | 11.4 |
