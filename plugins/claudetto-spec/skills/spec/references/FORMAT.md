# Spec Format and `spec_check` Output

## Spec File

- One file per capability: `specs/<capability>.md`, titled `# <Capability>`.
- Each requirement is a `## <ID> <title>` heading. The ID matches `[A-Z][A-Z0-9]*-\d+`, such as `AUTH-3`.
- Under it: one sentence of behaviour, at most three scenarios, optional `Open: <question>` lines.
- A scenario is `Given`, `When`, `Then` lines (plus `And`), one per line.
- Tests cite an ID anywhere in the test file, usually in the test name.

```markdown
# Auth

## AUTH-3 Lockout after failures

Five failed logins lock the account.

Given a user with four failed logins
When a fifth login fails
Then the account is locked

Open: how long does the lock last?
```

## `spec_check`

Tool `mcp__claudetto-spec__spec_check`, optional input `{ "path": "specs/auth.md" }`. It returns JSON text:

- `requirements`: `id`, `title`, `file`, `line`, `scenarios`, `open`.
- `malformed`: `file`, `line`, `reason`.
- `inflated`: requirements with more than one behaviour sentence or more than three scenarios.
- `uncovered`: IDs no test file cites.
- `orphans`: IDs tests cite that no spec defines.
- `changedSinceStaged`: test files edited since they were staged; each one breaks the red checkpoint.
- `removedIds`, `reworded`: IDs the spec had at session start (HEAD without a start record) that are gone, or whose behaviour sentence changed since. Spec changes need the user.
- `tampered`: per edited staged test: `deleted`, new skip/only markers, `assertions` dropped.
- `citedUnasserted`: test blocks that cite an ID and call no assertion (heuristic; check each).
