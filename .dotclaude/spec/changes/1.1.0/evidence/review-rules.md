# Review of the Rules Slice (P91)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/rules/` and `tests/dotclaude/rules/skills.test.ts`.
The fix package is P117.

## Confirmed Findings

### F1. I18, tool output misread: `git ls-files` quoting hides non-ASCII files

At `src/plugins/dotclaude/slices/rules/skills/rules-creator/scripts/check-globs.ts:88`, the script reads `git ls-files` output without `-z`.
Git quotes and octal-escapes a path with non-ASCII bytes, so no glob matches that file.
The script then reports a valid glob as "matches no file" and exits 1.
The probe ran in a new folder under `$TMPDIR`, with `docs/café.md` and a rule with `paths: ["docs/*.md"]`.

```text
$ git ls-files --cached --others --exclude-standard
"docs/caf\303\251.md"
$ bun check-globs.ts rules .
.../rules/r.md: docs/*.md: matches no file
1 rules checked, 1 problems
exit=1
```

Failing test, in `tests/dotclaude/rules/skills.test.ts`:

- Input: a git repository that holds `docs/café.md`, and `rules/r.md` with `paths: ["docs/*.md"]`.
- Expected: exit status 0.
- Actual: exit status 1, and the output says `docs/*.md: matches no file`.

`src/plugins/dotclaude/slices/setup/adapters/rules-check.ts:12` has the same cause, but it is in the scope of P93.

### F2. Smell: a bound outside `limits.ts`, with an unpinned copy

The script has `MAX_PATTERNS = 1000` at `check-globs.ts:11`, and the kernel has a copy at `src/kernel/rules.ts:7`.
Neither copy is in `slices/rules/limits.ts` or `src/kernel/budget.ts`, which `CLAUDE.md` requires.
The parity test at `tests/kernel/rules.test.ts:52` pins only `expansions`.
No test pins the copy of `MAX_PATTERNS` or `pathsOf` in the script.

```bash
grep -rn "MAX_PATTERNS" tests tools src | grep -v "\.md:"
```

Output: two definitions (`check-globs.ts:11` and `src/kernel/rules.ts:7`), and test uses only in `tests/kernel/rules.test.ts`.

Failing test, in `tests/kernel/rules.test.ts`:

- Input: import `MAX_PATTERNS` from the script and from the canonical `limits.ts` or `budget.ts`.
- Expected: the two values are equal.
- Actual: the import fails, because no `limits.ts` or `budget.ts` exports the bound.

### F3. Smell: a symlink cycle reads one rule two times (nit)

At `check-globs.ts:116-120`, `followSymlinks: true` follows `rules/sub/loop -> ..` one level, so one rule counts two times.

```text
$ timeout 15 bun check-globs.ts rules .
.../rules/sub/loop/sub/r.md: lib/**: matches no file
.../rules/sub/r.md: lib/**: matches no file
2 rules checked, 2 problems
```

Failing test, in `tests/dotclaude/rules/skills.test.ts`:

- Input: `rules/sub/r.md` with `paths: ["lib/**"]`, and the symlink `rules/sub/loop -> ..`.
- Expected: `1 rules checked, 1 problems`.
- Actual: `2 rules checked, 2 problems`.

## Unconfirmed Findings

- `expansions("a\\{b,c\\}")` returns 2, but `Bun.Glob` treats `\{` as a literal and matches `a{b,c}`.
  The over-count matters only if the matcher of Claude Code also honors `\{`, and no command showed that.
- I08: these `SKILL.md` claims about Claude Code are not verified: `paths` is the only key read (line 81), the 1,000 and 4 MiB budget (line 86), the symlink and `paths` load rule (line 43), and the `AGENTS.md` fallback order (line 108).
  The `2.1.296` bundle strings name `AGENTS.md` and `.claude/AGENTS.md`, but they do not show the "only when none exists" order.
- I09: the script copies `frontOf`, `pathsOf`, `expansions`, and `checkRule` from `src/kernel/rules.ts`.
  The reason at `rules.ts:4` holds for the generator now, because the generator copies skill folders verbatim.
  The `setup` slice wraps the same kernel logic in a generated `bin`, which can be an option to remove the copy.
- `check-globs.ts:89-91` drops the stderr of `git`, so the exit-2 message does not give the reason.

## Checked With No Finding

- I01: the script reads repository state from `git`, not from assumptions.
- I02 (`01-grounding-and-memory.md:124-125`, Recipe 1): `SKILL.md:26-33` sends "must never happen" to a hook, and step 5 replaces reading the globs with a command.
- I04 and I05: the tests run the real script and assert exit statuses, and no assertion is weak or skipped.
- I07: `SKILL.md:113` writes nothing before the user agrees.
- I10: `SKILL.md:14` treats file text and command output as data.
- I14: no user-owned value changes.
- I15: no test asserts wording.
- I17: a `git` failure gives exit 2 and not "no files" (`check-globs.ts:108-114`).
- I03, I06, I11, I12, I13, and I16: these do not apply to a manifest, a skill, and a script.
- Smells: no silent `catch`, because `:93` gives exit 2 and `:127` records a problem.
  The run found no test of prose and no test that cannot fail.
  The only unreachable code is the fallback `?? { product: 1, sum: 0 }` at `:51`.

Checked: `bun test tests/dotclaude/rules/skills.test.ts tests/kernel/rules.test.ts` (16 pass), probes in new `$TMPDIR` folders, `grep` and `strings` of the Claude Code `2.1.296` bundle, `CLAUDE.md`, `.claude/rules/*.md`, and the dossier `00-INDEX.md` and `01`.
