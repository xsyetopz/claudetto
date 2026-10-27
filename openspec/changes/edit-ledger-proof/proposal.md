## Why

The edit ledger lives in a file under `$TMPDIR/claudetto/ledger/`. On 2026-10-27 that folder was recreated at 10:06, and the ledger lost the lines of earlier Claude sessions. So `whoChanged` labeled two files that earlier Claude sessions wrote (`session/handoff/handover.ts`, `dev/probe/fixture.ts`) as "The user", and told Claude that "a change of the user is intended". Claude then refused to touch them.
The user asked for the proof of an agent edit to be kept in private, and for the files of the user, or of a formatter, never to be hashed (the user, 2026-10-27).

A second defect lost data. The `protect` slice saves the protected files at `classic.PreToolUse` of a `Bash` call and writes back each changed file at `classic.PostToolUse`. A file that a concurrent `Write` of another session or agent created or changed during that `Bash` call counted as the work of the `Bash` call. `protect` deleted `openspec/changes/gate-classifier/.openspec.yaml` and `proposal.md` this way, twice.

## What Changes

- The ledger moves to `$.store`, under the key `ledger:<projectKey(root)>`, with a value of `LedgerLine[]`. The temp file, `ledgerTmp`, `ledgerPath`, and the `TMPDIR` reads for it go. `LEDGER_MAX_FILES` rises from 200 to 2000.
- Each `LedgerLine` gets `via`: `"edit"` for `Edit` and `Write`, and `"bash"` for the capture of a `Bash` call. A line with no valid `via` is dropped.
- At `classic.PreToolUse` of `Edit` and `Write`, the system records a line with the hash of the content that the call will write.
- `protect` skips a path that a ledger line with `via: "edit"` holds with its current hash, because that write is the effect of an `Edit` or `Write`, not of the `Bash` call.
- The label for a file with no ledger line says that no claudetto agent wrote it, and no longer says that the change "is intended".

## Capabilities

### Modified Capabilities

- `session-hygiene`: "Edit Ledger" and "Who Changed a File", and a new requirement "Edit Proof Spares a Write" for the `protect` slice, which has no spec of its own.

## Impact

- `plugins/claudetto/modules/session/hygiene`, `project/domain`, `gate/adapters`, `work/notes/adapters`, `work/protect/adapters`, and `hooks/register.ts`.
- The wiki pages of the ledger and of `protect`, and `CHANGELOG.md`.
