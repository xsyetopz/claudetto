---
paths:
  - "src/plugins/*/slices/*/adapters/*.ts"
  - "src/plugins/*/slices/*/prompts/*.md"
  - "src/kernel/repo/*.ts"
---

These choices rest on facts of Claude Code that no test shows.
Do not replace one without new evidence, and record the evidence in `src/wiki/rationale/Decisions-Engine.md` (D48 to D61) or `src/wiki/rationale/Decisions-Session.md` (from D62) in the same change.

- A notice for the user goes through `$.ui.log`, which the model does not read.
  A `user` row from `$.session.append` goes to the model, and it can leak into a reply (D48).
- A hook that calls `next` first has no catch-all, because the result of `next` stands when the hook throws after it (D49).
- `CLAUDETTO_AGENT_CALL` is set with `$.env.set` for each `Bash` call of Claude.
  A `!` command skips the tool hooks, and a prefix in the command text breaks the `Bash(...)` allow rules (D50).
- A plugin cannot set `sandbox`, so `/claudetto:setup sandbox` writes it with `failIfUnavailable: true` (D51).
- Each function that touches `$` stays in the adapter file that uses it, because `claude plugin validate` follows `$` only in one file (D52).
- A plugin verdict only makes a call stricter (D53).
- The attribution reminder replaces `includeGitInstructions` (D54).
- claudetto uses no `CLAUDE_ENV_FILE` (D55).
- A text for the model that names a toolchain command or version gives a fact that claudetto reads (`bun --version`, a file of the project), and never a choice from memory (D56).
- A text for the model names a `bin/` command of a plugin by its path under `$.plugin.root`, because the `PATH` has the `bin/` folders only through the shell snapshot, which a sandbox can block (D57).
- A `Stop` hook runs after the user sees the reply, and the turn gate keeps its own count of blocks, with no pass for `stop_hook_active` alone (D58).
- A local background `Bash` command has no time limit (D59).
- The built-in read dedup covers only a read of the same range (D60).
- A `tool.call` hook wraps the permission dialog, so `next(e)` returns a rejection as `isError: true` with `result` equal to `User rejected tool use` (D61).
- `classic.SessionStart` `additionalContext` gives facts to the model at the start, `turn.complete` `usage.model` is the served model, and `$.http.fetch` has no timeout option, so a hook races it with `$.clock.sleep` (D62 in `src/wiki/rationale/Decisions-Session.md`).
- The judge of the turn gate measures its cost from the `usage` of its own `$.model.complete` result, because `total_cost_usd` leaves out a model call of a hook (D63).

When you find a fact of the engine that saves model tokens or costs none, add it to that page with its source.
