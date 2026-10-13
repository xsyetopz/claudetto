# Second check of the core prompt and agents (P03)

The check ran the generated copies in `plugins/dotclaude/` and the Bun tests in `tests/`.
Each new test was run before its fix and after it.
Line numbers are from the source in `src/`, at base `1a4538ce` plus the P03 fixes.

## Verdicts

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| A chain of two `git commit` commands, the first with the trailer, gives no trailer to the second | `src/plugins/dotclaude/slices/attribution/lab/attribution.test.ts:69` (fails before the fix) | defect | `src/plugins/dotclaude/slices/attribution/domain/call.ts:96-107` checks the text from each command to the next command |
| A chain of two `gh pr create` bodies, the first with the footer, gives no footer to the second | `src/plugins/dotclaude/slices/attribution/lab/attribution.test.ts:81` (fails before the fix) | defect | the same edit in `call.ts:96-107` |
| `dotclaude-run-checks ""  "bun test"` runs one command and exits 0 | `tests/dotclaude/checks/run.test.ts:151` (fails before the fix) | defect | `src/plugins/dotclaude/slices/checks/adapters/cli.ts:102-106` gives a usage error with status 2 for any empty argument |
| A model id with no version, such as `claude-opus`, gives `Claude` | none added | rejected by design: `src/plugins/dotclaude/slices/attribution/domain/lines.ts:26` returns `Claude` when the id has no family and version, and `CHANGELOG.md:29` states it | none |
| A model id with `[1m]` or a date suffix | none added | rejected: `lines.ts:13` accepts the date suffix, and the `[1m]` suffix is removed before the match | none |
| `gh pr create --body=...` gives no footer | none added | open: `call.ts:43` returns undefined by design | none |
| A heredoc body in `gh pr create` other than `<<'EOF'` gives no footer | none added | open: `call.ts:18` accepts only the quoted `<<'EOF'` form, and `call.ts:74` and `call.ts:81` return undefined for the other forms | none |
| `git --no-pager commit` gives no trailer | none added | open: `call.ts:12` and `call.ts:24-29` read only `-C` and `-c` before `commit`. `CHANGELOG.md:28` does not name the subcommand form, so no promise is broken by the text. No test was written | none |
| `dotclaude-run-checks` with quoted arguments, output without a newline, or assignment prefixes | none added | rejected by the earlier probe. Not re-checked in P03 | none |
| `JSON.parse` in `decide` can throw outside a `try` | none added | rejected: `src/plugins/dotclaude/slices/decide/domain/ask.ts:110-111`, `src/plugins/dotclaude/slices/decide/domain/reply.ts:20-21`, and `src/plugins/dotclaude/slices/decide/adapters/cli.ts:84-85` each sit inside a `try` | none |
| The slice order in `plugin.ts` | none added | not checked in P03. P02 owns `tools/generate/order.ts` | none |

## Search of the owned paths

- A search for `JSON.parse` in the owned slices found the three calls in the table, and each is inside a `try`.
- A search for `split("\\")` found no hit.
- A search for a non-atomic write was not run.

## Checks

- `just test tests/dotclaude/prompt tests/dotclaude/checks` gives 44 pass and 0 fail.
- `just lab` exits 0.
- `bun test plugins/dotclaude/tests/attribution.test.ts tests/dotclaude/checks/run.test.ts` gives 16 pass and 0 fail, with the three new tests passing after the fixes.
- `bun run lint` exits 0 after the new test file is formatted with Biome.
- `bun run typecheck` does not run in this worktree: `tsconfig.json` names the `claude-code` type package and `plugins/dotclaude/.claude-plugin/types/tsconfig.json`, and neither exists in the checkout.
