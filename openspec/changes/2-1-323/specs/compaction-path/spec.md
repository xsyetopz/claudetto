## ADDED Requirements

### Requirement: The Handoff Notice Keeps the Turn on the Work

The handoff notice SHALL ask the model to list each open task as its own, and as the user's only a step the user alone can take, and to go on with the next step in the same turn after it writes the file, with no message about the file. The opening built from the file SHALL ask the model to take each open task itself. A session wrote the file, then ended its turn on a report that listed a PR, branches, and a workflow as "Waiting on you".

#### Scenario: The Notice After the File

- **WHEN** the first auto-compaction finds no handoff file
- **THEN** the notice says to go on with the next step in this turn and to name only a step user alone can take as user's (`handoff.test.ts`, "the notice keeps the turn on the work")
