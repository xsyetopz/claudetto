---
paths:
  - "plugins/*/slices/*/adapters/*.ts"
  - "plugins/*/slices/*/prompts.ts"
---

These choices rest on facts of Claude Code that no test shows.
Do not replace one without new evidence, and record the evidence in `src/wiki/claudetto/rationale/Decisions-Engine.md` (D48 to D57) or `src/wiki/claudetto/rationale/Decisions-Session.md` (from D63) in the same change.

- A notice for the user goes through `$.ui.log`, which the model does not read.
  A `user` row from `$.session.append` goes to the model, and it can leak into a reply (D48).
- A hook that calls `next` first has no catch-all, because the result of `next` stands when the hook throws after it (D49).
- A plugin cannot set `sandbox`. The settings snippet of 0.3.0 sets no `sandbox` key, and `claudetto-setup --apply` removes the `sandbox` values that the 0.2.0 snippet wrote (tasks 7.1 and 7.3).
- Each function that touches `$` stays in the adapter file that uses it, because `claude plugin validate` follows `$` only in one file (D52).
- A plugin verdict only makes a call stricter (D53).
- claudetto uses no `CLAUDE_ENV_FILE` (D55).
- A text for the model names a `bin/` command of a plugin by its path under `$.plugin.root`, because the `PATH` has the `bin/` folders only through the shell snapshot, which a sandbox can block (D57).
- The cost of a hook model call comes from the `usage` of its own `$.model.complete` result, because `total_cost_usd` leaves out a model call of a hook (D63).

When you find a fact of the engine that saves model tokens or costs none, add it to that page with its source.
