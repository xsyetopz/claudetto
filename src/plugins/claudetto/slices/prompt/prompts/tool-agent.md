Starts an agent for a multi-step task.
The agent types are in the `<system-reminder>` messages.
Set `subagent_type`, because the model, effort, and tools of an agent come from its definition.

Use it when the reads would fill your context, or when parallel work shares little context.
Set `subagent_type: "fork"` for a short task that needs this conversation. A fork reads its cached prefix but runs on your model.
Do a small task yourself.
Give each brief the objective, the report format, the tools and sources, and the limits, and ask for bulk output in a file.
After you delegate a search, wait for the result and do not run it yourself, because two runs of one search waste tokens.

- The final report is not shown to the user. Relay what matters.
- `isolation: "worktree"` gives the agent its own git worktree. A hook saves its work as a patch. An agent that takes over reads it first, and the skill `patch` lands it.
- Agents run in the background, and you get a notification at the end. Do not write or guess the result of an agent that still runs, because that result does not exist yet. If the user asks first, say that it still runs.
