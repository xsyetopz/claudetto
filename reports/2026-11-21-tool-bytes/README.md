# Tool bytes, Claude Code 2.1.330

Measured with `tools/measure-tools.ts` on 2026-11-21. The harness starts `claude -p` against a local fake Anthropic API with an empty `CLAUDE_CONFIG_DIR` per run, records each `POST /v1/messages` body, and sums the JSON length of the `tools` array. Nothing leaves the machine and nothing is billed. A warm-up run precedes each plugin run because the plugin's deny list binds from the second session.

Figures are characters of the JSON `tools` array unless marked UTF-8. "Before" is the plugin with WebFetch, WebSearch, Write, Edit, NotebookEdit and SendMessage already hidden, without the ListAgents cut and without `tool.describe`. "After" is the plugin after both changes. Every "after" and vanilla figure comes from one run made after the last code change (`after.json`). Every "before" figure comes from the earlier run (`runs.json`).

## Request totals

| Run | Vanilla | Plugin before | Plugin after |
| --- | --- | --- | --- |
| Default mode, main loop | 12 tools, 29,825 | 8 tools, 16,730 | 7 tools, 8,887 |
| Default mode, subagent | 7 tools, 10,017 | 10,533 | 6,776 |
| Tools upfront (`ENABLE_TOOL_SEARCH=false`), main loop | 19 tools, 64,155 | 13 tools, 43,131 | 12 tools, 24,443 |
| Tools upfront, subagent | 13 tools, 33,396 | 25,983 | 11,381 (10 tools) |

## Correction of the vanilla figure

The PRD cites 31,215 bytes for vanilla. The run reproduces 29,825 characters (29,960 UTF-8) for the same `-p hi` request with a clean config. The 31,215 figure was not reproduced. Its likely cause is a different config, plugin set or version in that capture; it is not established. The PRD now cites 29,825.

## Per-tool bytes (tools upfront, main loop)

| Tool | Vanilla | Before | After |
| --- | --- | --- | --- |
| Agent | 4,848 | 4,798 | 2,110 |
| Bash | 3,041 | 4,597 | 3,523 |
| DesignSync | 10,950 | 10,950 | 10,950 |
| EnterWorktree | 4,013 | 4,013 | 921 |
| ExitWorktree | 2,903 | 2,903 | 897 |
| ListAgents | 1,963 | 1,397 | hidden |
| Monitor | 7,568 | 8,400 | 2,112 |
| Read | 1,919 | 1,919 | 1,292 |
| Skill | 1,803 | 1,803 | 553 |
| TaskStop | 789 | 789 | 524 |
| patch | n/a | 564 | 564 |
| web_fetch | n/a | 559 | 559 |
| web_search | n/a | 425 | 425 |

Default mode, before to after: Agent 4,798 to 2,110; Bash 4,597 to 3,523; Read 1,919 to 1,292; Skill 1,803 to 553; ToolSearch 1,439 to 633; ListAgents 1,397 to hidden.

## REQ-TOOLS-001 probe leg

In the plugin runs the request lists none of Write, Edit, NotebookEdit, SendMessage, ListAgents, WebFetch or WebSearch, in the main loop and in a subagent's request (`claudetto:Heracles`). The subagent request in tools-upfront mode carries Bash, EnterWorktree, ExitWorktree, Monitor, Read, Skill, TaskStop, patch, web_fetch and web_search. In default mode it carries Bash, Read, Skill, ToolSearch, DeferredToolPlaceholder and patch.

## REQ-TOOLS-002 decisions

| Tool | Decision | Cost per request | Reason |
| --- | --- | --- | --- |
| ListAgents | off | 1,397 to 1,963 bytes | It lists only agents SendMessage can reach, and SendMessage is off. |
| EnterWorktree | kept, 177 characters | 921 bytes upfront (was 4,013); a name line when deferred | Bash cannot change the session's working directory or writable directories. |
| ExitWorktree | kept, 188 characters | 897 bytes upfront (was 2,903); a name line when deferred | Same reason; the pair is one feature. |

The Bash path for the same job, probed 2026-11-21 in a scratch repository (git 2.x, zsh):

| Job | Bash calls | Command chars | Output chars | Then, per later call |
| --- | --- | --- | --- | --- |
| Create (`git worktree add -b feat-x ../feat-x`) | 1 | 36 | 68 | a `cd ../feat-x &&` prefix (16 chars) or `git -C`, because the Bash tool resets the working directory |
| Remove (`git worktree remove ../feat-x && git branch -d feat-x`) | 1 | 53 | 36 | none |

The Bash path costs one call and about 100 to 140 characters per job against 921 and 897 bytes on every request when the pair is upfront, and a name line when deferred. ListAgents has no Bash path: it lists only SendMessage targets, and SendMessage is off. EnterWorktree and ExitWorktree stay because the Bash path cannot move the session's working directory (the 2.1.330 Bash tool description: `cd` carries over only when it ends inside the working directories), and the default mode defers them, so their per-request cost there is the name line.

## REQ-TOOLS-003 test and probe legs

`TOOL_DESCRIPTIONS` in `plugins/claudetto/hooks/pool/describe.ts` holds 16 descriptions of 106 to 199 characters. `hooks/pool/__tests__/describe.test.ts` renders each and asserts at most 200 characters, asserts the key set, and asserts that tools outside the set keep their stock text. The probe shows described tools at most 200 characters in the main and the subagent request.

## Limits

- Bash renders at 915 characters in the plugin: the 199-character base plus the claudetto git block of about 716 characters, because the plugin turns the builtin git block off. The block is deliberate, so the REQ-003 bound holds for the base text and not for the rendered Bash text.
- Glob and Grep do not exist in this build, so they have no description.
- Bash (1,720 to 2,552) and Monitor (about 832) input schemas grow under the plugin because it enables the sandbox, which adds an `allowed_domains` property. This is inferred from the property-list diff, not measured on its own, and is outside description work.
- DesignSync costs 10,950 upfront in every run and is untouched.
- The deferred-tool listing is 356 characters under the plugin (7 names) against 347 for vanilla (9 names), rerun 2026-11-21 after `deferredListing` was cut to the listing block. The earlier 18,557 against 7,947 measured the whole session-context message that holds the listing. Under the plugin that message also carries the sandbox section (8,751), the claudetto output style (7,612) and the MCP server instructions (1,242), none of which is tool bytes.
- `-p` runs gate some tools; deferred tools are measured by their listing only, not their schemas.
- Descriptions may be cached by the engine across runs; each run used a fresh config dir.
- The eval leg of REQ-TOOLS-003 is not run.
