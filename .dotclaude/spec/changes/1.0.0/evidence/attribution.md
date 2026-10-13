# Attribution: where a `tool.call` hook gets the model

Question: can a `tool.call` hook of the core plugin read the resolved `attribution` settings,
and the model of the session or of the subagent that makes the `Bash` call?

Sources: `.claude-plugin/types/claude-code/index.d.ts` (the types of the plugin API, copied
from the main checkout) and `external/cc-2.1.296/strings.txt` (the binary of Claude Code 2.1.296,
read only as evidence).

## The `tool.call` payload has no model

- `ToolCallInput` (index.d.ts, line 12103) is `ToolCallEnvelope & AgentLoop`.
  The envelope holds `tool`, `tool_use_id`, and the tool's arguments (`command` for `Bash`).
- `AgentLoop` (line 189) adds `agentId` only inside a subagent or a teammate loop.
  It is absent on the main loop.
- The payload carries no model field.

## The main-loop model is readable

- `$.session.model()` (index.d.ts, around line 2683) "Returns the main loop's model, as `/model` shows it."
- Not known: whether the string is a full model id (`claude-opus-5-5`) or an alias (`opus`).
  The types do not say.
  The hook parses the string, and it uses `Claude` when the parse fails.

## The subagent model is not readable

- `AgentInfo` (`$.agent.list()`, lines 125 to 184) has `id`, `type`, `status`, `parentId`,
  `spawnedBy`, `name`, and `description`.
  It has no model field.
- `AgentCallRecord.resolvedModel` (line 118) is set on the `Agent` call's own result.
  It is not on a later `Bash` call in the subagent loop.
- `agent.spawn` input has `model` and `parentModel` (lines 287 to 305).
  These are facts at spawn time, and the `Bash` call does not carry them.
- `SessionMessage` (`$.session.messages()`, line 10591) has `role`, `text`, and tool blocks, and no model.

Result: the hook knows the model of a main-loop call.
It does not know the model of a subagent call.
For a call with `agentId`, the hook uses `Claude`.

## What Claude Code writes when `attribution` is not set

From the binary, `function rro(e)` (strings.txt, the line that holds `function rro(e){let n=rPt()`):

- The commit line is `Co-Authored-By: ${sro(e)} <noreply@anthropic.com>`.
- `sro(e)` names the model.
  For a known model it gives `k1n(model)`, which is `Claude ${display name}`.
  The display name comes from `Uv(e)`, for example `Opus 5.5`.
  For a model that is not known, it gives `Claude` for a `claude-fable-` id, and otherwise `Claude Code`.
- When the `attribution` object is set, each field uses the setting, and a missing field uses the default.
- When `includeCoAuthoredBy` is `false`, both lines are empty.
- The PR line is `rPt()`: `🤖 Generated with [Claude Code](<url>)`, with a suffix when a feature flag is on.

Our rule differs from `sro(e)` in one place.
When the hook cannot name the model, the line says `Claude`,
as the user decided, and not `Claude Code`.

## Transcript route (P39, checked 2026-10-13): not used

- The transcript file is `~/.claude/projects/<encoded cwd>/<sessionId>.jsonl`.
  A subagent has `<sessionId>/subagents/agent-<agentId>.jsonl`.
  On disk, an assistant row has `"model":"<id>"`, for example `claude-opus-5-5` and `claude-haiku-5-5`.
- The hook can name both files: `$.session.id()`, `$.session.cwd()`, `$.env.get("HOME")`, and `agentId`.
- The file port fails the tail read.
  `$.fs.read` reads the whole file, and it rejects a file over 4 MiB.
  A main-session transcript was 3.8 MB on 2026-10-13, so the read fails soon for a long session.
- `$.session.messages()` has no model field on `SessionMessage` or `ApiMessage`.
- Result: the route is not used.
  The main session uses `$.session.model()`, and a subagent uses `Claude`.

## Decision

- The commit line is `Co-Authored-By: <name> <noreply@anthropic.com>`.
  `<name>` is `Claude <Family> <major>.<minor>` for a main-loop call whose model parses.
  It is `Claude` for any other call.
- The model name is built from the parsed id.
  It is not a fixed name.
- The settings are read with `$.settings.read()`, the merged settings.
  An `attribution` object that sets `commit` or `pr` uses that value, and an empty value turns that part off.
  With no `attribution` object, `includeCoAuthoredBy: false` turns both parts off, as in Claude Code.
  Otherwise the defaults above apply.

## Trailers already in history

- Commits that have no `Co-Authored-By` trailer came from the installed 0.28.0 plugin, not from the 1.0.0 code.
  The 1.0.0 code adds the trailer only through this hook.

## Sandbox Check, 2026-10-13

Two headless sessions ran from the main session in `just sandbox`, on the subscription of the user, with `--model claude-haiku-5-5` and `--allowedTools Bash`.
A guard stopped the same run in a subagent worktree, so the main session ran it (the user, 2026-10-13).

Method:

1. `mktemp -d` made a temp folder with a throwaway git repository, `throwaway/`, which held one commit.
2. A stub `gh` script first on `PATH` wrote its arguments to `gh-calls.txt`, and printed a fake PR URL.
   It did not call GitHub, and the run pushed nothing.
3. `bun plugins/dotclaude-lab/bin/dotclaude-capture --port 8797 --out DIR --no-count` captured each request, with `ANTHROPIC_BASE_URL=http://127.0.0.1:8797`.
4. The prompt told Claude to append a line to `notes.txt`, commit it with `git commit -m`, and run `gh pr create --title ... --body ...`.
5. A script parsed each captured request, and searched the `system`, the `tools`, the user text, and the tool blocks for `Co-Authored-By`, `Generated with [Claude Code]`, and `noreply@anthropic.com`.

| Run | Settings | Commit message | PR body | Requests with attribution text |
| --- | --- | --- | --- | --- |
| 1 | The sandbox config, with no snippet | `Add b`, then `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>` | `Adds the line b.`, then `🤖 Generated with [Claude Code](https://claude.com/claude-code)` | 7 of 8, in a user text block |
| 2 | `--settings` with `{"includeGitInstructions": false}` | `Add c`, then `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>` | `Adds the line c.`, then `🤖 Generated with [Claude Code](https://claude.com/claude-code)` | 0 of 5 |

- In run 1, the attribution text is a `system-reminder` that starts with "Attribution for git commits and pull requests you create from here on".
  No file in `src/` or `plugins/` holds that text, so it is the git text of Claude Code.
  It shows because the sandbox config does not hold the snippet, and the `trim` slice sets `includeGitInstructions: false` only through the snippet.
- In run 2, no request holds attribution text.
  The model wrote `git commit -m 'Add c'` and `gh pr create --title 'Add c' --body 'Adds the line c.'`, with no attribution.
  So the `tool.call` hook added both lines, and no prompt text told the model about them.
- The name `Claude Haiku 5.5` comes from the parsed model id.
  The alias `haiku` does not parse, and gives `Claude`.

Result: each point of the acceptance passes.
