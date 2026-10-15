# Review of the Tools Folder (P108)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `tools/` at `76dc06d7`, with `lock.ts`, `lab.ts`, `release.ts`, `preflight.ts`, `bump-version.ts`, `eval-variant.ts`, `generate/`, `sandbox/`, and `limits.ts`, and the tests in `tests/tools/` and `tests/support/lock.test.ts`.
The probes ran in a new folder under `$TMPDIR`, called `$P` below.
`bun test tests/tools` passed before the review, with 83 pass and 0 fail.
The fix package is P134.

## Confirmed Findings

### F1. I17: Two runs take a stale eval lock at the same time

`tools/lock.ts:51-54` reads the holder, and then removes the file, in two steps that are not atomic.
So a second run can remove the lock that the first run took a moment before, and both runs hold the lock.
`release` at `tools/lock.ts:47` removes the file with no owner check, so the first run also deletes the lock of the second run.

```bash
# $P/race2.ts: a stale lock with the dead process 999999, then two takeLock calls
#   const [a, b] = await Promise.all([takeLock(f, 111), takeLock(f, 222)])
#   a.release()
bun $P/race2.ts
```

```text
A: true B: true file: 222 2026-10-14T02:56:04.390Z
after A.release, lock file exists: false
```

Failing test, in `tests/tools/lock.test.ts`:

- Input: a lock file that holds `999999`, then `Promise.all([takeLock(f, 111), takeLock(f, 222)])`, then `release` of the first lock.
- Expected: exactly one result has `release`, and the lock file of the holder stays after the other run ends.
- Actual: both results have `release`, and the release of run A removes the lock of run B.

The lock test is now in `tests/support/lock.test.ts`.
`CLAUDE.md` says that `tests/support/` holds only test helpers, so the test belongs in `tests/tools/`.

### F2. I17: The lock frees itself while the paid eval still runs

`tools/lock.ts:43` writes the process id of the wrapper, and `tools/lock.ts:75` starts the eval as a child with `Bun.spawnSync`.
When the wrapper gets `SIGTERM`, the child continues, but the lock counts as stale.
So a second `just eval` starts while the first eval still runs and writes to the same log.

```bash
# $P/copy/tools/lock.ts is a copy of tools/lock.ts, so its lock is under $P/copy
cd $P/copy
bun tools/lock.ts sh -c 'sleep 3 && echo child-finished > marker' &
sleep 1 && kill -TERM $!
bun tools/lock.ts echo "second run took the lock while child runs"
echo "exit=$?"
sleep 3 && cat marker
```

```text
parent alive: no
second run took the lock while child runs
exit=0
child-finished
```

Failing test, in `tests/tools/lock.test.ts`:

- Input: the lock wrapper runs a child that writes a marker after 3 s, the wrapper gets `SIGTERM` after 1 s, and a second wrapper starts.
- Expected: the second wrapper exits 1 with the holder message, or the child stops with the wrapper.
- Actual: the second wrapper exits 0, and the first child writes its marker after that.

### F3. I07 and I08: A mistyped dry run of `release.ts` makes and pushes tags

`tools/release.ts:36` reads only `Bun.argv[2] === "--dry-run"`, and ignores each other argument.
So `just release --dryrun` and `just release x --dry-run` run the real `claude plugin tag` and `git push --atomic`.

```bash
grep -n 'argv\[2\]' tools/release.ts
# $P/rel: a git repo with one commit and plugins/a, and a stub claude on PATH.
# The stub prints "real tag" only when it gets no --dry-run.
PATH=$P/rel/bin:$PATH bun tools/release.ts --dryrun
PATH=$P/rel/bin:$PATH bun tools/release.ts x --dry-run
```

```text
36:  if (Bun.argv[2] === "--dry-run") return;
Tags: a--v9.9.9
stub claude: real tag of plugins/a
fatal: no tag message?
exit=128
```

Both inputs gave the same output.
The tag of the stub failed only because the global git config signs tags, and `makeTags` rolled back.

Failing test, in `tests/tools/release-args.test.ts`:

- Input: `bun tools/release.ts --dryrun`, and `bun tools/release.ts x --dry-run`, in a temporary repository with a stub `claude`.
- Expected: exit 2 with a usage line for the first input, a dry run for the second input, and no `claude plugin tag` call without `--dry-run`.
- Actual: the stub gets a real `claude plugin tag plugins/a` call.

