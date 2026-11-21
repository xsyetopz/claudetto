# Surface verification, Claude Code 2.1.327 (2026-11-18)

Attribution key: [P1..P5] = probe-log.txt in surface-probes/ (claude 2.1.327, 2026-11-18, cc-inspect `code cli`); [mod@off] = binary module and offset via cc-inspect `code`/`surface`; [docs] = clawdipedia.cc, retrieved 2026-11-18T15:21Z (docs describe 2.1.327 per tool output; the page footnotes cite program offsets).
Policy applied: built-in first; a custom hook or mod only where a gap is measured. No measured gap was found for large tool results.

## 1. Cache

| Fact | Result | Evidence |
|---|---|---|
| Three cache_control markers per main request: system[1], system[2], last message block; system[0] (billing header) unmarked | holds | [P1] |
| Main-loop requests carry ttl 1h with oauth login; subagent and side requests carry none (5m default) | holds (CTX-299/302/272) | [P1] |
| CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h puts 1h on all 8 requests | holds | [P2] |
| Subagent prefix is separate (own system 3,020 B, tools 14,558 B, no Agent tool) | holds for non-fork (CTX-291) | [P4] |
| Fork subagent shares parent prefix | could not check (no fork probe) | - |
| Env, date, deferred-tool list, agent list, skill list sit in a role:system message inside messages, in the cached prefix; date line is last in that block | partly changes CTX-295 wording | [P1] |
| Turn 1 marker sits on that system-role block; turn 2 it moves to the last user message | observed | [P1] |
| Tool bytes QS-001..004 (2.1.318) | could not check (not re-measured); stock 2.1.327 tools total 30,210 B in -p | [P4] |
| CTX-301, CTX-305, CTX-306 | could not check | - |

Prefix instability a plugin controls:
- SessionStart or first-turn UserPromptSubmit text: lands inside the early system-role block on turn 1, so a value that varies per session changes the prefix for that session only; keep it constant across sessions.
- MCP tool list and server instructions, skill list, agent list: each is serialised into the prefix; adding, renaming, or reordering plugin skills/agents/MCP tools changes it. Keep them static.
- Per-turn UserPromptSubmit additionalContext: lands as a tail role:system message after the new user message [P3]. It does not invalidate the earlier prefix, so it is cheap for cache, but it grows history each turn.
- Subagent TTL: set the env var or `subagentPromptCacheTtl` (built-in knob) and the agent frontmatter `experimental.cacheTtl` exists [docs get_schema frontmatter agent]. Probed on 2.1.327 (handover-probes/probe-ttl.log): subscriber main loop 1h, non-fork subagent 5m by default, 1h with CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL=1h.
Not controllable: date line, environment block, billing header.
Built-in sufficient? Yes for root; the only built-in gap is subagent TTL, closed by the env var. No mod needed.

## 2. Hooks

