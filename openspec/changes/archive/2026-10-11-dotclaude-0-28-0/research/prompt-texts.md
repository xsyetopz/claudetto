# Texts that the harness gives to Claude (part 1)

Task 29.1 of `tasks.md`.
This list names each text that the Claude Code harness gives to Claude, the model, from the plugins in `plugins/`.
Part 2 is [prompt-texts-2.md](prompt-texts-2.md).
It holds the add-on plugins, the totals, and the `grep` counts.
Task 29.2 audits each entry of this list.

## Columns

- `Where` is a `path` or a `path:line` (the line where the text starts).
- `Surface` is the place in the request or in the conversation that gets the text.
- `When` is the time at which the text loads.
- `Bytes` is the size in UTF-8 bytes.
  A size marked "template" is the size of the static parts.
  I got it by calling the function with empty or minimal placeholders, so it can be off by a few bytes.
- `Bound` is the bound that covers the text.
  The bounds are in `tools/limits.mjs` (`T`), `plugins/dotclaude/lib/budget.mjs` (`B`), and `features/<name>/limits.mjs` (`F`).
  A dash means that no bound covers the text.
- Sizes are from the working tree of 2026-10-10 (branch `dotclaude-0-28-0`).

## Decisions on what to include

| Text | Decision | Reason |
| --- | --- | --- |
| `plugin.json` `description` | Excluded | The `/plugin` screen and the marketplace show it. `wiki/core/Prompt-Surface.md` (line 181) names the agent descriptions as the agent lines, and names no manifest text. |
| `hooks.json` `description` | Excluded | The `/hooks` screen shows it. No request holds it. |
| `hooks/description.txt` | Excluded | The tool `tools/hook-text.mjs` copies it to the `description` of `hooks.json`. |
| `hooks.json` `prompt` of `Stop` | Included | Claude Code sends it to the model that judges the hook (a separate request). |
| `hooks/Stop.prompt.txt` | Same text | `tools/hook-text.mjs` copies it to `hooks.json`. I count it one time. |
| Frontmatter of the output style | Body only | The `/output-style` picker shows `name` and `description`. The body is the prompt. |
| Frontmatter `tools`, `model`, `effort`, `maxTurns`, `color` of an agent | Excluded | They are settings and not prose. |
| `systemMessage` | Not used | The count in part 2 is 0. A `systemMessage` goes to the user and not to the model. |
| `ask` reasons | Marked "user" | The permission prompt shows the reason to the user. I did not verify that the model sees it after a deny. |
| Status line (`features/statusline/`) | Excluded | It draws in the terminal of the user. No text goes to the model. |
| Dev tools (`dotclaude-capture`, `dotclaude-schema`, `dotclaude-sandbox`, `dotclaude-codegraph-check`) | Excluded | No skill and no hook tells Claude to run them. |
| Skills with `disable-model-invocation: true` (`setup`, `eval-compare`) | Body included, listing excluded | The listing has no entry for them. The body loads when the user runs the skill. This is from the Claude Code docs, and I did not test it. |

## Plugin `dotclaude`

### Output style

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `plugins/dotclaude/output-styles/dotclaude.md` (body, line 7 on) | Output style, in the system prompt | Each request of the main session | 5,517 (file 5,720, frontmatter 203) | `T` `FIRST_REQUEST_*`, `T` `START_TOKENS` |

### System prompt sections in code

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `features/prompt/variants.mjs:32` `VARIANTS.opus.sections` | System prompt (`prompt.compose`, `<model_notes>`) | Each request, on Opus | 187 | `T` `FIRST_REQUEST_*` |
| `features/prompt/variants.mjs:41` `VARIANTS.sonnet.sections` | System prompt (`prompt.compose`) | Each request, on Sonnet | 224 | `T` `FIRST_REQUEST_*` |
| `features/prompt/variants.mjs:46` `VARIANTS.haiku.sections` | System prompt (`prompt.compose`) | Each request, on Haiku | 272 | `T` `FIRST_REQUEST_*` |
| `features/prompt/variants.mjs:51` `VARIANTS.fable.sections` | System prompt (`prompt.compose`) | Each request, on Fable | 209 | `T` `FIRST_REQUEST_*` |
| `features/prompt/variants.mjs:12` `EVIDENCE_LINE` | Inside the spawn blocks below, and a copy in the output style | See below | 366 | - |
| `features/prompt/variants.mjs:15` `VERIFY_LINE`, `:18` `STEP_LINE` | Inside the sections and blocks of Sonnet and Haiku | See above and below | 195 and 47 | - |
| `features/prompt/variants.mjs:84` `spawnBlock` (opus and fable 366, sonnet 562, haiku 610, plus a wrapper of 51) | End of the task prompt of a subagent (`agent.spawn`) | Each spawn of a subagent | 417 to 661 | - |
| `features/prompt/data.mjs:4` `CONTEXT_MANAGEMENT` | System prompt section `context_management` (`prompt.section`) | Each request, only when `DISABLE_COMPACT` is on | 591 | `T` `FIRST_REQUEST_*` |

