# Decisions: Evidence

This page holds the decisions D27, D29, and D30.
Read it to learn why dotclaude takes facts from the host and the workspace, not from model reports.
Each decision gives the problem, the choice, the alternatives, and the evidence.
The index is [Decisions](Decisions).
The decisions that 1.0.0 reverses are in [Decisions-Reversed](Decisions-Reversed).

## D27 Measured Facts over Model Reports

**Problem:** A model can report a false state.
GitHub issue #35357 records a Claude model that printed context warnings with false values.
The issue is not in this repository, so this page does not check it.

**Choice:** dotclaude does not take a state figure from the model.
It reads the measured value from the host.
The 1.0.0 parts of this choice are these:

1. No prompt text asks the model to estimate or announce its context share.
   The texts in `src/plugins/dotclaude/slices/prompt/texts.ts/` hold no such request.
2. The context bound reads measured usage.
   `triggerOf` in `src/plugins/dotclaude/slices/handoff/adapters/mod.ts` reads `$.session.usage()`.
   `CONTEXT_PERCENT` in `src/plugins/dotclaude/slices/handoff/limits.ts` is the bound.
   Its value is `60`.
   When the measured share reaches the bound, `withHint` adds a hint with the reason to the `turn.complete` output of the main session.
   `onToolCall` in the same file adds a report-now note to a tool result of a subagent that nears the bound.
   The bound and its default are in [Context Bound](Context-And-Handoff).
3. Compaction is off.
   The prompt slice sets `DISABLE_COMPACT` to `1` in `src/plugins/dotclaude/slices/prompt/slice.ts`.
   The transform in `src/plugins/dotclaude/slices/prompt/transforms/context_management.ts` replaces the compaction line.
   The new text says that the model does not need to wrap up early or hand off in the middle of a task.
4. A claim of a passed check has no hook.
   The prompt rules ask for a run before a claim of done.
   The rules are in `src/plugins/dotclaude/slices/prompt/texts.ts/verify-line.md` and `verification.md`.
   A `Stop` prompt hook that judged such claims is reversed, see [Decisions-Reversed](Decisions-Reversed).

**Alternatives:** A state figure that the model reports, which is rejected for the issue above.
A `Stop` prompt hook that judges the claims of a reply, which is reversed.

**Evidence:** The code paths of the parts above.
The test `src/plugins/dotclaude/slices/prompt/lab/section.test.ts` checks that `DISABLE_COMPACT` changes the `context_management` section.

## D29 Semantic Line Breaks

**Problem:** The text that Claude writes to files and to commits must hold one sentence on each line.
The model does not always keep this rule.
This is an inference from the design, not a measured result in this repository.

**Choice:** dotclaude rewrites the text before it is written, with no model token.
The code is in `src/plugins/dotclaude/slices/sembr/`.

- The `tool.call` hook in `slice.ts` rewrites a Markdown `Write` or `Edit`.
  It also rewrites the quoted heredoc of a `Bash` call to `git commit` or `gh pr create`.
- `domain/rewrite.ts` puts each sentence on its own line.
  `domain/split.ts` splits the sentences.
- `Edit` rewrites an `old_string` that spans two sentences.
- The hook has the phase `rewrite`.
  The generator orders this phase before the `check` phase of the `guard` slice (`slice.ts`, line 4).
- The design uses no `PostToolUse` rewrite, because that can make the next `Edit` fail.
  This reason is the design text, and this page does not test it.
- The chat reply is not rewritten.
  No code in `src/plugins/dotclaude/slices/sembr/` or in the output styles rewrites it.
  See [Semantic Line Breaks](Semantic-Line-Breaks).

**Alternatives:** The `markdownlint-rule-sembr` package as a gate.
The design rejects it for the runtime.
It needs extra packages, and each block costs tokens.

**Evidence:** The rewrite test in `src/plugins/dotclaude/slices/sembr/lab/sembr.test.ts`.
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
The first two parts ship in 1.0.0.

1. The evidence line.
   Its text is in `src/fragments/evidence-line.md`.
   It is in the shared `actions` section, `src/plugins/dotclaude/slices/prompt/texts.ts/actions.md`.
   It is also in the block of each variant, as `EVIDENCE_LINE` in `src/plugins/dotclaude/slices/prompt/domain/variants.ts`.
2. The subagent rule.
   `onSpawn` in `src/plugins/dotclaude/slices/prompt/adapters/mod.ts` adds the block of the model of the subagent to the task prompt.
   A subagent gets no shared section, so its block carries the evidence line.
   The agent bodies in `src/plugins/dotclaude/slices/agents/agents/` do not repeat the rule.
3. The gate, which is not in 1.0.0.
   `src/` has no `UserPromptSubmit` hook and no accusation flag.
   The gate is for the case that parts 1 and 2 fail the eval.

**Alternatives:** The gate of part 3, which is not built.

**Evidence:** The eval cases are these:

- `src/plugins/dotclaude/slices/prompt/evals/accusation-user/case.yaml`, a false claim of fault from the user.
- `src/plugins/dotclaude/slices/prompt/evals/accusation-subagent/case.yaml`, a false claim in a reviewer report.
- `src/plugins/dotclaude/slices/styles/evals/accusation-warranted/case.yaml`, a true claim, where the agent must change the work.

The 0.28.0 eval suite recorded that the evidence rule came back.
See [Evals-0.28.0-Ported-Suite](Evals-0.28.0-Ported-Suite).

### Open Items

- The paper tests `Claude-Opus-5` and `Claude-Sonnet-5`.
  The mapping to Opus 5.5 and Sonnet 5.5 is **inferred**, and Haiku 5.5 has no data.
- The paper has no evidence-line text, no false-positive rate, and no token cost.
- Rates in the paper are worst case, because its tasks hide the evidence.
  A real claim is often checkable.
  Then the right action is to check.
- No eval result in this repository shows whether parts 1 and 2 pass on 1.0.0.
  So the gate of part 3 stays unbuilt.

See [System Prompt](Prompt-Surface).

## Related Pages

- [Context Bound](Context-And-Handoff)
- [Semantic Line Breaks](Semantic-Line-Breaks)
- [Evals](Evals)
- [Decisions-Prompt](Decisions-Prompt)
- [Decisions-Reversed](Decisions-Reversed)
