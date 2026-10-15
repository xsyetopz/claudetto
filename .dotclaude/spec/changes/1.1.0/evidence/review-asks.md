# Review of the Asks Slice (P84)

A `reviewer` run (Opus 5.5) did the review on 2026-10-14, read only.
The main session wrote this file from its report.
The scratch scripts and fixtures were in `$TMPDIR/p84s` and `$TMPDIR/p84`, and the repository did not change.

## Confirmed Findings

### F1: I05, a weakening edit of a test file over `FILE_MAX_BYTES` gets no ask

At `src/plugins/dotclaude/slices/asks/adapters/mod.ts:27`, a file over `FILE_MAX_BYTES` (1 MB), a folder, or a link gives `null`.
At `src/plugins/dotclaude/slices/asks/domain/weaker.ts:68`, `before === null` returns `[]`.
So the check reads the large file as a new file.
This goes against the comment at `weaker.ts:8`, which says that an unknown change never passes.

Command: `bun "$TMPDIR/p84s/big.ts" "$TMPDIR/p84/w"`.
The script runs `decideAsk` with an `Edit` that removes `expect(a).toBe(1);` from a small test file and from a 1.1 MB test file.

```text
small ask
big no ask
```

Failing test:

- Input: an `Edit` that removes an `expect` line from `tests/big.test.ts`, which is a file over `FILE_MAX_BYTES`.
- Expected: `ask`, with the `UNREADABLE` reason.
- Actual: no ask.
- Test file: `tests/dotclaude/asks/weaker/tests.test.ts`.

### F2: I14 and a bound outside `limits.ts`, `weak-limits.ts` is not protected

`src/plugins/dotclaude/slices/asks/weak-limits.ts:6` holds `STATEMENT_MAX_CHARS`.
`weak-limits.ts:9` holds `JSON_DEPTH_MAX`.
The name `weak-limits.ts` does not match `LIMIT_FILE_NAME` at `src/plugins/dotclaude/slices/asks/limits.ts:162`.
So an edit of these bounds gets no ask.
The bounds are also outside `slices/asks/limits.ts`, which goes against the bound rule in `CLAUDE.md`.

Command: `bun "$TMPDIR/p84s/weak.ts"`.
The script makes the same kind of bound edit in each file through `decideAsk`.

```text
weak-limits.ts no ask
limits.ts ask
```

Failing test:

- Input: an `Edit` of `src/plugins/dotclaude/slices/asks/weak-limits.ts` from `JSON_DEPTH_MAX = 24;` to `JSON_DEPTH_MAX = 2;`.
- Expected: `ask`.
- Actual: no ask.
- Test file: `tests/dotclaude/asks/weaker/limits.test.ts`.

## Unconfirmed Findings

- `src/plugins/dotclaude/slices/asks/domain/hooks.ts:73` is a silent `catch`, and it uses a strict `JSON.parse`.
  `domain/jsondiff.ts:32-38` (`readJson`) reads the same settings files as JSONC.
  The command `bun "$TMPDIR/p84s/hook.ts" "$TMPDIR/p84/h"` printed `strict ask`, `comment no ask`, and `bom ask`.
  So when `.claude/settings.json` starts with a `//` comment, an edit of the hook script that it names gets no ask.
  This is a defect only if Claude Code loads hooks from a settings file that has comments.
  `external/cc-2.1.296/strings.txt` does not show that.
- `src/plugins/dotclaude/slices/asks/domain/content.ts:21`: lead rejected.
  The `undefined` from the `catch` makes the check scan the fragment, as its doc comment says.
  An invalid `package.json` makes each script run fail, so it does not hide a defect.
- I17 (a read error taken as no ask): the adapter has no `catch`.
  When `$.fs.read` throws after `next`, the verdict of the engine stands and the slice ask is lost.
  The header of `adapters/mod.ts` documents this.
  No command made the read throw.
- A link to a protected file also gives `null` at `adapters/mod.ts:27`, so F1 applies to it.
  The test reader `tests/dotclaude/asks/verdicts.ts:24-37` follows links, so the tests do not cover this case.
  It is not confirmed, because the lab was not run with `isLink`.

## Checked With No Finding

- I05: the slice asks on removed asserts, `.skip` and `.only`, suppressions, CI, lint, runner, hook, and settings changes.
  F1 and F2 are the only gaps found.
- I07: `git stash`, `git checkout`, `git restore`, `rm`, `sed -i`, and other shell writes ask (`domain/git.ts`, `domain/writes.ts`).
- I14: an edit of `limits.*` or `budget.*` asks.
  Old and new values in the reason are planned in P140, so they are not a defect.
- I15: the tests assert the decision and the file path.
  No test asserts the words of a reason.
- I17: covered under Unconfirmed Findings.
- I01 to I04, I06, I08 to I13, I16, and I18 do not apply to a deterministic `tool.check` hook.
- Silent `catch`: `domain/jsondiff.ts:35` returns `UNREADABLE` to its callers, and that asks.
- Copy of kernel code: none found.
  The kernel `JSON.parse` uses in `spec-store.ts`, `stamp.ts`, and `node/hook-io.ts` are not JSONC readers.
- Dead code: none found in the files that were read.
- A test that cannot fail: none found.
  `tests/dotclaude/asks/git.test.ts:198` has a literal bound of 200 ms, but no failure was seen.
- Baseline: `bun test tests/dotclaude/asks` gave 800 pass and 0 fail.

Checked: `CLAUDE.md`, `.claude/rules/*.md`, `design.md:12-41,168-173`, dossier `00`, `02` (I05), and `06` (I14).
Also read: `slice.ts`, `adapters/mod.ts`, the domain files `check`, `text`, `weaker`, `kinds`, `content`, `hooks`, `jsondiff`, `limitsWeaker`, `lab/asks.test.ts`, and `tests/dotclaude/asks/{calls,verdicts,stub-fs}.ts`.
