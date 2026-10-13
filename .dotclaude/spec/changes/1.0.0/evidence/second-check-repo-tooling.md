# Second check of the repo tooling (P02)

The check ran on `ad61fb01`, then on the fix commits of this package.
Each `file:line` was read in the worktree before it was written here.
Claims about the Claude Code bundle come from `external/cc-2.1.296/strings.txt`, and each byte offset was read with `dd`.
The run of `just test tests/tools tests/support && just validate` passed with 169 pass and 0 fail, and `just validate` exited 0.

## Candidates

| Candidate | Test | Verdict | Fix commit |
| --- | --- | --- | --- |
| Telemetry of the `claude` calls of `tools/` (datadog calls under the sandbox) | `tests/tools/telemetry-env.test.ts` | confirmed: the error path is gated by `DISABLE_ERROR_REPORTING` and the event path by `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | this commit |
| The env of `$claude` is built once at import | `tests/tools/telemetry-env.test.ts` | confirmed: a change of `process.env` after the import is lost | this commit |
| A `claude` command outside the helper | `tests/tools/bypass-scan.test.ts` | confirmed: the old test checked only the helper, so a `claude` command outside it passed | this commit |
| `check` and `ci` differ by `generate --check` | `tests/tools/justfile-gate.test.ts` | confirmed | `366f2a50` |
| `ci` has no type check | none | rejected: a decision of the repo, see the note below | none |
| `tools/generate/` has three packages in one overlap (spec text) | none | open, for the parent: the tool works as designed, the text overlaps | none |
| Bump to a pre-release target (`1.1.0-rc.1`) | `tests/tools/bump-version.test.ts` | rejected: `nextVersion` throws before a write | none |
| Bump from a pre-release current version | `tests/tools/bump-version.test.ts` | rejected: `nextVersion` throws before a write | none |
| Bump with a dirty tree | none | rejected: `release` refuses a dirty tree, and `bump` writes only its own files | none |
| Bump with a read-only target | `tests/tools/bump-version.test.ts` | confirmed | `366f2a50` |
| `sandbox-install --clean` on a missing folder, twice | `tests/tools/sandbox-clean.test.ts` | rejected: exits 0 both times | none (`2913ef0f` before this check) |
| `--clean` on a folder with a read-only file | `tests/tools/sandbox-clean.test.ts` | rejected: exits 0 and removes the folder | none |
| `--clean` on a sandbox whose `config/` is mode `555` with a file inside | none in `owns` | open, handed to P06: fails with `ENOTEMPTY` and a stack trace | none |

Notes on the rows:

- Telemetry, the trace in `external/cc-2.1.296/strings.txt` (each offset read with `dd` or `grep -b`):
  - `FMt()` at byte 13082831 returns `essential-traffic` for `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` (read at 13082841).
    `At()` at 13083051 tests that mode.
    `external/dossier/cc-2.1.296/env.md:54` lists the var.
  - Error path, `iDe()` at byte 20428914: it returns when `Nbs()` (byte 20400699) is false.
    `Nbs()` returns when `DISABLE_ERROR_REPORTING` is set (byte 20400729), so this path has a cited gate.
    `env.md:42` lists `DISABLE_ERROR_REPORTING`.
    `iDe()` calls `zfo()` (byte 20421487), which enqueues to the Datadog sender (byte 20421728).
  - Event path, `uPt()` at byte 20417140: it returns when the provider is not `firstParty`, and it uses `initializeDatadog` (byte 20416050).
    `initializeDatadog` returns false when `Uy()` or `ARs()` is true.
    `Uy()` (byte 15227601) is `u() || eo() !== null || MV() || l()`.
    `MV()` (byte 13083100) is `FMt() !== "default"`, and `FMt()` leaves `default` when `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY`, or `DO_NOT_TRACK` is set.
    Each of `Uy`, `FMt`, and this `MV` has one definition in the bundle (`grep -c`).
    So `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` gates the event path.
    The main session read these offsets after the retry.
  - The reporter at byte 13084960 returns on `DISABLE_ERROR_REPORTING` or `At()`, but it dispatches to a local store, not to Datadog.
  - The Datadog host is `http-intake.logs.us5.datadoghq.com` (byte 20403805).
  - Verdict: `confirmed` from the bundle.
    The error path is gated by `DISABLE_ERROR_REPORTING`, and the event path by `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, and `CLAUDE_ENV` sets both.
    A sandbox run that shows no denied call to the Datadog host is the live check.
    The sandbox run that gave the 9 calls was not repeated in this package.
  - `DISABLE_TELEMETRY` (`env.md:44`) feeds `FMt()`, but no Datadog path that it gates is cited, so `CLAUDE_ENV` does not set it.
