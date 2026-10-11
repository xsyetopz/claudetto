# Cut list of design D25: tests (task 2.2)

This page is the second part of [`cut.md`](cut.md).
It holds each test file of `tests/` and `plugins/*/tests/` (105 files) with its call.

A test goes when it checks cut code, or when it checks the words of a message, a prompt, a skill, an agent body, or a doc (dossier I15).
A test stays when it checks a decision, an exit status, a file, a parsed value, a structure, a bound, or a code item that the code puts in a message.

The calls:

- `port`: each test stays, and task 2.7 moves the file to `.ts`.
- `cut`: task 2.3 deletes the file.
- `split`: task 2.3 deletes the named tests, and the file stays.

Investigators read each file, and line counts come from `wc -l`.
A test name below is exact.

## `tests/codegraph/` (the `search` hook is cut)

| File | Lines | Call | Tests that go |
| --- | --- | --- | --- |
| `lists.test.mjs` | 58 | `cut` | All 4 run the `search` hook. |
| `symbols.test.mjs` | 86 | `cut` | All 4 run the `search` hook. |
| `timeout.test.mjs` | 21 | `cut` | Its one test runs the `search` hook. |
| `failures.test.mjs` | 42 | `port` | None. Its two tests of a bad payload and a crash ran the `search` hook, and task 2.3 runs them on `session-start`, which keeps the same fail-open path. |
| `session.test.mjs` | 71 | `split` | "a missing CLI adds nothing to a search". Test 1 also calls `search`, so only that line goes. |
| `layout.test.mjs` | 110 | `port` | None. Remove the `search` payload from "no hook run calls codegraph install or init". |
| `sync.test.mjs`, `run-tree.test.mjs`, `windows.test.mjs` | 223 | `port` | None. |
| `fake-cli.mjs` (helper) | 136 | `port` | Remove `hit` and `caller`, which no test uses after the cut. |

## `tests/dotclaude/` (first part)

| File | Lines | Call | Tests that go |
| --- | --- | --- | --- |
| `adherence/spans.test.mjs` | 273 | `cut` | All 15 test `spans.mjs`. |
| `adherence/files.test.mjs` | 217 | `split` | "a deny wins over an ask for the same call" (its deny comes from the span check), "an approval claim with no approval word in the transcript is denied", "an approval claim with an approval word in a prompt passes", "an approval claim fails open when the transcript is unreadable, cut, or absent", "text that holds no claim never reads the transcript", "an old claim in the file is not a new claim", "the claim patterns match the usual forms and not plain words", "the prompts are the text records of the user, and not tool results or reminders". |
| `errors.test.mjs` | 158 | `split` | "a line that is not JSON in a transcript is skipped by the approval check". |

## `tests/browser/`

| File | Lines | Call | Tests that go |
| --- | --- | --- | --- |
| `browser-notes.test.mjs`, `search.test.mjs` | 190 | `port` | None. |
| `guide.test.mjs` | 85 | `port` | Remove the matches of `stops at N characters` from "a guide over the bound stops at the bound with a notice" and "the default bound is `MAX_GUIDE_CHARS`". In the second test, check the cut point instead: the output starts with `MAX_GUIDE_CHARS` characters of the input and does not hold one more (decision 1). |

## `tests/support/`, `tests/docs/`, `tests/jev/`

No helper of these folders has only cut tests as users, so each helper stays.

| File | Lines | Call | Tests that go |
| --- | --- | --- | --- |
| `support/external-copy.test.mjs` | 111 | `cut` | It checks the prose of `wiki/` and `plugins/` against `external/` (decision 2). |
| `support/addons`, `evals-private`, `file-size`, `hook-text`, `lock`, `manifests`, `prefix-chains`, `runtimes`, `sizes`, `unsandboxed`, `wiki-links` (`.test.mjs`) | 777 | `port` | None. |
| `support/eval-patterns.mjs`, `fake-program.mjs`, `import-rules.mjs`, `repo.mjs`, `tmp-root.mjs` (helpers) | 319 | `port` | None. |
| `docs/docs.test.mjs`, `jev/layout.test.mjs` | 48 | `port` | None. |
| `jev/jev.test.mjs` | 192 | `port` | None. The 401 test (line 132) also matches the words "is not valid": remove that match and keep the match of `TYPESAFE_API_KEY`. |

## `tests/lab/`, `tests/sessions/`, and the hook labs `plugins/*/tests/`

No file of these folders imports cut code.
Each file stays, and a change of one or two lines removes a match of prose words.

| File | Call | Lines that change |
| --- | --- | --- |
| `lab/compare-run.test.mjs` | `port` | Remove the 2 matches of `Compare the WITH column`. |
| `lab/run-program.test.mjs` | `port` | Remove the match of `refused, because`. |
| `sessions/start/sources.test.mjs` | `port` | Remove the match of `/Start by source/`. |
| `sessions/usage/runs.test.mjs` | `port` | Remove the match of the label `the skill listings of the transcripts`. |
| `plugins/dotclaude/tests/drift.test.ts` | `port` | Remove the matches of `more` and `do not have`. |
| `plugins/dotclaude/tests/surface.test.ts` | `port` | Remove the matches of `Recent commits` and `Current branch: main`. |
| `plugins/dotclaude-browser/tests/web-search.test.ts` | `port` | Remove the matches of `asked CloakBrowser for a bot check` and `The search failed:`. |
| `plugins/dotclaude-jev/tests/second-opinion.test.ts` | `port` | In "when the client cannot run, the result still tells the model that the tool failed", replace the match of `failed` with a check that the result is not empty. |
| The other 18 files: `lab/` (10 files, with `fixture-repo.mjs` as a helper, and `schema/spans.test.mjs`, which tests `dotclaude-lab` and not the cut `spans.mjs`), `sessions/` (4 files), and the hook labs `mod.test.ts`, `sembr.test.ts`, `variants.test.ts`, `ask-user-question.test.ts` | `port` | None. |

