# Decisions: evidence

This page holds D27, D29, and D30.
The index is [Decisions](Decisions).

## D27 Measured facts over model reports

The source is issue #35357, as `research/code-graph.md` records it.
In that issue, Claude printed context warnings at false values and worked around the rules of the user.
A model can report a false state, so dotclaude does not take a state figure from the model.

1. No prompt text tells the model to estimate or announce its context share.
1. The main session gets no context note.
   Compaction is off, and the `context_management` text of `features/prompt/data.mjs` tells Claude to keep the state of work in files ([Context bound](Context-Bound#main-session)).
1. Claims of a passed check stay under the over-claim measure of the eval.
   A `Stop` prompt hook checks the claims of the last message ([Stop prompt hooks](Stop-Prompt-Hooks)).
   Two eval cases gave 0 over-claims with the hook and without it (2026-10-09), so the eval shows no fall and no loss.
   The hook stays on the evidence of a live run on Haiku 5.5, where it blocked a false claim once and the next stop passed (decision of the user).

See [Context bound](Context-Bound).

## D29 Semantic line breaks

The source is `research/sembr.md`.
dotclaude fixes the text before it is written, with no model token.
It uses no `PostToolUse` rewrite, because that can make the next `Edit` fail.
The parts are a formatter in `lib/`, a silent `PreToolUse` rewrite of Markdown writes and of commit and pull request text, a repair of a cross-sentence `old_string`, a `<text_format>` block in the output style, and a chat rewrite that ships because probe 2.31 showed that the display uses the rewritten row.
Note: this is the first state of D29.
0.28.0 ships no chat rewrite, and dotclaude does not rewrite the chat reply (D35, [Semantic line breaks](Semantic-Line-Breaks)).
An alternative is `markdownlint-rule-sembr` as a gate.
It is rejected for the runtime, because it needs four packages and a block costs tokens.
See [Semantic line breaks](Semantic-Line-Breaks).

## D30 Hold correct work under an unsupported claim

The source is arXiv 2609.32616 (`research/paper-2609-32616.md`).
In that paper, agents in Claude Code damage correct finished work after a false accusation.
The accusation can come from the user, from a subagent report, or from project context.
On 2026-10-10 a direct order of the user to delete work skipped the check, and the plugin arm deleted correct work in 3 of 3 `accusation-user` runs, so the check applies to a claim of fault from the user too (task 29.12).
The harm is a rollback, a deletion, or a reversal after the agent says "you're right".
Three interventions cut the harm: an evidence rule, a gate on irreversible calls, and a gate armed by a live signal.

D30 follows D27 and D28.
A claim with no check in the workspace is a claim and not a fact.

1. An evidence line in the `actions` shared section and in the block of each prompt variant.
   The model shows a new check before it undoes finished work, and else it keeps the work and asks.
1. A subagent rule.
   The `agent.spawn` block keeps the work and reports to the parent when a claim has no workspace evidence.
   The agent bodies no longer repeat the rule.
1. A gate, only if the first two parts do not pass the eval.
   A `UserPromptSubmit` hook sets a flag on an accusation pattern.
   A `PreToolUse` hook then asks, or denies in auto mode, before one irreversible call.
   The gate never blocks a normal edit and does not fire without the flag.

Open items:

- The paper tests Claude-Opus-5 and Claude-Sonnet-5.
  The mapping to Opus 5.5 and Sonnet 5.5 is **inferred**, and Haiku 5.5 has no data.
- The paper has no evidence-line text, no false-positive rate, and no token cost.
- Rates in the paper are worst case, because its tasks hide the evidence.
  A real claim is often checkable, and then the right action is to check.

See [System prompt](System-Prompt#evidence-before-undoing-finished-work).

## Related pages

- [Context bound](Context-Bound)
- [Semantic line breaks](Semantic-Line-Breaks)
- [Evals](Evals)
