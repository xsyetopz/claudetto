# Bounds

A bound is a fixed limit, such as a timeout, a size, or a token count.
This page lists the shared and repository bounds with their values and files.
The slice bounds are on [Bounds for Slices](Bounds-Slices) and [Bounds for Add-Ons](Bounds-Add-Ons).

## Where a New Bound Goes

Each bound has one owner file, and tests pin the copies in code and config.
Pick the tier by who reads the bound:

| Tier | File | Use when |
| --- | --- | --- |
| Kernel | `plugins/claudetto/kernel/node/limits.ts` | The kernel code of the plugin reads it |
| Module | `plugins/claudetto/modules/<module>/limits.ts` | One module reads it, or the modules that share it import it from the module that owns it |
| Repository | `tools/limits.ts` | Only tests and tools read it, so it does not ship |

A value in a `{{...}}` placeholder is filled from the code when `just generate` runs.

## Shared Runtime Bounds

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `CONTEXT_WINDOW` | `{{CONTEXT_WINDOW}}` | `plugins/claudetto/modules/session/limits.ts` | The context window in tokens, which the settings snippet sets for Claude Code. |
| `COMPACT_OUTPUT_RESERVE` | `20,000` | `plugins/claudetto/modules/session/limits.ts` | The output reserve that Claude Code takes from the compaction window. |
| `CONTEXT_BLOCK_MARGIN` | `23,000` | `plugins/claudetto/modules/session/limits.ts` | The tokens below the window at which the client blocks the next request as too long. |
| `USAGE_LEVELS` (low) | `{{USAGE_LEVEL_LOW}}` | `plugins/claudetto/modules/session/limits.ts` | The percent at which the status line shows a use in the warning color. It applies to the pace of a limit and to the context of a subagent. |
| `USAGE_LEVELS` (high) | `{{USAGE_LEVEL_HIGH}}` | `plugins/claudetto/modules/session/limits.ts` | The percent at which the status line shows a use in the limit color. It applies to the pace of a limit and to the context of a subagent. |
| `HANDOFF_TRIGGER_TOKENS` | `{{HANDOFF_TRIGGER_TOKENS}}` | `plugins/claudetto/modules/session/limits.ts` | The context at which the auto handoff of an Opus, Sonnet, or Fable session starts. |
| `HAIKU_HANDOFF_TRIGGER_TOKENS` | `{{HAIKU_HANDOFF_TRIGGER_TOKENS}}` | `plugins/claudetto/modules/session/limits.ts` | The context at which the auto handoff of a Haiku session starts. |
| `AUTOCOMPACT_PCT` | `{{AUTOCOMPACT_PCT}}` | `plugins/claudetto/modules/session/limits.ts` | The value of `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, which starts the auto compaction at `HANDOFF_TRIGGER_TOKENS` in the window `CONTEXT_WINDOW`. |
| `HAIKU_AUTOCOMPACT_WINDOW` | `{{HAIKU_AUTOCOMPACT_WINDOW}}` | `plugins/claudetto/modules/session/limits.ts` | The `autoCompactWindow` of a Haiku model, which starts the auto compaction below `HAIKU_HANDOFF_TRIGGER_TOKENS`. |
| `SHELL_SCAN_MAX_CHARS` | `200,000` | `plugins/claudetto/modules/shell/limits.ts` | The most characters that `parse` in `plugins/claudetto/modules/shell/domain/shell.ts` reads in one command with its nested scripts. |
| `BRACE_WORDS_MAX` | `256` | `plugins/claudetto/modules/shell/limits.ts` | The most words that the brace expansion of one word gives. A word that gives more is unreadable. |
| `RENAME_TRIES` | `10` | `plugins/claudetto/kernel/node/limits.ts` | The tries of a rename in `writeAtomic`, the first one included. |
| `RENAME_WAIT_MS` | `100` | `plugins/claudetto/kernel/node/limits.ts` | The wait in milliseconds between two tries of a rename in `writeAtomic`. |

## Repository Bounds

| Name | Value | File | Purpose |
| --- | --- | --- | --- |
| `WORKTREE_TEST_TIMEOUT_MS` | `15,000` | `tools/limits.ts` | The time for one test that makes a `git worktree`. |
| `BUNDLE_SCAN_TIMEOUT_MS` | `60,000` | `tools/limits.ts` | The time for one test that scans the bundle of the installed `claude`. |
| `STUB_RUN_TIMEOUT_MS` | `30,000` | `tools/limits.ts` | The time for one `claude` run against the stub of the Messages API. |
| `CTX7_HELP_TIMEOUT_MS` | `30,000` | `tools/limits.ts` | The time for the run of `ctx7 --help` that checks the pinned `ctx7`. |
| `OPENSPEC_RUN_TIMEOUT_MS` | `30,000` | `tools/limits.ts` | The time for one run of the OpenSpec CLI in the parity test of MiniSpec. |
| `PIN_RUNS_TIMEOUT_MS` | `180,000` | `tools/limits.ts` | The time for all the stub runs of the settings pin test. |
| `STUB_RUNS_AT_ONCE` | `6` | `tools/limits.ts` | The most stub runs at a time in the settings pin test. |
| `SKILL_MAX_TOKENS` | `5,000` | `tools/limits.ts` | The most tokens of one `SKILL.md` of a plugin, as 4 characters for each token. After a compaction, Claude Code keeps only 5,000 tokens of each skill that ran. |
| `EVAL_MIN_RUNS_PER_ARM` | `10` | `tools/limits.ts` | The fewest runs of each arm of an eval. |
| `MIN_CLAUDE_CODE_VERSION` | `2.1.310` | `tools/limits.ts` | The lowest Claude Code version that claudetto is built for. |
| `DOCKER_CPUS` | `4` | `tools/limits.ts` | The CPUs of the container of `just docker`. |
| `EVAL_MAX_COST_USD` | `5` | `tools/limits.ts` | The most US dollars for one `just eval` run. |
| `LINUX_TOKEN_MIN_MINUTES` | `30` | `tools/limits.ts` | The fewest minutes of life of the access token before `just sandbox-linux` sends the login to its container. |
| `LINUX_SESSION_MODEL` | `haiku` | `tools/limits.ts` | The model of the one session of `just sandbox-linux`, which only runs one `Bash` call. |

## Source of the Binary Facts

Two shared bounds depend on the Claude Code binary:
`CONTEXT_WINDOW` and `CONTEXT_BLOCK_MARGIN`.
`CONTEXT_BLOCK_MARGIN` is the output reserve of 20,000 tokens plus 3,000 tokens of the `2.1.303` bundle.
The `+3,000` was not found by name in the `2.1.304` bundle, so it stays a claim of `2.1.303` only.
The `2.1.303` and `2.1.304` bundles cap the window of some models at 200,000 tokens.
The `2.1.305` bundle changed the window resolver, and no live check shows its cap.
The env var and the setting win first in each of them, so the settings snippet sets `CONTEXT_WINDOW` in `autoCompactWindow`.
The `2.1.303` to `2.1.305` bundles start the auto compaction at `min(floor(E × pct / 100), E − 13000)`, with `E` the window less `COMPACT_OUTPUT_RESERVE`.
`AUTOCOMPACT_PCT` and `HAIKU_AUTOCOMPACT_WINDOW` come from this formula.

## Related Pages

- [Bounds for Slices](Bounds-Slices)
- [Bounds for Add-Ons](Bounds-Add-Ons)
- [Settings Snippet](Settings-Snippet)
- [Handoff](Handoff)
