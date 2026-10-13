# Second check of the repo tooling (P02)

The check ran on `ad61fb01`, then on the fix commits of this package.
Each `file:line` was read in the worktree before it was written here.
Claims about the Claude Code bundle come from `external/cc-2.1.296/strings.txt`, and each byte offset was read with `dd`.
The run of `just test tests/tools tests/support && just validate` passed with 166 pass and 0 fail.

## Candidates

| Candidate | Test | Verdict | Fix commit |
| --- | --- | --- | --- |
| Telemetry of the `claude` calls of `tools/` (datadog calls under the sandbox) | `tests/tools/telemetry-env.test.ts` | confirmed | `4c63f6e6` |
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

- Telemetry: `tools/telemetry.ts:1-6` cites the bundle.
  `FMt()` is at byte 13082831, `At()` at 13083051, the error-reporter gate at 13085285, and the datadog URL at 20403775.
  `external/dossier/cc-2.1.296/env.md:54` lists `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`.
  The interactive `Bun.spawn` of `tools/sandbox/run.ts` and `tools/sandbox/install.ts:30` keeps the user env on purpose.
- `ci`: `justfile:31` says CI has no `.claude-plugin/types/`, so the type check stays out of `ci`.
  The test `tests/tools/justfile-gate.test.ts` pins only the `generate --check` step.
- Overlap: `src/plugins/dotclaude/slices/spec/adapters/ready.ts:3-4` skips a package whose `owns` overlap a printed package.
  `src/plugins/dotclaude/slices/spec/domain/validate.ts:228-241` refuses an overlap in one wave.
  The packages `01b1-generator-core.md`, `01b2-prompt-slice.md`, and P13 each name `tools/generate/`.
  The fix is in the text of the spec, so the parent owns it.
- Bump: `tools/bump-version.ts:25` refuses a pre-release current version.
  `tools/bump-version.ts:39-41` refuses a level that is not `major`, `minor`, `patch`, or `X.Y.Z`.
  `tools/preflight.ts:32-41` refuses a dirty tree.
- Read-only target: `tools/bump-version.ts` checks each target with `W_OK` before the first write.
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
