# Decisions: Evidence

`claudetto` takes facts from the host and the workspace, not from model reports.
These decisions explain how.

## Why State Comes From Measurement

**Choice:** `claudetto` never takes a state figure from the model.

1. No prompt text asks the model to estimate its context share.
2. The handoff starts at a measured context, through `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
   The trigger is `HANDOFF_TRIGGER_TOKENS` in `plugins/claudetto/kernel/budget.ts`.
3. The `context_management` transform agrees with the compaction state.
4. The done list of a handoff comes from checked tasks in `tasks.md` and passed checks.
5. The prompt rules ask for a run before a claim of done (the `verification` part of `agents/main.md`).
   No hook checks the claim.

**Reason:** A model can report a false state.
GitHub issue #35357 records a model that printed context warnings with false values (not checked here).
No eval proves the `Stop` prompt hook that judges replies, because its eval of 2026-10-12 had too few runs (D25, [Stop Hook Eval](Stop-Hook-Eval)).

**Evidence:** `plugins/claudetto/tests/context.test.ts` and `tests/claudetto/session/handoff/status.test.ts`.

## Why Markdown Gets Semantic Line Breaks

**Status:** The `sembr` slice is removed in 0.3.0.

**Choice:** `claudetto` rewrites text before it is written, with no model token (`slices/sembr/` at `v0.2.0`).

- The `tool.call` hook rewrites a Markdown `Write` or `Edit`, and the quoted heredoc of `git commit` or `gh pr create` in `Bash`.
- `domain/split.ts` splits sentences, `domain/rewrite.ts` puts each on its own line, and `domain/title.ts` sets Title Case in headings.
- `Edit` rewrites an `old_string` that spans two sentences, because Claude Code checks `old_string` before a classic hook runs.
- The hook has the phase `rewrite`, before the `check` phase of `guard`.
- It does not rewrite after the tool runs, because that could make the next `Edit` fail (a design reason, not tested).
- Chat replies are not rewritten.

**Reason:** The model does not always keep the one-sentence-per-line rule.
This is an inference from the design, not a measured result.

**Evidence:** `slices/sembr/lab/sembr.test.ts` at `v0.2.0`.

## Why Finished Work Stays Under an Unchecked Claim

**Choice:** A claim of fault, from any source, does not undo finished work.
The work stays until a check in the workspace shows the fault.

1. An evidence line sits in the `actions` part of the body of `claudetto:main`.
2. A subagent gets no shared section, so the `<claudetto_notes>` block of `onSpawn` carried the line. The block is removed in 0.3.0.
3. A gate on the prompt of the user is not built.
   It is held for the case that parts 1 and 2 fail the eval.

**Reason:** An agent can undo correct work after a claim it does not check.
The source is arXiv 2609.32616, which is not in this repository.
It tests `Claude-Opus-5` and `Claude-Sonnet-5`, and the mapping to the 5.5 models is inferred.
Its rates are worst case, because its tasks hide the evidence.
No eval result shows whether parts 1 and 2 pass on 0.2.0.

**Evidence:** Eval cases:

- `plugins/claudetto/evals/accusation-user/case.yaml` (false claim from the user)
- `plugins/claudetto/evals/accusation-subagent/case.yaml` (false claim in a reviewer report)
- `plugins/claudetto/evals/accusation-warranted/case.yaml` (true claim, the agent must change the work)

See [Evals](Evals).

## Why a Guard Hook Fails Closed

**Choice:** `guard` gives `onCheckFail` to `.catch()` of its `tool.check` hook.
A crash or timeout gives an `ask` for a person, with the reason that the gate failed.

**Reason:** Claude Code skips a hook that throws, so the call runs.
A guard that fails open lets a denied call through.
A false `ask` costs little, because a person can answer it.

**Evidence:** The header of `plugins/claudetto/slices/guard/adapters/mod.ts` and `tests/claudetto/gate/faults.test.ts`.

## Related Pages

- [Handoff](Handoff)
- [Guard](Guard)
- [Evals](Evals)
- [Decisions](Decisions)