### F4. I07 and I08: A mistyped dry run of `bump-version.ts` writes the files

`tools/bump-version.ts:90-92` skips each argument that starts with `--`, and `tools/bump-version.ts:109` checks only the exact `--dry-run`.
So an unknown flag is ignored, and the bump writes `package.json` and `CHANGELOG.md`.

```bash
cp package.json CHANGELOG.md $P/bump/
bun tools/bump-version.ts minor --dryrun --root $P/bump
grep -n '"version"' $P/bump/package.json
```

```text
1.0.0 -> 1.1.0
  package.json
  CHANGELOG.md
Next: run `just generate`, so each plugin.json has the new version.
exit=0
3:  "version": "1.1.0",
```

Failing test, in `tests/tools/bump-version.test.ts`:

- Input: `main(["minor", "--dryrun", "--root", dir])` on a fixture at `1.0.0`.
- Expected: return 2 with the usage line, and `package.json` stays at `1.0.0`.
- Actual: return 0, and `package.json` is `1.1.0`.

### F5. I16: `just eval-variant` deletes the traces of its two paid arms

`justfile:93` says that `--keep-temp` is always on for an eval, and `justfile:96` passes it.
`tools/eval-variant.ts:66-76` runs two paid arms with no `--keep-temp`, and `evalArgs` of `dotclaude-eval-compare` does not add it.
So a failed run of either arm cannot be diagnosed or graded again.

```bash
grep -rn -- "--keep-temp" tools src/plugins/dotclaude-lab/slices/eval-compare
echo "exit=$?"
grep -c -- "--keep-temp" justfile
```

```text
exit=1
2
```

Failing test, in `tests/lab/eval-variant.test.ts`:

- Input: the argument list that `tools/eval-variant.ts` gives to `dotclaude-eval-compare` for `REF` with no options.
- Expected: the list holds `--keep-temp`.
- Actual: the list does not hold `--keep-temp`.

### F6. Bound outside `tools/limits.ts`: The cost bound of `just eval`

`justfile:96` sets `--max-cost-usd 5` as a literal.
`CLAUDE.md` says that a repository bound is set only in `tools/limits.ts`, and that a test pins each copy in config.
`tools/limits.ts` has no cost bound, and no test pins the `justfile` copy.

```bash
grep -on -- "--max-cost-usd [0-9]*" justfile tools/limits.ts
grep -n "COST" tools/limits.ts
echo "exit=$?"
```

```text
justfile:93:--max-cost-usd 
justfile:96:--max-cost-usd 5
exit=1
```

Failing test, in `tests/tools/justfile-gate.test.ts`:

- Input: the value after `--max-cost-usd` in the `eval` recipe of `justfile`.
- Expected: it equals the cost bound that `tools/limits.ts` exports.
- Actual: `tools/limits.ts` exports no cost bound, so the import fails.

### F7. Smell, tool output read as a negative: The stray check misses quoted file names

`tools/generate/stray.ts:9-28` runs `git ls-files` with no `-z`.
Git quotes a path with non-ASCII characters, and the `fs.existsSync` filter at line 28 drops the quoted path with no message.
So a hand-written file with such a name in `plugins/` passes `just generate --check`.

```bash
# $P/stray: a git repo with the untracked files plugins/plain.md and plugins/ünï.md
bun $P/stray.ts
git -C $P/stray ls-files --others -- plugins
```

```text
[ "plugins/plain.md has no source in src/. Add its source to src/, or delete it." ]
plugins/plain.md
"plugins/\303\274n\303\257.md"
```

Failing test, in `tests/tools/generate/stray.test.ts`:

- Input: a temporary git repository with the untracked file `plugins/ünï.md`, and `strays(root, [])`.
- Expected: one message that names `plugins/ünï.md`.
- Actual: no message for that file.

## Unconfirmed Findings

No command in the workspace shows these findings.

- `tools/lock.ts:51` and `tools/lock.ts:56` read the lock with `Bun.file(file).text()`.
  When the holder releases the lock between the `EEXIST` and the read, the read throws `ENOENT`, and the wrapper stops with a stack trace.
