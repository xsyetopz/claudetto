---
schema: dotclaude-spec/2
kind: package
id: P41
title: `dcc-plugin-you-should-know`
wave: 4
deps: []
owns: ["src/plugins/dcc-plugin-you-should-know/","tests/dcc-plugin-you-should-know/","the dcc-plugin-you-should-know entry of .claude-plugin/marketplace.json","src/wiki/add-ons/You-Should-Know.md","evidence/you-should-know.md"]
satisfies: []
verify: just check, just lab, and one session in just sandbox where a notice shows before the action that it is about
agent: implementer
status: planned
---

## Goal

A new add-on plugin, `dcc-plugin-you-should-know`, tells the user one thing they should know before Claude acts on it, not after.
It replaces the built-in `cc-plugin-you-should-know`, which stays off.
It makes at most one model call per turn: a small Haiku call with an API key, and a fork of the main conversation on a subscription.

## Context

- The decisions of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-13.
- The built-in `cc-plugin-you-should-know` of Claude Code 2.1.296 (bundle `~/.local/share/claude/versions/2.1.296`, near byte 222887356):
  - It runs on `turn.step`, on every 6th step and never on step 0, and skips subagents.
  - It starts a `model.fork` call with the transcript, does not wait for it, and shows the answer above the prompt later.
    So the notice comes after Claude has acted, which is the problem of the user.
  - It asks for at most one topic: a trade-off the user may not understand, a design decision with consequences, or an edge case that is not obvious.
    Most checks give no topic.
  - The notice is for the user only, and Claude sees it only when the user picks to discuss it.
  - Each module ends with the notice `(c) Anthropic PBC. All rights reserved.`, so this package copies no code or prompt text of it.
- The probes (`evidence/you-should-know.md`):
  - With an API key, `$.model.complete` on `haiku` answers in about 1 second, with 21 input and 4 output tokens for a short prompt.
  - On a subscription, each `$.model.complete` and `$.model.classify` call from a hook gets HTTP 429 `rate_limit`.
  - On a subscription, `$.model.fork` answers in about 1 second.
    It runs on the main model and reads the conversation as a cache read (13,532 cached tokens in the probe).
  - `$.model.fork` gives `nothing-to-fork` before the first response of a session and after `/clear`.
  - A hooks module loads only when `hooks/hooks.json` lists it in `modules`, which `just generate` writes.
- The mods API (`plugins/dotclaude/.claude-plugin/types/claude-code/index.d.ts`):
  `tool.check` (line 3976) runs before a tool, `$.ui.toast` (2453) shows a notice that the model does not see, `$.model.complete` (2624) makes one completion, and `$.model.fork` (near 2640) answers one prompt on a branch of the conversation.
- The `asks` and `guard` slices of the core plugin already ask before risky calls, so this plugin has no rules for risky commands.
- The user picked a toast that does not stop the action (the user, 2026-10-13).
- The plugin is opt-in: the user installs it, and the setup of dotclaude does not turn it on (the user, 2026-10-13).
- An API key uses `$.model.complete`, and a subscription uses `$.model.fork` until Claude Code lets a subscription make separate calls from a hook (the user, 2026-10-13).

## Steps

1. Find out, with sources, and add the findings to `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md`:
   - whether a toast from `tool.check` shows before the tool runs, in an interactive session
   - whether a fork in `tool.check` sees the pending tool call
2. The plugin, in `tool.check`, on the first call of a turn that changes something (`Edit`, `Write`, `NotebookEdit`, or a `Bash` call that is not a read):
   - It tries one `$.model.complete` call to `haiku` with the prompt of the user and the pending action, and not the transcript.
   - If that call gets HTTP 429, it uses `$.model.fork` for this check and for the rest of the session.
     A fork reads the conversation, so its prompt names only the pending action.
   - The prompt asks for at most one topic of the three kinds above, or none, in the own words of this package and in ASD-STE100.
   - A topic shows as a `$.ui.toast`, and the action runs.
   - A subagent call, a second call in the same turn, `nothing-to-fork`, a failed or slow model call, and a topic that showed in this session already, give no notice.
3. Tests: a lab test for the first changing call, a read, a second call in a turn, a subagent, the switch to a fork after a 429, a fork for the rest of the session, `nothing-to-fork`, a failed model call, a repeated topic, and a call that gives no topic.
4. Docs: a wiki page of the add-on that says it is opt-in and what each check costs on an API key and on a subscription, the add-on list in `AGENTS.md`, `README.md`, and `src/wiki/dotclaude/Architecture.md`, and a `CHANGELOG.md` entry under `[Unreleased]`.

## Acceptance

- `just check` and `just lab` pass.
- In `just sandbox`, with `cc-plugin-you-should-know@builtin` off, a notice shows before the action that it is about, on a subscription.
- The cost and wait of one check, on each path, are in the evidence file.

## Boundaries

- Do not copy code or text of the built-in plugin.
- Do not import from another plugin.
- Do not send the transcript in a `$.model.complete` call.
- Do not stop or change the action.
- Do not add an env var.
