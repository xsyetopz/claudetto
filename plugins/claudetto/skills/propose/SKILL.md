---
name: propose
description: Plans a change in `openspec/changes/<name>/` with a preset (`task`, `story`, or `epic`), one artifact at a time. Use when the user wants a plan in files before the code.
disable-model-invocation: true
argument-hint: "[task|story|epic] <change or idea>"
allowed-tools: Bash(minispec *)
---

Plan the change in files. Stop before the code.
Ask the user in place of a guess. Do this when an open question would change one of these: the specs, the approach, or the tasks.
In `claude -p`, write `[NEEDS CLARIFICATION: <question>]` in place of the guess. End the report with the open questions.

1. Pick the preset. State the facts that you used.
   Use the first rule that fits:
   - The user names a preset: that preset.
   - No `openspec/specs/` and a near-empty repository: `epic`.
   - A release that changes more than one capability: `epic`.
   - The change has no change of behavior: `task`, and only then.
   - The change touches one capability: `story`.
   - Unsure: `story`. Say that it is your choice.
2. Pick a kebab-case name. Run `minispec new change <name> --schema <preset>`.
3. Run `minispec status --change <name> --json`.
   It gives each artifact with its `status`, `outputPath`, `template`, and `instruction`.
   It also gives the `context` and `rules` of `openspec/config.yaml` (`rules` hold a list for each artifact id).
4. Take the first artifact with the status `ready`.
   Read its template. Obey its instruction, the `context`, and its list in `rules`.
   Write its `outputPath` in the change folder.
   Then run step 3 again.
   A `MODIFIED` requirement can rename a scenario of the main spec.
   Then write two bullets in the block, before the scenarios, so that `validate` and `archive` read the old scenario as renamed:
   ```text
   - RENAMED SCENARIO FROM: `#### Scenario: <old name>`
   - RENAMED SCENARIO TO: `#### Scenario: <new name>`
   ```
   The new scenario must be in the block. The archive removes the two bullets from the main spec.
5. When each artifact is `done`, run `minispec validate <name>`. Fix each issue.
6. Make this line the last line of the report to the user:
   `Next: /claudetto:apply`.
   Take the command from `next` in `minispec status --change <name> --json`.
   Give JSON to the user only when the user asks for it.
