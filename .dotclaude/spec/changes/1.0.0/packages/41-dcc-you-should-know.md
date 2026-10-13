---
id: P41
deps: []
owns: ["src/plugins/dcc-plugin-you-should-know/", "tests/dcc-plugin-you-should-know/", "the dcc-plugin-you-should-know entry of .claude-plugin/marketplace.json", "src/wiki/add-ons/You-Should-Know.md", "evidence/you-should-know.md"]
verify: just check, just lab, and one session in just sandbox where a notice shows before the action that it is about
agent: implementer
---

# P41 `dcc-plugin-you-should-know`

## Goal

A new add-on plugin, `dcc-plugin-you-should-know`, tells the user one thing they should know before Claude acts on it, not after.
It replaces the built-in `cc-plugin-you-should-know`, which stays off, and it costs at most one small Haiku call per turn.

## Context

- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-13.
- The built-in `cc-plugin-you-should-know` of Claude Code 2.1.296 (bundle `~/.local/share/claude/versions/2.1.296`, near byte 222887356):
  - It runs on `turn.step`, on every 6th step and never on step 0, and skips subagents.
  - It starts a billed `model.fork` call with the transcript, does not wait for it, and shows the answer above the prompt later.
    So the notice comes after Claude has acted, which is the problem of the user.
  - It asks for at most one topic: a trade-off the user may not understand, a design decision with consequences, or an edge case that is not obvious.
    Most checks give no topic.
  - The notice is for the user only, and Claude sees it only when the user picks to discuss it.
  - Each module ends with "(c) Anthropic PBC.
    All rights reserved.", so this package copies no code or prompt text of it.
- The mods API (`plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`):
  `tool.check` (line 3976) runs before a tool, `$.ui.toast` (2453) shows a notice that the model does not see, and `$.model.classify` (2662) makes one small completion.
- The `asks` and `guard` slices of the core plugin already ask before risky calls, so this plugin has no rules for risky commands.
- The user picked a toast that does not stop the action (the user, 2026-10-13).

## Steps

1. Find out, with sources, and write the findings to `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md`:
   - which model the `haiku` alias of `$.model.classify` resolves to, and the tokens and wait of one call, measured
   - whether a toast from `tool.check` shows before the tool runs, in an interactive session
2. The plugin, in `tool.check`, on the first call of a turn that changes something (`Edit`, `Write`, `NotebookEdit`, or a `Bash` call that is not a read):
   - It sends one `$.model.classify` call to Haiku with the prompt of the user and the pending action, and not the transcript.
   - The call asks for at most one topic of the three kinds above, or none, in the own words of this package.
   - A topic shows as a `$.ui.toast`, and the action runs.
   - A subagent call, a second call in the same turn, a failed or slow model call, and a topic that showed in this session already, give no notice.
3. Tests: a lab test for the first changing call, a read, a second call in a turn, a subagent, a failed model call, a repeated topic, and a call that gives no topic.
4. Docs: a wiki page of the add-on, the add-on list in `AGENTS.md`, `README.md`, and `src/wiki/dotclaude/Architecture.md`, and a `CHANGELOG.md` entry under `[Unreleased]`.

## Acceptance

- `just check` and `just lab` pass.
- In `just sandbox`, with `cc-plugin-you-should-know@builtin` off, a notice shows before the action that it is about.
- The cost and wait of one check are in the evidence file.

## Boundaries

- Do not copy code or text of the built-in plugin.
- Do not import from another plugin.
- Do not send the transcript to the model.
- Do not stop or change the action.
- Do not add an env var.
