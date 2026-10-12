# Decisions: prompt

This page holds D3, D4, D15, D16, and D28.
The index is [Decisions](Decisions).

## D3 Attachment and tool-description cuts by id

- The mod rewrites by exact id, with a lab test for each handler.
  An unknown id passes on unchanged.
- `tool.describe` rewrites the large loaded tools.
- `agent.offer` drops the built-in agent lines that dotclaude does not need.
- Deferred tools stay on.
  The mod never sets `isDeferred` to `false`.
- Cuts of `session_context` and `prompt.context` need an eval with no loss.
  Note: 0.28.0 already cuts the `Recent commits:` block of `session_context`, and no cut of `prompt.context` exists.

See [Prompt surface](Prompt-Surface).

## D4 Measured budget

`just measure` reads the usage of the first request in a session transcript, prints it, and compares it with `START_TOKENS`.
`START_TOKENS` in `tools/limits.ts` is the measure after the cuts plus 5% headroom.
The command writes no file, because a baseline file is a format that dotclaude made up (D35).
The request capture of D16 closes the gap between the measure and what the API bills.

## D15 dotclaude owns the system prompt

The shared sections of the `prompt` slice (`slices/prompt/domain/`) hold the rules that every model shares.
The mod replaces the Claude Code sections with the shared sections and the text of one model, and the block of a subagent adds the evidence line.
The output style holds only the role, the tone, and the format, because Claude Code sends an output style as a message in the conversation and not in the system prompt.
The rules are in [System prompt](Prompt-Surface) and the variants are in [Prompt variants](Prompt-Variants).
No rule text is in two of the shared sections, a variant, and the output style.

- XML tags separate instructions from data.
- Plain imperatives, a reason only where it changes behavior, and no stacked capitals.
- One scope line, one keep-going sentence, and one confirmation rule for hard-to-undo actions, all in the shared sections.
- The verification rule is in the shared `verification` section, and the subagent block of Sonnet 5.5 and Haiku 5.5 repeats it, because a subagent does not get the shared sections (cut V2 of task 29.3).
- Delegation text, in the `tools` shared section: delegate only large, independent, parallel work.
- The attribution line replaces the git instructions that the snippet turns off.
- No variant changes in a session or an agent, because a change breaks the cache.
- The compact prompt has no override route, and the wiki records that.

## D16 Request capture and the 30K start

- A local logging proxy, reached through `ANTHROPIC_BASE_URL`, records the first request body.
  The capture run sets `ENABLE_TOOL_SEARCH=true`, because a non-first-party base URL turns tool search off.
- The agent sandbox blocks a local port, so the user starts `just capture` in a terminal ([Sandbox](Sandbox)).
- The capture splits the first request into system blocks, tool schemas, and messages.
- The research found a 30K start only when the settings of the snippet did not apply.
  The cause is a config source that the surface does not read (**inferred**).

## D28 Compliance by checks, not by prose

The source is `research/compliance.md`.
Concrete rules that a check can see held, such as ask before publish, read before edit, and file size.
Prose rules failed, such as no recap, no semicolons in long lists, and one sentence for each chat line.

1. A rule that a program can check moves to a hook, a lint in `just check`, or an eval measure.
2. `auto-mode-guard.mjs` asked 56 times and found no real risk.
   All asks were `rm -rf` of a variable.
   The guard now resolves a variable that an earlier part of the same command set from `mktemp -d` or from `$TMPDIR`.
   It rejects `..` and a reset `TMPDIR`, and it keeps the ask for any other unresolved path.
   Note: this is the 0.27.0 state.
   0.28.0 removed `auto-mode-guard.mjs` and its resolver, and `plugins/` has neither.
   A recursive `rm` is now an `ask` rule of the settings snippet, with the sandbox.
3. The old eval harness had measures for repeat reads, recap, and chat lines with more than one sentence.
   The harness is gone (D9), and the format of `claude plugin eval` has no such measure, so no gate exists for them.
4. `CLAUDE.md` states whether chat replies are in the scope of the line-break rule.

## Related pages

- [Prompt surface](Prompt-Surface)
- [System prompt](Prompt-Surface)
- [Semantic line breaks](Semantic-Line-Breaks)
