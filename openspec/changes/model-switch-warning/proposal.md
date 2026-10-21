# Proposal: model-switch-warning

> This change takes the commit `4439a6e3` from the branch `worktree-agent-aa482046137065819` into `main`, as the user asked on 2026-10-21.

## Why

A `/model` switch drops a warm prompt cache.
The new model then writes the whole context to its cache again, which can cost more than one dollar on a long session (D47 in `release-0-2-0`).
Claude Code gives the classic hook `PreModelSwitch` (2.1.251 or later) with the fields `prompt_cache_warm`, `cache_ttl`, `context_tokens`, and `estimated_cache_write_usd`.

## What Changes

- Add the classic hook `PreModelSwitch` to the `handoff` slice, in `src/plugins/claudetto/slices/handoff/adapters/switch.ts`.
  On a warm cache and a typed `/model` command (`source` is `command`), it returns `permissionDecision: "ask"` with a reason that names the TTL, the new model, the tokens, and the cost.
  On a cold cache, with no cache field, or for any other `source`, it returns nothing, and the switch goes on.
  `ask` is a refusal for any other `source`.
  When the tokens or the cost are not numbers, the reason has no cost sentence.
- Add the prompt `prompts/switch-warning.md`, the control `model switch warning`, and its row in the wiki page `Controls.md`.
- Add `tests/claudetto/handoff/switch.test.ts`.
- Add a `CHANGELOG.md` entry under `[Unreleased]`.

## What Does Not Change

- The `session.compact` mod hook and the handoff text.
- A switch on a cold cache, a fallback, and a resume. `PreModelSwitch` does not fire for a fallback or a resume.