The model key comes from `variantKey` in `features/prompt/select.mjs` and is fixed at the first request of a session.
A session loads one variant section.

### Prompt surface handlers (replace text of Claude Code)

`features/surface/data.mjs` holds the replacement texts.
`features/surface/rules.mjs` uses a replacement only when it is shorter than the original.

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `features/surface/data.mjs:6` `SANDBOX_TEXT` | `sandbox_instructions` attachment | Session start, when `allowUnsandboxedCommands` is `false` | 341 | `T` `FIRST_REQUEST_*` |
| `features/surface/data.mjs:16` `SANDBOX_RETRY_TEXT` | `sandbox_instructions` attachment | Session start, when `allowUnsandboxedCommands` is `true` | 725 | `T` `FIRST_REQUEST_*` |
| `features/surface/data.mjs:28` `AUTO_MODE_TEXT` | `auto_mode` attachment | When auto mode is on | 188 | - |
| `features/surface/data.mjs:36` `AGENT_NOTE` | End of the `agent_listing_delta` attachment (replaces 133 bytes) | When the agent listing loads | 78 | - |
| `features/surface/data.mjs:59` `TOOL_TEXT.Agent` | Tool description of `Agent` | Each request | 1,010 | `T` `FIRST_REQUEST_*` |
| `features/surface/data.mjs:73` `TOOL_TEXT.Bash` | Tool description of `Bash` | Each request | 747 | `T` `FIRST_REQUEST_*` |
| `features/surface/data.mjs:85` `TOOL_TEXT.Read` | Tool description of `Read` | Each request | 512 | `T` `FIRST_REQUEST_*` |

The handlers also cut text and add none: they drop the `Recent commits:` block of `session_context`, and they hide the agents `claude-code-guide` and `statusline-setup`.
They defer the tools `AskUserQuestion` and `ListAgents`.

### Agents

The listing shows the `description` of each agent on each request.
The body is the system prompt of the subagent, and it loads when the agent runs.
`AGENT_DESCRIPTION_MAX_CHARS` (`T`) is 300, and all five descriptions fit.

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `agents/debugger.md:3` description | Agent listing | Each request | 169 | `T` `AGENT_DESCRIPTION_MAX_CHARS` |
| `agents/debugger.md` body | Agent body | At each run of the agent | 3,001 | tests pin `F` `REPORT_MAX_WORDS` in the body |
| `agents/implementer.md:3` description | Agent listing | Each request | 193 | `T` `AGENT_DESCRIPTION_MAX_CHARS` |
| `agents/implementer.md` body | Agent body | At each run | 2,987 | tests pin `F` `REPORT_MAX_WORDS` |
| `agents/investigator.md:3` description | Agent listing | Each request | 208 | `T` `AGENT_DESCRIPTION_MAX_CHARS` |
| `agents/investigator.md` body | Agent body | At each run | 4,183 | tests pin `F` `REPORT_MAX_WORDS` |
| `agents/reviewer.md:3` description | Agent listing | Each request | 191 | `T` `AGENT_DESCRIPTION_MAX_CHARS` |
| `agents/reviewer.md` body | Agent body | At each run | 4,731 | tests pin `F` `REPORT_MAX_WORDS` |
| `agents/test-runner.md:3` description | Agent listing | Each request | 183 | `T` `AGENT_DESCRIPTION_MAX_CHARS` |
| `agents/test-runner.md` body | Agent body | At each run | 2,646 | tests pin `F` `REPORT_MAX_WORDS` |