- `tools/lock.ts:41-43`: between `openSync` and `writeSync` the lock file is empty.
  A second run reads `""`, gets `NaN`, and removes the new lock.
  This is the same race class as F1.
- `tools/lab.ts:8` skips each plugin with no `tests/` folder, with no message.
  A plugin with `hooks/register.ts` and no tests would get no hook lab.
  No plugin is in that state now, because `dotclaude-docs` and `dotclaude-lab` have no hooks.
- `tools/preflight.ts:14-18`: `tagExists` reads each `git rev-parse` error as "no tag".
  In the rollback at `tools/preflight.ts:72-74`, such an error, or a failed `git tag -d` with `nothrow`, leaves a tag with no message.
- `tools/update.ts:9-12` calls `claude plugin update` for each folder of `plugins/`, but its header says "that the user installed".
  The review did not run it, because it changes the install of the user.
- `tests/tools/preflight.test.ts:43`, `:54`, `:64`, and `:75` check only `toHaveLength(1)`.
  So a wrong problem passes these tests.
  The tests can still fail, so this is a weak test, not a test that cannot fail.

## Dossier Check

- I01: No failure found. `tools/generate/emit/manifest.ts:69` reads the version from `package.json`, and `tools/measure.ts` reads its bounds from `tools/limits.ts` (`01-grounding-and-memory.md`, I01).
- I02: Partly held. `tools/validate.ts`, `tools/lint/arrow-functions.grit`, and `tests/tools/bypass-scan.test.ts` make rules into checks, but the bound rule has no check (F6) (`01-grounding-and-memory.md`, I02).
- I03: Not applicable to `tools/` (`01-grounding-and-memory.md`, I03).
- I04: Known from P94: `tools/release.ts` has no spec code, so a release does not `accept` its change. Also `justfile:76` says that `just bump` changes "both manifests", but it writes only `package.json` and `CHANGELOG.md` (`02-verification-and-honesty.md`, I04).
- I05: No edited or skipped test found. The preflight tests are weak (Unconfirmed Findings) (`02-verification-and-honesty.md`, I05).
- I06: Not applicable to `tools/` (`02-verification-and-honesty.md`, I06).
- I07: Found in F3 and F4: a mistyped dry run does the irreversible or writing action (`03-safety-and-trust-boundaries.md`, I07).
- I08: Found in F3 and F4: an unknown flag is ignored. The `claude plugin eval` flags of `justfile:96` exist in `claude plugin eval --help` (`03-safety-and-trust-boundaries.md`, I08).
- I09: No copy of kernel code found. `tools/generate/closure.ts` copies `src/kernel/` into add-ons by design (`04-engineering-delegation-and-cost.md`, I09).
- I10: Not applicable. The inputs of `tools/` come from the user of the checkout (`03-safety-and-trust-boundaries.md`, I10).
- I11: Not applicable to `tools/` (`04-engineering-delegation-and-cost.md`, I11).
- I12: Held, apart from F1 and F2. `--max-cost-usd` bounds each eval run, and `withCostBound` bounds each arm of `eval-variant` (`04-engineering-delegation-and-cost.md`, I12).
- I13: No failure found. The lock message tells the user to remove the lock only when no run is in progress (`06-autonomy-and-consent.md`, I13).
- I14: Related to F6: the cost bound is outside the one place of bounds, so a change of it has no pinned copy (`06-autonomy-and-consent.md`, I14).
- I15: No pure test of prose found. `tests/tools/generate/texts.test.ts:147-151` checks message words, but the words are mostly file names (`06-autonomy-and-consent.md`, I15).
- I16: Found in F5: the variant eval keeps no traces. `tools/unsandboxed.ts` stops an eval in the sandbox before it spends money, so that part held (`07-measurement-and-environment.md`, I16).
- I17: Found in F1 and F2. `isAlive` at `tools/lock.ts:23-30` reads `EPERM` as alive, so that part held. The lock records no owner, which the I17 recipe asks for (`07-measurement-and-environment.md`, I17).
- I18: Partly found in F7: `git` quoting changes the file list with no error. The relative `--plugin-dir` of `tools/sandbox/run.ts:9` is safe, because `src/plugins/dotclaude-lab/slices/sandbox/adapters/setup.ts:73-76` resolves it (`07-measurement-and-environment.md`, I18).
