# P51 Sandbox Session

This file records the sandbox session of P51, which runs the phase skills on a trivial change and a large change.

## Method

1. `just sandbox-clean`, then a first `just sandbox -p` run that made the sandbox folder.
2. In the sandbox `project/`: a `justfile` with `check` (`bun test`) and an empty `generate`, `math.ts`, `math.test.ts`, one commit, and a local git identity.
3. One headless turn for each slash command, with `just sandbox [-c] -p "<command>"` and `--allowedTools Bash Write Edit Read Agent Skill Glob Grep`.
4. The agents of a headless run get no grant from `--allowedTools`.
   With the approval of the user (2026-10-13), the sandbox `config/settings.json` allows `Edit`, `Write`, `Bash(just check)`, `Bash(git add:*)`, and `Bash(git commit:*)`, and nothing more.
   A run with `--permission-mode bypassPermissions` was denied by the auto mode classifier, and was not used.
5. Each defect that a run found was fixed in the checkout before the next run.

## Results

| Change | Size | Path | End state |
| --- | --- | --- | --- |
| `sub` | trivial | `specify`, `implement` | `canceled`: made before the fix of `specify` |
| `mul` | trivial | `specify`, `implement` | `canceled`: the `asks` guard asked on an edit of `math.test.ts`, and a headless run cannot answer |
| `div` | trivial | `specify` to `merge`, then `accept` refused | `canceled`: made before the citation rule of the skills |
| `neg` | trivial | `specify`, `implement`, `review`, `merge`, `accept`, `archive` | `archive/2026-10-13-neg`, `specs/neg.md` |
| `stats` | large | `specify`, `plan` (2 packages, 2 waves), `implement`, `review`, `merge` for each, a `reject` and a retry of `P6`, `accept`, `archive` | `archive/2026-10-13-stats`, `specs/stats.md` |

- The package IDs `P1` to `P6` and the requirement IDs `REQ-1` to `REQ-6` are unique over all changes.
- `drop <change>` canceled each open package of the change.
- `merge` made one commit with the `done` event, and left the files of other changes uncommitted.

## Defects and Fixes

| Defect | Fix |
| --- | --- |
| `specify` left the package of a short change as the template, with `owns: []` | `41477d13` |
| The skills did not give the citation rule, so `accept` refused at the end | `31db3e9f` |
| `merge` refused when another change had uncommitted store files | `22daf57b` |
| `trace` after `verify` read the main checkout and not the package worktree | `fa47deb0`: `trace --in <dir> --package <p>` |
| The worktree of an `implementer` has no copy of the uncommitted change files | `4d481559`: the `implement` skill gives the brief and the requirements in the prompt |

## Open

- A missing citation in a `done` package has no path of its own.
  In the `stats` run, the user decision let the retry of `P6` cite line 1 of `P5` with `REQ-5`, outside the `satisfies` of `P6`.
- The `asks` guard asks on each changed line of a test file, also on an import line that only adds a name.
  A headless run cannot answer the ask, so the sandbox changes put each new test in a new file.
