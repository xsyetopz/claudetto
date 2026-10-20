# Decisions: Prompt

These decisions explain the shape of the system prompt, the cuts to built-in text, and the limits on result size.

## Why Some Built-In Text Is Cut

**Choice:** The `prompt` slice answers by exact id.
An unknown id passes on unchanged.

- `prompt.compose` replaces the text of `lean_body` with the tailored text, because Claude Code `2.1.302` and `2.1.303` never send that section to `prompt.section`.
- `prompt.section` answers the ids that have a transform in `slices/prompt/transforms/`.
- `tool.describe` replaces the description of `Agent` when the new text is shorter.
  `ListAgents` is deferred behind `ToolSearch`.
- `prompt.attachment` leaves out `goal_status` and `tool_hosts_notice`.
- `command.describe` hides 29 commands from the typeahead and `/help`.
  A hidden command still runs when typed in full.
- The `context_management` section follows the compaction state: `handoff`, `built-in`, or `off`.
  With `built-in`, Claude Code text stays as written.

**Reason:** Some built-in text does not help `claudetto` and costs tokens on every request.
Nothing cuts `session_context` or `prompt.context`, because a cut needs an eval with no loss first.

**Evidence:** `slices/prompt/lab/` tests the handlers.
`tools/builtins/verdicts/` holds the verdict for each part.
See [Prompt](Prompt).

## Why claudetto Owns the System Prompt

**Choice:** The `prompt` slice builds on the short prompt (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT=1`).
It replaces the text of `lean_body` with one text for every model, through `prompt.compose`.
`LEAN_BODY` joins the sections `intro`, `doing_tasks`, `system`, `blocks`, `verification`, `actions`, `tools`, and `counts`.

- The text is the same on each turn, so the prompt cache stays valid.
- A subagent gets its prompt from Claude Code, so `agent.spawn` adds a `<claudetto_notes>` block once.
  It holds the verification, block, and evidence lines.
- An output style reaches the model as a message, so `Concise` holds only role, tone, and format.
- Rules are plain imperatives.
  A reason appears only where it changes behavior.

**Reason:** The same rules are needed for every model, and one text serves them all.

**Evidence:** `tests/claudetto/prompt/rules.test.ts` pins the least-code rule, the pushback tiers, and the missing-tool rule.
`slices/prompt/lab/section.test.ts` checks that `prompt.compose` replaces the `lean_body` section and keeps the other ids.

## Why Requests Are Captured

**Choice:** `claudetto-capture` is a local logging proxy in `src/plugins/claudetto-lab/slices/capture/adapters/cli.ts`.
Claude Code reaches it through `ANTHROPIC_BASE_URL`.
It records each request body and forwards it to `--upstream URL`, then to `ANTHROPIC_BASE_URL`, then to `https://api.anthropic.com`.
It refuses an upstream that is its own address.
The report splits the first request into system blocks, tool schemas, and messages.

**Reason:** A size figure for the start of a session must come from a real request, not an estimate.
The agent sandbox can block a local port, so the user runs `just capture` in a terminal.

**Evidence:** [Prompt Size](Prompt-Size).

## Why a Result Has a Size Limit

**Choice:**

1. `guard` denies a `Bash` command that only prints a file, and names the `Read` call with the same range.
   A `Read` of an unchanged range returns a short stub, and a `Bash` print does not.
2. The `tools` section tells the model to read only the part it needs, with `offset` and `limit`.
3. `bashOutputMaxChars` is 16000.
   Claude Code 2.1.303 to 2.1.305 allow 4000 to 128000, with a default of 30000.
   A longer output goes to a file, and Claude gets a preview and the path.

**Reason:** Each read and command output adds text to the context.
The value 16000 is a choice.
It brings 196 of 240 saved outputs inline.

**Evidence:** `tests/claudetto/guard/print.test.ts` and `slices/guard/lab/print.test.ts`.

## Why Checks Beat Prose

**Choice:** A rule that a program can check goes to a hook, a lint rule in `just check`, or an eval case.

- `sembr` rewrites line breaks, and `guard` denies a file print, with no model token.
- `just eval` runs `claude plugin eval` with the cases in the `evals/` folders.
- `just validate` fails on a case that checks only the words of a reply (`tools/case-checks.ts`).

**Reason:** A rule written only as prose is not checked, and some fail in practice.
No gate checks repeat reads, recaps, or multi-sentence chat lines yet.

**Evidence:** `tests/tools/case-checks.test.ts`.

## See Also

- [Prompt](Prompt)
- [Styles](Styles)
- [Settings Snippet](Settings-Snippet)
- [Sembr](Sembr)
- [Sandbox](Sandbox)
- [Decisions](Decisions)