- Per-call env: `$claude` is now a function, so each call reads `process.env` again.
  `tests/tools/telemetry-env.test.ts` changes `process.env` after the import and reads the child.
- Scan: `tests/tools/bypass-scan.test.ts` strips comments with `Bun.Transpiler`, then flags a `claude` command that does not use `$claude()`.
  Its allow list has `sandbox/run.ts`, `sandbox/install.ts`, and `eval-variant.ts`, and the reasons are in the file.
  No file of the allow list runs `claude` today, so the list is a reserve.
- `eval-variant.ts` spawns the eval comparison on the plain env, because the telemetry-off env can change the flags that the evals fetch.
  The choice is recorded here, and the test of the helper does not cover this spawn.
- `ci`: `justfile:31` says CI has no `.claude-plugin/types/`, so the type check stays out of `ci`.
  The test `tests/tools/justfile-gate.test.ts` pins that `ci` runs the `generate --check` step, and that `ci` equals `check` minus `typecheck`.
- Overlap: `src/plugins/dotclaude/slices/spec/adapters/ready.ts:3-4` skips a package whose `owns` overlap a printed package.
  `src/plugins/dotclaude/slices/spec/domain/validate.ts:228-241` refuses an overlap in one wave.
  The packages `01b1-generator-core.md`, `01b2-prompt-slice.md`, and P13 each name `tools/generate/`.
  The fix is in the text of the spec, so the parent owns it.
- Bump: `tools/bump-version.ts:25` refuses a pre-release current version.
  `tools/bump-version.ts:39-41` refuses a level that is not `major`, `minor`, `patch`, or `X.Y.Z`.
  `tools/preflight.ts:32-41` refuses a dirty tree.
- Read-only target: `tools/bump-version.ts` checks each target with `W_OK` before the first write.
  This is a pre-check only.
  A race between the check and a write, or a write that fails after the first target, is not rolled back.
  The test skips when the process is root, because `W_OK` passes for root.
  It asserts exit status 1 and the message that names `CHANGELOG.md`.
- `--clean` entry: `src/plugins/dotclaude-lab/slices/sandbox/adapters/cli.ts:69-70` returns 0 for a missing folder.
  The `555` row comes from the earlier run and was not run again in this check.
  Its fix is outside `owns`, so P06 owns it.

## Sweep of the owned paths

| Pattern | Hit | Verdict |
| --- | --- | --- |
| Bare `JSON.parse` | `tools/lint.ts:15` | rejected: `must` of Biome runs first, so the parse runs only after Biome exits 0 |
| Bare `JSON.parse` | `tools/generate/emit/texts.ts:80` | open: a broken `hooks.json` throws a `SyntaxError` without the file name, but generation stops |
| Bare `JSON.parse` | `tools/generate/emit/texts.ts:153` | rejected: wrapped with the source name |
| Non-atomic write | `tools/generate/index.ts:23` | open: a crash mid-write leaves a short file, and the next `generate` rewrites it |
| Non-atomic write | `tools/bump-version.ts:120` | open: a write that fails after the first target leaves a partial bump, and the `W_OK` check covers only the common case |
| Non-atomic write | `tools/lock.ts:40` | rejected: uses `wx`, which fails on a held lock |
| Path split on a separator | `tools/generate/emit/slices.ts:25` | rejected: matches both separators on purpose |
| Path split on a separator | `tools/generate/discover.ts:45`, `closure.ts:14`, `emit/fill.ts:45`, `emit/texts.ts:47` | rejected: join with `path.sep`, then convert to `/` |
| Path split on a separator | `tools/generate/emit/slices.ts:109,129,172` | rejected: input is already posix |

No hit in this sweep gets a new test, because none of the open rows is a likely defect of the tool.
