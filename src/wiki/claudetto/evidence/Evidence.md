# Evidence

Evidence pages show what was measured, how, and the result.
They back the choices on the [Decisions](Decisions) pages.
Each row below names a page, what it measures, and when.

## Measurement Pages

| Page | What it measures | Date | Claude Code version |
| --- | --- | --- | --- |
| [Handoff Cost](Handoff-Cost) | The cost of one handoff and one `/compact` in the same session | 2026-10-12 | `2.1.296` |
| [Usage Evidence](Usage-Evidence) | Prices, models, cache, and one week of usage | 2026-09-21 to 2026-10-18 | `2.1.287` for one fact, otherwise not stated |
| [Prompt Size](Prompt-Size) | The size of the tailored prompt text | 2026-10-19 | Not stated |
| [Evals](Evals) | The eval suite, how to run it, and where results are | 2026-10-10 | `2.1.296` |
| [Eval Graders](Eval-Graders) | The grader kinds of `claude plugin eval` | Not stated | `2.1.296` to `2.1.302` |
| [Evals of 0.1.0](Evals-0.1.0) | Paid runs of the `Concise` style cases on Haiku 5.5 | 2026-10-16 to 2026-10-17 | `2.1.301`, `2.1.302` |
| [Evals History](Evals-History) | Off-switch eval, compaction bench, model sweeps | 2026-09-27 to 2026-10-10 | `2.1.287` to `2.1.296` |
| [Model Guidance](Model-Guidance) | What guides and system cards say about false completion | 2026-10-16 | `2.1.301` |
| [Prohibition Lists](Prohibition-Lists) | Plugin texts that keep a list of `Do not` sentences | 2026-10-16 | Not stated |
| [Probes of 2.1.301](Probes-2.1.301) | What a plugin `hooks.json`, agent, and `Stop` input accept | 2026-10-16 | `2.1.301` |
| [Stop Hook Eval](Stop-Hook-Eval) | The behavior of a `type: "prompt"` hook on `Stop` | 2026-10-07 to 2026-10-12 | `2.1.292`, `2.1.296` |

## See Also

- [Handoff Cost](Handoff-Cost)
- [Usage Evidence](Usage-Evidence)
- [Evals](Evals)
- [Model Guidance](Model-Guidance)
