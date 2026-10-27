## Why

The user asked for each tool or claim that judges text by arbitrary English words to be removed, because such checks are brittle and not trustworthy (the user, 2026-10-27).
Two slices match English words in prose:

- `work/ground` (`ground/domain/claims.ts`) denies a `Write` or `Edit` of a plan or a spec on three word rules: an attribution such as "the user chose ..." (`USER`), a done-claim such as "tests pass" or "is fixed" that no `Bash` call of the turn backs (`DONE`, with the exempt words of `FUTURE`), and a tool name such as `npm` in a project with `bun.lock`, which a line with "not", "never", or "no" exempts (`NEGATION`).
- `work/finish` (`finish/domain/reply.ts`) sets a note on the last reply from a list of labels and phrases of left work (`LABEL`, `PHRASE`, `BLOCK`), and from the words "ready" and "done" (`claimsDone`).

## What Changes

- `ground` keeps the checks that read digits and paths only: a number that no source holds, and a `file:line` reference past the end of its file. The attribution, done-claim, and tool-name checks go, with `Msg.bash`, the lock files in `PROJECT_FILES`, and their tests.
- `finish` drops the `Deferred` note, `deferredItem`, and `claimsDone`. The `Not proven` note shows when a task box that the session checked has no passed check, with no word gate, and no longer reads `git status`, because an uncommitted change is normal in mid-work and the note had shown it only on a claim of done.
- The heading-case note stays. It reads the form of a heading, not a word of a claim.

## Capabilities

### Modified Capabilities

- `claim-grounding`: "Answers Count as User Words" is removed, and the purpose names numbers and references only.
- `finish`: "Note on Deferred Work" and "Fixtures Hold the Rules" are removed, "Note on Unproven Done" is replaced by "Note on Unproven Box", and "Stop Passes" is replaced by "Notes Leave the Stop Open", with a scenario of an unproven box in place of a deferred reply.

## Impact

- `plugins/claudetto/modules/work/ground`, `plugins/claudetto/modules/work/finish`, and their tests in `tests/claudetto/work/`.
- The wiki pages of `Ground` and `Finish`, the pages that cite the `Deferred` note, and `CHANGELOG.md`.
