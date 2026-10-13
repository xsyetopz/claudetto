# Second check of the core prompt and agents (P03)

The check ran the generated copies in `plugins/dotclaude/` and the Bun tests in `tests/`.
Each new test was run before its fix and after it, unless the row says that it passed before the fix too.
Line numbers are from the source in `src/`, at the P03 commits.
The lab tests are in `src/plugins/dotclaude/slices/attribution/lab/attribution.test.ts`, and `claude plugin test` runs their copies.
The folder `tests/dotclaude/attribution/` named in the brief does not exist, so the attribution tests live in the lab.

## Verdicts

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| A model id with a one-digit major and a date suffix, such as `claude-sonnet-4-20250514`, gives `Claude Sonnet 4.20250514` | `attribution.test.ts`, "a model id with a one-digit major version and a date suffix" (fails before the fix) | defect | `domain/lines.ts:14` makes the minor version optional, and `lines.ts:29` shows the major version alone when there is no minor |
| A model id with a minor version and `[1m]`, such as `claude-opus-4-1-20250805[1m]`, gives `Claude Opus 4.1` | `attribution.test.ts`, "a model id with a minor version and a `[1m]` suffix" (passes before and after) | rejected: the kept case works | none |
| A model id with no version and `[1m]`, such as `claude-opus[1m]`, gives `Claude` | `attribution.test.ts`, "a model id with no version and a `[1m]` suffix" (passes before and after) | rejected: the kept case works | none |
| A model id with no version, such as `claude-opus`, gives `Claude` | `attribution.test.ts`, "a model that has no name and version" (passes) | rejected by design: `lines.ts` returns `Claude` for an id with no family and version, and `CHANGELOG.md:29` states it | none |
| A chain of two `git commit` commands, the first with the trailer, gives no trailer to the second | `attribution.test.ts`, "a chain whose first commit holds the trailer" (fails before the fix) | defect | `domain/call.ts:108` checks the text from each command to the next command |
| A chain of two `gh pr create` bodies, the first with the footer, gives no footer to the second | `attribution.test.ts`, "a chain whose first pull request holds the line" (fails before the fix) | defect | the same edit in `call.ts:108` |
| `echo "$TRAILER" > msg && git commit -F msg` gives the commit a second trailer | `attribution.test.ts`, "an `echo` into a file, then `git commit -F`" (passes) | rejected: the hook cannot read the file, so it adds the line. A scratch probe with git 2.55.0 showed that `git commit --trailer` adds an identical trailer only when the message does not already end with it, so the message holds one copy | none |
| `git commit -m a && git commit --amend --no-edit` gives the amend a trailer | `attribution.test.ts`, "a commit and then `git commit --amend --no-edit`" (passes) | rejected: the amend keeps the message. A scratch probe with git showed that the identical trailer is not added again, so the message holds one copy. A standalone amend has no trailer from an earlier command, so it needs the line | none |
| `git --no-pager commit` gives no trailer | `attribution.test.ts`, "a `git --no-pager commit` gets the trailer" (fails before the fix) | defect | `domain/call.ts:12-20` and `call.ts:37` skip each option before the subcommand, and read the value of `-C`, `-c`, `--git-dir`, and the other options that take a value |
| `git --git-dir=x -P commit` and `git --git-dir x commit` give no trailer | `attribution.test.ts`, "a `git` option with a value before the subcommand" (fails before the fix) | defect | the same edit in `call.ts:37` |
| `git commit --trailer "Signed-off-by: A" -m x` gets the model line before the user trailer | `attribution.test.ts`, "a `git commit` with a user trailer before `-m`" (passes) | rejected: the user trailer is kept, and git accepts both | none |
| A message with another `Co-Authored-By` gets the model line | `attribution.test.ts`, "a message with another `Co-Authored-By`" (passes) | rejected: the match is on the exact model line | none |
| A message that already holds the model line keeps its command | `attribution.test.ts`, "a message that already holds the trailer" (passes) | rejected: the kept case works | none |
| A heredoc message, `git commit -F -` with `<<'EOF'`, or `-m "$(cat <<'EOF'`, gets the trailer before the body | `attribution.test.ts`, lines for the heredoc cases (pass) | rejected: the kept cases work | none |
| `-F msg` gets the trailer before the file option | `attribution.test.ts`, "a `git commit -F` gets the trailer" (passes) | rejected: the kept case works | none |
| `--amend` alone gets the trailer | `attribution.test.ts`, "a `git commit --amend` gets the trailer" (passes) | rejected: the kept case works | none |
| `attribution` setting with an empty `commit` or `pr`, and `includeCoAuthoredBy: false` | `attribution.test.ts`, the three settings tests (pass) | rejected: the kept cases work | none |
| A user `attribution.commit` line is used and the model is not named | `attribution.test.ts`, "a user `attribution` line stays in force" (passes) | rejected: the kept case works | none |
| A subagent call names `Claude` | `attribution.test.ts`, "a commit of a subagent names `Claude`" (passes) | rejected: the kept case works | none |
| `gh pr create --body=...` gives no footer | none added | open: `call.ts:52` returns undefined by design | none |
| A heredoc body in `gh pr create` other than `<<'EOF'` gives no footer | none added | open: `call.ts:26` accepts only a single-quoted delimiter, and `call.ts:83` and `call.ts:90` return undefined for the other forms | none |
| `dotclaude-run-checks` with a quoted argument | `tests/dotclaude/checks/run.test.ts`, "a quoted argument with two spaces" (passes) | rejected: a quote is shell syntax, so the command runs through `sh -c` and keeps the argument | none |
| `dotclaude-run-checks` with an assignment prefix, such as `GREETING=hi bun ...` | `tests/dotclaude/checks/run.test.ts`, "an assignment before the program" (passes) | rejected: `domain/command.ts:4` sends it to the shell | none |
| `dotclaude-run-checks` with output that has no final newline, passing or failing | `tests/dotclaude/checks/run.test.ts`, the two "no final newline" tests (pass) | rejected: the counts and the failure line are read from the whole output | none |
| `dotclaude-run-checks ""  "bun test"` runs one command and exits 0 | `tests/dotclaude/checks/run.test.ts:151` (fails before the fix) | defect | `src/plugins/dotclaude/slices/checks/adapters/cli.ts:102` gives a usage error with status 2 for any empty argument |
| `JSON.parse` in `decide` can throw outside a `try` | none added | rejected: `decide/domain/ask.ts:110-111`, `decide/domain/reply.ts:20-21`, and `decide/adapters/cli.ts:84-85` each sit inside a `try` | none |
| A slice that throws at load | none added | open, owned by P02: `tools/generate/order.ts` throws at `just generate` on a duplicate handler, which `generate --check` also reports. No test imports `order.ts`. A throw at the top level of a slice adapter would fail `register.ts`, and the lab loads that file | none |
| The slice order in `plugin.ts` | none added | `plugin.ts` holds only the manifest data, so it has no slice order. The order is set by `tools/generate/order.ts` and the generated `register.ts`, owned by P02 | none |
| The `evals/` folder of the core plugin | `tests/dotclaude/evals/graders.test.ts` (passes) | rejected for this check: the test checks that each case folder matches the graders that read it. The cases run only with `claude plugin eval`, which costs money, and it was not run here | none |
| The `prompt/evals/` folder | none added | open: it holds one scaffold, `report-count`, which no test in P03 reads | none |

## Search of the owned paths

- A search for `JSON.parse` in the owned slices found three calls, and each is inside a `try` (see the table).
- A search for `split("\\")` found no hit.
- A search for a non-atomic write found one `Bun.write` in `slices/checks/adapters/cli.ts:56`, the write of a log file.
  The verdict is rejected: each log name carries a run id and the step number, so no other process reads the file while it is written.
  A partial log after a crash is kept as it is, and it is not a defect of the summary.

## Checks

- `bun test tests/dotclaude/prompt tests/dotclaude/checks` gives 48 pass and 0 fail.
- `bun tools/generate/index.ts` writes the copies, and `bun tools/generate/index.ts --check` exits 0.
- `claude plugin test` on `plugins/dotclaude` gives 133 pass and 0 fail.
- The Specs of this change named in the brief do not hold any requirement of these owned paths, so none was removed.
- `bun run typecheck` does not run in this worktree: `tsconfig.json` names the `claude-code` type package, which is missing from the checkout.
