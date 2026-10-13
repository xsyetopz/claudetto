# Second check: add-on plugins and lab

This file records the verdict of each candidate of P06.
The base is `ad61fb01`.
The fix commits are `ce6847fd`, `7653bfe9`, `41f4f012`, and `1b7093c6` (the symlinked sandbox root).
The you-should-know fixes are in `5d8e9bce`.
The you-should-know candidates are in `second-check-you-should-know.md`, which another agent writes.

## Candidates

"Failed before" means that the new test failed on the code without the fix.
The old code was the `src/` of `1a4538ce`, with the tests of this change.

| Candidate | Test | Verdict | Fix |
| --- | --- | --- | --- |
| `briefSize` in `usage/domain/parse.ts` throws on a `null` line | `tests/sessions/usage/report.test.ts`, brief reader skips `null`, number, and array lines (failed before) | fixed | Skip a line that is not an object. |
| `agentType` in `usage/domain/transcript.ts` throws on a `null` meta file | `tests/sessions/usage/report.test.ts` and `tests/sessions/start/readers.test.ts`, `null` meta file (failed before) | fixed | `meta?.agentType`. |
| `agentType` in `start-cost/domain/transcript.ts` throws on a `null` meta file | `tests/sessions/start/readers.test.ts`, `null` meta file (failed before) | fixed | `meta?.agentType`. |
| `parsePlugins` in `usage/domain/runs.ts` throws on a `null` installed-plugins file | `tests/sessions/usage/report.test.ts`, `null` installed-plugins file (failed before) | fixed | `JSON.parse(text)?.plugins`. |
| Capture JSONL reader has no torn-line handling | None. The repo has no reader of `report-<n>.jsonl`, `request-<n>.jsonl`, or `error-<n>.txt` in `src/` or `tools/`. The only reader is `tests/lab/capture/proxy.test.ts`, which reads a whole file. | rejected for a reader, since none exists | None. |
| 200 reply of `count_tokens` whose body is not JSON (`capture/domain/report.ts:196`) | `tests/lab/capture/sizing.test.ts`, 200 reply that is not JSON (passed before) | guard | None. |
| `dotclaude-sandbox --clean` with a read-only `config/` (mode `555`) | `tests/lab/sandbox/clean.test.ts`, read-only `config/` (failed before with `ENOTEMPTY`) | fixed | `makeWritable` adds the owner bits to each folder before `rmSync`, in `sandbox/adapters/cli.ts`. |
| `dotclaude-sandbox --clean` with a symlinked root: `statSync`, `chmodSync`, and `readdirSync` follow the link to a folder outside the sandbox | `tests/lab/sandbox/clean.test.ts`, symlinked root (failed before: the command exited 0 and removed the link, and the test stopped at the exit code, so the mode change of the outside folder was not observed, but the code of `makeWritable` follows the link) | fixed | `lstatSync` refuses a symbolic-link root with a message and exit 1, in `sandbox/adapters/cli.ts`. Commit `1b7093c6`. |
| `claudeMdExcludes`: UNC path with `\` | `tests/dcc-plugin-agents-md/agents.test.ts`, UNC test (passed before) | guard | None. |
| `claudeMdExcludes`: Windows path with `\` and a glob with `/` | `tests/dcc-plugin-agents-md/agents.test.ts`, drive path test (passed before for the `C:` case) | guard | None. |
| `claudeMdExcludes`: drive letter in lower case | `tests/dcc-plugin-agents-md/agents.test.ts`, drive path test (failed before for the lower-case case) | fixed | `slashed` lower-cases the drive letter. The basis is that Windows does not tell the case of a drive apart. No Claude Code source in `external/` states this, so the case is `open` for Claude Code itself. |

## Search of the owned paths

| Hit | Verdict |
| --- | --- |
| `codegraph/slices/graph/domain/graph.ts:50` `JSON.parse` | Guarded. A `SyntaxError` gives `null`. |
| `sandbox/adapters/json.ts:7` `JSON.parse` | Guarded. A `SyntaxError` gives `null`. |
| `capture/adapters/cli.ts:46` `JSON.parse` | Guarded. `parseBody` returns `null`. |
| `sessions/usage/domain/turns.ts:32`, `transcript.ts:86`, `start-cost/domain/transcript.ts:85` `JSON.parse` | Guarded by `try`. A torn or blank line has no entry. |
| `sessions/usage/domain/parse.ts:117` `JSON.parse` | Guarded by `try`. |
| `capture/domain/report.ts:196` `JSON.parse` | Covered by the 200 reply test above. A non-JSON body throws, and the part sizing gives no count. |
| `capture/adapters/cli.ts:67, 135, 168` non-atomic `Bun.write` | Accepted. The files are whole-file outputs of the lab, and no repo code reads them while they are written. A crash can leave a torn file. |
| `schema/adapters/cli.ts:69` non-atomic `Bun.write` | Accepted. It writes the build output of the schema files. |
| `sandbox/adapters/setup.ts:52` non-atomic `Bun.write` of `.claude.json` | Accepted. The sandbox owns the file, and `setUp` rewrites it at each start. |
| `agents/lab/agents.test.ts:47` path split on `\` | Accepted. It is the same rule as `slashed`, and the tests above cover it. |

## Capture sandbox note

The brief reports 9 failures with `EADDRINUSE` in `tests/lab/capture` inside the sandbox, and 109 passing with 0 failing outside it.
This is a sandbox limit, not a repo defect.
The tests were not skipped or mocked.
In this run, `bun test tests/lab/capture` gave 15 pass and 0 fail, so the sandbox failure did not reproduce here.

## Spec check

No requirement of `Second-checking/specs/usage-parse.md` is rejected.
The scenario "Same file in both readers" compares entries.
`briefSize` returns a size, not entries, so that scenario has no direct test yet.
Both readers skip `null` and a number, and both keep an array.
