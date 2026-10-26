---
name: propose
description: Plans a change in `openspec/changes/<name>/` with a preset (`task`, `story`, or `epic`), one artifact at a time.
disable-model-invocation: true
argument-hint: "[task|story|epic] <change or idea>"
allowed-tools: Bash(minispec *)
---

Plan the change in files, and stop before the code.
Ask the user in place of a guess when an open question would change the specs, the approach, or the tasks.
In `claude -p`, write `[NEEDS CLARIFICATION: <question>]` in place of the guess, and end the report with the open questions.

1. Pick the preset, and state the facts that you used.
   Use the first rule that fits:
   - The user names a preset: that preset.
   - No `openspec/specs/` and a near-empty repository: `epic`.
   - A release that changes more than one capability: `epic`.
   - The change has no change of behavior: `task`, and only then.
   - The change touches one capability: `story`.
   - Unsure: `story`, and say that it is your choice.
2. Pick a kebab-case name, and run `minispec new change <name> --schema <preset>`.
3. Run `minispec status --change <name> --json`.
   It gives each artifact with its `status`, `outputPath`, `template`, and `instruction`, and the `context` and `rules` of `openspec/config.yaml` (`rules` hold a list for each artifact id).
4. Take the first artifact with the status `ready`.
   Read its template, follow its instruction, the `context`, and its list in `rules`, and write its `outputPath` in the change folder.
   Then run step 3 again.
5. When each artifact is `done`, run `minispec validate <name>` and fix each issue.
6. End the report with this line to the user, as the last line:
   `Next: /claudetto:apply`.
   Take the command from `next` in `minispec status --change <name> --json`.
   Give JSON to the user only when the user asks for it.
