# Decisions: Prompt

This page holds the decisions D3, D4, D15, D16, and D28.
Read it to learn why the system prompt, the start budget, and the request capture have the shape that they have.
The index is [Decisions](Decisions).
The reversed parts of these decisions are in [Decisions-Reversed](Decisions-Reversed#prompt).

## D3 Tool-Description and Section Cuts by Id

**Problem:** The start of a session sends the built-in tool descriptions, the built-in agent list, and the built-in sections of the system prompt.
Some of that text does not help dotclaude.

**Choice:** The mods of the `surface` and `prompt` slices answer by exact id.
The lab tests of each slice check the handlers.
Each handler has a lab test.

- `tool.describe` (`src/plugins/dotclaude/slices/surface/adapters/mod.ts`) replaces the description of `Agent`, `Bash`, and `Read` when the new text is shorter.
  The rule is in `toolAnswer` in `slices/surface/domain/tools.ts`.
- `ListAgents` is deferred behind `ToolSearch`.
  `toolAnswer` sets `isDeferred` to `true`.
  It never sets `isDeferred` to `false`.
- `agent.offer` drops `claude-code-guide` and `statusline-setup`.
  The list is `DROPPED_AGENTS` in `slices/surface/domain/agents.ts`.
- `prompt.section` (`slices/prompt/adapters/mod.ts`) answers only the ids that have a transform in `slices/prompt/transforms/`.
  An unknown id passes on unchanged.
- The `context_management` section gets its transform only when `DISABLE_COMPACT` is set to a value other than `0` or `false`.
  The section says that the context is summarized.
  So it stays unchanged when compaction runs.

**Open points:**

- No code in `src/` cuts `session_context` or `prompt.context`.
  A cut of either needs an eval with no loss before it ships.
- `prompt.attachment` is not used by any source file.
  The attachment cut in the older text of this decision has no code.

**Alternatives:** No other alternative is recorded in the sources of this decision.

See [Prompt Surface](Prompt-Surface).

## D4 Measured Budget

**Problem:** The start of a session needs a bound that a check can test.

**Choice:** `START_TOKENS` in `tools/limits.ts` holds the bound, with the value `9_960`.
`just measure` runs `tools/measure.ts`.
That script calls `dotclaude-start` of the plugin `dotclaude-sessions` with `--bound START_TOKENS`.
`measure.ts` writes no file.
The reason was D35, which kept out each format that dotclaude made up.
1.0.0 reverses D35 ([Decisions-Reversed](Decisions-Reversed#settings)).
But `measure.ts` still writes no baseline file.

**Evidence:**

- The measure of 9,485 tokens comes from the research dossier in `external/agent-failure-dossier/04-engineering-delegation-and-cost.md`, line 155.
  The `external/` folder is git-ignored, and it is not in the repository.
- The comment of `START_TOKENS` says that the measured sessions were headless.
  The dossier does not say so.
- The request captures of 2026-10-11 for `claude-sonnet-5-5` show a `full` total of 19,906 tokens with the settings snippet.
  They show 18,253 tokens without it.
  Both totals are about twice the measure.

**Open point:** The gap between the measure (9,485 tokens) and the capture totals (about 18,000 to 20,000 tokens) is open.
The capture of D16 shows the request, but no decision yet explains the gap.
The bound stays at `9_960` until the gap is settled.

## D15 dotclaude Owns the System Prompt

**Problem:** Claude Code sends its own system prompt sections.
The same rules are needed for each model.

**Choice:** The `prompt` slice replaces the Claude Code sections with its shared sections.
It adds one variant for the model of the session.
The shared sections are in `slices/prompt/domain/variants.ts` as `SHARED_SECTIONS`.
Their order is `doing_tasks`, `system`, `blocks`, `verification`, `actions`, `tools`, and `counts`.
Each variant holds a model name, optional model notes, and a block for a subagent.

- The variants are `opus` (Opus 5.5), `sonnet` (Sonnet 5.5), `haiku` (Haiku 5.5), and `fable` (Fable 5.1).
  A model id that contains `mythos` selects `fable`.
  Any other model id gets no variant.
  The shared sections still apply.
- The variant is set at the first `prompt.compose` of a session.
  It is kept for that session (`onCompose` in `slices/prompt/adapters/mod.ts`).
  A model switch changes nothing, because a changed system prompt breaks the prompt cache.
- A subagent gets its system prompt from its agent body.
  So `agent.spawn` adds the block of its model to the end of the task prompt.
  The model is the model of the agent.
  When the agent says `inherit`, the model is the parent model.
- An output style reaches the model as a message, not in the system prompt.
  So the output style holds only the role, the tone, and the format.
- The `prompt.compose` and `prompt.section` hooks do not reach the compact prompt of Claude Code.
  See [Prompt Variants](Prompt-Variants#the-compact-prompt-gap).

The sections hold these rules:

- XML tags separate instructions from data.
- Plain imperatives.
  A reason is given only where it changes the behavior.
- One scope line, one keep-going sentence, and one confirmation rule for hard-to-undo actions.
  All three are in the shared sections.
- The `tools` section tells the model to delegate a read only when it is larger than the start cost of a subagent.
  When the user asks for a subagent, use one.
- The attribution line replaces the git instructions that the settings snippet turns off.

**Open point:** The rule "no rule text in two places" does not hold.
The verification rule is in the shared `verification` section.
The subagent block of Sonnet 5.5 and Haiku 5.5 repeats it, because a subagent does not get the shared sections.
The output style `slices/styles/styles/Concise.md` also repeats the verification rule.
This page does not change that repeat.

**Alternatives:** No other alternative is recorded in the sources of this decision.

See [Prompt Surface](Prompt-Surface) for the rules in the sections.
See [Prompt Variants](Prompt-Variants) for the variants.

## D16 Request Capture and the Session Start

**Problem:** The measure of D4 does not show the request that Claude Code sends.
The start of a session is larger in the capture than in the measure.

**Choice:** `dotclaude-capture` is a local logging proxy.
Its code is in `src/plugins/dotclaude-lab/slices/capture/adapters/cli.ts`.
Claude Code reaches it through `ANTHROPIC_BASE_URL`.
The proxy records the body of each request.
The proxy forwards to `--upstream URL`.
If that option is not set, it forwards to `ANTHROPIC_BASE_URL`.
If that is not set either, it forwards to `https://api.anthropic.com`.
The capture splits the first request into system blocks, tool schemas, and messages.

- A capture run sets `ENABLE_TOOL_SEARCH=true`.
  The binary of Claude Code, version `2.1.296`, turns tool search off when the base URL is not a first-party host.
  The fact is found by reading the text strings of that binary, which is allowed for evidence.
  Its message names `ENABLE_TOOL_SEARCH=true` as the fix.
- The agent sandbox can block a local port.
  So the user runs `just capture` in a terminal.
  See [Sandbox](Sandbox).

**Evidence and open points:**

- The older text says "30K start".
  Only the research dossier has a source for it.
  That source gives a range of 32,382 to 40,721 tokens for the first requests of some sessions.
  The "30K" figure has no other source.
- The cause of the larger start is open.
  One possible cause is a config source that the surface does not read.
  This is an inference, not a settled fact.

## D28 Compliance by Checks, Not by Prose

**Problem:** Rules that are written as prose in the prompt sections are not checked.
Some of them fail in practice.

**Choice:** A rule that a program can check goes to a hook, a lint rule in `just check`, or an eval measure.

1. A rule that a program can check moves to a hook, a lint in `just check`, or an eval measure.
   Item 1 is kept.
2. This item is reversed.
   The auto-mode guard file is gone from `src/`.
   Auto mode uses the native classifier and the `autoMode.hard_deny` rules that [Auto Mode](Auto-Mode) describes.
   The reversed text is in [Decisions-Reversed](Decisions-Reversed#prompt).
3. The old eval harness had measures for repeat reads, recaps, and chat lines with more than one sentence.
   The harness is gone.
   But `just eval` runs `claude plugin eval` on the plugin.
   The format of that command has no measure for repeat reads, recaps, or chat lines.
   So no gate checks them.
   Item 3 is kept with this correction.
4. `CLAUDE.md` says that chat replies are in the scope of the line-break rule.
   Item 4 is kept.

**Open points:**

- "Ask before publish" is prose in the prompt sections.
  No check in `src/` or in `just check` tests it.
- The research file `research/compliance.md` is not in the repository.
  The items above come from the decisions of the change, not from that file.

## Related Pages

- [Prompt Surface](Prompt-Surface)
- [Prompt Variants](Prompt-Variants)
- [Settings Snippet](Settings-Snippet)
- [Semantic Line Breaks](Semantic-Line-Breaks)
- [Sandbox](Sandbox)
- [Auto Mode](Auto-Mode)
