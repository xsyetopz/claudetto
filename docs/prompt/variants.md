# Prompt Variants and What Each One Costs

Read on 2026-10-27 from the Claude Code docs for `2.1.311` with `cc-docs read`. Every number here comes from the page named in its row. A cell of `not given` means the page gives no number.

## The Switch for Each Variant

`System Characters` is the row `System blocks only` on the page. `Total Characters` is the row `Everything shown here`. The page counts text only, so tool text is not in either number. `Change against the Lean Default` is `Total Characters` minus `15,721`, worked out from the two page numbers.

| Variant | Route | What Turns It On | System Characters | Tools Sent | Total Characters | Change against the Lean Default |
| --- | --- | --- | --- | --- | --- | --- |
| Lean default | `prompts/default-lean` | `claude --model claude-opus-5-5` with no other prompt flags | `5,767` | `12` | `15,721` | `0` |
| Full prompt | `prompts/full-prompt` | `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` | `26,944` | `12` | `37,105` | `+21,384` |
| Exclude dynamic | `prompts/exclude-dynamic` | `claude --exclude-dynamic-system-prompt-sections` | `3,400` | `12` | `15,616` | `-105` |
| Exclude dynamic, full | `prompts/exclude-dynamic-full` | `claude --exclude-dynamic-system-prompt-sections` with `CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=0` | `26,675` | `12` | `37,115` | `+21,394` |
| Git instructions off | `prompts/git-instructions-off` | `"includeGitInstructions": false` in `settings.json`, or `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS=1` | `5,767` | `12` | `15,083` | `-638` |
| Memory off | `prompts/memory-off` | `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1`, or `"autoMemoryEnabled": false` in `settings.json` | `3,704` | `12` | `13,658` | `-2,063` |
| Brief | `prompts/brief` | `claude --brief` | `5,767` | `12` | `15,721` | `0` |
| All tools upfront | `prompts/tools-upfront` | `ENABLE_TOOL_SEARCH=false` | `5,767` | `21` | `15,352` | `-369` |
| Bare | `prompts/bare` | `claude --bare` | `163` | `3` | `376` | `-15,345` |

Notes from the pages:

- `prompts/exclude-dynamic` moves the `Memory` section into the first user message. It drops `Session-specific guidance` from the body. It drops the fast-mode sentence.
- `prompts/exclude-dynamic-full` moves the memory section to the first user message in the same way.
- `prompts/git-instructions-off` keeps the git status reminder. The commit and pull request rules live in the `Bash` tool text, so that text changes.
- `prompts/brief` changes nothing in the text or the tools in the capture. The `SendUserMessage` tool is not in the tool list, so the brief rules do not appear.
- `prompts/memory-off` removes the whole memory section from the system body.
- `prompts/bare` has a body of `CWD: <cwd>` and `Date: <date>`. It sends no agent list and no skill list.

## Tools per Variant

Source: `prompts/tools-per-variant`. The default list has `12` tools on Opus 5.5: `Agent`, `Bash`, `Edit`, `ListAgents`, `Read`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, `DeferredToolPlaceholder`, `Write`.

| Variant | Tools | Adds | Removes | Changes the Text or Schema Of |
| --- | --- | --- | --- | --- |
| Lean default | `12` | none | none | none |
| Full prompt | `12` | none | none | `Agent`, `Bash`, `Edit`, `Read`, `Write` |
| Exclude dynamic | `12` | none | none | none |
| Exclude dynamic, full | `12` | none | none | `Agent`, `Bash`, `Edit`, `Read`, `Write` |
| Git instructions off | `12` | none | none | `Bash` |
| Memory off | `12` | none | none | none |
| Brief | `12` | none | none | none |
| All tools upfront | `21` | `CronCreate`, `CronDelete`, `CronList`, `EnterWorktree`, `ExitWorktree`, `Monitor`, `NotebookEdit`, `SendMessage`, `TaskStop`, `WebFetch`, `WebSearch` | `ToolSearch`, `DeferredToolPlaceholder` | none |
| Bare | `3` | none | `Agent`, `ListAgents`, `ReportFindings`, `ScheduleWakeup`, `Skill`, `ToolSearch`, `Workflow`, `DeferredToolPlaceholder`, `Write` | `Bash`, `Edit`, `Read` |

