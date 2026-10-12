# Decisions: evidence

This page holds D27, D29, and D30.
The index is [Decisions](Decisions).
The decisions that 1.0.0 reverses are in [Decisions-Reversed](Decisions-Reversed).

## D27 Measured facts over model reports

Problem: a model can report a false state.
GitHub issue #35357 records Claude that printed context warnings at false values.
The issue is not in this repository, so this page does not check it.

Choice: dotclaude does not take a state figure from the model.
It reads the measured value from the host.
The 1.0.0 parts of the choice are these.

1. No prompt text asks the model to estimate or announce its context share.
   The texts in `src/plugins/dotclaude/slices/prompt/texts.ts/` hold no such request.
2. The context bound reads measured usage.
   `triggerOf` in `src/plugins/dotclaude/slices/handoff/adapters/mod.ts` reads `$.session.usage()`.
   `CONTEXT_PERCENT` in `src/plugins/dotclaude/slices/handoff/limits.ts` is the bound, with the value 60.
   When the measured share reaches the bound, `withHint` adds a hint with the reason to the `turn.complete` output of the main session.
   `onToolCall` in the same file adds a report-now note to a tool result of a subagent that nears the bound.
   The bound and its default are in [Context bound](Context-And-Handoff).
3. Compaction is off.
   The prompt slice sets `DISABLE_COMPACT` to `1` in `src/plugins/dotclaude/slices/prompt/slice.ts`.
   The transform in `src/plugins/dotclaude/slices/prompt/transforms/context_management.ts` replaces the compaction line.
   The new text says that the model does not need to wrap up early or hand off in the middle of a task.
4. A claim of a passed check has no hook.
   The prompt rules ask for a run before a claim of done, in `src/plugins/dotclaude/slices/prompt/texts.ts/verify-line.md` and `verification.md`.
   A `Stop` prompt hook that judged such claims is reversed, see [Decisions-Reversed](Decisions-Reversed).

Alternatives: a state figure that the model reports (rejected, for the issue above), and a `Stop` prompt hook that judges the claims of a reply (reversed).

Evidence: the code paths of the parts above.
The test `src/plugins/dotclaude/slices/prompt/lab/section.test.ts` checks that `DISABLE_COMPACT` changes the `context_management` section.

## D29 Semantic line breaks

Problem: the text that Claude writes to files and to commits must hold one sentence on each line.
The model does not always keep this rule (inference from the design, not measured in this repository).

Choice: dotclaude fixes the text before it is written, with no model token.
The code is in `src/plugins/dotclaude/slices/sembr/`.

- The `tool.call` hook in `slice.ts` rewrites a Markdown `Write` or `Edit`.
  It also rewrites the quoted heredoc of a `Bash` call to `git commit` or `gh pr create`.
- `domain/rewrite.ts` puts each sentence on its own line, and `domain/split.ts` splits the sentences.
- `Edit` repairs an `old_string` that spans two sentences.
- The hook has the phase `rewrite`, which the generator orders before the `check` phase of the `guard` slice (`slice.ts`, line 4).
- The design uses no `PostToolUse` rewrite, because that can make the next `Edit` fail.
  This reason is the design text, and this page does not test it.
- The chat reply is not rewritten.
  No code in `src/plugins/dotclaude/slices/sembr/` or in the output styles rewrites it.
  See [Semantic line breaks](Semantic-Line-Breaks).

Alternatives: `markdownlint-rule-sembr` as a gate.
It is rejected for the runtime, because it needs extra packages, and a block costs tokens.

Evidence: the rewrite test in `src/plugins/dotclaude/slices/sembr/lab/sembr.test.ts`.
The source `research/sembr.md` is not in this repository, and this page does not check it.

## D30 Hold correct work under an unsupported claim

Problem: an agent can undo correct finished work after a claim of fault that it does not check.
The claim can come from the user, from a subagent report, or from project context.
The source is arXiv 2609.32616, which is not in this repository, so this page does not check it.
The paper tests Claude-Opus-5 and Claude-Sonnet-5.
The mapping to Opus 5.5 and Sonnet 5.5 is **inferred**.

Choice: a claim of fault, from any source, does not undo finished work until a check in the workspace shows the fault.
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

Alternatives: the gate of part 3, which is not built.

Evidence: the eval cases `src/plugins/dotclaude/slices/prompt/evals/accusation-user/case.yaml` (a false claim of fault from the user), `src/plugins/dotclaude/slices/prompt/evals/accusation-subagent/case.yaml` (a false claim in a reviewer report), and `src/plugins/dotclaude/slices/styles/evals/accusation-warranted/case.yaml` (a true claim, where the agent must fix the work).
The 0.28.0 eval suite recorded that the evidence rule came back, see [Evals-0.28.0-Ported-Suite](Evals-0.28.0-Ported-Suite).

Open items:

- The paper tests Claude-Opus-5 and Claude-Sonnet-5.
  The mapping to Opus 5.5 and Sonnet 5.5 is **inferred**, and Haiku 5.5 has no data.
- The paper has no evidence-line text, no false-positive rate, and no token cost.
- Rates in the paper are worst case, because its tasks hide the evidence.
  A real claim is often checkable, and then the right action is to check.
- No eval result in this repository shows whether parts 1 and 2 pass on 1.0.0.
  So the gate of part 3 stays unbuilt.

See [System prompt](Prompt-Surface).

## Related pages

- [Context bound](Context-And-Handoff)
- [Semantic line breaks](Semantic-Line-Breaks)
- [Evals](Evals)
- [Decisions-Prompt](Decisions-Prompt)
- [Decisions-Reversed](Decisions-Reversed)
