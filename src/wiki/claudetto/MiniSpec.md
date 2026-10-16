# MiniSpec

This page tells how MiniSpec plans and tracks a change in `claudetto`.
It is for a user who wants to plan a change with files, and for an agent that follows the skills.
MiniSpec is a lightweight spec-driven workflow with 3 skills and one CLI, `minispec`.

## Layout

MiniSpec keeps its files in the project folder:

| Path | Use |
| --- | --- |
| `minispec/specs/<capability>/spec.md` | The current spec of one capability. |
| `minispec/changes/<name>/` | One open change. |
| `minispec/changes/archive/<date>-<name>/` | A change that is done. |

A change folder holds these files:

- `proposal.md` tells why the change is needed and what it changes.
- `tasks.md` lists the tasks.
  Each task has a check.
- `design.md` is for a big change.
- `specs/<capability>/spec.md` is for a big change.
  It holds the spec delta: `ADDED`, `MODIFIED`, or `REMOVED` requirements.
- `handoff.md` holds the handoff of a session.
  See [Handoff](Handoff).

## Tiers

The size of the change sets the tier:

| Tier | Files |
| --- | --- |
| Small | None. Edit the code and run the check. |
| Medium | `proposal.md` and `tasks.md` |
| Big | Medium, and `design.md` and `specs/` |
| Large | Same files as big. The `planner` agent writes the plan, and a `reviewer` reviews the plan before the work. |

The CLI infers the tier from the files.
A change with `design.md` or `specs/` is big.

## The Skills

- `minispec` plans the change and writes the files.
- `minispec-apply` does the tasks in order.
  It marks a task done only after its check ran and passed.
- `minispec-review` starts the `reviewer` agent.
  The reviewer did not write the change.
  After the review, the skill runs `minispec archive <name> --yes`.

At any later step, go back to planning when the work shows that the plan is wrong.
Change `proposal.md`, `design.md`, or `tasks.md`, then continue.

## Checks

A check is a command in a code span, or in a fenced block after `Check:`.
For example:

```markdown
- [ ] 1.1 Add the flag
  Check: `just test tests/cli.test.ts`
```

A check in prose is not a command, so `minispec validate` refuses it.
A prose check is reported as not run.

## The Command

`minispec` is the only `bin/` command of the core plugin.

| Command | Use |
| --- | --- |
| `minispec new <name>` | Make the files of a change. `--tier big` adds `design.md` and `specs/`. |
| `minispec list` | List the open changes. |
| `minispec show <name>` | Print the files of a change. |
| `minispec status [name]` | Count the done tasks, and name the next open task. |
| `minispec validate [name]` | Check the files, the checks, and the spec deltas. |
| `minispec archive <name> --yes` | Merge the spec deltas, and move the change to the archive. |

- Each command takes `--json`, `--no-color`, and `-h`.
- Data goes to stdout.
  Messages and errors go to stderr.
- The exit code is 0 on success, 1 when the work failed, and 2 for a wrong use.
- `NO_COLOR` and a pipe turn the color off.
- The CLI never prompts, because a prompt needs a word that depends on a language.
  `minispec archive` without `--yes` fails with exit code 2 and names `--yes`.
- `archive` needs a valid change with each task checked.

## Spec Format

A spec file uses fixed labels: `## Purpose`, `## Requirements`, `### Requirement: <name>`, and `#### Scenario: <name>`.
A delta file uses `## ADDED Requirements`, `## MODIFIED Requirements`, and `## REMOVED Requirements`.
The labels are the syntax of the format, like keys in a data file.
The label `Check:` of a task is a fixed label too.
They do not change with the language of the spec.
`minispec validate` checks the structure only.
Each requirement needs a statement line and a `#### Scenario:` block.
It reads no word of the statement, so a spec in any language is valid.

## Worktrees

`minispec` finds the project root from the working folder.
The root is the nearest folder above it with `minispec/` or `.git`.
A linked git worktree has `.git` as a file, so the root is the worktree.
Each worktree has its own `minispec/changes/`.

## The Handoff

When a change has an open task, the handoff goes to `minispec/changes/<name>/handoff.md`.
It names the change folder and the next open task.
With no open change, the handoff goes to `.claudetto/handoffs/`.

The status line shows the same change and task.
See [Status Line](Status-Line).

## Related Pages

- [Overview](Overview)
- [Architecture](Architecture)
- [Handoff](Handoff)
- [Agents](Agents)
- [Status Line](Status-Line)
