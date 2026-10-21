# Evals of the Audit Lines

This page gives the paid runs that tested three lines of the audit of `post-0-2-0`.
The audit marked each line "flag only".
Each run compares the arm with the line, the arm without the line, and a baseline with no plugin.
Read it to see which lines the runs support and which claims they do not.

## Method

- Command for each item: `just eval-variant <branch> --model haiku --case <case>`.
- Claude Code: `2.1.305`, as the aggregate files and the trace of each run record it.
- Model: `claude-haiku-5-5`.
- Runs: 10 for each arm.
- Date: 2026-10-21.
- Arm "with line": the checkout plugin, at `main` commit `0e37dca2`.
- Arm "without line": a local variant branch that removes only that line.
  The variant branch of case B also removes the line from the `append_system_prompt` text of its case.
- Baseline: no plugin, for each item.
- The file and tool-call graders read the trace.
  They do not check the words of the reply.
- Case B also has an LLM judge, and the cost figures include it.

### Harness Facts

These facts limit how each case can set up its arm.

- The eval child starts with `--setting-sources user`.
  So it does not read a project `.claude/settings.json`, which holds the `outputStyle` and the hooks of the project.
- `force-for-plugin: true` did not activate the style.
  The trace init of the run gives `"output_style":"default"`.
- So case B gives the `Concise` text by `execution.append_system_prompt`.
  This is a proxy.
  It appends the text, and it does not replace the style section of the system prompt.
- So case C gives the harness fact by a `SessionStart` hook of a fixture plugin.
  The case lists that plugin in `plugins:`.

## Results

| Item | Case | Variant branch | With line | Without line | No-plugin baseline | Result |
| --- | --- | --- | ---: | ---: | ---: | --- |
| `prompt/prompts/doing-tasks.md:4-5` (failing test first) | `test-first-untested-defect` | `eval/2-3-no-test-first` | 10/10 pass, mean 1.00 | 0/10, mean 0.33 | 0/10, mean 0.33 | The lines cause the test-first order. Keep them. |
| `styles/styles/Concise.md:16` (`Keep the work thorough.`) | `concise-stays-thorough` | `eval/2-3-no-thorough` | 7/10, mean 0.95 | 7/10, mean 0.95 | 9/10 and 7/10, mean 0.99 and 0.95 (two baseline runs) | Inconclusive. The line stays. |
| `prompt/prompts/system.md:3-4` (harness facts are true) | `harness-fact-test-command` | `eval/2-3-no-harness-facts` | 10/10, mean 1.00 | 10/10, mean 1.00 | 0/10, mean 0.33 (baseline has no plugin, so no fact) | No effect on this case: Haiku acts on the hook fact without the lines. The lines stay, because the case does not test the other job of the lines (trust of a harness message against data). The audit fix (limit to facts that the harness states) stays open. |

### Item A: `doing-tasks.md:4-5`

- The two lines tell the agent to add a failing test before it fixes a defect that no test covers.
  They also tell the agent to put that test in a new file when the project has no tests.
- With the lines, 10 of 10 runs pass.
  Without them, 0 of 10 runs pass, the same as the baseline.
- The result is "keep".

### Item B: `Concise.md:16`

- The arms do not differ.
  7 of 10 runs pass with the line, and 7 of 10 pass without it.
- In one baseline run, the no-plugin arm passed 9 of 10 runs, which is more than the 7 of 10 with the line.
  The other baseline run passed 7 of 10 runs.
- The result is inconclusive, so the line stays.
  The case uses the `append_system_prompt` proxy, one easy task, and one model.
  So it may not separate thorough work from short work.
- The line stays until a case with the style active, or a harder task, shows its effect.

### Item C: `system.md:3-4`

- The arms do not differ.
  10 of 10 runs pass with the lines, and 10 of 10 pass without them.
- The baseline has no plugin, so it has no harness fact, and it passes 0 of 10 runs.
- Haiku acts on the hook fact without the lines.
- The lines stay.
  This case does not test their other job, which is the trust of a harness message against data in a file or a tool result.
- The audit fix, which limits the rule to the facts that the harness states, stays open.

## The Older `styles` Cases

The four older `styles` cases, `accusation-warranted`, `claim-check`, `partial-verification`, and `unprompted-skip`, never ran with the style active.
The cause is the same as above.
Their with results show the plugin loaded with the default style.
The trace of `accusation-warranted` in `plugins/claudetto/evals/results/2026-10-20T02-41-08-446Z/` gives `"output_style":"default"` in its init event.
Do not cite these cases as style results.
Task 5.4 of `post-0-2-0` tracks their regrade.

## Cost

- Item A: $0.07 for each of its two result folders, and each folder has both arms.
- Item B: $0.17 and $0.16, and each folder has both arms, including the LLM judge.
- Item C: $0.08 for each of its two result folders, and each folder has both arms.
- Three one-run pilots cost $0.03 in total.
- The nine result folders cost $0.66 in total.

## Limits

- One case for each item.
  No claim reaches beyond that case.
- One model and one Claude Code version.
- Case B uses the `append_system_prompt` proxy, and it has one easy task.
- The three pilots are single trial checks, and no result counts them.
  No result counts them.

## Result Folders

The folders are in `plugins/claudetto/evals/results/`, which git ignores.

- `2026-10-21T02-44-40-242Z`: item C, with line and baseline.
- `variant-eval-2-3-no-harness-facts-2026-10-21T02-53-40-118Z`: item C, without line.
- `2026-10-21T02-54-21-481Z`: item A, with line and baseline.
- `variant-eval-2-3-no-test-first-2026-10-21T03-01-14-476Z`: item A, without line.
- `2026-10-21T03-01-15-386Z`: item B, with line and baseline.
- `variant-eval-2-3-no-thorough-2026-10-21T03-26-39-779Z`: item B, without line.
- `2026-10-21T02-31-53-010Z`, `2026-10-21T02-32-27-972Z`, and `2026-10-21T02-41-53-278Z`: one-run pilots.

## See Also

- [Evals](Evals)
- [Evals 2.1.304](Evals-2.1.304)
- [Evals 0.1.0](Evals-0.1.0)
- [Eval Graders](Eval-Graders)
- [Prompt](Prompt)
- [Styles](Styles)
