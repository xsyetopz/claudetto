# System prompt

dotclaude owns the system prompt of the main session.
This page says what the prompt must do, how large it can be, and when it can change.
The variants are in [Prompt variants](Prompt-Variants).

## One route

The prompt has three parts, and no rule text is in two of them.

| Part | Holds | Source |
| --- | --- | --- |
| Shared sections | The rules that every model shares: `doing_tasks`, `system`, `blocks`, `verification`, `actions`, `tools`, and `counts` | `features/prompt/shared.ts` |
| Prompt variant | The text of one model, such as the step line of Haiku 5.5, and the block of a subagent | `features/prompt/variants.ts` |
| Output style | The role, the tone, and the format of the reply (`<role>`, `<reports>`, and `<text_format>`) | `output-styles/dotclaude.md` |

`variantSections` returns the shared sections and then the model notes, and `prompt.compose` puts them where the Claude Code sections were.
The output style is not a place for rules.
Claude Code sends an output style as a message in the conversation, and not in the system prompt ([output styles](https://code.claude.com/docs/en/output-styles), [modifying system prompts](https://code.claude.com/docs/en/agent-sdk/modifying-system-prompts)).
A kept eval trace on Claude Code 2.1.296 showed the style as an `output_style_instructions` attachment, and the system prompt held the shared sections and then the `<model_notes>` of the variant.
The Sonnet variant has no `<model_notes>`.
With the rules in the style, the plugin arm of the eval cases `facts-release-scope` and `report-count` scored like the no-plugin baseline.
A model with no variant and a `bare` session get no shared sections.

A subagent does not inherit the output style or get the shared sections.
Its agent body and the model block of `agent.spawn` give it the rules.
The block repeats the evidence line and the block line for that reason, and a test keeps them equal to the lines of the shared sections.
The decisions are D15 and D30 in [Decisions](Decisions-Prompt).

## Ownership

- The hooks module replaces the Claude Code sections with the dotclaude text for the model of the session.
  Each of Fable 5.1, Opus 5.5, Sonnet 5.5, and Haiku 5.5 has its own variant.
  The shared rules arrive as the shared sections before the model notes.
  Mythos 5.1 gets the Fable variant (`variantKey` in `features/prompt/select.ts`).
- A section id that the module does not know passes on unchanged.
  The drift check reports it ([Core plugin](Core-Plugin#drift-check)).
- The shared sections, each variant, and the output style use XML tags to separate their content.
  It uses plain imperatives, gives a reason only where the reason changes behavior, and uses no stacked forceful words.
- The variants differ where the model guides differ.
  For example, Haiku 5.5 gets the step line, and Sonnet 5.5 gets no model notes, because the shared `verification` section holds its verification rule.

## Size

A variant has no byte bound of its own.
`just measure` checks the text of the first request against `FIRST_REQUEST_LOW_BYTES` and `FIRST_REQUEST_HIGH_BYTES` in `tools/limits.ts`.
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
The short `Bash` tool text that `tool.describe` sends (`features/surface/data.ts`) therefore tells Claude to end commit messages and pull request text with the attribution lines of the system reminder, when it has them.
The system prompt has no commit text.

## Human stays in the loop

- The `actions` shared section keeps one rule that makes Claude ask the user before an action that is hard to undo or that other people see.
- Neither the shared sections nor a variant tells Claude to get around a permission rule, a hook, or the sandbox.
- A `claude plugin eval` case can measure the policy-violation rate with a `tool_used` grader ([Evals](Evals)).

## Blocks

The shared sections have a `blocks` section.
A permission rule, a hook, the sandbox, a failing check, a lint rule, a test, and a size bound each stop the work for a reason.
Claude reads the reason, and then it changes the work to fit the block or asks you.
It does not raise a bound, weaken or skip a test, or edit a check, a config, or a hook so that a check passes, unless you ask.
The reason is that such a change hides the defect that the check exists to find.
The block of a subagent carries a short form of the rule (`BLOCK_LINE` in `features/prompt/shared.ts`), because a subagent does not get the shared sections.
The hook `adherence` asks before the edits that the rule names ([Core plugin](Core-Plugin#hooks)).

## Tests check code, not words

The `verification` shared section and the `implementer` agent tell Claude that a test checks what the code does, such as a decision, an exit status, a file, or a value that a message carries.
A test does not check the words of a message, a doc, a prompt, or a comment.
When you give a rule about text, Claude follows it when it writes, and does not make a test of it.
The `reviewer` agent looks for such tests.

## Evidence before undoing finished work

The `actions` shared section and the block of each model tell Claude to show a new check in the workspace before it reverts, deletes, or undoes finished work because of a claim of fault.
When Claude cannot reach the evidence, it keeps the work and asks for the evidence, also when the user tells it to delete the work (task 29.12).

- The claim can come from a subagent report or from project context.
- The line costs about 50 tokens in the cached prefix (**inference**).
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
