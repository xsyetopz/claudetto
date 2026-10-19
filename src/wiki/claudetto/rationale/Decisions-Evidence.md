# Decisions: Evidence

This page holds the decisions D27, D29, D30, and D31.
Read it to learn why `claudetto` takes facts from the host and the workspace and not from model reports.
Each decision gives the problem, the choice, the alternatives, and the evidence.
The index is [Decisions](Decisions).

## D27 Measured Facts over Model Reports

**Problem:** A model can report a false state.
GitHub issue #35357 records a Claude model that printed context warnings with false values.
The issue is not in this repository, so this page does not check it.

**Choice:** `claudetto` does not take a state figure from the model.
It reads the measured value from the host.

1. No prompt text asks the model to estimate or announce its context share.
2. The handoff starts at a measured context, through `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
   The trigger is `HANDOFF_TRIGGER_TOKENS` in `src/kernel/budget.ts`.
3. The `context_management` transform of the `prompt` slice agrees with the compaction state (`slices/prompt/transforms/context_management.ts`).
4. The done list of a handoff comes from the checked tasks of `tasks.md` and from checks that passed, and not from the text of the model.
5. A claim of a passed check has no hook.
   The prompt rules ask for a run before a claim of done (`slices/prompt/prompts/verification.md` and `verify-line.md`).

**Alternatives:** A state figure that the model reports, which is rejected for the issue above.
A `Stop` prompt hook that judges the claims of a reply failed its hook eval on 2026-10-12.
See [Evidence](Evidence).

**Evidence:** The code paths above.
`src/plugins/claudetto/slices/prompt/lab/section.test.ts` checks the `context_management` section, and `tests/claudetto/handoff/status.test.ts` checks the done list.

## D29 Semantic Line Breaks

**Problem:** The text that Claude writes to files and to commits must hold one sentence on each line.
The model does not always keep this rule.
This is an inference from the design, not a measured result in this repository.

**Choice:** `claudetto` rewrites the text before it is written, with no model token.
The code is in `src/plugins/claudetto/slices/sembr/`.

- The `tool.call` hook rewrites a Markdown `Write` or `Edit`.
  It also rewrites the quoted heredoc of a `git commit` or `gh pr create` call in `Bash`.
- `domain/split.ts` splits the sentences, and `domain/rewrite.ts` puts each one on its own line.
  `domain/title.ts` puts each heading in Title Case (Chicago style).
- `Edit` rewrites an `old_string` that spans two sentences, because Claude Code checks `old_string` before a classic hook runs.
- The hook has the phase `rewrite`, which runs before the phase `check` of the `guard` slice.
- The design uses no `PostToolUse` rewrite, because that can make the next `Edit` fail.
  This reason is the design text, and this page does not test it.
- The chat reply is not rewritten.

**Alternatives:** The `markdownlint-rule-sembr` package as a gate.
It needs extra packages, and each block costs tokens.

**Evidence:** `src/plugins/claudetto/slices/sembr/lab/sembr.test.ts`.
See [Sembr](Sembr).

## D30 Hold Work That Is Right Under an Unsupported Claim

**Problem:** An agent can undo finished work that is right, after a claim of fault that it does not check.
The claim can come from the user, from a subagent report, or from project context.
The source is the paper arXiv 2609.32616, which is not in this repository, so this page does not check it.
The paper tests `Claude-Opus-5` and `Claude-Sonnet-5`.
The mapping to Opus 5.5 and Sonnet 5.5 is inferred.

**Choice:** A claim of fault, from any source, does not undo finished work.
The work stays until a check in the workspace shows the fault.

1. The evidence line.
   Its text is `src/fragments/evidence-line.md`, and the shared `actions` section includes it.
2. The subagent rule.
   A subagent gets no shared section, so the block `<claudetto_notes>` of `onSpawn` carries the evidence line.
3. A gate on the prompt of the user is not built.
   It is for the case that parts 1 and 2 fail the eval.

**Alternatives:** The gate of part 3.

**Evidence:** The eval cases:

- `src/plugins/claudetto/slices/prompt/evals/accusation-user/case.yaml`, a false claim of fault from the user.
- `src/plugins/claudetto/slices/prompt/evals/accusation-subagent/case.yaml`, a false claim in a reviewer report.
- `src/plugins/claudetto/slices/styles/evals/accusation-warranted/case.yaml`, a true claim, where the agent must change the work.

**Open points:** The paper has no evidence-line text, no false-positive rate, and no token cost.
Its rates are worst case, because its tasks hide the evidence.
A real claim is often checkable, and then the right action is to check.
No eval result in this repository shows whether parts 1 and 2 pass on 0.2.0.
See [Evals](Evals).

## D31 A Guard Hook Fails Closed

**Problem:** When a hook throws or times out, Claude Code skips it, so the call runs (a guard fails open).
A guard that fails open lets a denied call through.

**Choice:** The `guard` slice gives `onBashFail` to `.catch()` of its `tool.call` hook.
A crash or a timeout denies a `Bash` command that prints a file, and a command that does not print a file runs.
The hook has no catch-all: a `catch` names only the error that it expects, and the others reach the log of Claude Code (D49 in [Engine Facts](Decisions-Engine)).

**Alternatives:** Fail open, which 0.1.0 chose.
The deny of a print is cheap to repeat with `Read`, so a false deny costs little.

**Evidence:** The header of `src/plugins/claudetto/slices/guard/adapters/mod.ts`, and `tests/claudetto/guard/errors.test.ts`.

## Related Pages

- [Handoff](Handoff)
- [Guard](Guard)
- [Sembr](Sembr)
- [Evals](Evals)
- [Decisions](Decisions)
