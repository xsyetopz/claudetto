## Context

`minispec` copies the behavior of OpenSpec, and this change closes the gaps that the proposal names.
Two of the gaps need a rule that the text of the spec does not show at once: the form of a scenario rename, and the meaning of `done` in `status`.

## Decisions

### Scenario Rename

A `MODIFIED` block declares a rename with two bullets, as OpenSpec PR #1843 proposes: `- RENAMED SCENARIO FROM: `#### Scenario: Old`` and `- RENAMED SCENARIO TO: `#### Scenario: New``.
A bullet cannot be a scenario header, so the count of scenarios stays right.
A declaration gives credit for one old scenario, and only when the new scenario is in the block. An unpaired bullet or a missing new scenario gives no credit, so the loss is reported as before.
The merge removes the bullets from the main spec, because a main spec holds no delta marker.

### Done Needs Content

An artifact with a fixed file name is `done` when each `##` section of its template is in the file with text.
A numbered template section, such as `## 1. Group` in `tasks.md`, is an example that the author names, so it needs no match.
An artifact with a glob, such as `specs/**/*.md`, is `done` when each file has text, because the author names the sections of a delta.

## Risks / Trade-Offs

A change that passed `validate --strict` before can fail now, because `validate` gives an ERROR when the archive would refuse the delta, and a WARNING for a missing step, an overlap, or a task number.
An artifact that held a heading with no text was `done` before, and is `ready` now.