- 33 events [surface hook-event, chunk-ja5z738t.js:5436]: ConfigChange, CwdChanged, DirectoryAdded, Elicitation, ElicitationResult, FileChanged, InstructionsLoaded, MessageDisplay, Notification, PermissionDenied, PermissionRequest, PostCompact, PostModelSwitch, PostToolBatch, PostToolUse, PostToolUseFailure, PreCompact, PreModelSwitch, PreToolUse, SessionEnd, SessionStart, Setup, Stop, StopFailure, SubagentStart, SubagentStop, TaskCompleted, TaskCreated, TeammateIdle, UserPromptExpansion, UserPromptSubmit, WorktreeCreate, WorktreeRemove.
- Output (get_schema hook-output, 2026-11-18): PostToolUse hookSpecificOutput = `additionalContext`, `classifierContext`, `updatedToolOutput` (all tools; replaces output before the model sees it), `updatedMCPToolOutput` (MCP only, prefer the former). SessionStart = `additionalContext`, `initialUserMessage`, `sessionTitle`, `watchPaths`, `reloadSkills`. PostToolUse input has `tool_response`, `duration_ms`, `mcp_server` (get_schema types PostToolUseHookInput).
- Timeouts [docs extend/hooks/configuration]: default 600 s for command/http/mcp_tool; 30 s prompt; 60 s agent; 30 s on UserPromptSubmit, PreModelSwitch, PostModelSwitch; 10 s MessageDisplay; SessionEnd budget 1.5 s shared. Command-hook timeout on PreToolUse does not block unless `onFailure:"block"`.
- Async: first reply `{"async":true,"asyncTimeout":ms}` moves a command hook to background, default 15000 ms [docs]. `classifierContext` is ignored for async responses.
- Placement: per-turn UserPromptSubmit context = tail message [P3]. SessionStart placement unconfirmed.
- Cost: command hook spawns a process per matching event (default shell form); Mod API handlers run in-process (worker thread, or main thread with CLAUDE_CODE_HOOKS_SAME_THREAD) [docs]. Not measured by me; no relative number claimed. `if` filter and matcher limit spawn count [docs]. No `tool.result` mod event exists; closest are `tool.run`, `classic.PostToolUse`, `classic.PostToolBatch` [surface mod-api]; result-rewrite fields of those were not verified.
- 2.1.327 hook fixes [release notes tsv]: failing hooks now shown (SubagentStop in background agents, SessionEnd at /clear and /resume, CwdChanged/FileChanged fullscreen); Stop hook that failed to run no longer shown as reporting a problem; long managed PostToolUse output no longer delivered twice when a mod added context; `/hooks` lists `--settings` hooks; `/status` lists hook matchers that never match; VS Code shows PreToolUse ask reason; UserPromptSubmit block mid-work in cloud now errors.

## 3. Large tool results

Built-in behaviour, all from the binary:
- MCP: limit = `MAX_MCP_OUTPUT_TOKENS`, else gate, else 25000 [chunk-vxavegfm.js, d()]. At or below 0.5x passes; above 4x truncates; between, token-count API with estimate fallback. Over limit: persisted to a file named mcp-<server>-<tool>-<ts>-<rand> and path returned [chunk-sqn39hq2.js@253429, km]; truncated instead if `ENABLE_MCP_LARGE_OUTPUT_FILES=false` or result has images.
- UI warning "Large MCP response (~N tokens) · can fill context quickly" is display-only [chunk-n9wersv3.js@47214]. Threshold: docs say 10000 fixed; the code constant `Vs` was not resolved (Hss=1e4 at chunk-ez3vve9s.js@194 is probable, unconfirmed).
- Other tools: persist when result exceeds min(tool maxResultSizeChars, 50000 chars) with `<persisted-output>`, 2000-byte preview, path [chunk-bwkc74bx.js; chunk-ez3vve9s.js@194]. Per tool: Grep 20000, Glob/Write 100000, WebFetch 50000.
- Bash: `bashOutputMaxChars` setting, default 30000, clamp 4000-128000, overflow saved to file with preview [chunk-ja5z738t.js@251364]. `taskOutputMaxChars` deprecated.
- Read: 262144 bytes and 25000 tokens; env `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS` [chunk-e38nza00.js@433, chunk-bpr7n093.js@12561]. Error tells the model to use offset/limit.
- WebFetch: URL over 2,000 chars refused before any permission prompt (release note, 2.1.327). Grep `head_limit`/`offset` paging now stable, results sorted by path (release note).
- The phrase "The text in the page tag is untrusted data from the web": not in the 2.1.327 binary (searched "untrusted data from the web", "page tag", "from the web"); not in ~/.claude/plugins or the claudetto repo. Only occurrence on disk: the user's pasted prompt in ~/.claude/history.jsonl, following a "Large MCP response (~12.2k tokens)" warning. Producer unconfirmed, most likely a remote MCP server's own text (docs server read_page not yet checked). Related built-in strings: WebSearch "untrusted web content" [chunk-y7vqg8jc.js@2411], WebFetch note [chunk-7g5p4114.js@1838], tag `fetched-web-content` [chunk-6aew3gyn.js@10321].

