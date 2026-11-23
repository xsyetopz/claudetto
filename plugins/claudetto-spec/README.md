# Claudetto-Spec

A spec-first loop for Claude Code: requirements get IDs, tests cite the IDs, failing tests are staged before the implementation, and a deferred tool, `spec_check`, reports coverage from the files.

## Install

```sh
claude plugin install claudetto-spec --marketplace xsyetopz/bedrock
```

## The Loop

The `spec` skill applies to new or changed behaviour, not typos, renames, dependency bumps or questions. The model decides when to load it, and under pressure a smaller model may skip it; the commands below run it every time. The Stop gate below checks the result either way.

1. Clarify: an interactive session asks each expensive unknown through AskUserQuestion; a `-p` run writes it as an `Open:` line, takes the cheap default and lists each assumption in the reply.
2. Spec: edit `specs/<capability>.md`.
3. Red: write tests in the project's framework that cite the requirement ID, see them fail, then `git add` them.
4. Green: implement without editing the staged tests. A contradiction with a requirement, or a test that cannot pass honestly, stops the work and is reported with the requirement ID.
5. Check: call `spec_check` and the project's test command, and report both.

## Commands

The commands fire every time they are typed, whatever the model would decide, and split the loop at the spec so a reviewer can read and edit it before any test or code exists.

| Command | Runs |
| --- | --- |
| `/claudetto-spec:spec <request>` | the whole loop, as the skill does |
| `/claudetto-spec:specify <request>` | clarify and spec, then stops with the requirement IDs and any `Open:` lines |
| `/claudetto-spec:implement [IDs]` | red, green and check from the spec as you left it; with no IDs, every requirement no test cites yet |

A requirement that narrows another, such as a cap, governs the inputs it names; `implement` stops and names both IDs only when no implementation can satisfy them. The model cannot invoke `specify` or `implement` (`disable-model-invocation: true`), so they add nothing to each request.

## Spec Format

```markdown
# Auth

## AUTH-3 Lockout after failures

Five failed logins lock the account.

Given a user with four failed logins
When a fifth login fails
Then the account is locked

Open: how long does the lock last?
```

- One file per capability at `specs/<capability>.md`, titled `# <Capability>`.
- Each requirement is a `## <ID> <title>` heading; the ID matches `[A-Z][A-Z0-9]*-\d+`.
- One sentence of behaviour, at most three scenarios of `Given`/`When`/`Then` lines, optional `Open: <question>` lines.
- Tests cite an ID anywhere in the test file, usually in the test name.

## `spec_check`

`mcp__claudetto-spec__spec_check` is deferred (load it through ToolSearch). It reads the files git lists (`git ls-files --cached --others --exclude-standard`) on every call and stores nothing. Optional input: `{ "path": "specs/auth.md" }` limits the report to one spec.

It returns JSON text:

- `requirements`: `id`, `title`, `file`, `line`, `scenarios`, `open`.
- `malformed`: `file`, `line`, `reason` for a bad heading, a missing title or a duplicate ID.
- `inflated`: requirements with more than one behaviour sentence or more than three scenarios.
- `uncovered`: IDs no test file cites.
- `orphans`: IDs cited in tests that no spec defines, limited to prefixes some spec uses, so `UTF-8` or `ISO-8601` are not orphans.
- `changedSinceStaged`: test files in `git diff --name-only` (work tree against the index), so an edit to a staged test is visible.
- `removedIds`, `reworded`: spec drift against the spec text the session started with (`git show HEAD:<file>` when the plugin holds no session-start record; see Stop Gate). An ID the start spec had that no spec defines now is removed; an ID whose one behaviour sentence changed (whitespace aside) is reworded. New IDs and new spec files are not drift.
- `tampered`: for each test in `changedSinceStaged`, `deleted` from the work tree, `addedMarkers` (`.skip(`, `.only(`, `xit(`, `xdescribe(`, `test.todo(`, `it.todo(`) the work tree has more of than the index, and `assertions` `{before, after}` when the count of `expect(` and `assert` calls dropped. With a session-start record, a test the user had already changed counts only when the session changed it that way again.
- `citedUnasserted`: `{id, file, line}` for each test block that cites a defined ID and calls no assertion. A heuristic: a block runs from a `test(`, `it(`, `def test_` or `func Test` line to the next test or `describe` line, and an assertion is `expect(`, `assert` or `assertX(`. It misreports a test that asserts through a helper or a framework with other names, such as Go's `t.Errorf`.

`hardFindings(report)` (`hooks/check/hard.ts`) returns the findings that should block completion: malformed, `removedIds`, `reworded`, `tampered` and `orphans`. The rest is advice.

## Stop Gate

When the main agent is about to finish a turn in a repo with a `specs/` directory, a `classic.Stop` hook (`hooks/check/stop.ts`) runs the same gather and check and blocks the stop once if `hardFindings` is non-empty.

Only the session's own changes count. At `session.start` the plugin records a baseline (`hooks/check/baseline.ts`) in session state: each spec file's text, the text of each test file that already differed from the index, and the malformed and orphan findings already present. At Stop, specs are compared with that baseline instead of HEAD; a tamper finding counts only when the test also changed that way since the start; and a malformed or orphan finding the start had is dropped. A user's uncommitted spec edit or unstaged test is therefore never reported as the agent's drift. Without a baseline (it failed, or the plugin loaded mid-session), the gate compares with HEAD and the index as before.

The block reason holds one line per finding; a `reworded` or `removedId` line names the wording the requirement had at session start and tells the agent to restore the spec, its tests and the code unless the user named the change, and to report the conflict by ID. It blocks at most once per turn: a Stop that follows a block (`stop_hook_active`) passes. It never blocks a subagent, never blocks on advice findings, and fails open on any error (logged to the debug log). A repo without `specs/` costs one `fs.exists`. The hook adds no always-on tokens.

Test files are paths matching `*.test.*`, `*.spec.*`, `*_test.*`, `test_*.py`, or under `__tests__/`, `test/` or `tests/`.

## Disable

Run `/plugin` and turn off claudetto-spec, or run `claude plugin disable claudetto-spec`.
