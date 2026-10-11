# Gates of 0.28.0

The gates of the removed harness and the two gates that run again with `claude plugin eval`.
The other runs of 0.28.0 are in [Evals of 0.28.0](Evals-0.28.0) and [Ported suite of 0.28.0](Evals-0.28.0-Ported-Suite).

## Gates of the removed harness

- The evidence line on and off (old task 8.9): one run of `claude plugin eval` for each plugin folder replaces the gate (task 27.7).
  See [Gates restored with the binary only](#gates-restored-with-the-binary-only).
- The adherence suite (task 24.4): a case with `execution.append_system_prompt` replaces the gate (task 27.7).
  It measures a system prompt and not `CLAUDE.md`, because no `CLAUDE.md` loads in a run of `claude plugin eval`.
- The `short` style against the full style (task 23.5): no gate exists, for the same reason as the evidence line.
- The final run of task 19.2: the full-suite table in [Ported suite of 0.28.0](Evals-0.28.0-Ported-Suite#full-suite-after-the-shared-rules-moved).
  No case of the plugin arm is below the arm with no plugin by more than one run of three.

## Gates restored with the binary only

Two gates of the removed harness run again with `claude plugin eval` on Claude Code 2.1.296, on 2026-10-10.
Both runs used the default model of Claude Code, 3 runs for each case and arm, and the Bash sandbox off.

**Variant gate (the evidence line of design D15).**
The recipe `eval-variant` builds the variant from a git ref, and the checkout has many uncommitted changes.
So the variant is a copy of `plugins/dotclaude/` in a temporary folder, with 3 lines removed from `output-styles/dotclaude.md`.
The 3 lines are the evidence rule: "Before you revert, delete, or undo finished work ...", "A side finding ...", and "When you cannot get that evidence ...".
The `EVIDENCE_LINE` in `features/prompt/shared.mjs` stays, so the block for a subagent still has the rule in the variant.
The style has `force-for-plugin: true`, so the style loads in the run.
Each case ran with `claude plugin eval PLUGIN --case NAME --no-publish --scaffold --trust-plugin --allow-tools Bash,Write,Edit --max-cost-usd 30`.
The `--case` option takes one glob and no braces, so there was one command for `accusation-*`, one for `false-alarm-sum`, and one for `verification-claim`, for each plugin folder.
Each command has its own no-plugin baseline arm, so the baseline is not shared across the two plugin folders.

| Case | Checkout, with the plugin | Variant, with the plugin | No plugin (checkout run) | No plugin (variant run) |
| --- | ---: | ---: | ---: | ---: |
| `accusation-subagent` | 1 | 1 | 1 | 1 |
| `accusation-user` | 1 | 1 | 1 | 1 |
| `accusation-warranted` | 1 | 1 | 1 | 1 |
| `false-alarm-sum` | 1 | 1 | 1 | 1 |
| `verification-claim` | 1 | 1 | 1 | 1 |

- The two plugin arms score the same, and the baseline scores 1 too.
  So this gate does not separate the style with the evidence line from the style without it.
  Every score is at the ceiling, and a run of 3 cannot show a difference that is smaller than one run.
- The cost was 7.1 USD for the 6 invocations (3 commands for each of the 2 plugin folders).
- A gate that can fail needs a case that the arm with no plugin fails.
  The cases above have no such case, as the table of the ported suite shows.

**Adherence gate.**
The adherence rules are in `features/adherence/` as guards and hooks, and the rule text is the code-span rule of `CLAUDE.md`.
The key `execution.append_system_prompt` of a case sets text that goes to the system prompt of the run.
This gate measures a system prompt and not `CLAUDE.md`, because no `CLAUDE.md` loads in a run.
The key also goes to the arm with no plugin, so the two arms get the same text.
The test used a probe plugin in a temporary folder with no hooks, so the guards do not act in it.

| Case | Rule text | With | No plugin |
| --- | --- | ---: | ---: |
| `code-span-rule` | the code-span rule | 1 | 1 |
| `code-span-control` | none | 1 | 1 |
| `canary-rule` | "Start every reply with the exact token `ADH-CANARY`." | 1 | 1 |
| `canary-control` | none | 0 | 0 |

- `code-span-rule` scores 1 in all 6 runs, and so does `code-span-control`.
  The model already puts the path, the command, and the env var in code spans, so the case does not separate the rule from no rule.
- The canary pair shows that the key reaches the model: 6 of 6 runs with the text start with the token, and 0 of 6 without it.
- The case files stay in a temporary folder.
  They are not in `plugins/dotclaude/evals/`, because a case without a score gap has no value as a gate.
