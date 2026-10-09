# System prompt

dotclaude owns the system prompt of the main session.
This page says what the prompt must do, how large it can be, and when it can change.
The variants are in [Prompt variants](Prompt-Variants).
The decisions are D15 and D30 in [Decisions](Decisions-Prompt).

## Ownership

- The hooks module replaces the Claude Code sections with a dotclaude variant for the model of the session.
  The models are Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1.
- A section id that the module does not know passes on unchanged.
  The drift check reports it ([Commands](Commands#drift-check)).
- Each variant uses XML tags to separate its content.
  It uses plain imperatives, gives a reason only where the reason changes behavior, and uses no stacked forceful words.
- The variants differ where the model guides differ.
  For example, the verification line is on for Sonnet 5.5 and Haiku 5.5, and off for Opus 5.5.

## Size

A variant has no byte bound of its own.
`just measure` checks the text of the first request against `FIRST_REQUEST_LOW_BYTES` and `FIRST_REQUEST_HIGH_BYTES` in `tools/limits.mjs`.
See [Prompt variants](Prompt-Variants#size-of-the-first-request) for the figures.

## Stable inside a session and an agent

- The main-session variant is chosen at session start through `prompt.compose`, from the session model.
- A subagent has its agent body as its system prompt, because Claude Code does not compose it through `prompt.compose` or `prompt.section`.
  At spawn, the module adds the block of the subagent model to the task prompt, one time.
- The variant text does not change inside a session or an agent.
  A model switch with `/model` leaves the system prompt bytes of the next request equal to those of the first.
- The reason is the prompt cache.
  A system prompt edit in the middle of a session breaks the cache and invalidates later thinking blocks.
- Whether a fixed variant costs adherence after a model switch with `/model` is a variant-eval question ([Open items](Open-Items)).

## Commit attribution

The [settings snippet](Settings-Snippet) sets `includeGitInstructions` to `false`, so Claude Code gives no git instructions.
The prompt therefore tells Claude to end commit messages and pull request text with the attribution text that the session gives it.

## Human stays in the loop

- Every variant keeps one rule that makes Claude ask the user before an action that is hard to undo or that other people see.
- No variant tells Claude to get around a permission rule, a hook, or the sandbox.
- A `claude plugin eval` case can measure the policy-violation rate with a `tool_used` grader ([Evals](Evals)).

## Evidence before undoing finished work

Every variant and the output style tell Claude to show a new check in the workspace before it reverts, deletes, or undoes finished work because of a claim of fault.
When Claude cannot reach the evidence, it keeps the work and asks for the evidence.

- The claim can come from the user, from a subagent report, or from project context.
- The line costs about 50 tokens in the cached prefix (**inferred**).
- The wording is ours, because the source paper gives no text.
  The suite can measure the wrongful-revert rate and the warranted-fix rate with free graders ([Evals](Evals)).
- A gate on irreversible calls is not built.

## No loss against the default prompt

A variant must show no loss against the Claude Code default prompt on the same model.
The measures are the resolve rate, the over-claim rate, and the policy-violation rate, within the noise bound of the suite.
When a variant shows a loss, its text is restored until it does not.
The format of `claude plugin eval` has no arm for a variant, so no gate for this rule exists ([Evals](Evals#dropped-checks)).

## Compact prompt

Claude Code has no route to override the compact prompt.
The settings snippet limits compaction instead ([Prompt variants](Prompt-Variants#the-compact-prompt-gap)).

## Related pages

- [Prompt variants](Prompt-Variants)
- [Prompt surface](Prompt-Surface)
- [Agents](Agents)
