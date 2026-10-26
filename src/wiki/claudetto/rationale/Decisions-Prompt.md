# Decisions: Prompt

These decisions explain the shape of the system prompt, the cuts to built-in text, and the limits on result size.

## Why Some Built-In Text Is Cut

**Choice:** The `prompt` slice answers by exact id.
An unknown id passes on unchanged.

- The `prompt.compose` and `prompt.section` rewrites of the system sections are removed in 0.3.0, because the body of `claudetto:main` replaces each section (A9, fault 44).
- `tool.describe` replaces the description of `Agent`, `Bash`, `Edit`, `Read`, `Skill`, `ToolSearch`, and `Write` when the new text is shorter.
  `ListAgents` and `Workflow` are deferred behind `ToolSearch`.
- `prompt.attachment` leaves out `goal_status` and `tool_hosts_notice`.
- The `command.describe` hook that hid 29 commands is removed in 0.3.0.
- The `context_management` block of `prompt.context` follows the compaction state: `handoff`, `built-in`, or `off`.

**Reason:** Some built-in text does not help `claudetto` and costs tokens on every request.
Nothing cuts `session_context` or a block of `prompt.context`, because a cut needs an eval with no loss first.

**Evidence:** `plugins/claudetto/tests/` tests the handlers.
`tools/builtins/verdicts/` holds the verdict for each part.
See [Prompt](Prompt).

## Why claudetto Owns the System Prompt

**Choice:** Each session runs as the main agent `claudetto:main`, and its body is the whole system prompt (A9).
The body holds the parts `intro`, `doing_tasks`, `system`, `blocks`, `verification`, `actions`, `tools`, `counts`, `working`, `communication`, and `session`.
The 0.2.0 route, a `prompt.compose` rewrite of the `lean_body` section of the short prompt, is removed in 0.3.0, because the whole default prompt came back when the mods did not load.

- The text is the same on each turn, so the prompt cache stays valid.
- The `agent.spawn` block `<claudetto_notes>` for a subagent is removed in 0.3.0.
- An output style reaches the model as a message, so `Concise` holds only role, tone, and format.
- Rules are plain imperatives.
  A reason appears only where it changes behavior.

**Reason:** The same rules are needed for every model, and one text serves them all.

**Evidence:** `tests/claudetto/session/prompt/faults.test.ts` checks that the plugin `settings.json` selects `claudetto:main`.

## Why Requests Are Captured

**Choice:** `just capture` runs a local logging proxy in `tools/capture/adapters/cli.ts`.
Claude Code reaches it through `ANTHROPIC_BASE_URL`.
It records each request body and forwards it to `--upstream URL`, then to `ANTHROPIC_BASE_URL`, then to `https://api.anthropic.com`.
It refuses an upstream that is its own address.
The report splits the first request into system blocks, tool schemas, and messages.

**Reason:** A size figure for the start of a session must come from a real request, not an estimate.
The agent sandbox can block a local port, so the user runs `just capture` in a terminal.

**Evidence:** [Prompt Size](Prompt-Size).

## Why a Result Has a Size Limit

**Status:** Removed in 0.3.0.
The `guard` slice no longer denies a `Bash` command that only prints a file.
The settings snippet no longer sets `bashOutputMaxChars`.

**Choice:** The `tools` section of `agents/main.md` tells the model to read only the part it needs, with `offset` and `limit`.
Claude Code keeps its own default for the size of a command output.

**Reason:** Each read and command output adds text to the context.
The 0.2.0 value of 16000 was a choice, and no 0.3.0 code or test pins it.

**Evidence:** The 0.2.0 tests `print.test.ts` are removed.

## Why Checks Beat Prose

**Choice:** A rule that a program can check goes to a hook, a lint rule in `just check`, or an eval case.

- `guard` reads the command and the `git` state of its paths, with no model token.
- `just eval` runs `claude plugin eval` with the cases in the `evals/` folders.
- `just validate` fails on a case that checks only the words of a reply (`tools/case-checks.ts`).

**Reason:** A rule written only as prose is not checked, and some fail in practice.
No gate checks repeat reads, recaps, or multi-sentence chat lines yet.

**Evidence:** `tests/tools/case-checks.test.ts`.

## Related Pages

- [Prompt](Prompt)
- [Styles](Styles)
- [Settings Snippet](Settings-Snippet)
- [Sandbox](Sandbox)
- [Decisions](Decisions)
