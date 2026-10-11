# What a mod can replace, Claude Code 2.1.293

Labels: **docs** = the mods reference, overview, and API pages on `code.claude.com/docs/en/plugins/mods/`, and the `claude-code.d.ts` types file on GitHub.
**not found** = no page says it.
**inferred** = my reasoning.
The sizes come from the `prompt_snapshot` of session `ce160872` (`subagent-usage.md`).
`capture.md` gives the token cost of each part and prices each lever.

## Levers

| Part | Lever | What it can do | Label |
| --- | --- | --- | --- |
| Built-in tool description | `tool.describe` | replace the text | docs |
| Built-in tool loading | `tool.describe` `isDeferred: true` | move the tool behind ToolSearch, so only its name is sent | docs |
| Built-in tool `input_schema` | none | `ToolDescribeResult` is `{description, isDeferred?}` only | not found |
| Remove a built-in tool | none in mods | `tool.call` or `tool.check` can deny a call, and `permissions.deny` of a bare name removes it | docs, prior capture |
| New tool | `$.tool.register` in `session.start` | JSON schema tool, named `mcp__<plugin>__<name>`, served by `tool.call` | docs |
| Replace a built-in by name | none | the `mcp__` prefix keeps the names apart | inferred |
| System prompt sections | `prompt.compose`, `prompt.section` | replace, drop, reorder, or replace the whole prompt | docs |
| First-message context | `prompt.context` | replace the blocks | docs |
| Attachments | `prompt.attachment` | `{text}` or `{text:null}`, for the types in the d.ts list | docs |
| Agent listing | `agent.offer` | withhold one agent type; the listing text itself has no hook | docs, not found |
| Sandbox text, output style | not found | maybe an attachment type; task 2.9 checks | not found |
| Tool description cache | `tool.describe` | answers are cached for the session, and an unstable answer spends the prompt cache | docs |

## Consequences for the plan

- The largest lever for loaded tools is deferral, not a shorter text.
  A deferred tool costs its name.
  The loaded tools are 29,407 chars: `AskUserQuestion` 6,794, `Agent` 5,362, `Bash` 4,622, `Skill` 3,302, `ToolSearch` 2,497, `Read` 2,459, `ListAgents` 2,009, `Edit` 1,399, `Write` 953.
  Candidates for `isDeferred: true`: `AskUserQuestion`, `ListAgents`, and maybe `Skill` and `Agent`.
  The engine keeps some built-ins loaded (`tengu_non_deferrable_builtins`, `0.27` research), and a deferred tool costs one ToolSearch call at first use.
- A custom re-definition does not save bytes on its own.
  A mod tool adds its own schema, and the built-in stays, deferred or denied.
  It saves bytes only when the custom schema is much smaller than the built-in and the built-in is denied, for example a short `ask` tool in place of `AskUserQuestion`.
  The cost is a lost built-in UI and a tool name that the model was not trained on (inferred), so the eval decides.
- `input_schema` text stays as Claude Code sends it.
  A shorter description is the only text cut for a loaded built-in.
- Each cut answer must be the same for the whole session, because the answer is cached and a change breaks the prompt cache.
