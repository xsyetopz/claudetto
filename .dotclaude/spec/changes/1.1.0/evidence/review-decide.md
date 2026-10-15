# Review of the Decide Slice (P87)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
The review found 5 confirmed findings in `src/plugins/dotclaude/slices/decide/`.
The `decide` tests pass: `bun test tests/dotclaude/decide` gives 71 pass and 0 fail.
`bun check` shows no type errors.

## Confirmed Findings

### F1. Correctness: duplicate option keys pass the input check

`domain/request.ts:45` checks each option alone, so two options with the same `key` pass.
`adapters/cli.ts:119` then puts the options into one object, and Jev gets a pick with 1 option.
`domain/ask.ts:57` loses a duplicate `label` in the same way.

```sh
bun -e "<parseInput, cliCall, buildBody for options [{key:'a'},{key:'a'}]>"
# parseInput ok: true
# criteria: {"a":""}
```

- Failing test: in `tests/dotclaude/decide/request.test.ts` (a new file).
- Input: `parseInput({ question: "Which?", options: [{ key: "a" }, { key: "a" }] })`.
- Expected: `ok: false`.
- Actual: `ok: true`.
- Severity: should-fix.

### F2. I16: the eval entry says that the hook sends 0 model requests

The `tool.call` evals at `slice.ts:30-38` set `requests: 0`.
But `onSecondOpinion` calls `$.model.complete` at `adapters/mod.ts:54`.
`src/kernel/slice.ts:41` says that a hook that runs a model has `requests` above 0 and an `eval` case.
`dcc-plugin-you-should-know` follows that rule with `requests: 1`.

```sh
grep -n '"requests": [1-9]' plugins/*/evals/hooks.json
# plugins/dcc-plugin-you-should-know/evals/hooks.json:10:    "requests": 1,
```

- Failing test: in `tests/support/hook-evals.test.ts`.
- Input: the `tool.call decide` entry and `adapters/mod.ts:54`.
- Expected: `requests >= 1` and a `claude plugin eval` case.
- Actual: `requests: 0`, and the case names only tests of `AskUserQuestion`.
- Severity: should-fix.

### F3. Dead code: nothing reads `TOOL_NAME`

`domain/tool.ts:10` exports `TOOL_NAME`, and no file reads it.
`slice.ts:46` repeats its value as the regex `/^mcp__dotclaude__second_opinion$/`.

```sh
grep -rn "TOOL_NAME\b" src tests tools plugins/dotclaude
# src/plugins/dotclaude/slices/decide/domain/tool.ts:10:export const TOOL_NAME = ...
# plugins/dotclaude/slices/decide/domain/tool.ts:11:export const TOOL_NAME = ...
```

- Failing test: in `tests/dotclaude/decide/` (a new file).
- Input: the filter of the third `mod` entry of `slice`.
- Expected: the filter is built from `TOOL_NAME`, or `TOOL_NAME` is removed.
- Actual: the filter has its own copy of the value.
- Severity: nit.

### F4. Bound outside `limits.ts`

`domain/ask.ts:45` uses the number `2`, but `limits.ts:30` already defines `MIN_OPTIONS`.

```sh
grep -n "< 2\|MIN_OPTIONS" src/plugins/dotclaude/slices/decide/domain/ask.ts
# 45:    if (options.length < 2 || q.multiSelect) return;
```

- Failing test: a pin of the bound in `tests/dotclaude/decide/ask.test.ts`.
- Input: a question with `MIN_OPTIONS` options after a change of `MIN_OPTIONS`.
- Expected: `askRequest` uses the new bound.
- Actual: the bound stays at `2`.
- A test of behavior cannot fail while `MIN_OPTIONS` is `2`.
- Severity: nit.

### F5. Silent `catch`: the CLI error is lost

`adapters/jev.ts:25-32` turns each exit that is not 0, and each thrown error, into the cause `failed`.
No code reads `run.stderr`, so the error text of the CLI (`adapters/cli.ts:198`) is lost.
Claude sees only "The call to Jev failed.".

```sh
grep -rn "stderr" src/plugins/dotclaude/slices/decide
# adapters/mod.ts:46: ... stderr: run.stderr };
# adapters/jev.ts:14:  readonly stderr: string;
```

- Failing test: in `tests/dotclaude/decide/providers.test.ts`.
- Input: a run with `exitCode: 1` and `stderr: "TypeSafe API 500: busy"`.
- Expected: the result text names the status of the API.
- Actual: `{ ok: false, cause: "failed" }`, with no detail.
- Severity: should-fix.
- Confidence: medium, because the fix changes the contract of `Decision`.

## Unconfirmed Findings

- A copy of kernel code: `CliRun` (`adapters/jev.ts:11-15`) repeats the fields of `ProcessResult` (`src/kernel/ports.ts:11-14`).
  No test of behavior can fail on a copied type.
- A copy inside the slice: `asAnswer` (`domain/ask.ts:98`) is almost the same as `answerFrom` (`domain/reply.ts:33`).
- `pickWords` (`domain/picks.ts:20`) sends `key=` for an option with no description, so the API gets `""` in place of `null`.
  No run against the TypeSafe API shows that this changes the answer.
- The name of the test at `cli.test.ts:189` says "prints no key", but the test does not check the output.
- Outside the slice: `wiki/dotclaude/Second-Opinion.md:44` puts `onAskUserQuestion` in `adapters/ask.ts`, but it is in `adapters/mod.ts:90`.

## Checked With No Finding

- I13 (`06`): when no answer comes, the tool tells Claude to answer from its own evidence (`domain/text.ts:41`).
  The pick of Jev is added to the question as a recommendation.
- I14 (`06`): no code changes a value that the user owns.
  The model and the bounds are in `limits.ts`.
- I08 (`03`): `bun --help` lists `--no-env-file`.
  The `ProcessRunInit` type documents `env`, `stdin`, and `timeoutMs`.
- I10 (`03`): `Second-Opinion.md:64` documents that each question goes to the API.
  The key goes in the environment and not in the arguments.
- I17 (`07`): when the `AskUserQuestion` hook fails, the question goes to the user without a change.
  The hook does not read the failure as a negative answer.
- I12 (`04`): `$` calls do not count against the hook budget.
  `cli.test.ts:179` checks that the tries fit in `JEV_TIMEOUT_MS`.
- I15 (`06`): no test checks only prose.
- I01 to I07, I09, I11, I16 apart from F2, and I18 have no finding.
- No test is skipped, and no test has a weaker assertion.

Checked: `bun test tests/dotclaude/decide`, `bun check`, `bun --help`, greps, and `bun -e` probes.
The run read each file of the slice, its tests, `src/kernel/slice.ts`, `src/kernel/ports.ts`, the types of `$.process.run`, the dossier `00` and `06`, and the design "Review wave".
