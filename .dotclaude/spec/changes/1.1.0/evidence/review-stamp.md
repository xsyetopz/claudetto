# Review of the Stamp Slice (P95)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/stamp/`, `src/kernel/stamp.ts`, and their tests.
The fix package is P121.
A context bound stopped the run early, so the dossier check is short.

## Confirmed Findings

### F1. I18: the transcript folder differs from Claude Code for a long `cwd`

`projectFolder` at `domain/build.ts:86` replaces characters only.
Claude Code 2.1.296 (`DO` in `external/cc-2.1.296/strings.txt`) cuts the name at 200 characters and adds `-` and a hash.
The hash is `h = (h << 5) - h + charCode | 0`, written in base 36 of `Math.abs(h)`.
`CLAUDE_CODE_PROJECT_DIR_NAME` also replaces the name when `CLAUDE_CONFIG_DIR` is set.
In both cases `fs.exists` gives `false`, so each resume adds a duplicate row, which is the 1.0.0 bug.

```text
$ bun $TMPDIR/p95-probe/folder.ts
cwd length 253
projectFolder length 253
same rule false
```

Failing test, in `tests/dotclaude/stamp/build.test.ts`:

- Input: `projectFolder` of a `cwd` of 253 characters.
- Expected: 200 characters, then `-` and the hash.
- Actual: 253 characters.

### F2. Silent catch: the outer `catch` at `adapters/mod.ts:163-167`

The engine already skips a hook that throws, and it reports the failure by name (`index.d.ts:3834-3836`).
The `catch` only hides that report.
The `allow` eval at `slice.ts:18` names a test that does not use the `catch`.

```text
mutant: mod.ts with the try/catch removed, in $TMPDIR/p95-probe/plugin
$ claude plugin test $TMPDIR/p95-probe/plugin
12 pass, 0 fail
probe "a stamp whose transcript check rejects still lets the session start":
pass on the mutant, pass on the real code
```

Failing test, in `lab/stamp.test.ts`:

- Input: `fs.exists` rejects for the transcript.
- Expected: the session starts, and the failure goes to the engine report or to a `ui.log` `debug` line.
- Actual: nothing records the failure.

### F3. Copy of kernel code: `.claude` at `adapters/mod.ts:51`

`src/kernel/paths.ts:8` exports `CLAUDE_DIR`.
Command: `grep -n '\.claude' src/plugins/dotclaude/slices/stamp/adapters/mod.ts` shows line 51.
Failing test: none can show this. A lint or a review fixes it. Severity: nit.

## Unconfirmed Findings

- `configDir` (`mod.ts:47-52`) reads `HOME`, but Claude Code uses `os.homedir()`.
  On native Windows with no `HOME`, the install SHA and the transcript are never found.
  No Windows run confirms this.
- The 3 leads `mod.ts:41`, `mod.ts:107`, and `build.ts:24` are rejected as defects.
  The transcript read fails closed (`null`, no row).
  The other failures fall back to a source that the record names (`git` or `unknown`).
  `parseJson` catches only the `SyntaxError` of its contract.
- `at` uses `new Date()` (`mod.ts:142`), not `$.clock`.
  The lab checks it only with `expect.any(String)`.

## Dossier Check

- I16: the `allow` eval does not test what it claims (F2).
- I17: the leads are rejected, because no tool error is read as "no stamp".
- I18: F1.
- I01: `HOME` is a generic default (unconfirmed).
- I09: F3.
- I15: no test checks prose.
- The run did not check I02 to I08 and I10 to I14 line by line.

Checked: I read the slice files, both tests, dossier `07`, the engine types, the bundle strings, and the 1.0.0 stamp evidence. I ran the lab in a probe copy (baseline, mutant, and probe) and the `bun` probe.
