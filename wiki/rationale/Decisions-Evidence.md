# Decisions: Evidence

This page holds the decisions D27, D29, and D30.
Read it to learn why claudetto takes facts from the host and the workspace, not from model reports.
Each decision gives the problem, the choice, the alternatives, and the evidence.
The index is [Decisions](Decisions).
The ids come from dotclaude 1.0.0.

## D27 Measured Facts over Model Reports

**Problem:** A model can report a false state.
GitHub issue #35357 records a Claude model that printed context warnings with false values.
The issue is not in this repository, so this page does not check it.

**Choice:** claudetto does not take a state figure from the model.
It reads the measured value from the host.
The parts of this choice are these:

1. No prompt text asks the model to estimate or announce its context share.
   The texts in `src/plugins/claudetto/slices/prompt/texts.ts/` hold no such request.
2. The context bound reads measured usage.
   For the main session, the handoff starts at a measured context, through the built-in `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`.
   The trigger is `HANDOFF_TRIGGER_TOKENS` in `src/kernel/budget.ts`.
   For a subagent, `onToolCall` in `src/plugins/claudetto/slices/agents/adapters/mod.ts` adds a report-now note to a tool result when the measured context of the subagent passes its bound.
   The bounds are in `src/plugins/claudetto/slices/agents/limits.ts`.
3. The handoff replaces the compaction.
   The transform in `src/plugins/claudetto/slices/prompt/transforms/context_management.ts` replaces the compaction line of the system prompt for each state of the compaction.
   The basis changed in 0.1.0.
   dotclaude 1.0.0 turned the compaction off with `DISABLE_COMPACT`.
   The reason is in `openspec/changes/claudetto-0-1-0/design.md` (D3 there).
4. A claim of a passed check has no hook.
   The prompt rules ask for a run before a claim of done.
   The rules are in `src/plugins/claudetto/slices/prompt/texts.ts/verify-line.md` and `verification.md`.

**Alternatives:** A state figure that the model reports, which is rejected for the issue above.
A `Stop` prompt hook that judges the claims of a reply.
dotclaude 0.28.0 had that hook, and it failed its hook eval on 2026-10-12.

**Evidence:** The code paths of the parts above.
The test `src/plugins/claudetto/slices/prompt/lab/section.test.ts` checks the `context_management` section.

## D29 Semantic Line Breaks

**Problem:** The text that Claude writes to files and to commits must hold one sentence on each line.
The model does not always keep this rule.
This is an inference from the design, not a measured result in this repository.

**Choice:** claudetto rewrites the text before it is written, with no model token.
The code is in `src/plugins/claudetto/slices/sembr/`.

- The `tool.call` hook in `slice.ts` rewrites a Markdown `Write` or `Edit`.
  It also rewrites the quoted heredoc of a `Bash` call to `git commit` or `gh pr create`.
- `domain/rewrite.ts` puts each sentence on its own line.
  `domain/split.ts` splits the sentences.
- `Edit` rewrites an `old_string` that spans two sentences.
- The hook has the phase `rewrite`.
  The generator orders this phase before the `check` phase of the `guard` slice.
- The design uses no `PostToolUse` rewrite, because that can make the next `Edit` fail.
  This reason is the design text, and this page does not test it.
- The chat reply is not rewritten.
  No code in `src/plugins/claudetto/slices/sembr/` or in the output styles rewrites it.
  See [Semantic Breaks](Semantic-Breaks).

**Alternatives:** The `markdownlint-rule-sembr` package as a gate.
The design rejects it for the runtime.
It needs extra packages, and each block costs tokens.

**Evidence:** The rewrite test in `src/plugins/claudetto/slices/sembr/lab/sembr.test.ts`.
The source `research/sembr.md` is not in this repository, so this page does not check it.

## D30 Hold Work That Is Right Under an Unsupported Claim

**Problem:** An agent can undo finished work that is right, after a claim of fault that it does not check.
The claim can come from the user, from a subagent report, or from project context.
The source is the paper `arXiv 2609.32616`.
The paper is not in this repository, so this page does not check it.
The paper tests `Claude-Opus-5` and `Claude-Sonnet-5`.
The mapping to Opus 5.5 and Sonnet 5.5 is **inferred**.

**Choice:** A claim of fault, from any source, does not undo finished work.
The work stays until a check in the workspace shows the fault.
The rule has three parts.
The first two parts ship in claudetto 0.1.0.

1. The evidence line.
   Its text is in `src/fragments/evidence-line.md`.
   It is in the shared `actions` section, `src/plugins/claudetto/slices/prompt/texts.ts/actions.md`.
   It is also in the block of each variant, as `EVIDENCE_LINE` in `src/plugins/claudetto/slices/prompt/domain/variants.ts`.
2. The subagent rule.
   A subagent gets no shared section, so its block carries the evidence line.
   `onSpawn` in `src/plugins/claudetto/slices/prompt/adapters/mod.ts` keeps the variant of the subagent after the spawn resolves.
   `onAppend` in the same file writes the block into the task row of the subagent.
   The agent bodies in `src/plugins/claudetto/slices/agents/agents/` do not repeat the rule.
3. The gate, which is not built.
   `src/` has no `UserPromptSubmit` hook and no accusation flag.
   The gate is for the case that parts 1 and 2 fail the eval.

**Alternatives:** The gate of part 3, which is not built.

**Evidence:** The eval cases are these:

- `src/plugins/claudetto/slices/prompt/evals/accusation-user/case.yaml`, a false claim of fault from the user.
- `src/plugins/claudetto/slices/prompt/evals/accusation-subagent/case.yaml`, a false claim in a reviewer report.
- `src/plugins/claudetto/slices/styles/evals/accusation-warranted/case.yaml`, a true claim, where the agent must change the work.

### Open Items

- The paper tests `Claude-Opus-5` and `Claude-Sonnet-5`.
  The mapping to Opus 5.5 and Sonnet 5.5 is **inferred**, and Haiku 5.5 has no data.
- The paper has no evidence-line text, no false-positive rate, and no token cost.
- Rates in the paper are worst case, because its tasks hide the evidence.
  A real claim is often checkable.
  Then the right action is to check.
- No eval result in this repository shows whether parts 1 and 2 pass on 0.1.0.
  So the gate of part 3 stays unbuilt.

See [Prompt](Prompt).

## Related Pages

- [Handoff](Handoff)
- [Semantic Breaks](Semantic-Breaks)
- [Evals](Evals)
- [Decisions-Prompt](Decisions-Prompt)