The path prefix is `plugins/dotclaude/`.
The agent names (`name:` on line 2, 8 to 12 bytes) also go to the listing.
`F` is `features/context/limits.mjs`.

### Skill

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `skills/setup/SKILL.md:2-3` name and description | Skill listing | Not listed (`disable-model-invocation`) | 77 | `T` `SKILL_META_*` (below the low bound of 150) |
| `skills/setup/SKILL.md` body | Skill body | When the user runs `/dotclaude:setup` | 1,790 | `T` `SKILL_BODY_*` (below the low bound of 2 KB) |
| `skills/setup/scripts/openspec.mjs` and `features/setup/openspec.mjs` output | Tool result of `node openspec.mjs` | When the skill runs the script | 4,799 (both files, mostly code) | `B` `BASH_OUTPUT_MAX_CHARS` |

The output strings of the script are about 700 bytes.
I did not count them one by one.

### Hook text files

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `hooks/Stop.prompt.txt` (copy in `hooks/hooks.json:52`) | Prompt of the hook model (`type: "prompt"`) | At each `Stop` of the main session | 1,918 | - |

The reply of the hook model is a `reason` for `{"ok": false}`.
The `reason` goes to the main model as the block message.
Its size is not fixed, and no bound covers it.

### Hook output in code

| Where | Surface | When | Bytes | Bound |
| --- | --- | --- | --- | --- |
| `features/reads/rules.mjs:78` `denyReason`, built in `features/reads/cli.mjs` | Deny reason (`permissionDecisionReason`, `PreToolUse` `Bash`) | A `Bash` call that only prints a file | 196, template | - |
| `features/adherence/git.mjs:93` `gitReason` | Ask reason, user | `git stash`, `git reset`, `git checkout` or `git restore` of a path | 241, template | - |
| `features/adherence/git.mjs:99` `gitReason` (long command) | Ask reason, user | A `Bash` command over the scan bound | 242, template | `B` `SHELL_SCAN_MAX_CHARS` |
| `features/adherence/rules.mjs:50` `protectedReason` | Ask reason, user | A change to an existing line of a test or limits file | 288, template | `F` `LINE_SHOWN_MAX_CHARS` |
| `features/adherence/approval.mjs:60` `claimReason` | Deny reason | New text that claims an approval with no approval | 240, template | - |
| `features/adherence/spans.mjs:127` `spansReason` | Deny reason | Markdown or commit text with a bare code item | 199, template | `F` `ITEMS_SHOWN_MAX`, `F` `SCAN_MAX_CHARS` |
| `features/guard/rules.mjs:131` `policyReason`, set in `hooks/register.mjs:166` | Ask reason, user | The first call to a repository of another owner with an AI policy | 230, template, plus up to 3 files of 2,000 characters | `B` `POLICY_FILE_MAX_CHARS` |
| `features/context/rules.mjs:53` `reportNow` (over-bound text) | `additionalContext` (`PostToolUse`) | A subagent over its context bound | 291, template | `F` `SUBAGENT_CONTEXT_MAX`, `F` `HAIKU_CONTEXT_MAX`, `F` `REPORT_MAX_WORDS` |
| `features/context/rules.mjs:53` `reportNow` (turn-only text) | `additionalContext` (`PostToolUse`) | A subagent with 2 turns left | 196, template | `F` `TURNS_LEFT_AT` |
| `features/context/turns.mjs:73` `turnFact` | Part of the text above | Same | 86, template | `F` `TURNS_LEFT_AT` |
| `features/drift/rules.mjs:118` `driftNote` | User-role row (`$.session.append`, `features/drift/hooks.mjs:59`) | `session.start` of a new session | 235, template, plus the lines below | - |
| `features/drift/rules.mjs:81-105` `driftLines` | Lines of the note: guard seated 239, version 75, plugins on 401 (with a list of 280), synced skills 118, unknown sections 121, override variables 124 | Same, one line for each difference | 0 to 1,078, template | - |

The module hooks `prompt.compose`, `agent.spawn`, `prompt.section`, `prompt.attachment`, and `tool.describe` emit the texts of the tables above.
The module hooks `agent.offer` and the three `tool.call` rewrites of `sembr` emit no text for the model.
The `sembr` rewrites change the input of a tool call.