The default tool sizes, in characters, are below.

| Tool | Description | Schema |
| --- | --- | --- |
| `Agent` | `3,227` | `1,942` |
| `Bash` | `1,934` | `1,720` |
| `Edit` | `360` | `552` |
| `ListAgents` | `777` | `316` |
| `Read` | `790` | `1,071` |
| `ReportFindings` | `574` | `1,545` |
| `ScheduleWakeup` | `3,396` | `1,392` |
| `Skill` | `1,417` | `327` |
| `ToolSearch` | `953` | `406` |
| `Workflow` | `3,480` | `1,775` |
| `DeferredToolPlaceholder` | `83` | `33` |
| `Write` | `240` | `348` |

The bare tools are much smaller, as `prompts/tools-per-variant` shows in the section `Bare Mode Tools`.

| Tool | Description | Schema |
| --- | --- | --- |
| `Bash` | `22` | `1,483` |
| `Edit` | `29` | `552` |
| `Read` | `35` | `1,071` |

## Which of These Claudetto Can Use

Claudetto needs `Skill`, `Agent`, `ToolSearch`, and `Write`. A variant that removes any of them is `unusable`.

| Variant | Verdict | Reason |
| --- | --- | --- |
| Lean default | `usable` | Keeps all `12` tools. |
| Full prompt | `usable` | Keeps all `12` tools. It only changes tool text. It is large, so it gives no saving. |
| Exclude dynamic | `usable` | Keeps all `12` tools. It only moves and drops prompt text. |
| Exclude dynamic, full | `usable` | Keeps all `12` tools. It is large, so it gives no saving. |
| Git instructions off | `usable` | Keeps all `12` tools. It only drops text from the `Bash` description. |
| Memory off | `usable` | Keeps all `12` tools. It only drops the memory section. |
| Brief | `usable` | Changes nothing in the capture. It saves nothing. |
| All tools upfront | `unusable` | Removes `ToolSearch`. It also removes `DeferredToolPlaceholder`. It sends `21` tools. |
| Bare | `unusable` | Removes `Agent`, `Skill`, `ToolSearch`, and `Write`. |

No variant here is `partly`. Each one either keeps all four tools or removes at least one.

## The Floor and the Ceiling

Among the ten pages read:

- The smallest shape is `prompts/bare`, with `376` characters in total and `3` tools. It is `unusable`.
- The smallest usable shape is `prompts/memory-off`, with `13,658` characters in total and `12` tools.
- The largest shape is `prompts/exclude-dynamic-full`, with `37,115` characters in total and `12` tools.
- The largest plain full prompt is `prompts/full-prompt`, with `37,105` characters in total.

The usable range runs from `13,658` to `37,115` characters of text. The lean default sits at `15,721`. The switches that lower it, taken one at a time, save `105`, `369`, `638`, and `2,063` characters.

## Not Given by the Docs

- The ten pages give no total for the characters of the tool text. They give a size per tool only for the default list and for the bare tools.
- The pages give no number for a mix of two cheaper switches, except `prompts/exclude-dynamic-full`. Whether the savings add up is not given.
- `prompts/tools-per-variant` gives a size per tool only for the default `12` tools and the bare `3`. The sizes for the `11` tools that `prompts/tools-upfront` adds are not given.
- The pages do not mention the baseline numbers in `docs/surfaces.md`. The two sets of numbers are not reconciled here.
- The pages say `prompts/brief` adds rules for the `SendUserMessage` tool. The size of those rules is not given, because the capture does not show them.
- The other pages listed in `prompts/tools-per-variant` were not read. A variant on one of them could be smaller or larger than the floor and ceiling above.
