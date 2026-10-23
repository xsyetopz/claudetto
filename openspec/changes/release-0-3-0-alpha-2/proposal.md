## Why

0.3.0-alpha.1 still costs the user prompts, tokens, and turns, and its agents still defer, tick tasks with no check, and hand work back.
The problems and goals G1 to G20 are in `prd.md`, and the evidence is in `research/`.

## What Changes

- **BREAKING** The gate answers each permission prompt of Claude Code: `allow` when no danger gate matches, in the main agent and in each subagent (D1).
  The danger gates: OS destruction, system tampering, secrets, `git` loss, database and infrastructure loss, a delete with an unreadable target, and a download piped into a shell.
  The snippet drops `Bash(rm -rf /*)`, `Bash(rm -rf ~/*)`, and the `TaskStop` deny.
- The snippet turns off the claude.ai skills, plugins, and MCP servers and the built-in mod `cc-plugin-you-should-know`, caps the effort of each model, denies the built-in agents `claude`, `claude-code-guide`, and `general-purpose`, and sets `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1`, so only the claudetto roster stays (D2, D21).
- `kernel/tmp.ts` gives the gate and the cleanup one list of temp folders (D3).
- `claudetto-setup --inventory` reports the plan, plugins, mods, MCP servers, and skills, and setup asks `merge` or `replace` (D4).
  The Jev key goes to `userConfig` with `sensitive: true`, so Jev runs.
  Setup offers a shell alias `claude-demo` for `IS_DEMO=1 claude` and writes `IS_DEMO` to no settings file.
- The `prompt.context` block gives the plan, branch, latest tag, open change, shell, and `grep` engine (D5).
- `main.md` leads and delegates by a routing block, and the `reviewer` and `researcher` move to Sonnet 5.5 at `medium` (D6).
- Each text that claudetto writes or replaces keeps its behavior in fewer words with positive framing, with a lint test and a size test (D7).
  `Concise.md` keeps only the reply format, its behavior rules move to `main.md`, and each agent runs each free check before it reports a claim as not verified.
- New slice `finish`: a `box` hook denies a ticked task with no passed check, and a `stop` hook sets a note for a reply that defers finishable work or says "done" with no check (D8).
  `goal` merges into it.
- New slice `notes`: a note above the prompt from hook counters and a tagged reply line, with no model call (D9).
- `ground` counts the tool output of a subagent and an `AskUserQuestion` answer as sources, and skips example values of specs and tests (D10).
- The edit ledger is one file of the project, and `git status` and `git diff` name who changed each file (D11).
- **BREAKING** A handover replaces compaction: a code-built handoff, then `/clear`, then a resume prompt, at a context bound, after an idle pause past the cache TTL, or at a task group change (D12).
  The option `compaction` becomes `auto`, `handover`, or `built-in`.
- Handoffs go only to `.claudetto/handoffs/`, with the decisions, passed checks, and user values (D13).
- `minispec new change` maps dots to hyphens, and the change folder gets no `handoff.md` (D14).
  `minispec status` prints a `Next:` line with the next claudetto command, and the skills `propose`, `apply`, and `verify` end with it.
- The status line shows usage in a green, amber, and red gradient, and writes `rate_limits` for the eval recipes (D15).
- **BREAKING** `reply` and `dry` go, `setup` drops the 0.1.0 and 0.2.0 upgrade paths, and dead exports go (D16).
  Each slice parses a fact once in `kernel/` and prints through one printer, and each task gives the line count of the plugin before and after.
- Claude Code 2.1.309 is the minimum and the tested version (D17).
- Free checks run after the edits, and the paid checks run last in one ask (D18).
- The findings of `research/external.md` with the verdict `new` get a task each (D19).
- Setup asks off or on for each tool, MCP server, LSP plugin, and skill, and removes an OpenSpec install when `minispec` is there (D20).
- Setup writes a global `~/.claude/CLAUDE.md` of 20 lines or fewer with an origin block and the rules of the user, offers `claudeMdExcludes` and a `CLAUDE.local.md` template, and lists each `~/.claude/rules/*.md` with its owner (D21).
  The repository `AGENTS.md` goes to 20 lines, with the rest in `.claude/rules/`.
- `minispec` gives the same results as OpenSpec 1.14.3 for its 5 defects, and gets the workflow commands, `schemas`, and `schema validate`, on one model in 793 lines or fewer (D22).
- claudetto uses a pinned npm package where it removes more code than it adds and its place can load it (D23).
- An undocumented, experimental, or gated lever of Claude Code is allowed when it saves cost or time with no loss, with a pin test for each (D24).

## Capabilities

### New Capabilities

- `side-notes`: notes above the prompt with no model call.
- `claim-grounding`: the check of claims in a `Write` or `Edit` against the sources of the agent that writes.
- `session-economy`: no duplicate `Monitor`, short repeat reads, and a cap on the `/goal` stop.
- `finish`: the `box` and `stop` hooks.
- `text-surfaces`: the text audit of each surface, with its lint and size tests.
- `status-line`: the usage gradient and the `rate_limits` file.
- `handover`: handoff, `/clear`, and resume in place of compaction.

### Modified Capabilities

- `permission-gate`
- `settings-levers`
- `setup`
- `session-hygiene`
- `prompt-base`
- `agent-roster`
- `minispec`
- `release-evidence`

Task 1.1 archives `0-3-0` first, so the base specs exist (architecture A1).

## Impact

- Code: `plugins/claudetto/slices/` (`guard`, `setup`, `hygiene`, `ground`, `spec`, `handoff`, `prompt`, `statusline`, `decide`, the new `finish` and `notes`, and the removed `reply`, `dry`, and `goal`), `kernel/`, `agents/`, `output-styles/`, `skills/`, `hooks/register.ts`, and `plugin.json`, with the kernel copies of the add-on plugins. `slices/spec/` gets the commands of D22.
- User files: setup reports each change and asks before it writes `~/.claude/settings.json`, `~/.claude/CLAUDE.md`, the rc file of the shell (the `claude-demo` alias), and the project settings.
- Repository: `CLAUDE.md` (one `@AGENTS.md` line or none, by task 9.6), `AGENTS.md`, `.claude/rules/`, `tools/limits.ts`, CI, `README.md`, `CONTRIBUTING.md`, `schemas/`, fixtures, issue templates, `src/wiki/`, `justfile`, and `CHANGELOG.md` under `[0.3.0-alpha.2]`.
- Paid runs: group 11 of `tasks.md`, in one ask with the cost and the weekly share.