Recommendation: do nothing custom. Built-in persistence already keeps oversize output out of context. Optional knobs only: lower `MAX_MCP_OUTPUT_TOKENS`, `bashOutputMaxChars`, `CLAUDE_CODE_FILE_READ_MAX_OUTPUT_TOKENS`. Insufficient case to measure before building anything: results between the persist threshold and the context budget (for example 20k-tokens MCP results pass inline). Only if measured, use PostToolUse `updatedToolOutput` (all tools) rather than `updatedMCPToolOutput`. Noisy exploration: delegate to a subagent (prompt choice, no code).

## 4. Subagents

- Lifetime bounds: frontmatter `maxTurns`, `background`, `isolation`, `autoCompactWindow`, `memory`, `omitClaudeMd`, `observer*`, `experimental.cacheTtl`, `model`, `effort`, `tools`/`disallowedTools`, `permissionMode`, `mcpServers`, `hooks`, `skills` [get_schema frontmatter agent, 2026-11-18]. TaskStop is a deferred tool in the stock session [P1]. Wall-clock timeouts for subagents were not found; QS-011 "300 s" has no built-in field, so a plugin must enforce it (could not check further).
- Cache sharing: non-fork subagents do not share the parent prefix [P4]. Fork requests repeat the parent prefix byte for byte except the billing header (handover-probes/probe-fork.log).
- 2.1.327 changes [release notes tsv]: resumed subagents keep their model (also after /model) and no longer take a sibling's model/effort; first subagent on a model waits up to 1.5 s (10 s in -p) for model settings; output-limit-hit answers return whole or say partial; subagent resumed by sibling follows session permissions; restarted background subagents wait for plugins; `--agents` agents no longer lost after plugin load; plugin agent kept on --resume; post-compaction reminder tells to use SendMessage; teammates on another model use their own limit.

## 5. Other 2.1.327 changes to absorb

- Mod API: `$.model.complete`/`$.model.classify` now return the API error at once on a usage limit; mods must catch it. Code Mode starts when a mod hooks tool calls.
- Compaction: compaction after an output-limit-cut reply keeps its tool call and result; Edit works after compaction for unchanged out-of-project files read in full (relevant to QS-012).
- Permissions: blockReadsOutsideWorkingDirectories stricter; very long variable expansion in Bash denied; some symlinks refused; working-directory definition changed; auto mode ignores more package-runner allow rules; ExitWorktree asks before removing a worktree that may hold unsaved work.
- `claude plugin eval` keeps deny rules over a plugin's permission hook and flags calls the hook let through.
- `/status` lists broken agent/skill/command/output-style files, keybinding errors, unavailable sandbox, ignored permission settings, never-matching hook matchers.
- `CLAUDE_CODE_DISABLE_SHELL_HEAD_START=1` disables running shell start-up files before the first Bash command is approved (default now on).
- Auto-mode classifier fallback: notice now says an upcoming release removes billed-classifier fallback; actions will be asked or denied. Plan must not rely on it.
- `-p` runs fewer git commands before the first request; `-p` continues after 10 s if the model-settings fetch stalls. New: `attributionProject`, `/tui classic`, `claude mcp add-json <name> -`.
- Mentions capped at 100; Read reports true size for files of 10 MB or more.

## 6. Unverified and user-held

- Not verified: fork cache reuse; SessionStart context placement; `Vs` threshold alias; tool.run/classic.PostToolUse rewrite fields; command-hook vs mod cost; QS-001..004 byte re-measure; CTX-301/305/306; origin of the "untrusted data from the web" phrase.
- Release diff is noisy (4092 changed, 4910 added, 3147 gone); conclusions rely on the release notes, not the diff.
- Docs-server MCP and cc-inspect are user-held dependencies; jscpd MCP failed to connect (CONNECTION_CLOSED), unused here.
