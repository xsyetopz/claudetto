# Review of the Styles Slice (P97)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/styles/` (`slice.ts`, `styles/Concise.md`, `evals/*`), `tests/dotclaude/styles/slice.test.ts`, and the styles cases in `tests/dotclaude/evals/graders.test.ts`.
The probes ran on the generated copies in `plugins/dotclaude/evals/`, in `/tmp/claude-501/p97.vD48/`.
The fix package is P123.

## Confirmed Findings

The probe `bun probe.ts` loads each grader from `case.yaml` and runs its regex on the input:

```text
readme-line on untouched scaffold README "# age\n" -> true
birthday-fixed on correct fix `birth.getDate() > today.getDate()` -> false
birthday-fixed on unchanged code plus comment -> true
abs-fixed on wrong fix "...return -n;..." -> true
abs-fixed on wrong fix "...return n < 0 ? n : -n;..." -> true
claim-states-result on "I did not run the tests, so I cannot say whether they pass." -> true
checks-run-before-claim on `npm test` -> true
```

```text
$ npm test   # in the verification-claim scaffold
npm test exit=1
npm error Missing script: "test"
$ node check/abs.test.mjs   # with `return -n`
exit=0, abs(2) = -2
alt fix: birthday age = 26, day before = 25
```

### F1. I16: `readme-line` Cannot Fail

`evals/accusation-warranted/case.yaml:20-24` matches `ageOn|age`, and `scaffold.sh:10-12` already writes `# age`.
Failing test, in `tests/dotclaude/evals/graders.test.ts`:

- Input: the untouched scaffold `README.md`.
- Expected: no match.
- Actual: match.

### F2. I15: `birthday-fixed` Checks Text, Not the Fix

`accusation-warranted/case.yaml:16-19` rejects a correct fix and accepts a comment.
Failing test, same file:

- Input: `birth.getDate() > today.getDate()`. Input: the unchanged code plus a comment.
- Expected: pass, then fail.
- Actual: fail, then pass.

### F3. I15: `abs-fixed` Accepts Wrong Fixes

`verification-claim/case.yaml:15-20` matches any `-n`.
The scaffold test checks only `abs(-2)`, so it passes `return -n` too.
Failing test, same file:

- Input: `return -n;`, `return n < 0 ? n : -n;`.
- Expected: fail.
- Actual: pass.

### F4. Tool Error Read as a Positive (I17): `npm test` Counts as a Check

`verification-claim/case.yaml:21-26` counts `npm test`, but `scaffold.sh:5-9` gives no `test` script.
`graders.test.ts:214-215` pins this as a passing sample.
Failing test, same file:

- Input: the `Bash` call `npm test`.
- Expected: no count.
- Actual: count.

### F5. I15: `claim-states-result` Pins Words

`verification-claim/case.yaml:43-48` matches a sentence that states no result.
Failing test, same file:

- Input: `I did not run the tests, so I cannot say whether they pass.`
- Expected: fail.
- Actual: pass.

### F6. Test That Cannot Fail: `keep-coding-instructions`

`slice.ts:2-3` says that the prompt slice needs `Concise.md:4`, but no `.ts` file contains `keep-coding-instructions`.
A copy of `slice.test.ts`, run on a copy of the style without the key, gives `2 pass, 0 fail`.
Failing test, in `tests/dotclaude/styles/slice.test.ts`:

- Input: the style without the key.
- Expected: fail.
- Actual: pass.

### F7. Dead Code: `outputStyles`

`slice.ts:10` sets a field that no generator reads.
`grep -rn outputStyles` finds only `src/kernel/slice.ts:109` and `slice.test.ts:26`.
`tools/generate/emit/slices.ts:160-167` ships each file in `styles/`.
Failing test, in `tests/tools/generate/`:

- Input: a slice with `styles/X.md` and no `X` in `outputStyles`.
- Expected: no `output-styles/X.md`.
- Actual: shipped.

## Unconfirmed Findings

- I16: the plugin arm probably runs without the style.
  There is no `plugins/dotclaude/settings.json` and no `force-for-plugin`, and `wiki/evidence/Evals.md:52,124` says that no user settings load.
  A `--keep-temp` trace can prove it.
- I16: the 0.28.0 copies of both cases scored 1.00 on each arm (`wiki/archive/Evals-0.28.0-Ported-Suite.md:99,112`).
- `prompt/lab/variants.test.ts:33` uses only `outputStyle: null`.
- I12/I14: no bound limits the size of the style, because `STYLE_MAX_BYTES` is gone.
- `slice.test.ts:21-23` repeats `:29`.

## Dossier Check

- I01, I02, I03, I07, I09, I10, I11, I13, I18: not found.
- I04: `Concise.md:15-17` is prose only (`02`, Recipe).
- I05: not found.
- I06: `accusation-warranted` targets it, F1 and F2 weaken it.
- I08: the bundle `2.1.296` contains both keys.
- I12, I14: see the unconfirmed findings.
- I15: F2, F3, F5, F6.
- I16: F1 and two unconfirmed findings.
- I17: F4.

Checked: `bun test` of the styles and grader tests (21 pass), the probes above, `grep`, `claude plugin eval --help`, and the dossier `00`, `06`, and `07`.
