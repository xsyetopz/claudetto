# External sources: instruction following and full context

Checked 2026-10-08 by a web-researcher subagent.
Issue states come from WebFetch of GitHub pages, which a small model summarized.
The `gh` CLI failed with a TLS error, so no raw checks ran.
Labels: **confirmed** (URL read) or **inferred** (search snippet or reasoning).

## A. Instructions not followed

- **confirmed** CLAUDE.md is context, not enforcement.
  "To block an action regardless of what Claude decides, use a PreToolUse hook instead." (<https://code.claude.com/docs/en/memory>)
- **confirmed** CLAUDE.md arrives as a user message after the system prompt, and "there's no guarantee of strict compliance" (same page).
- **confirmed** Target under 200 lines per file, because "Longer files consume more context and reduce adherence" (same page).
- **confirmed** Contradictory rules across CLAUDE.md files and `.claude/rules/` make Claude "pick one arbitrarily" (same page).
- **confirmed** `/doctor prompt-audit` finds conflicting or outdated instructions (same page).
- **confirmed** Project-root CLAUDE.md and unscoped rules are re-injected from disk after `/compact` (<https://code.claude.com/docs/en/context-window>, "What survives compaction").
- **confirmed** The skill listing is not re-injected after compaction.
  Invoked skill bodies are re-injected, capped at 5,000 tokens each and 25,000 in total, and truncation keeps the start.
- **confirmed** Conversation-only instructions are lost at compaction (memory page, "Instructions seem lost after /compact").

Issues in `anthropics/claude-code`:

- **confirmed** #17530 "CLAUDE.md instructions systematically ignored despite explicit MUST/ALWAYS directives", closed as not planned.
  One user reports about 50% of sessions failing with a CLAUDE.md of about 400 lines (anecdotal).
  The reporter suggests critical rules at the top, a file under 150 lines, and key rules repeated at the end.
- **confirmed** #32198 "Claude Code skips mandatory rules in CLAUDE.md (Definition of Done)", closed as not planned.
  A CRITICAL rule to run a review before "done" was skipped, and the user's own review then found 14 issues.
- **confirmed** #6354 "Claude forgets everything in CLAUDE.md after compaction", open.
- **confirmed** #24460 "CLAUDE.md context lost after /compact", closed as not planned and stale, Opus 4.6.
- **inferred** #15443, #34774, #34197, #4017, and #4517 report ignored rules or loss after compaction (snippets only).
- **inferred** Commenters suggest a `PostCompact` hook and a `UserPromptSubmit` reminder.

Prompting guidance (<https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices>):

- **confirmed** "Tell Claude what to do instead of what not to do."
- **confirmed** XML tags "reduce misinterpretation" when a prompt mixes instructions, context, and inputs.
- **confirmed** Long data at the top and the query at the end "can improve response quality by up to 30 percent in tests".
- **confirmed** Newer Opus models respond more to the system prompt, so "CRITICAL: You MUST..." can overtrigger.
- **confirmed** Context rot: recall falls as the window fills (<https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents>).
  The post recommends a system prompt at the "right altitude", a minimal tool set, and subagents with clean context windows.

## B. Context near 100%

- **confirmed** One Bash result is read back up to about 30,000 characters (cap 150,000) by `BASH_MAX_OUTPUT_LENGTH`, and a failing command gets about 10,000 inline (<https://code.claude.com/docs/en/tools-reference>, <https://code.claude.com/docs/en/env-vars>).
- **confirmed** MCP output warns above 10,000 tokens and is capped at 25,000 by `MAX_MCP_OUTPUT_TOKENS`, and text over 50,000 characters goes to a file (<https://code.claude.com/docs/en/mcp>).
- **confirmed** Every request resends the full conversation with all earlier tool results (<https://code.claude.com/docs/en/costs>).
- **confirmed** A `PreToolUse` hook can rewrite a test command through `updatedInput` to keep only failures, and a hook can grep a 10,000-line log down to hundreds of tokens (costs page).
- **confirmed** Subagents keep verbose output in their own context and return a summary (costs page).
- **confirmed** `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` can only lower the compaction threshold, and `CLAUDE_CODE_AUTO_COMPACT_WINDOW` sets the window (env-vars page).
- **confirmed** API context editing (`context-management-2025-06-27`, `clear_tool_uses_20250919`) has `trigger`, `keep`, `clear_at_least`, `exclude_tools`, and `clear_tool_inputs` (<https://platform.claude.com/docs/en/build-with-claude/context-editing>).
- **inferred** Claude Code has no setting for `clear_tool_uses`.
  The costs page names the clearing of old tool results only as an "expected rebuild" in `/usage`.
- **confirmed** #66144 "Auto compact does not trigger at 100% context window", open, v2.1.168.
- **inferred** #68635, #63015, and #65379 report the same, and one says a single large read can jump past the threshold.

## Techniques with the best evidence

1. Enforce hard rules with hooks (`PreToolUse`, `Stop`), not prose.
1. Keep CLAUDE.md under 200 lines, concrete, and free of contradictions.
1. Keep critical rules in the project-root CLAUDE.md or unscoped rules, which survive compaction.
1. Cut tool output at the source: `BASH_MAX_OUTPUT_LENGTH`, `PreToolUse` command rewrite, and subagents for verbose work.
1. Use positive phrasing and XML structure, without forceful words.