The 26 files have 3,952 lines: `lab/` 1,290, `sessions/` 1,183, and the hook labs 1,479.
The hook labs are already `.ts`.

## `tests/dotclaude/` (subfolders other than `adherence/`)

No file of these folders imports cut code.

| File | Lines | Call | Lines that change |
| --- | --- | --- | --- |
| `fixtures/trace-writes.mjs` | 29 | `cut` | No file uses it (`grep` for `trace-writes` and `TRACE_WRITES_FILE`). |
| `fixtures/validate.mjs` (helper of `settings-pin.test.mjs` and `tests/lab/schema/build.test.mjs`) | 39 | `port` | None. |
| `setup/addons.test.mjs` | 133 | `port` | Remove the matches of `No dotclaude add-on is installed` (line 78) and `index built` (line 106). |
| `setup/openspec.test.mjs` | 133 | `port` | Remove the match of `OpenSpec steps` (line 113). |
| `setup/settings.test.mjs` | 281 | `port` | Remove the matches of `Kept your statusLine` (line 240) and `Project settings get no status line` (line 263). |
| `context/` (2), `guard/` (1), `lib/` (5), `reads/` (1), `sembr/` (3) | 1,251 | `port` | None. The `sembr` tests check the output of a text transform, which is behavior. |
| `statusline/` (5) | 1,100 | `port` | None. Task 12.6 removes `grid.test.mjs` with the column code. |

## `tests/dotclaude/` (direct files, and `adherence/` other than `spans` and `files`)

No file of this part imports cut code.
`setup/addons.test.mjs` runs a stub `codegraph` for the add-on check of `setup`, not the `search` hook, so it stays.

| File | Lines | Call | Tests or lines that change |
| --- | --- | --- | --- |
| `prompt-variants.test.mjs` | 66 | `split` | "the block of each model for a subagent holds the evidence line", "the block of each model for a subagent holds the block line", "the sections of each variant for the main session hold the evidence line that the subagent block holds". They check that prose lines are in each copy, and the "Copy differs" test of the generator (task 4.2) replaces them. |
| `eval-graders.test.mjs` | 354 | `port` | None. See question 3. |
| `stop-prompt.test.mjs` | 53 | `port` | None. Task 3.2 removes it with the `Stop` prompt hook, or changes it. |
| `adherence/shellreview.test.mjs` | 123 | `port` | In "`git checkout tests/x.test.mjs` for a path that does not exist gets no write ask", replace the match of "writes the path" with a check of `permissionDecision`. Remove the match of the kind words (line 41) and the "writes the path" match of lines 111 to 115, and rename "`<command>` asks and names the kind". |
| `adherence/shellwrites.test.mjs` | 163 | `port` | Remove the match of the kind words (line 81), and rename the test of line 77, which says "names the kind". |
| `agents`, `deferred-tools`, `drift`, `import-rules`, `imports`, `settings-pin`, `skills`, `stop-prompt` (`.test.mjs`) | 784 | `port` | None. |
| `adherence/`: `code`, `git`, `hookfiles`, `protect`, `risk`, `scripts`, `second`, `shellpaths` (`.test.mjs`), and the helper `stub-fs.mjs` | 1,255 | `port` | None. |

## Summary

| Call | Files |
| --- | --- |
| `cut` | 6: `codegraph/lists.test.mjs`, `codegraph/symbols.test.mjs`, `codegraph/timeout.test.mjs`, `dotclaude/adherence/spans.test.mjs`, `dotclaude/fixtures/trace-writes.mjs`, `support/external-copy.test.mjs` |
| `split` | 4: `codegraph/session.test.mjs`, `dotclaude/adherence/files.test.mjs`, `dotclaude/errors.test.mjs`, `dotclaude/prompt-variants.test.mjs` |
| `port` | the other files, some with the line changes above |

## Decisions of the review

1. `tests/browser/guide.test.mjs`: the two tests keep the check of the cut point and lose the match of the notice words.
   The user gave this question to Jev, which picked this route (confidence 0.80).
2. `tests/support/external-copy.test.mjs` checks prose, so it goes (answer of the user).

## Open question

1. `tests/dotclaude/eval-graders.test.mjs` runs the regex of each eval grader on a passing and a failing sample message.
   Six graders read the final message of a model run (`verification-claim: claim-states-result`, `stop-check-verification-claim-cut: result-stated`, `stop-check-verification-claim-cut: cut-output-handled`, `facts-formatter: format-tool-named`, `facts-formatter: format-result-stated`, `false-alarm-sum: report-says-nothing-broken`), so 12 tests match prose of sample messages.
   They check the grader code and not a text that dotclaude ships, so this list keeps them.
   The other route cuts the 12 tests, and then task 5.5 must check these graders in another way.
