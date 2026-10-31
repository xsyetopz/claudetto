---
description: Write claudetto's settings.
---

Set up claudetto's keys in the user's Claude Code settings file.

1. Load the tool with `ToolSearch` and the query `select:mcp__claudetto__setup`, then call `mcp__claudetto__setup` with no input. It returns the settings file, the groups with what each does, and each difference between the user's value (`now`, absent when unset) and claudetto's value. If it says there is nothing to ask, tell the user and stop.
2. Ask the user with `AskUserQuestion`, using only the differences the tool returned:
   - One question per group, with `multiSelect: true`. Each option is one difference or a few that belong together. The label names the key, and the description gives the user's value, claudetto's value, and what it changes, from the group's `why` or the difference's `why`.
   - Ask about the `sandbox.` ids in a question of their own. `sandbox.enabled=false` and `sandbox.enabled` exclude each other: offer them as a single-select choice.
   - At most 4 questions in one call. Make more calls when there are more groups.
3. Call `mcp__claudetto__setup` with `keep` set to the `id` of each chosen difference, exactly as returned. Do not edit the settings file yourself.
4. If no question was answered, call nothing more and tell the user that nothing was written.
5. Show the user the tool's report. It ends by saying whether Claude Code needs a restart.

If `mcp__claudetto__setup` is not found, write nothing. The tool is registered only in an interactive session, because only a person can choose the keys. In an interactive session, a missing tool means claudetto's hooks module did not load. Tell the user that, and that `just setup` does the same work from a checkout of the repository.
