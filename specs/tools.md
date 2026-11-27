# Tools

History, checks and sources: [evidence/tools.md](evidence/tools.md).

## TOOLS-001 Hide File and Messaging Tools

claudetto keeps Write, Edit and NotebookEdit from every model loop and SendMessage and ListAgents from every subagent's loop through `tool.offer` `{ isOffered: false }`.

Given a `-p` request with claudetto loaded
When the request's tool list is read
Then it lists none of the file tools

Given a subagent's request
When its tool list is read
Then it lists none of the five
And the request's tool bytes are measured before and after

## TOOLS-002 Decide Worktree and Agent Tools

claudetto turns ListAgents off for subagents and keeps EnterWorktree and ExitWorktree with descriptions of at most 200 characters, on measured cost.

Given the tool bytes each tool adds per request and the calls and bytes the Bash or Agent-isolation path takes for the same job
When a report is written for ListAgents, EnterWorktree and ExitWorktree
Then it gives both numbers per tool and the decision (off, or kept with a description of at most 200 characters)

## TOOLS-003 Short Built-In Tool Descriptions

claudetto describes each kept built-in tool in at most 200 characters through `tool.describe`, and SendMessage in at most 400.

Given a test that renders each description
When it asserts the length
Then each description is at most 200 characters
And the request's tool bytes are measured before and after

Given a trivial eval and a feature eval
When they run with the short descriptions
Then they show no lower score

## TOOLS-004 Hide DesignSync and RemoteTrigger

claudetto keeps DesignSync and RemoteTrigger from every model loop through `tool.offer`.

Given a plugin request, main or subagent
When its tool list is read
Then it lists neither tool, inline or deferred

## TOOLS-005 Subagent Tool Limits

claudetto keeps the goal tools (`set_goal`, `get_goal`, `pause_goal`, `clear_goal`), Monitor and TaskStop from every subagent's loop and offers `web_fetch` and `web_search` in a subagent's loop only to the `Hermes` agent, through `tool.offer` on `subagentType`.

Given a plugin subagent request (Heracles)
When its tool list is read
Then it lists none of the goal tools, Monitor, TaskStop, `web_fetch` or `web_search`, inline or deferred

Given a Hermes request
When its tool list is read
Then it lists `web_fetch` and `web_search`
And the main request's tool list is unchanged

## TOOLS-010 One Patch Tool for File Changes

claudetto registers one `patch` tool that creates, replaces, edits and deletes files, many files and hunks per call, in a context-anchored format with no line numbers.

Given a patch with an add, an update with several hunks, a delete or a move
When the tool runs it
Then the reply names each file changed
And a hunk whose context matches only after trailing-whitespace folding applies

Given a hunk whose context is missing or ambiguous, or a path in the sandbox write deny list
When the tool runs
Then the whole patch is refused
And nothing is written

Given a patched file that matches a path-scoped rule (`paths` globs, project rules relative to the directory holding `.claude`, user rules relative to the primary cwd) or a nested CLAUDE.md or CLAUDE.local.md
When a patch to `src/api/x.ts` runs
Then the reply appends the matching rule text once with frontmatter and block comments stripped
And it does not append it again or append a non-matching rule

## TOOLS-011 Output Style Names Patch

claudetto's output style tells the model to change files with `patch` and keeps the perl note but not the tab strip.

Given a feature eval and a trivial eval
When they run with `patch` instead of Edit and Write
Then they score no lower
And the turns and output tokens per run are reported

## TOOLS-012 Patch Refuses Add File over Existing

The `patch` tool refuses an `*** Add File` whose path exists on disk or was deleted earlier in the same patch, writing nothing, with an error that names the path and tells the model to use `*** Update File` hunks.

Given Add File over an existing file, or Delete and Add of one path in one patch
When the tool runs
Then both refuse and write nothing

Given Add File of a new path
When the tool runs
Then it creates the file
And `count-after-change` scores no lower with claudetto than vanilla

## TOOLS-013 File Tools Reach Other Folders without a Prompt

claudetto lets `read` and `patch` reach a path outside the session's working folders with no permission prompt, so the agent reads a `/tmp` image or fixes a sibling repository itself; a deny or ask rule and the sandbox write deny list still hold.

Given a path outside the working folders that only the permission mode asks about
When `read` or `patch` is checked for it
Then the call is allowed

Given a `patch` path under a sandbox write deny list entry such as `~/.ssh`
When the tool runs
Then the patch is refused and nothing is written

## TOOLS-020 Register `web_fetch`

claudetto registers `web_fetch`, which fetches a URL directly, turns HTML into compact Markdown, falls back to a headless Chrome render, and opens a visible Chrome when a captcha blocks, saving the cookies for later fetches.

Given local fixture pages
When tests run
Then they cover the direct path, the size cap with a saved full copy, the fallback, and the cookie reuse
And WebFetch is not offered

## TOOLS-021 Register `web_search`

claudetto registers `web_search`, which returns titles, URLs and snippets for a query without an API key and uses a configured search API when one is set.

Given a saved results page
When the parser test runs
Then it returns the titles, URLs and snippets
And WebSearch is not offered

## TOOLS-031 Lean Output Style

claudetto's output style holds only voice, length, format and the claudetto reporting rules, sized at or under the stock Proactive style plus those rules.

Given the stock Proactive and Concise texts saved with their sizes
When the new style is built from them
Then its size is reported against them
And `keep-coding-instructions` is set only if a full-prompt model needs it

Given the feature and trivial evals
When they run with the new style
Then they score no lower

Given the AskUserQuestion, background exit-status and background-read paragraphs
When they measure higher on the style than on a tool description
Then they stay on the style

## TOOLS-032 Place Instructions on Their Surface

claudetto places each instruction it ships on the surface the table names, and a line on the wrong surface moves.

Given every line in the output style, agents, skills and hook texts
When each is checked against the table
Then a report lists each moved line with its old and new surface

## TOOLS-033 A Repeat Read of Unchanged Text Gets a Short Note

claudetto answers a `read` call that repeats an earlier call of the same agent loop, with the same paths, range and text, with a short note that the earlier result is current, once, as Claude Code's own `Read` does, and gives the full text to the next repeat and to any read after a compaction, because a plugin cannot see whether the earlier result is still in the context.

Given a file read twice with no change
When the second `read` runs
Then the result is the short note, and a third `read` returns the text

Given a read, then a compaction
When the same `read` runs again
Then the result is the full text

## TOOLS-034 A Read Stays Within the File Read Token Budget

claudetto cuts a `read` result at the last whole line within `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` (25,000 when unset, as Claude Code's `Read` uses) at four characters a token and names the `offset` to continue from, because a result over that budget fills the context toward autocompact.

Given a file of about 53,000 tokens
When `read` runs with no range
Then the result ends at a whole line within the budget with the `offset` to continue

Given `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` set to 100
When `read` runs on the same file
Then the result holds the lines that fit in 400 characters
