# Second Check Summary

This file joins the verdicts of the nine evidence files of the second check.
Each row links its evidence file, and the file holds the method and the detail.
The verdicts are `fixed`, `rejected`, `guard` (a test that passes before and after), `accepted`, and `open`.

## Candidates

| Area | Candidate | Verdict | Test | Fix commit |
| --- | --- | --- | --- | --- |
| [kernel](second-check-kernel.md) | Torn last line of `events.jsonl` makes the change unreadable | fixed | `tests/kernel/spec-store.test.ts` | `97c3025c` |
| [kernel](second-check-kernel.md) | `writeAtomic` leaves its temp file when the rename fails | rejected | `tests/kernel/write-atomic.test.ts` | none |
| [kernel](second-check-kernel.md) | `writeAtomic` needs a retry on a Windows rename over an open file | fixed | `tests/kernel/write-atomic.test.ts` | `4d68fdc3` |
| [kernel](second-check-kernel.md) | `shell.ts` returns `truncated` past 200,000 characters | fixed per evidence | `tests/kernel/shell.test.ts` | not found, see Open |
| [kernel](second-check-kernel.md) | Bare `JSON.parse` in the owned paths | rejected | none | none |
| [kernel](second-check-kernel.md) | A write that is not `writeAtomic` in the owned paths | rejected | none | none |
| [kernel](second-check-kernel.md) | A path split on `\` in `rules.ts:101` and `process.ts:47` | open | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Telemetry of the `claude` calls of `tools/` | fixed | `tests/tools/telemetry-env.test.ts` | `4c63f6e6` |
| [repo-tooling](second-check-repo-tooling.md) | The env of `$claude` is built once at import | fixed | `tests/tools/telemetry-env.test.ts` | `91e91553` |
| [repo-tooling](second-check-repo-tooling.md) | A `claude` command outside the helper | fixed | `tests/tools/telemetry-env.test.ts` | `91e91553` |
| [repo-tooling](second-check-repo-tooling.md) | `check` and `ci` differ by `generate --check` | fixed | see evidence | `366f2a50` |
| [repo-tooling](second-check-repo-tooling.md) | `ci` has no type check | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Three packages in one overlap of `tools/generate/` text | open | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Bump to a pre-release target | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Bump from a pre-release current version | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Bump with a dirty tree | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Bump with a read-only target | fixed | `tests/tools/bump-version.test.ts` | `366f2a50` |
| [repo-tooling](second-check-repo-tooling.md) | `sandbox-install --clean` on a missing folder, twice | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | `--clean` on a folder with a read-only file | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | `--clean` on a `config/` of mode `555` | fixed | `tests/lab/sandbox/clean.test.ts` | `7653bfe9` |
| [repo-tooling](second-check-repo-tooling.md) | Bare `JSON.parse` in `tools/lint.ts:15` | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Bare `JSON.parse` in `tools/generate/emit/texts.ts:80` | open | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Bare `JSON.parse` in `tools/generate/emit/texts.ts:153` | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Non-atomic write in `tools/generate/index.ts:23` | open | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Non-atomic write in `tools/bump-version.ts:120` | open | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Non-atomic write in `tools/lock.ts:40` | rejected | none | none |
| [repo-tooling](second-check-repo-tooling.md) | Path split on a separator in `tools/generate/` (three hits) | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Model id with a one-digit major and a date suffix | fixed | `attribution.test.ts` | `bfe1aee3` |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Model id with a minor version and `[1m]` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Model id with no version and `[1m]` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Model id with no version | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Chain of two `git commit` commands with the trailer | fixed | `attribution.test.ts` | `4b469a7d` |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Chain of two `gh pr create` bodies with the footer | fixed | `attribution.test.ts` | `4b469a7d` |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `echo "$TRAILER" > msg && git commit -F msg` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `git commit -m a && git commit --amend --no-edit` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `git --no-pager commit` gives no trailer | fixed | `attribution.test.ts` | `bfe1aee3` |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `git --git-dir=x -P commit` gives no trailer | fixed | `attribution.test.ts` | `bfe1aee3` |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `--trailer` before the model line in `git commit` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Another `Co-Authored-By` in the message | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Message that already holds the model line | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Heredoc or `-F -` message | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `-F msg` before the trailer, and `--amend` alone | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `attribution` setting with an empty `commit` or `pr` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | User `attribution.commit` line is used | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Subagent call names `Claude` | rejected | `attribution.test.ts` | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `gh pr create --body=...` gives no footer | open | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | Heredoc body in `gh pr create` other than `<<'EOF'` | open | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `dotclaude-run-checks` with a quoted argument | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `dotclaude-run-checks` with an assignment prefix | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `dotclaude-run-checks` with output and no final newline | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `dotclaude-run-checks ""` with `"bun test"` runs one command | fixed | run-checks test | `4b469a7d` |
| [core-prompt-agents](second-check-core-prompt-agents.md) | `JSON.parse` in `decide` throws outside a `try` | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | A slice that throws at load (duplicate handler in `tools/generate/order.ts`) | open | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | The slice order in `plugin.ts` | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | The `evals/` folder of the core plugin | rejected | none | none |
| [core-prompt-agents](second-check-core-prompt-agents.md) | The `prompt/evals/` scaffold `report-count` | open | none | none |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Torn last line: reader throws | fixed | `tests/dotclaude/spec/cli/validate.test.ts` | `97c3025c` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Torn last line: validate names the file and line | guard | `tests/dotclaude/spec/cli/validate.test.ts` | `97c3025c` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Torn line stays after an append | fixed | `tests/dotclaude/spec/cli/append.test.ts` | `97c3025c` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `fsync` in `appendEvent` | rejected | none | none |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Write guard gives no ask on a command over the shell scan bound | fixed | `tests/dotclaude/asks/shellwrites.test.ts` | `79b38501` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `git${IFS}reset${IFS}--hard` allowed | fixed | `tests/dotclaude/guard/substitution.test.ts` | `8eef4a26` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `alias g=git` with `g reset --hard` allowed | fixed | `tests/dotclaude/guard/substitution.test.ts` | `07e64460` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `alias git=echo` with `git reset --hard` allowed | fixed | `tests/dotclaude/guard/substitution.test.ts` | `07e64460` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `git${x:-$IFS}reset --hard` allowed | fixed | `tests/dotclaude/guard/substitution.test.ts` | `07e64460` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `git commit -m '$IFS'` loses `-m` | fixed | `tests/dotclaude/guard/substitution.test.ts` | `07e64460` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `command alias`, `builtin alias`, and `al\ias` hide the verb | fixed | `tests/dotclaude/guard/substitution.test.ts` | `79a8c5c8` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Alias body split on whitespace only | fixed | `tests/dotclaude/guard/substitution.test.ts` | `79a8c5c8` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `git$9 reset --hard` and the other empty parameters | fixed | `tests/dotclaude/guard/substitution.test.ts` | `79a8c5c8` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `git$IFS$9reset --hard` | rejected | none | `33280fe9` |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Normal commands near each fix | guard | none | none |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | `$(echo reset)`, backticks, `env git`, `command git`, `xargs git` | guard | none | none |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Path `\` separator and `C:foo` in `slices/guard/domain/paths.ts` | rejected | none | none |
| [core-guard-asks-spec](second-check-core-guard-asks-spec.md) | Bare `JSON.parse`, non-atomic write, and path split in `slices/asks` and `slices/sembr` | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `settings.json` write is not atomic for a symlink | fixed | `tests/dotclaude/setup/settings.test.ts` | `2c8846e4` |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `settings.json` write drops the file mode | fixed | `tests/dotclaude/setup/settings.test.ts` | `2c8846e4` |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Hard link to the old `settings.json` keeps the old text | accepted | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Temp file left by the settings write | guard | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `mythosInCatalog` calls `statSync` outside its `try` | fixed | see evidence | `884b992b` |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Top-level `[]` or `null` settings file | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Settings file with a byte order mark, or with comments | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Key with a scalar where the snippet has an object | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `statusLine` of another tool, `availableModels`, and a second `--apply` | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `claude auth status` output that is empty, torn, or not an object | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Exclude line torn by two runs | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Exclude duplicate line from read then append | open | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `HANDOFF_WAIT_TURNS` in `handoff/limits.ts` | open | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Handoff file that is empty or partial | open | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Session ends between the write prompt and the resume | open | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | `JSON.parse` in `drift-cmd.ts:27` and other hits | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Backslash path handling in `merge.ts` | rejected | none | none |
| [core-setup-rules-handoff](second-check-core-setup-rules-handoff.md) | Non-atomic write pattern in the owned paths | guard | none | none |
| [add-on-plugins](second-check-add-on-plugins.md) | `briefSize` throws on a `null` line | fixed | `tests/sessions/usage/report.test.ts` | `ce6847fd` |
| [add-on-plugins](second-check-add-on-plugins.md) | `agentType` throws on a `null` meta file (usage) | fixed | `tests/sessions/usage/report.test.ts` | `ce6847fd` |
| [add-on-plugins](second-check-add-on-plugins.md) | `agentType` throws on a `null` meta file (start-cost) | fixed | `tests/sessions/start/readers.test.ts` | `ce6847fd` |
| [add-on-plugins](second-check-add-on-plugins.md) | `parsePlugins` throws on a `null` installed-plugins file | fixed | `tests/sessions/usage/report.test.ts` | `ce6847fd` |
| [add-on-plugins](second-check-add-on-plugins.md) | Capture JSONL reader has no torn-line handling | rejected | none | none |
| [add-on-plugins](second-check-add-on-plugins.md) | 200 reply of `count_tokens` whose body is not JSON | guard | `tests/lab/capture/sizing.test.ts` | none |
| [add-on-plugins](second-check-add-on-plugins.md) | `dotclaude-sandbox --clean` with a read-only `config/` | fixed | `tests/lab/sandbox/clean.test.ts` | `7653bfe9` |
| [add-on-plugins](second-check-add-on-plugins.md) | `dotclaude-sandbox --clean` with a symlinked root | fixed | `tests/lab/sandbox/clean.test.ts` | `1b7093c6` |
| [add-on-plugins](second-check-add-on-plugins.md) | `claudeMdExcludes` with a UNC path or a Windows path | guard | `tests/dcc-plugin-agents-md/agents.test.ts` | none |
| [add-on-plugins](second-check-add-on-plugins.md) | `claudeMdExcludes` with a lower-case drive letter | fixed | `tests/dcc-plugin-agents-md/agents.test.ts` | `7653bfe9` |
| [add-on-plugins](second-check-add-on-plugins.md) | Bare `JSON.parse` hits in the add-on plugins | rejected | none | none |
| [add-on-plugins](second-check-add-on-plugins.md) | Non-atomic `Bun.write` hits in `capture`, `schema`, and `sandbox` | accepted | none | none |
| [add-on-plugins](second-check-add-on-plugins.md) | Path split on `\` in `agents/lab/agents.test.ts:47` | accepted | none | none |
| [you-should-know](second-check-you-should-know.md) | The band was never drawn, because each `Button` had no `onPress` | fixed | `the first changing call of a turn shows the topic in the band` | `5d8e9bce` |
| [you-should-know](second-check-you-should-know.md) | The heads-up note did not reach the next call of the main agent | fixed | heads-up tests | `5d8e9bce` |
| [you-should-know](second-check-you-should-know.md) | Unawaited `$` calls may be cancelled or dropped | open | none | none |
| [you-should-know](second-check-you-should-know.md) | The tool waited for a model call slower than its bound | fixed | band tests | `5d8e9bce` |
| [statusline](second-check-statusline.md) | Pace arrows (`▼` and `▲`) and their colors were not pinned | fixed | `pace.test.ts` | `c248d0ff` |
| [statusline](second-check-statusline.md) | `joinRow` moved later items left when a middle place was empty | fixed | `layout.test.ts` | `c248d0ff` |
| [statusline](second-check-statusline.md) | Alignment was chosen per row | fixed | `layout.test.ts` | `c248d0ff` |
| [statusline](second-check-statusline.md) | Subagent rows joined with two spaces | fixed | `subagents.test.ts` | `7e1d95df` |
| [statusline](second-check-statusline.md) | Emoji with default emoji presentation had one column | fixed | `width.test.ts` | `7e1d95df` |
| [statusline](second-check-statusline.md) | Damaged cache (torn, empty, or non-object) | guard | none | none |
| [statusline](second-check-statusline.md) | `baseName` splits on `\` | rejected | none | none |
| [statusline](second-check-statusline.md) | Non-atomic cache write | rejected | none | none |
| [statusline](second-check-statusline.md) | `JSON.parse` hits in the status line | rejected | none | none |
| [statusline-usage](second-check-statusline-usage.md) | Reset time `↻`, run-out `⏵`, and projected color | fixed | `change.test.ts` | `ea2f6bb4` |
| [statusline-usage](second-check-statusline-usage.md) | Raw percent early in the window, and `5h`/`7d` rows | fixed | `pace.test.ts` | `ea2f6bb4` |
| [statusline-usage](second-check-statusline-usage.md) | Meridiem after U+202F or U+00A0 stays `PM` | fixed | `clock.test.ts` | `d6b8cd16` |
| [statusline-usage](second-check-statusline-usage.md) | `renderRows` renders all four plans on each run | fixed | `rows` test | `d6b8cd16` |
| [statusline-usage](second-check-statusline-usage.md) | Compact mode pads the percent to four columns | fixed | `segments` test | `d6b8cd16` |
| [statusline-usage](second-check-statusline-usage.md) | End anchor of the `change` test is lost | guard | `change.test.ts` | none |
| [statusline-usage](second-check-statusline-usage.md) | Reset time dropped from the `5h` assertions | guard | `pace.test.ts` | none |
| [statusline-usage](second-check-statusline-usage.md) | `spend` column test deleted | guard | none | none |

## Open

These defects stay open after the second check, and each has no fix in this change.

- The `tools/generate/` overlap text is the spec text, and the tool works as designed.
- `tools/generate/emit/texts.ts:80` throws a `SyntaxError` for a broken `hooks.json`, and the message does not name the file.
- `tools/generate/index.ts:23` writes a file without a temp file, so a crash leaves a short file.
- `tools/bump-version.ts:120` writes the targets one by one, so a failed write after the first target leaves a mix of versions.
- `rules.ts:101` and `process.ts:47` split a path on `\`.
- `gh pr create` gives no footer for `--body=...` or for a heredoc that is not `<<'EOF'`, in `call.ts:52` and `call.ts:26`.
- `prompt/evals/` holds the `report-count` scaffold, and no test reads it.
- `exclude-step.ts:49,54` can write a duplicate exclude line when two runs race, and no test covers the race.
- `resume` in `handoff/adapters/mod.ts:151-156` accepts an empty or partial file.
- A session that ends between the write prompt and the resume loses the pending state, by design.
- `HANDOFF_WAIT_TURNS` has a lab gap, because the test loops over a copy of the bound.
- Unawaited `$` calls in the you-should-know plugin may be cancelled or dropped after the hook returns.
- In `domain/rows.ts`, the last plan drops the items at the right when no plan keeps every item.
- The fix commit of the `shell.ts` `truncated` candidate is not in the history of this branch, so its fix needs a check.
